import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const documentedCommand = "npm exec -- repo-release-dossier --repo .";

for (const file of ["README.md", "SKILL.md"]) {
  const contents = await readFile(file, "utf8");
  if (!contents.includes(documentedCommand)) {
    throw new Error(`${file} must include the tested source-checkout command.`);
  }
  if (contents.includes("npx repo-release-dossier-skill")) {
    throw new Error(`${file} still recommends an unavailable public-registry command.`);
  }
}

const { stdout } = await execFileAsync(
  "npm",
  ["exec", "--", "repo-release-dossier", "--repo", "."],
  { cwd: process.cwd(), env: process.env, timeout: 10_000 }
);

if (!stdout.includes("# Release Dossier: repo-release-dossier-skill")) {
  throw new Error("The documented command did not produce a dossier for this checkout.");
}
if (/timed out|Verification failed: npm run smoke:docs/.test(stdout)) {
  throw new Error("The documented command recursively executed its active documentation smoke.");
}

console.log("documented usage smoke ok");
