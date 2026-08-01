import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { collectPackageEvidence } from "../src/package-inspector.js";

async function inspectScripts(scripts) {
  const repo = await mkdtemp(path.join(os.tmpdir(), "dossier-package-"));
  await writeFile(path.join(repo, "package.json"), JSON.stringify({ name: "fixture", scripts }));
  return collectPackageEvidence(repo);
}

test("retains legitimate verification script bodies", async () => {
  const evidence = await inspectScripts({
    test: "node --test",
    "check:types": "tsc --noEmit",
    build: "vite build",
    lint: "eslint .",
    smoke: "node smoke.js",
    verify: "node verify.js",
    typecheck: "tsc --noEmit",
    start: "node server.js"
  });

  assert.deepEqual(evidence.verificationScripts, [
    "test", "check:types", "build", "lint", "smoke", "verify", "typecheck"
  ]);
  assert.deepEqual(evidence.warnings, []);
});

test("rejects npm placeholders, blank bodies, and non-string bodies", async () => {
  const evidence = await inspectScripts({
    test: "echo \"Error: no test specified\" && exit 1",
    check: "   ",
    build: false,
    start: "node server.js"
  });

  assert.deepEqual(evidence.verificationScripts, []);
  assert.ok(evidence.warnings.includes("Ignored npm no-test placeholder scripts: test."));
  assert.ok(evidence.warnings.includes("Ignored blank or non-string verification scripts: check, build."));
  assert.ok(evidence.warnings.includes("No usable verification scripts found in package.json."));
});

test("warns about a malformed scripts field", async () => {
  const evidence = await inspectScripts(["node --test"]);

  assert.deepEqual(evidence.scripts, {});
  assert.ok(evidence.warnings.includes("The package.json scripts field is malformed; expected an object."));
  assert.ok(evidence.warnings.includes("No usable verification scripts found in package.json."));
});
