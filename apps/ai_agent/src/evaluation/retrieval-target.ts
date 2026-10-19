// R3 target-recovery measurement: the frozen serving corpus and its drift check.
// Nothing may be measured before this boundary passes; a runbook edit must fail
// closed instead of silently changing a score.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import type { RunbookIndex } from "../tools/search-runbooks.ts";

export type FrozenSection = Omit<
  RunbookIndex[number],
  "headingTerms" | "contentTerms"
>;

export type FrozenCorpus = {
  version: 1;
  source: string;
  corpusHash: string;
  sections: FrozenSection[];
};

export const corpusHash = (sections: readonly FrozenSection[]) =>
  createHash("sha256").update(JSON.stringify(sections)).digest("hex");

export function canonicalSections(index: RunbookIndex): FrozenSection[] {
  return index.map(({ headingTerms, contentTerms, ...section }) => section);
}

export async function loadFrozenCorpus(path: string): Promise<FrozenCorpus> {
  const parsed = JSON.parse(await readFile(path, "utf8")) as FrozenCorpus;
  if (parsed.version !== 1 || !Array.isArray(parsed.sections)) {
    throw new Error("Frozen corpus artifact is not readable");
  }
  if (parsed.corpusHash !== corpusHash(parsed.sections)) {
    throw new Error("Frozen corpus artifact hash does not match its sections");
  }
  return parsed;
}

export function verifyTargetCorpus(
  index: RunbookIndex,
  frozen: FrozenCorpus,
): void {
  const sections = canonicalSections(index);
  const actualHash = corpusHash(sections);
  if (
    actualHash !== frozen.corpusHash ||
    JSON.stringify(sections) !== JSON.stringify(frozen.sections)
  ) {
    throw new Error("Target corpus changed; create a new protocol");
  }
}
