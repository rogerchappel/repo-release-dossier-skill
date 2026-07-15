import { access, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

export async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readJson(filePath, fallback = null) {
  if (!(await exists(filePath))) return fallback;
  return JSON.parse(await readFile(filePath, "utf8"));
}

export async function listFiles(root, options = {}) {
  const { maxDepth = 4, ignore = new Set([".git", "node_modules", "dist", "coverage"]) } = options;
  const files = [];

  async function visit(dir, depth) {
    if (depth > maxDepth) return;
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (ignore.has(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await visit(fullPath, depth + 1);
      } else if (entry.isFile()) {
        files.push(path.relative(root, fullPath));
      }
    }
  }

  await visit(root, 0);
  return files.sort();
}

export async function fileSize(filePath) {
  try {
    const info = await stat(filePath);
    return info.size;
  } catch {
    return 0;
  }
}
