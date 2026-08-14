# Repo Release Dossier Skill

Use this skill when an agent needs to assemble release-candidate evidence from
a local repository before asking a maintainer to ship. It is designed for small
OSS repositories, agent-skill packages, and automation lanes that need a concise
readiness summary.

## Required Inputs

- A local repository path.
- Read access to git metadata when available.
- Optional fixture mode for tests or non-git sample projects.

## Tools

This package is not currently published to the public npm registry. Run the CLI
from a source checkout:

```bash
git clone https://github.com/rogerchappel/repo-release-dossier-skill.git
cd repo-release-dossier-skill
npm install
npm exec -- repo-release-dossier --repo .
```

During local development in this repo:

```bash
node bin/repo-release-dossier.js --repo fixtures/sample-repo --fixture
```

## Side-Effect Boundaries

This skill is read-only unless the caller supplies `--out`. It may inspect
files, package scripts, git status, and recent commits. Verification scripts run
serially in a disposable copy, with a 30-second timeout per command and a
10-command limit, so their side effects do not modify the target. With `--out`,
it writes only the requested dossier; an output inside the inspected repository
is intentionally absent from that run's already-collected Git evidence and is
visible on the next run.
It must not push, merge, tag, publish packages, change branch protection, edit
other repository files, or write to external systems.

## Approval Requirements

No approval is needed for local inspection. Ask the maintainer before using the
generated dossier to open or update a PR, and ask explicit approval before any
external action that is outside this skill.

## Workflow

1. Run the CLI against the target repository.
2. Review pass, warning, and fail sections.
3. Copy exact verification commands and unresolved warnings into the release
   candidate PR body.
4. If classification is `hold`, stop and fix the missing evidence first.

## Validation

Run:

```bash
npm test
npm run check
npm run smoke
npm run smoke:docs
```

The fixture-backed tests verify package script detection and successful,
failing, unavailable, and skipped execution states, required docs checks,
classification, and markdown rendering. Detected commands and actual execution
results are separate JSON fields; only successful execution renders as `PASS`,
while every other state warns, lowers readiness, and prevents `ship`.
