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

## 2026-07-25 Exported-Tree Verification

- `npm test` passed: 7 tests, 0 failures, including a fixture outside any Git worktree.
- `npm run check` passed: required docs and render sections present.
- `npm run smoke` passed: fixture JSON dossier classified as `ship` with no Git warnings.
- `bash scripts/validate.sh` passed from a clean `git archive` export.

## Known Limits

- JavaScript package metadata is supported first.
- Fixtures without their own Git metadata intentionally report Git as unavailable.
- The readiness score is advisory and should not replace maintainer review.
