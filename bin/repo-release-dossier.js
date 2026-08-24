#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { analyzeRepository } from "../src/analyze.js";
import { renderDossier } from "../src/render.js";

class UsageError extends Error {}

function usage() {
  return `Usage: repo-release-dossier --repo <path> [--out <file>] [--json] [--fixture]

Options:
  --repo <path>   Repository path to inspect.
  --out <file>    Write markdown dossier to a file.
  --json          Print JSON evidence instead of markdown.
  --fixture       Treat missing git metadata as fixture mode.
  --help          Show this help.`;
}

function parseArgs(argv) {
  const args = { repo: process.cwd(), out: "", json: false, fixture: false };
  const seen = new Set();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const option = arg === "-h" ? "--help" : arg;
    if (["--help", "--repo", "--out", "--json", "--fixture"].includes(option)) {
      if (seen.has(option)) {
        throw new UsageError(`${option} may only be specified once.`);
      }
      seen.add(option);
    }
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--repo") {
      if (!argv[i + 1] || argv[i + 1].startsWith("--")) {
        throw new UsageError("--repo requires a value.");
      }
      args.repo = argv[++i];
    } else if (arg === "--out") {
      if (!argv[i + 1] || argv[i + 1].startsWith("--")) {
        throw new UsageError("--out requires a value.");
      }
      args.out = argv[++i];
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--fixture") {
      args.fixture = true;
    } else {
      throw new UsageError(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const evidence = await analyzeRepository(args.repo, { fixture: args.fixture });
  if (args.out) {
    evidence.sideEffects = describeOutput(args.repo, args.out);
    const output = args.json ? `${JSON.stringify(evidence, null, 2)}\n` : renderDossier(evidence);
    await replaceFileAtomically(args.out, output);
  } else {
    const output = args.json ? `${JSON.stringify(evidence, null, 2)}\n` : renderDossier(evidence);
    process.stdout.write(output);
  }
}

async function replaceFileAtomically(outputPath, contents) {
  const directory = path.dirname(outputPath);
  const temporaryPath = path.join(
    directory,
    `.${path.basename(outputPath)}.${process.pid}.${randomUUID()}.tmp`
  );
  let replaced = false;

  try {
    await writeFile(temporaryPath, contents, { encoding: "utf8", flag: "wx" });
    await rename(temporaryPath, outputPath);
    replaced = true;
  } finally {
    if (!replaced) {
      await unlink(temporaryPath).catch((error) => {
        if (error.code !== "ENOENT") {
          throw error;
        }
      });
    }
  }
}

function describeOutput(repoPath, outputPath) {
  const repo = path.resolve(repoPath);
  const output = path.resolve(outputPath);
  const relative = path.relative(repo, output);
  const artifact = relative && !relative.startsWith(`..${path.sep}`) && relative !== ".."
    ? relative
    : output;
  return `wrote output artifact ${artifact}`;
}

main().catch((error) => {
  if (error instanceof UsageError) {
    console.error(`Error: ${error.message}\n\n${usage()}`);
  } else {
    console.error(error.message);
  }
  process.exitCode = 1;
});
