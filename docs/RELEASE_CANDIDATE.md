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

## Known Limits

- JavaScript package metadata is supported first.
- Git evidence is best-effort in fixture mode.
- The readiness score is advisory and should not replace maintainer review.
