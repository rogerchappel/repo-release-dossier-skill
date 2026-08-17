import path from "node:path";
import { collectDocsEvidence } from "./docs.js";
import { collectGitEvidence } from "./git.js";
import { collectPackageEvidence } from "./package-inspector.js";

export async function analyzeRepository(repoPath, options = {}) {
  const repo = path.resolve(repoPath);
  const [git, pkg, docs] = await Promise.all([
    collectGitEvidence(repo, options),
    collectPackageEvidence(repo, options),
    collectDocsEvidence(repo)
  ]);

  const warnings = [...git.warnings, ...pkg.warnings, ...docs.warnings].filter(Boolean);
  const score = computeScore({ git, pkg, docs, warnings });

  return {
    repo,
    generatedAt: new Date().toISOString(),
    score,
    classification: classify(score, warnings),
    git,
    package: pkg,
    docs,
    warnings,
    sideEffects: "read-only"
  };
}

function computeScore({ git, pkg, docs, warnings }) {
  let score = 100;
  if (!git.available) score -= 10;
  if (git.status) score -= 10;
  if (!pkg.verificationScripts.length) score -= 25;
  score -= pkg.verificationResults.filter((result) => result.status === "failed").length * 25;
  score -= pkg.verificationResults.filter((result) => result.status === "unavailable").length * 15;
  score -= pkg.verificationResults.filter((result) => result.status === "skipped").length * 10;
  score -= docs.warnings.length * 10;
  score -= warnings.filter((warning) => /missing|No /.test(warning)).length * 5;
  return Math.max(0, score);
}

function classify(score, warnings) {
  if (score >= 85 && warnings.length === 0) return "ship";
  if (score >= 60) return "incubate";
  return "hold";
}
