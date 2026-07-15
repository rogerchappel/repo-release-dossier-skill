# Orchestration

## Agent Flow

1. Inspect the target repo locally.
2. Run `repo-release-dossier --repo <path>`.
3. Review classification and warnings.
4. Add the dossier to the release-candidate PR body or attach it as an artifact.

## Safety

The tool is read-only. It should be safe to run in automation because it does
not mutate the target repository and does not call external services.

## Failure Handling

- If git metadata is unavailable, use `--fixture` only for tests and examples.
- If required docs are missing, classify as `incubate` or `hold`.
- If package scripts are missing, call out the absence of verification evidence.

## Integration Notes

Automation lanes can write CLI output to `release-dossier.md`, but the CLI does
not write unless `--out` is explicitly provided.
