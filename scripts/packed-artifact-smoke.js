import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const temporaryRoot = await mkdtemp(path.join(tmpdir(), "release-dossier-pack-"));

async function run(command, args, cwd) {
  return execFileAsync(command, args, { cwd, env: process.env });
}

try {
  const packDirectory = path.join(temporaryRoot, "pack");
  const consumerDirectory = path.join(temporaryRoot, "consumer");
  await mkdir(packDirectory);
  await mkdir(consumerDirectory);

  const { stdout } = await run(
    "npm",
    ["pack", "--json", "--pack-destination", packDirectory],
    process.cwd()
  );
  const [{ filename }] = JSON.parse(stdout);
  const tarball = path.join(packDirectory, filename);

  await run("npm", ["init", "--yes"], consumerDirectory);
  await run("npm", ["install", "--ignore-scripts", tarball], consumerDirectory);

  const packageDirectory = path.join(
    consumerDirectory,
    "node_modules",
    "repo-release-dossier-skill"
  );
  const cli = path.join(
    consumerDirectory,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "repo-release-dossier.cmd" : "repo-release-dossier"
  );
  const fixture = path.join(packageDirectory, "fixtures", "sample-repo");
  const { stdout: cliOutput } = await run(
    cli,
    ["--repo", fixture, "--fixture", "--json"],
    consumerDirectory
  );
  const evidence = JSON.parse(cliOutput);
  if (evidence.classification !== "ship") {
    throw new Error("Installed CLI did not classify the packaged fixture as ready to ship.");
  }

  await run("bash", ["scripts/validate.sh"], packageDirectory);
  await readFile(path.join(packageDirectory, "test", "cli.test.js"), "utf8");
  console.log("packed artifact smoke ok");
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
