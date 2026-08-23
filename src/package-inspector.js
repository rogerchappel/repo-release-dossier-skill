import path from "node:path";
import { execFile } from "node:child_process";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { readJson } from "./fs-utils.js";

const execFileAsync = promisify(execFile);
const MAX_SCRIPTS = 10;
const SCRIPT_TIMEOUT_MS = 30_000;
const ACTIVE_VERIFICATION_ENV = "REPO_RELEASE_DOSSIER_VERIFY_ACTIVE";

export async function collectPackageEvidence(repo, options = {}) {
  const pkg = await readJson(path.join(repo, "package.json"));
  if (!pkg) {
    return {
      manager: "unknown",
      scripts: {},
      verificationScripts: [],
      verificationResults: [],
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

  const verificationResults = await runVerificationScripts(repo, verificationScripts, options);
  for (const result of verificationResults) {
    if (result.status === "failed") {
      warnings.push(`Verification failed: npm run ${result.script} (exit ${result.exitCode}).${detail(result)}`);
    } else if (result.status === "unavailable") {
      warnings.push(`Verification unavailable: npm run ${result.script}.${detail(result)}`);
    } else if (result.status === "skipped") {
      warnings.push(`Verification skipped: npm run ${result.script} (${result.reason}).`);
    }
  }

  return {
    manager: "npm",
    name: pkg.name ?? path.basename(repo),
    version: pkg.version ?? "0.0.0",
    scripts,
    verificationScripts,
    verificationResults,
    warnings
  };
}

async function runVerificationScripts(repo, scripts, options) {
  if (!scripts.length) return [];
  if (options.executeVerification === false) {
    return scripts.map((script) => ({ script, status: "skipped", reason: "execution disabled" }));
  }
  const environment = options.environment ?? process.env;
  if (environment[ACTIVE_VERIFICATION_ENV] === "1") {
    return scripts.map((script) => ({ script, status: "skipped", reason: "nested dossier verification" }));
  }

  const sandbox = await mkdtemp(path.join(tmpdir(), "release-dossier-verify-"));
  const copy = path.join(sandbox, "repo");
  const results = [];
  try {
    await cp(repo, copy, { recursive: true, filter: (source) => path.basename(source) !== ".git" });
    for (const [index, script] of scripts.entries()) {
      if (index >= MAX_SCRIPTS) {
        results.push({ script, status: "skipped", reason: `limit of ${MAX_SCRIPTS} commands reached` });
        continue;
      }
      try {
        await execFileAsync(options.npmCommand ?? "npm", ["run", script], {
          cwd: copy,
          env: { ...environment, CI: "true", [ACTIVE_VERIFICATION_ENV]: "1" },
          timeout: SCRIPT_TIMEOUT_MS,
          maxBuffer: 1024 * 1024
        });
        results.push({ script, status: "passed", command: `npm run ${script}` });
      } catch (error) {
        const message = outputDetail(error);
        if (error.code === "ENOENT") {
          results.push({ script, status: "unavailable", reason: "npm executable not found", detail: message });
          for (const remaining of scripts.slice(index + 1)) {
            results.push({ script: remaining, status: "unavailable", reason: "npm executable not found" });
          }
          break;
        }
        const reason = error.killed ? `timed out after ${SCRIPT_TIMEOUT_MS}ms` : "command exited nonzero";
        results.push({ script, status: "failed", exitCode: error.code ?? null, reason, detail: message });
      }
    }
  } finally {
    await rm(sandbox, { recursive: true, force: true });
  }
  return results;
}

function outputDetail(error) {
  const output = `${error.stderr ?? ""}\n${error.stdout ?? ""}`.trim();
  return output ? output.slice(-500) : error.message;
}

function detail(result) {
  const value = result.detail || result.reason;
  return value ? ` ${value.replace(/\s+/g, " ")}` : "";
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
