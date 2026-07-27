import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const cli = path.resolve("bin/repo-release-dossier.js");

async function git(repo, ...args) {
  return execFileAsync("git", ["-C", repo, ...args]);
}

async function createCleanRepository() {
  const parent = await mkdtemp(path.join(tmpdir(), "release-dossier-cli-"));
  const repo = path.join(parent, "repo");
  await cp("fixtures/sample-repo", repo, { recursive: true });
  await git(repo, "init", "--initial-branch=main");
  await git(repo, "config", "user.name", "Test User");
  await git(repo, "config", "user.email", "test@example.com");
  await git(repo, "add", ".");
  await git(repo, "commit", "-m", "initial fixture");
  return { parent, repo };
}

test("markdown output is written after collecting clean repository evidence", async (t) => {
  const { parent, repo } = await createCleanRepository();
  t.after(() => rm(parent, { recursive: true, force: true }));
  const output = path.join(repo, "dossier.md");

  await execFileAsync(process.execPath, [cli, "--repo", repo, "--out", output]);

  const { stdout: status } = await git(repo, "status", "--short");
  const dossier = await readFile(output, "utf8");
  assert.equal(status, "?? dossier.md\n");
  assert.match(dossier, /Classification: ship/);
  assert.match(dossier, /Side effects: wrote output artifact dossier\.md/);
  assert.match(dossier, /Working tree: clean/);
  assert.doesNotMatch(dossier, /^  - dossier\.md$/m);
});

test("JSON output is written after collecting clean repository evidence", async (t) => {
  const { parent, repo } = await createCleanRepository();
  t.after(() => rm(parent, { recursive: true, force: true }));
  const output = path.join(repo, "dossier.json");

  await execFileAsync(process.execPath, [cli, "--repo", repo, "--out", output, "--json"]);

  const { stdout: status } = await git(repo, "status", "--short");
  const evidence = JSON.parse(await readFile(output, "utf8"));
  assert.equal(status, "?? dossier.json\n");
  assert.equal(evidence.classification, "ship");
  assert.equal(evidence.sideEffects, "wrote output artifact dossier.json");
  assert.deepEqual(evidence.git.changedFiles, []);
  assert.doesNotMatch(evidence.warnings.join("\n"), /working tree is dirty/i);
});

test("analysis failure preserves existing output and leaves no temporary artifact", async (t) => {
  const parent = await mkdtemp(path.join(tmpdir(), "release-dossier-cli-failure-"));
  t.after(() => rm(parent, { recursive: true, force: true }));
  const repo = path.join(parent, "repo");
  const output = path.join(parent, "dossier.md");
  await cp("fixtures/sample-repo", repo, { recursive: true });
  await writeFile(path.join(repo, "package.json"), "{broken", "utf8");
  await writeFile(output, "KEEP THIS CONTENT", "utf8");

  await assert.rejects(
    execFileAsync(process.execPath, [cli, "--repo", repo, "--fixture", "--out", output]),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /Expected property name|JSON/);
      return true;
    }
  );

  assert.equal(await readFile(output, "utf8"), "KEEP THIS CONTENT");
  assert.deepEqual(await readdir(parent), ["dossier.md", "repo"]);
});

for (const option of ["--repo", "--out"]) {
  test(`${option} without a value prints a concise error and usage`, async () => {
    await assert.rejects(
      execFileAsync(process.execPath, [cli, option]),
      (error) => {
        assert.equal(error.code, 1);
        assert.match(error.stderr, new RegExp(`Error: ${option} requires a value\\.`));
        assert.match(error.stderr, /Usage: repo-release-dossier/);
        assert.doesNotMatch(error.stderr, /ERR_INVALID_ARG_TYPE|node:internal/);
        return true;
      }
    );
  });
}
