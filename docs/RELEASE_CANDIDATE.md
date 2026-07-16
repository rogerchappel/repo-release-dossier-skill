# Release Candidate Notes

## Classification

Ship after public repo setup, branch protection, and release-candidate PR review.

## Verification Commands

```bash
npm test
npm run check
npm run smoke
bash scripts/validate.sh
```

## 2026-07-16 Verification

- `npm test` passed: 3 tests, 0 failures.
- `npm run check` passed: required docs and render sections present.
- `npm run smoke` passed: fixture JSON dossier classified as `ship`.
- `bash scripts/validate.sh` passed: test, check, and smoke suite completed.

## Known Limits

- JavaScript package metadata is supported first.
- Git evidence is best-effort in fixture mode.
- The readiness score is advisory and should not replace maintainer review.
