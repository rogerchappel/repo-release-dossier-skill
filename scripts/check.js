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
if (!rendered.includes("## Release Candidate Notes")) {
  throw new Error("Rendered dossier is missing release candidate notes.");
}

console.log("check ok");
