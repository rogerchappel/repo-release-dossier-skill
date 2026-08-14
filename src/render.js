export function renderDossier(evidence) {
  const lines = [
    `# Release Dossier: ${evidence.package.name ?? "repository"}`,
    "",
    `Generated: ${evidence.generatedAt}`,
    `Repository: ${evidence.repo}`,
    `Classification: ${evidence.classification}`,
    `Readiness score: ${evidence.score}/100`,
    `Side effects: ${evidence.sideEffects}`,
    "",
    "## Summary",
    "",
    summaryLine(evidence),
    "",
    "## Verification",
    "",
    ...renderVerification(evidence.package.verificationScripts, evidence.package.verificationResults),
    "",
    "## Git Evidence",
    "",
    ...renderGit(evidence.git),
    "",
    "## Documentation",
    "",
    ...renderDocs(evidence.docs.required),
    "",
    "## Risks And Warnings",
    "",
    ...renderWarnings(evidence.warnings),
    "",
    "## Release Candidate Notes",
    "",
    ...renderReleaseNotes(evidence)
  ];

  return `${lines.join("\n")}\n`;
}

function summaryLine(evidence) {
  if (evidence.classification === "ship") {
    return "PASS: required docs and verification evidence are present with no open warnings.";
  }
  if (evidence.classification === "incubate") {
    return "WARN: usable release evidence exists, but at least one readiness gap needs maintainer review.";
  }
  return "FAIL: release evidence is incomplete; hold the release candidate until gaps are closed.";
}

function renderVerification(scripts, results = []) {
  if (!scripts.length) return ["- FAIL: no verification scripts were detected."];
  const byScript = new Map(results.map((result) => [result.script, result]));
  return scripts.map((script) => {
    const result = byScript.get(script);
    if (!result) return `- WARN: npm run ${script} (detected; not executed)`;
    if (result.status === "passed") return `- PASS: npm run ${script} (executed successfully)`;
    if (result.status === "failed") return `- FAIL: npm run ${script} (${result.reason}; exit ${result.exitCode})`;
    return `- WARN: npm run ${script} (${result.status}: ${result.reason})`;
  });
}

function renderGit(git) {
  const lines = [];
  lines.push(`- Git metadata: ${git.available ? "PASS" : "WARN fixture/unavailable"}`);
  lines.push(`- Working tree: ${git.status ? "WARN dirty" : "PASS clean or fixture"}`);
  if (git.changedFiles.length) {
    lines.push("- Changed files:");
    lines.push(...git.changedFiles.map((file) => `  - ${file}`));
  }
  if (git.recentCommits.length) {
    lines.push("- Recent commits:");
    lines.push(...git.recentCommits.map((commit) => `  - ${commit}`));
  }
  return lines;
}

function renderDocs(required) {
  return required.map((doc) => {
    const status = doc.present && doc.bytes >= 120 ? "PASS" : "WARN";
    return `- ${status}: ${doc.path} (${doc.bytes} bytes)`;
  });
}

function renderWarnings(warnings) {
  if (!warnings.length) return ["- PASS: no warnings detected."];
  return warnings.map((warning) => `- WARN: ${warning}`);
}

function renderReleaseNotes(evidence) {
  return [
    `- Recommended classification: ${evidence.classification}`,
    "- Do not tag, publish, merge, or push from this skill.",
    "- Copy verification commands and unresolved warnings into the release-candidate PR body."
  ];
}
