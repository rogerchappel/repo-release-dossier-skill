# Repo Release Dossier Skill

Build a concise release-candidate dossier from a local repository. The CLI
collects git evidence, verification scripts, required docs, warnings, and
release notes. It is read-only unless an output path is explicitly requested.

## Quickstart

This package is not currently published to the public npm registry. Run it from
a source checkout instead:

```bash
git clone https://github.com/rogerchappel/repo-release-dossier-skill.git
cd repo-release-dossier-skill
npm install
npm exec -- repo-release-dossier --repo .
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
use the same `git.changedFiles` list. Any dirty path adds an unresolved warning,
prevents a `ship` classification, and prevents the Markdown summary from
reporting `PASS`.

The CLI collects evidence and renders the complete dossier before changing the
path supplied to `--out`. It then writes a temporary artifact in the output
directory and atomically replaces the destination. Analysis, rendering, or
write failures preserve any existing destination, and temporary artifacts are
removed. Consequently, an output created inside the inspected repository is
not part of that run's Git evidence; it appears in the next run. The
`sideEffects` field still names the written artifact.

`--fixture` treats a target without its own Git worktree as intentionally clean
so checked-in examples remain deterministic. If the fixture path is itself a
Git worktree, its real status is inspected and dirty paths still block `ship`.

## Safety

This tool is read-only by default. It does not tag, publish, merge, push, or call
external services. The `--out` option writes only the generated dossier path
chosen by the caller, and the dossier discloses that side effect. Replacement
is atomic, so a failed run does not truncate a previously generated dossier.

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
npm run smoke:docs
bash scripts/validate.sh
```

These commands are included in a source checkout and in the npm tarball created
from it. Maintainers additionally verify the installed tarball, including its
CLI and the complete validation command above, with:

```bash
node scripts/packed-artifact-smoke.js
```

That packaging smoke test is intended for a source checkout because it creates
and installs a fresh tarball of the current tree.

Verification evidence comes from non-empty string-valued `test`, `check`,
`build`, `lint`, `smoke`, `verify`, and `typecheck` scripts (including their
namespaced variants, such as `check:types`). The default npm failing test
placeholder (`echo "Error: no test specified" && exit 1`), blank values, and
non-string values are warnings rather than usable release evidence.

## Limitations

- Package script detection currently targets `package.json`.
- Git failures are reported as warnings rather than fatal errors.
- The classification is advisory and should be reviewed by a maintainer.
