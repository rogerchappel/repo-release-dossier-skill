import { readFile } from "node:fs/promises";

const workflow = await readFile(".github/workflows/ci.yml", "utf8");
if (!workflow.includes("- run: npm ci")) {
  throw new Error("CI must install dependencies with npm ci.");
}
if (/\bnpm install\b/.test(workflow)) {
  throw new Error("CI must not use an unfrozen npm install.");
}

const lockfile = JSON.parse(await readFile("package-lock.json", "utf8"));
if (lockfile.name !== "repo-release-dossier-skill" || lockfile.lockfileVersion !== 3) {
  throw new Error("package-lock.json must be the npm lockfile for this package.");
}

console.log("CI install contract ok");
