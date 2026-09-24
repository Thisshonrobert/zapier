import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const allowedFiles = [
  "transient-provider-failure.md",
  "credentials-and-destinations.md",
  "template-and-registry-validation.md",
  "uncertain-delivery.md",
  "replay-and-stale-cases.md",
  "evidence-gaps.md",
] as const;

const ignoredTerms = new Set([
  "a",
  "an",
  "and",
  "are",
  "for",
  "is",
  "of",
  "or",
  "the",
  "to",
  "with",
]);

const maximumQueryLength = 500;
const maximumDocumentBytes = 64 * 1_024;
const maximumSectionLength = 4_000;
const maximumSections = 64;
const maximumFilterValueLength = 64;
const maximumFilterLength = 256;

type RunbookMetadata = {
  id: string;
  version: string;
  simulated: true;
  status: "current" | "stale";
  owner: string;
  reviewed: string;
  taxonomy: string[];
  providers: string[];
  codeVersion: string;
};

type IndexedSection = RunbookMetadata & {
  citation: string;
  heading: string;
  content: string;
  contentHash: string;
  headingTerms: Set<string>;
  contentTerms: Set<string>;
};

export type RunbookIndex = ReadonlyArray<IndexedSection>;

export type RunbookSearchInput = {
  query: string;
  taxonomy?: readonly string[];
  providers?: readonly string[];
  limit?: number;
};

export type RunbookMatch = {
  runbookId: string;
  version: string;
  citation: string;
  heading: string;
  content: string;
  contentHash: string;
  taxonomy: readonly string[];
  providers: readonly string[];
  simulated: true;
  authority: "untrusted_procedural_guidance";
  canChangePolicy: false;
  score: number;
};

function terms(value: string): Set<string> {
  return new Set(
    (value.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
      (term) => !ignoredTerms.has(term),
    ),
  );
}

function commaSeparated(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function parseMetadata(block: string, filename: string): RunbookMetadata {
  const fields = new Map<string, string>();
  for (const line of block.split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator > 0) {
      fields.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
    }
  }

  const required = (name: string) => {
    const value = fields.get(name);
    if (!value) throw new Error(`${filename}: missing ${name} metadata`);
    return value;
  };
  const id = required("id");
  const version = required("version");
  const status = required("status");
  const reviewed = required("reviewed");
  const taxonomy = commaSeparated(required("taxonomy")).map((item) => item.toUpperCase());
  const providers = commaSeparated(required("providers"));

  if (!/^RB-[A-Z0-9-]+$/.test(id)) throw new Error(`${filename}: invalid id`);
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`${filename}: invalid version`);
  if (required("simulated") !== "true") throw new Error(`${filename}: runbook must be simulated`);
  if (status !== "current" && status !== "stale") throw new Error(`${filename}: invalid status`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reviewed)) throw new Error(`${filename}: invalid reviewed date`);
  if (taxonomy.length === 0 || taxonomy.some((item) => !/^F(?:0[1-9]|10)$/.test(item))) {
    throw new Error(`${filename}: invalid taxonomy`);
  }
  if (providers.length === 0 || providers.some((item) => !/^[a-z0-9-]+$/.test(item))) {
    throw new Error(`${filename}: invalid providers`);
  }

  return {
    id,
    version,
    simulated: true,
    status,
    owner: required("owner"),
    reviewed,
    taxonomy,
    providers,
    codeVersion: required("code_version"),
  };
}

function sectionId(heading: string): string {
  const value = heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!value) throw new Error("Runbook section heading has no usable citation id");
  return value;
}

function parseRunbook(source: string, filename: string): IndexedSection[] {
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!frontmatter?.[1]) throw new Error(`${filename}: missing frontmatter`);

  const metadata = parseMetadata(frontmatter[1], filename);
  if (metadata.status === "stale") return [];

  const body = source.slice(frontmatter[0].length);
  const headings = [...body.matchAll(/^## (.+)$/gm)];
  const sections: IndexedSection[] = [];
  const citations = new Set<string>();

  for (let index = 0; index < headings.length; index++) {
    const match = headings[index];
    const heading = match?.[1]?.trim();
    if (!match || !heading) continue;
    const start = (match.index ?? 0) + match[0].length;
    const end = headings[index + 1]?.index ?? body.length;
    const content = body.slice(start, end).trim();
    if (!content) continue;
    if (content.length > maximumSectionLength) {
      throw new Error(`${filename}: section ${JSON.stringify(heading)} is too long`);
    }

    const citation = `${metadata.id}@${metadata.version}#${sectionId(heading)}`;
    if (citations.has(citation)) throw new Error(`${filename}: duplicate section citation ${citation}`);
    citations.add(citation);
    sections.push({
      ...metadata,
      citation,
      heading,
      content,
      contentHash: createHash("sha256").update(`${heading}\n${content}`).digest("hex"),
      headingTerms: terms(heading),
      contentTerms: terms(content),
    });
  }

  return sections;
}

export async function loadRunbooks(directory: string): Promise<RunbookIndex> {
  const sections: IndexedSection[] = [];
  const citations = new Set<string>();

  for (const filename of allowedFiles) {
    let source: string;
    try {
      const path = join(directory, filename);
      const file = await stat(path);
      if (file.size > maximumDocumentBytes) throw new Error(`${filename}: runbook is too large`);
      source = await readFile(path, "utf8");
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") continue;
      throw error;
    }
    for (const section of parseRunbook(source, filename)) {
      if (citations.has(section.citation)) {
        throw new Error(`Runbook index has duplicate citation ${section.citation}`);
      }
      citations.add(section.citation);
      sections.push(section);
    }
    if (sections.length > maximumSections) throw new Error("Runbook index has too many sections");
  }

  return sections;
}

function normalizedFilters(values: readonly string[] | undefined, name: string): Set<string> {
  if (!values) return new Set();
  if (values.length > 10) throw new RangeError(`${name} filter is too large`);
  if (
    values.some((value) => value.length > maximumFilterValueLength) ||
    values.reduce((length, value) => length + value.length, 0) > maximumFilterLength
  ) {
    throw new RangeError(`${name} filter is too large`);
  }
  return new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean));
}

function intersects(left: Set<string>, right: readonly string[]): boolean {
  return left.size === 0 || right.some((value) => left.has(value.toLowerCase()));
}

export function searchRunbooks(
  index: RunbookIndex,
  input: RunbookSearchInput,
): RunbookMatch[] {
  const query = input.query.trim();
  if (!query || query.length > maximumQueryLength) {
    throw new RangeError(`Runbook query must contain 1-${maximumQueryLength} characters`);
  }
  const limit = input.limit ?? 3;
  if (!Number.isInteger(limit) || limit < 1 || limit > 3) {
    throw new RangeError("Runbook result limit must be between 1 and 3");
  }

  const queryTerms = terms(query);
  const taxonomy = normalizedFilters(input.taxonomy, "Taxonomy");
  const providers = normalizedFilters(input.providers, "Provider");

  return index
    .filter(
      (section) =>
        intersects(taxonomy, section.taxonomy) && intersects(providers, section.providers),
    )
    .map((section) => {
      let score = 0;
      for (const term of queryTerms) {
        if (section.headingTerms.has(term)) score += 3;
        if (section.contentTerms.has(term)) score += 1;
        if (section.taxonomy.some((item) => item.toLowerCase() === term)) score += 5;
        if (section.providers.includes(term)) score += 2;
      }
      return { section, score };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => {
      if (left.score !== right.score) return right.score - left.score;
      if (left.section.citation === right.section.citation) return 0;
      return left.section.citation < right.section.citation ? -1 : 1;
    })
    .slice(0, limit)
    .map(({ section, score }) => ({
      runbookId: section.id,
      version: section.version,
      citation: section.citation,
      heading: section.heading,
      content: section.content,
      contentHash: section.contentHash,
      taxonomy: section.taxonomy,
      providers: section.providers,
      simulated: true,
      authority: "untrusted_procedural_guidance",
      canChangePolicy: false,
      score,
    }));
}
