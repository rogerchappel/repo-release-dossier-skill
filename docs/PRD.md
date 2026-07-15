# Product Requirements: Repo Release Dossier Skill

## Summary

Repo Release Dossier Skill helps agents assemble release-candidate evidence from
a local repository into a concise markdown dossier.

## Users

- Agents preparing release-candidate PRs.
- Maintainers reviewing whether a small OSS repo is ready to ship.
- Automation lanes that need consistent release-readiness summaries.

## Problem

Release-candidate PRs often omit exact verification, documentation status,
working-tree state, or known risks. Agents need a repeatable way to surface
those facts while leaving final judgment to maintainers.

## MVP Scope

- Inspect git status, recent commits, changed files, package scripts, and docs.
- Generate markdown and JSON output.
- Provide fixture mode for tests.
- Include read-only safety boundaries.
- Ship with tests, smoke command, and release-candidate notes.

## Non-Goals

- No publishing, tagging, merging, or pushing.
- No hosted service.
- No automated maintainer approval decisions.

## Success Criteria

- A caller can run one CLI command and receive a useful release dossier.
- Tests run without network access.
- The generated markdown includes verification, docs, risks, and release notes.
