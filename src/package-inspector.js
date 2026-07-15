import path from "node:path";
import { readJson } from "./fs-utils.js";

export async function collectPackageEvidence(repo) {
  const pkg = await readJson(path.join(repo, "package.json"));
  if (!pkg) {
    return {
      manager: "unknown",
      scripts: {},
      verificationScripts: [],
      warnings: ["No package.json found."]
    };
  }

  const scripts = pkg.scripts ?? {};
  const verificationScripts = Object.keys(scripts).filter((name) =>
    /^(test|check|build|lint|smoke|verify|typecheck)(:|$)/.test(name)
  );

  return {
    manager: "npm",
    name: pkg.name ?? path.basename(repo),
    version: pkg.version ?? "0.0.0",
    scripts,
    verificationScripts,
    warnings: verificationScripts.length ? [] : ["No verification scripts found in package.json."]
  };
}
