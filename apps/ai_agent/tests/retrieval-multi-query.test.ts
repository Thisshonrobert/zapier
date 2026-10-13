import { expect, test } from "bun:test";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import {
  planQueries,
  retrieveVariant,
  compareDevelopment,
} from "../src/evaluation/retrieval-multi-query.ts";
import {
  loadRunbooks,
  parseRunbook,
  searchRunbooks,
} from "../src/tools/search-runbooks.ts";

const directory = join(import.meta.dir, "../../../docs/AI/runbooks");

test("baseline is the exact production ranking and expansion cannot create a no-match hit", async () => {
  const index = await loadRunbooks(directory);
  const input = {
    query: "Telegram 429 retry after",
    providers: ["telegram"],
    limit: 3,
  };
  expect(retrieveVariant(index, input, "baseline")).toEqual(
    searchRunbooks(index, input),
  );
  for (const variant of ["metadata", "multi-query", "combined"] as const) {
    expect(
      retrieveVariant(
        index,
        { query: "quasar horticulture spectroscopy" },
        variant,
      ),
    ).toEqual([]);
    const result = retrieveVariant(index, input, variant);
    expect(result.length).toBeLessThanOrEqual(3);
    expect(new Set(result.map((r) => r.citation)).size).toBe(result.length);
    expect(retrieveVariant(index, input, variant)).toEqual(result);
    for (const match of result) {
      const source = index.find((s) => s.citation === match.citation)!;
      expect(match.contentHash).toBe(source.contentHash);
      expect(match.content).toBe(source.content);
      expect(match.authority).toBe("untrusted_procedural_guidance");
      expect(match.canChangePolicy).toBe(false);
    }
  }
});

test("explicit requested task filters headings without using gold taxonomy", async () => {
  const index = await loadRunbooks(directory);
  const input = {
    query: "What evidence should I collect for Telegram 429 cooldown?",
    providers: ["telegram"],
  };
  for (const variant of ["metadata", "combined"] as const) {
    const matches = retrieveVariant(index, input, variant);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every((m) => m.heading === "Evidence needed")).toBe(true);
  }
  const plan = planQueries(input);
  expect(plan).toHaveLength(3);
  expect(
    plan.every((q) => q.query.length <= 500 && q.limit === 3 && !q.taxonomy),
  ).toBe(true);
  expect(plan.every((q) => q.providers?.[0] === "telegram")).toBe(true);
});

test("provider filtering keeps generic guidance and rejects another provider", () => {
  const runbook = (id: string, provider: string, status = "current") =>
    parseRunbook(
      `---\nid: ${id}\nversion: 1.0.0\nsimulated: true\nstatus: ${status}\nowner: test\nreviewed: 2026-10-12\ntaxonomy: F01\nproviders: ${provider}\ncode_version: test\n---\n## Evidence needed\nCaptured outage status.\n`,
      id,
    );
  const index = [
    ...runbook("RB-EMAIL", "email"),
    ...runbook("RB-GENERIC", "generic"),
    ...runbook("RB-STALE", "telegram", "stale"),
  ];
  for (const variant of [
    "baseline",
    "metadata",
    "multi-query",
    "combined",
  ] as const) {
    const matches = retrieveVariant(
      index,
      {
        query: "What evidence should I collect for an outage?",
        providers: ["telegram"],
      },
      variant,
    );
    expect(matches.map((m) => m.runbookId)).toEqual(["RB-GENERIC"]);
  }
});

test("expanded searches respect the requested return limit and production input bounds", async () => {
  const index = await loadRunbooks(directory);
  expect(
    retrieveVariant(index, { query: "Telegram 429", limit: 1 }, "combined"),
  ).toHaveLength(1);
  expect(() =>
    retrieveVariant(index, { query: " ", limit: 3 }, "combined"),
  ).toThrow();
  expect(() =>
    retrieveVariant(index, { query: "a".repeat(501) }, "combined"),
  ).toThrow();
  expect(() =>
    retrieveVariant(
      index,
      { query: "Telegram", providers: ["a".repeat(65)] },
      "combined",
    ),
  ).toThrow();
  expect(() =>
    retrieveVariant(index, { query: "Telegram", limit: 4 }, "combined"),
  ).toThrow();
  expect(
    planQueries({ query: "x".repeat(500) }).every((q) => q.query.length <= 500),
  ).toBe(true);
});

test("development comparison records denominators, abstention and mismatches without feeding labels to retrieval", async () => {
  const index = await loadRunbooks(directory);
  const rows = [
    {
      id: "positive",
      split: "development",
      query: "What evidence should I collect for Telegram 429?",
      providers: ["telegram"],
      taxonomy: [],
      relevantCitations: ["RB-F01-F02@1.0.0#evidence-needed"],
      support: {},
    },
    {
      id: "negative",
      split: "development",
      query: "quasar horticulture spectroscopy",
      providers: [],
      taxonomy: [],
      relevantCitations: [],
      support: {},
    },
  ];
  const result = compareDevelopment(index, rows);
  expect(result).toHaveLength(4);
  for (const variant of result) {
    expect(variant.metrics.positiveQueryCount).toBe(1);
    expect(variant.metrics.noMatchQueryCount).toBe(1);
    expect(variant.metrics.noMatchAccuracy).toBe(1);
    expect(variant.rows[1]!.returned).toEqual([]);
    expect(variant.metrics.wrongIntentFlags).toBeGreaterThanOrEqual(0);
  }
  const changed = compareDevelopment(
    index,
    rows.map((r) => ({
      ...r,
      relevantCitations: [],
      intent: "CONSTRAINTS",
      taxonomy: ["F10"],
    })),
  );
  expect(changed.map((v) => v.rows.map((r) => r.returned))).toEqual(
    result.map((v) => v.rows.map((r) => r.returned)),
  );
  expect(() =>
    compareDevelopment(index, [{ ...rows[0]!, split: "held_out" }]),
  ).toThrow();
});

test("CLI uses only fixed development captures, records hashes, and refuses overwriting results", async () => {
  const root = join(import.meta.dir, "../../..");
  const output = join(
    root,
    ".tmp-turbo-user",
    `multi-query-test-${randomUUID()}`,
  );
  const args = [
    "--experimental-transform-types",
    join(root, "apps/ai_agent/src/evaluation/retrieval-multi-query.ts"),
    "--output",
    output,
  ];
  execFileSync("node", args, { cwd: root, timeout: 30_000, stdio: "pipe" });
  const reportText = await readFile(join(output, "report.json"), "utf8");
  const report = JSON.parse(reportText);
  const manifest = JSON.parse(
    await readFile(join(output, "manifest.json"), "utf8"),
  );
  expect(report.productionChanged).toBe(false);
  expect(report.modelInvocations).toBe(0);
  expect(report.intentResults).toHaveLength(4);
  expect(report.intentResults[0].metrics.queryCount).toBe(28);
  expect(
    report.graphResults.every(
      (v: { excludedControls: number; rows: unknown[] }) =>
        v.excludedControls === 2 && v.rows.length === 16,
    ),
  ).toBe(true);
  expect(
    Object.keys(manifest.inputHashes).every((p) => !/fresh|held.?out/.test(p)),
  ).toBe(true);
  expect(Object.keys(manifest.sourceHashes)).toHaveLength(5);
  expect(() =>
    execFileSync("node", args, { cwd: root, timeout: 30_000, stdio: "pipe" }),
  ).toThrow();
  expect(await readFile(join(output, "report.json"), "utf8")).toBe(reportText);
}, 60_000);
