import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function git(repo, args) {
  try {
    const result = await execFileAsync("git", ["-C", repo, ...args], {
      timeout: 5000,
      maxBuffer: 1024 * 1024
    });
    return { ok: true, stdout: result.stdout.trimEnd(), stderr: result.stderr.trim() };
  } catch (error) {
    return {
      ok: false,
      stdout: error.stdout?.trimEnd() ?? "",
      stderr: error.stderr?.trim() || error.message
    };
  }
}

function dirtyPaths(porcelain) {
  if (!porcelain) return [];

  const entries = porcelain.split("\0");
  const paths = new Set();
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (!entry) continue;

    const status = entry.slice(0, 2);
    const file = entry.slice(3);
    if (file) paths.add(file);

    if (status.includes("R") || status.includes("C")) {
      const original = entries[++index];
      if (original) paths.add(original);
    }
  }
  return [...paths].sort();
}

export async function collectGitEvidence(repo, options = {}) {
  const inside = await git(repo, ["rev-parse", "--is-inside-work-tree"]);
  const topLevel = inside.ok ? await git(repo, ["rev-parse", "--show-toplevel"]) : { ok: false, stdout: "" };
  const fixtureWithoutOwnGit = options.fixture && topLevel.stdout && topLevel.stdout !== repo;
  if (fixtureWithoutOwnGit) {
    return {
      available: false,
      status: "",
      recentCommits: [],
      changedFiles: [],
      warnings: []
    };
  }

  if (!inside.ok && !options.fixture) {
    return { available: false, status: "unknown", recentCommits: [], changedFiles: [], warnings: [inside.stderr] };
  }

  const status = await git(repo, ["status", "--short"]);
  const porcelain = await git(repo, ["status", "--porcelain=v1", "-z"]);
  const commits = await git(repo, ["log", "--oneline", "-n", "8"]);

  return {
    available: inside.ok,
    status: status.ok ? status.stdout : "",
    recentCommits: commits.ok && commits.stdout ? commits.stdout.split("\n") : [],
    changedFiles: porcelain.ok ? dirtyPaths(porcelain.stdout) : [],
    warnings: [status, porcelain, commits].filter((item) => !item.ok).map((item) => item.stderr)
  };
}
