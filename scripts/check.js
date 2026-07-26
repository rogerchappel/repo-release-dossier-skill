import { access } from "node:fs/promises";
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
