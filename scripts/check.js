import { access, readFile } from "node:fs/promises";
import { analyzeRepository } from "../src/analyze.js";
import { renderDossier } from "../src/render.js";

const requiredFiles = [
  "README.md",
  "SKILL.md",
  "docs/PRD.md",
  "docs/TASKS.md",
  "docs/ORCHESTRATION.md",
  "docs/RELEASE_CANDIDATE.md"
];

for (const file of requiredFiles) {
  await access(file);
}

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

const evidence = await analyzeRepository("fixtures/sample-repo", { fixture: true });
const rendered = renderDossier(evidence);
if (evidence.classification !== "ship" || evidence.warnings.length !== 0) {
  throw new Error("Clean fixture evidence should remain ready to ship.");
}
if (!rendered.includes("PASS: required docs and verification evidence are present")) {
  throw new Error("Clean fixture dossier should retain its PASS summary.");
}
if (!rendered.includes("## Release Candidate Notes")) {
  throw new Error("Rendered dossier is missing release candidate notes.");
}

console.log("check ok");
