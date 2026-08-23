import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { collectPackageEvidence } from "../src/package-inspector.js";

async function inspectScripts(scripts, options = { executeVerification: false }) {
  const repo = await mkdtemp(path.join(os.tmpdir(), "dossier-package-"));
  await writeFile(path.join(repo, "package.json"), JSON.stringify({ name: "fixture", scripts }));
  return collectPackageEvidence(repo, options);
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
  assert.equal(evidence.verificationResults.every((result) => result.status === "skipped"), true);
  assert.equal(evidence.warnings.every((warning) => warning.includes("Verification skipped")), true);
});

test("records successful verification execution", async () => {
  const evidence = await inspectScripts({ test: "node -e \"process.exit(0)\"" }, {});

  assert.deepEqual(evidence.verificationResults, [
    { script: "test", status: "passed", command: "npm run test" }
  ]);
  assert.deepEqual(evidence.warnings, []);
});

test("skips execution inside an active dossier verification command", async () => {
  const evidence = await inspectScripts(
    { test: "node -e \"process.exit(0)\"", "smoke:docs": "npm exec -- repo-release-dossier --repo ." },
    { environment: { REPO_RELEASE_DOSSIER_VERIFY_ACTIVE: "1" } }
  );

  assert.deepEqual(evidence.verificationResults, [
    { script: "test", status: "skipped", reason: "nested dossier verification" },
    { script: "smoke:docs", status: "skipped", reason: "nested dossier verification" }
  ]);
  assert.equal(evidence.warnings.every((warning) => warning.includes("nested dossier verification")), true);
});

test("records nonzero verification execution as a failure", async () => {
  const evidence = await inspectScripts({ test: "node -e \"process.exit(7)\"" }, {});

  assert.equal(evidence.verificationResults[0].status, "failed");
  assert.equal(evidence.verificationResults[0].exitCode, 7);
  assert.match(evidence.warnings[0], /Verification failed: npm run test \(exit 7\)/);
});

test("records verification as unavailable when npm cannot be started", async () => {
  const evidence = await inspectScripts(
    { test: "node --test", check: "node check.js" },
    { npmCommand: "definitely-not-an-npm-executable" }
  );

  assert.deepEqual(evidence.verificationResults.map(({ script, status }) => ({ script, status })), [
    { script: "test", status: "unavailable" },
    { script: "check", status: "unavailable" }
  ]);
  assert.equal(evidence.warnings.length, 2);
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
