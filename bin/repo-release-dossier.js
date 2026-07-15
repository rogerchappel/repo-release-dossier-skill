#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { analyzeRepository } from "../src/analyze.js";
import { renderDossier } from "../src/render.js";

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
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--repo") {
      args.repo = argv[++i];
    } else if (arg === "--out") {
      args.out = argv[++i];
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--fixture") {
      args.fixture = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
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
  const output = args.json ? `${JSON.stringify(evidence, null, 2)}\n` : renderDossier(evidence);

  if (args.out) {
    await writeFile(args.out, output, "utf8");
  } else {
    process.stdout.write(output);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
