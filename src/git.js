import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function git(repo, args) {
  try {
    const result = await execFileAsync("git", ["-C", repo, ...args], {
      timeout: 5000,
      maxBuffer: 1024 * 1024
    });
    return { ok: true, stdout: result.stdout.trim(), stderr: result.stderr.trim() };
  } catch (error) {
    return {
      ok: false,
      stdout: error.stdout?.trim() ?? "",
      stderr: error.stderr?.trim() || error.message
    };
  }
}

export async function collectGitEvidence(repo, options = {}) {
  const inside = await git(repo, ["rev-parse", "--is-inside-work-tree"]);
  if (!inside.ok && !options.fixture) {
    return { available: false, status: "unknown", recentCommits: [], changedFiles: [], warnings: [inside.stderr] };
  }

  const status = await git(repo, ["status", "--short"]);
  const commits = await git(repo, ["log", "--oneline", "-n", "8"]);
  const changed = await git(repo, ["diff", "--name-only", "HEAD"]);

  return {
    available: inside.ok,
    status: status.ok ? status.stdout : "",
    recentCommits: commits.ok && commits.stdout ? commits.stdout.split("\n") : [],
    changedFiles: changed.ok && changed.stdout ? changed.stdout.split("\n") : [],
    warnings: [status, commits, changed].filter((item) => !item.ok).map((item) => item.stderr)
  };
}
