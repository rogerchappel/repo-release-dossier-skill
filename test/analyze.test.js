import test from "node:test";
import assert from "node:assert/strict";
import { analyzeRepository } from "../src/analyze.js";

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
