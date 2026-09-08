import { readFile } from "node:fs/promises";

const workflow = await readFile(".github/workflows/ci.yml", "utf8");
if (!workflow.includes("- run: npm ci")) {
  throw new Error("CI must install dependencies with npm ci.");
}
if (/\bnpm install\b/.test(workflow)) {
  throw new Error("CI must not use an unfrozen npm install.");
}
if (!/node-version:\s*\[22, 24\]/.test(workflow)) {
  throw new Error("CI must test the supported Node.js 22 minimum and Node.js 24 LTS.");
}
if (!/node-version:\s*\$\{\{\s*matrix\.node-version\s*\}\}/.test(workflow)) {
  throw new Error("CI setup-node must use every configured matrix entry.");
}

const lockfile = JSON.parse(await readFile("package-lock.json", "utf8"));
if (lockfile.name !== "repo-release-dossier-skill" || lockfile.lockfileVersion !== 3) {
  throw new Error("package-lock.json must be the npm lockfile for this package.");
}
if (lockfile.packages?.[""]?.engines?.node !== ">=22") {
  throw new Error("package-lock.json must require the supported Node.js 22 minimum.");
}

console.log("CI install contract ok");
