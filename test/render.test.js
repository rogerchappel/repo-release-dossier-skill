import test from "node:test";
import assert from "node:assert/strict";
import { analyzeRepository } from "../src/analyze.js";
import { renderDossier } from "../src/render.js";

test("renders release dossier sections", async () => {
  const evidence = await analyzeRepository("fixtures/sample-repo", { fixture: true });
  const markdown = renderDossier(evidence);

  assert.match(markdown, /^# Release Dossier: sample-release-target/m);
  assert.match(markdown, /## Verification/);
  assert.match(markdown, /PASS: npm run test/);
  assert.match(markdown, /## Risks And Warnings/);
  assert.match(markdown, /Recommended classification: ship/);
});

test("renders the same changed file list exposed by JSON evidence", async () => {
  const evidence = await analyzeRepository("fixtures/sample-repo", { fixture: true });
  evidence.git.changedFiles = [
    "deleted.txt",
    "new-name.txt",
    "old-name.txt",
    "untracked.txt"
  ];

  const markdown = renderDossier(evidence);
  const json = JSON.parse(JSON.stringify(evidence));

  assert.deepEqual(json.git.changedFiles, evidence.git.changedFiles);
  for (const file of json.git.changedFiles) {
    assert.match(markdown, new RegExp(`^  - ${file}$`, "m"));
  }
});
