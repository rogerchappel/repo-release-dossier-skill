#!/usr/bin/env bash
set -euo pipefail

npm install --ignore-scripts
npm test
npm run check
npm run smoke
npm run smoke:docs
node scripts/packed-artifact-smoke.js
