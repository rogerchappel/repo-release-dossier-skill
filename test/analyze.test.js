import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { analyzeRepository } from "../src/analyze.js";

const execFileAsync = promisify(execFile);

async function git(repo, ...args) {
  await execFileAsync("git", ["-C", repo, ...args]);
}

async function createGitFixture() {
  const repo = await mkdtemp(path.join(tmpdir(), "release-dossier-git-"));
  await git(repo, "init", "--initial-branch=main");
  await git(repo, "config", "user.name", "Test User");
  await git(repo, "config", "user.email", "test@example.com");

  for (const file of ["deleted.txt", "modified.txt", "old-name.txt"]) {
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

test("warns when verification scripts are missing", async () => {
  const evidence = await analyzeRepository("fixtures/sample-repo/docs", { fixture: true });

  assert.equal(evidence.package.verificationScripts.length, 0);
  assert.ok(evidence.warnings.some((warning) => warning.includes("No package.json")));
  assert.equal(evidence.classification, "hold");
});

test("reports an untracked file as changed git evidence", async (t) => {
  const repo = await createGitFixture();
  t.after(() => rm(repo, { recursive: true, force: true }));
  await writeFile(path.join(repo, "untracked.txt"), "not committed\n");

  const evidence = await analyzeRepository(repo);

  assert.match(evidence.git.status, /\?\? untracked\.txt/);
  assert.deepEqual(evidence.git.changedFiles, ["untracked.txt"]);
  assert.match(evidence.git.recentCommits[0], /initial fixture/);
});

test("reports staged, unstaged, deleted, and renamed dirty paths", async (t) => {
  const repo = await createGitFixture();
  t.after(() => rm(repo, { recursive: true, force: true }));
  await writeFile(path.join(repo, "modified.txt"), "unstaged change\n");
  await rm(path.join(repo, "deleted.txt"));
  await git(repo, "mv", "old-name.txt", "new-name.txt");
  await writeFile(path.join(repo, "staged.txt"), "staged change\n");
  await git(repo, "add", "staged.txt");

  const evidence = await analyzeRepository(repo);

  assert.deepEqual(evidence.git.changedFiles, [
    "deleted.txt",
    "modified.txt",
    "new-name.txt",
    "old-name.txt",
    "staged.txt"
  ]);
});
