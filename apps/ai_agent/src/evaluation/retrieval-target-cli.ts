// R3 CLI: freeze the serving corpus artifact before any measurement.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";

import { defaultRunbookDirectory } from "../paths.ts";
import { loadRunbooks } from "../tools/search-runbooks.ts";
import { canonicalSections, corpusHash } from "./retrieval-target.ts";

const source = "docs/AI/runbooks";

export async function freezeTargetCorpus(
  outPath: string,
): Promise<{ corpusHash: string; sections: number }> {
  const index = await loadRunbooks(defaultRunbookDirectory());
  const sections = canonicalSections(index);
  const hash = corpusHash(sections);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(
    outPath,
    JSON.stringify({ version: 1, source, corpusHash: hash, sections }, null, 2) +
      "\n",
    { flag: "wx" },
  );
  return { corpusHash: hash, sections: sections.length };
}

async function main() {
  const { values } = parseArgs({
    options: { "freeze-corpus": { type: "string" } },
    strict: true,
  });
  if (!values["freeze-corpus"]) {
    throw new Error("Usage: --freeze-corpus <path>");
  }
  const { corpusHash: hash, sections } = await freezeTargetCorpus(
    resolve(values["freeze-corpus"]),
  );
  console.log(`${sections} sections`);
  console.log(hash);
}

if (import.meta.main) await main();
