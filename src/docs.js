import path from "node:path";
import { exists, fileSize, listFiles } from "./fs-utils.js";

const REQUIRED_DOCS = ["README.md", "SKILL.md", "docs/PRD.md", "docs/TASKS.md", "docs/ORCHESTRATION.md"];

export async function collectDocsEvidence(repo) {
  const files = await listFiles(repo, { maxDepth: 3 });
  const required = [];
  for (const doc of REQUIRED_DOCS) {
    const fullPath = path.join(repo, doc);
    required.push({
      path: doc,
      present: await exists(fullPath),
      bytes: await fileSize(fullPath)
    });
  }

  return {
    required,
    markdownFiles: files.filter((file) => file.endsWith(".md")),
    warnings: required.filter((doc) => !doc.present || doc.bytes < 120).map((doc) => `${doc.path} missing or thin.`)
  };
}
