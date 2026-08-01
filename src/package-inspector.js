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

  const scripts = isScriptMap(pkg.scripts) ? pkg.scripts : {};
  const candidates = Object.entries(scripts).filter(([name]) =>
    /^(test|check|build|lint|smoke|verify|typecheck)(:|$)/.test(name)
  );
  const placeholderScripts = candidates.filter(([, body]) => isNpmNoTestPlaceholder(body));
  const unusableScripts = candidates.filter(
    ([, body]) => !isUsableScript(body) && !isNpmNoTestPlaceholder(body)
  );
  const verificationScripts = candidates
    .filter(([, body]) => isUsableScript(body) && !isNpmNoTestPlaceholder(body))
    .map(([name]) => name);
  const warnings = [];

  if (pkg.scripts != null && !isScriptMap(pkg.scripts)) {
    warnings.push("The package.json scripts field is malformed; expected an object.");
  }
  if (placeholderScripts.length) {
    warnings.push(`Ignored npm no-test placeholder scripts: ${names(placeholderScripts)}.`);
  }
  if (unusableScripts.length) {
    warnings.push(`Ignored blank or non-string verification scripts: ${names(unusableScripts)}.`);
  }
  if (!verificationScripts.length) {
    warnings.push("No usable verification scripts found in package.json.");
  }

  return {
    manager: "npm",
    name: pkg.name ?? path.basename(repo),
    version: pkg.version ?? "0.0.0",
    scripts,
    verificationScripts,
    warnings
  };
}

function isScriptMap(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isUsableScript(body) {
  return typeof body === "string" && body.trim().length > 0;
}

function isNpmNoTestPlaceholder(body) {
  if (typeof body !== "string") return false;
  return /^echo\s+(["'])Error:\s*no test specified\1\s*&&\s*exit\s+1\s*$/i.test(body.trim());
}

function names(entries) {
  return entries.map(([name]) => name).join(", ");
}
