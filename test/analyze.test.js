import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { analyzeRepository } from "../src/analyze.js";
import { renderDossier } from "../src/render.js";

const execFileAsync = promisify(execFile);

async function git(repo, ...args) {
  await execFileAsync("git", ["-C", repo, ...args]);
}

async function createGitFixture() {
  const repo = await mkdtemp(path.join(tmpdir(), "release-dossier-git-"));
  await git(repo, "init", "--initial-branch=main");
  await git(repo, "config", "user.name", "Test User");
  await git(repo, "config", "user.email", "test@example.com");

  for (const file of ["copy-source.txt", "deleted.txt", "modified.txt", "old-name.txt"]) {
    await writeFile(path.join(repo, file), `${file}\n`);
  }
  await git(repo, "add", ".");
  await git(repo, "commit", "-m", "initial fixture");
  return repo;
}

test("analyzes fixture repository with docs and scripts", async () => {
  const evidence = await analyzeRepository("fixtures/sample-repo", { fixture: true });

  assert.equal(evidence.package.name, "sample-release-target");
  assert.equal(evidence.sideEffects, "read-only");
  assert.ok(evidence.package.verificationScripts.includes("test"));
  assert.ok(evidence.package.verificationScripts.includes("check"));
  assert.ok(evidence.package.verificationScripts.includes("smoke"));
  assert.equal(evidence.docs.required.every((doc) => doc.present), true);
  assert.equal(evidence.classification, "ship");
});

test("treats a fixture outside any Git worktree as intentionally unavailable", async (t) => {
  const parent = await mkdtemp(path.join(tmpdir(), "release-dossier-fixture-"));
  const repo = path.join(parent, "sample-repo");
  t.after(() => rm(parent, { recursive: true, force: true }));
  await cp("fixtures/sample-repo", repo, { recursive: true });

  const evidence = await analyzeRepository(repo, { fixture: true });

  assert.equal(evidence.git.available, false);
  assert.deepEqual(evidence.git.warnings, []);
  assert.equal(evidence.classification, "ship");
});

test("warns when verification scripts are missing", async () => {
  const evidence = await analyzeRepository("fixtures/sample-repo/docs", { fixture: true });

  assert.equal(evidence.package.verificationScripts.length, 0);
  assert.ok(evidence.warnings.some((warning) => warning.includes("No package.json")));
  assert.equal(evidence.classification, "hold");
});

test("a clean Git repository remains free of dirty-tree warnings", async (t) => {
  const repo = await createGitFixture();
  t.after(() => rm(repo, { recursive: true, force: true }));

  const evidence = await analyzeRepository(repo);

  assert.equal(evidence.classification, "hold");
  assert.equal(evidence.git.status, "");
  assert.deepEqual(evidence.git.changedFiles, []);
  assert.doesNotMatch(evidence.warnings.join("\n"), /working tree is dirty/i);
  assert.doesNotMatch(renderDossier(evidence), /^PASS:/m);
  assert.match(evidence.git.recentCommits[0], /initial fixture/);
});

const dirtyCases = [
  ["untracked", async (repo) => writeFile(path.join(repo, "untracked.txt"), "untracked\n"),
    ["untracked.txt"]],
  ["staged", async (repo) => {
    await writeFile(path.join(repo, "staged.txt"), "staged\n");
    await git(repo, "add", "staged.txt");
  }, ["staged.txt"]],
  ["unstaged", async (repo) => writeFile(path.join(repo, "modified.txt"), "modified\n"),
    ["modified.txt"]],
  ["deleted", async (repo) => rm(path.join(repo, "deleted.txt")),
    ["deleted.txt"]],
  ["renamed", async (repo) => git(repo, "mv", "old-name.txt", "new-name.txt"),
    ["new-name.txt", "old-name.txt"]],
  ["copied", async (repo) => {
    await cp(path.join(repo, "copy-source.txt"), path.join(repo, "copy.txt"));
    await git(repo, "add", "copy.txt");
  }, ["copy-source.txt", "copy.txt"]]
];

for (const [kind, mutate, changedFiles] of dirtyCases) {
  test(`blocks ship classification for ${kind} changes`, async (t) => {
    const repo = await createGitFixture();
    t.after(() => rm(repo, { recursive: true, force: true }));
    await mutate(repo);

    const evidence = await analyzeRepository(repo);
    const markdown = renderDossier(evidence);

    assert.notEqual(evidence.classification, "ship");
    assert.match(evidence.warnings.join("\n"), /working tree is dirty/i);
    assert.deepEqual(evidence.git.changedFiles, changedFiles);
    assert.doesNotMatch(markdown, /^PASS:/m);
    assert.match(markdown, /Working tree: WARN dirty/);
    for (const file of changedFiles) {
      assert.match(markdown, new RegExp(`^  - ${file}$`, "m"));
    }
  });
}
