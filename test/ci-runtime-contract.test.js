import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("CI covers the supported Node.js minimum and current LTS", async (t) => {
  const root = new URL("../", import.meta.url);
  let workflow;
  try {
    workflow = await readFile(new URL(".github/workflows/ci.yml", root), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      t.skip("workflow source is intentionally absent from the packed artifact");
      return;
    }
    throw error;
  }
  const packageJson = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
  const lockfile = JSON.parse(await readFile(new URL("package-lock.json", root), "utf8"));

  assert.equal(packageJson.engines.node, ">=22");
  assert.equal(lockfile.packages[""].engines.node, ">=22");
  assert.match(workflow, /node-version:\s*\[22, 24\]/);
  assert.match(workflow, /node-version:\s*\$\{\{\s*matrix\.node-version\s*\}\}/);
  assert.doesNotMatch(workflow, /node-version:\s*(?:20|\[20\])/);
});
