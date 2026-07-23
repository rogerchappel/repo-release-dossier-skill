# Repo Release Dossier Skill

Build a concise release-candidate dossier from a local repository. The CLI
collects git evidence, verification scripts, required docs, warnings, and
release notes without mutating the target repo.

## Quickstart

```bash
npm install
npm run smoke
node bin/repo-release-dossier.js --repo . --out release-dossier.md
```

## CLI

```bash
repo-release-dossier --repo <path> [--out release-dossier.md] [--json] [--fixture]
```

## Output

The markdown dossier includes:

- readiness classification and score
- verification commands detected from package scripts
- git status, every dirty path, and recent commits
- required documentation status
- unresolved risks and release-candidate notes

Dirty paths come from Git porcelain status, so the changed-file list includes
untracked, staged, unstaged, renamed, copied, and deleted paths. For renames and
copies, both the original and destination paths are reported. Markdown and JSON
use the same `git.changedFiles` list.

## Safety

This tool is read-only by default. It does not tag, publish, merge, push, or call
external services. The `--out` option writes only the generated dossier path
chosen by the caller.

## Examples

Inspect the current repo:

```bash
node bin/repo-release-dossier.js --repo .
```

Return machine-readable evidence:

```bash
node bin/repo-release-dossier.js --repo fixtures/sample-repo --fixture --json
```

## Validation

```bash
npm test
npm run check
npm run smoke
bash scripts/validate.sh
```

## Limitations

- Package script detection currently targets `package.json`.
- Git failures are reported as warnings rather than fatal errors.
- The classification is advisory and should be reviewed by a maintainer.
