import { expect, test } from "bun:test";
import { loadR22 } from "../src/evaluation/retrieval-r22.ts";
import { passageR23, diagnoseR23 } from "../src/evaluation/r23-analysis.ts";
import { loadR23, validateR23Capture } from "../src/evaluation/retrieval-r23.ts";
import { hash } from "../src/evaluation/retrieval-r21.ts";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

test("R2.3 context comes from the same frozen runbook and preserves the target section", async () => {
  const { index } = await loadR22();
  const section = index.find(
    (s) => s.citation === "RB-F04-F06@1.0.0#forbidden-actions",
  )!;
  const symptoms = index.find(
    (s) => s.id === section.id && s.heading === "Symptoms",
  )!;
  expect(passageR23(index, section, "original")).toBe(
    `${section.heading}\n${section.content}`,
  );
  const text = passageR23(index, section, "runbook-context");
  expect(text).toContain(symptoms.content);
  expect(text).toContain(`${section.heading}\n${section.content}`);
  expect(text).not.toContain("HTTP 429");
});

test("R2.3 separates candidate, cutoff and rank losses without changing labels", () => {
  const result = diagnoseR23(
    ["missing", "low", "fourth", "first"],
    ["first", "x", "y", "fourth", "low"],
    { first: 3, x: 2, y: 1, fourth: 0, low: -10 },
  );
  expect(result.returned).toEqual(["first", "x", "y"]);
  expect(result.gold.map((g) => g.reason)).toEqual([
    "candidate",
    "cutoff",
    "ranking",
    "returned",
  ]);
  expect(result.gold.find((g) => g.citation === "fourth")!.rank).toBe(4);
  expect(
    result.gold.find((g) => g.citation === "fourth")!.marginVsBestDistractor,
  ).toBe(-2);
});

test("R2.3 rejects incomplete logits/token captures and changed provenance", async () => {
  const { config } = await loadR23();
  const record = { logits: { a: 1 }, tokenCounts: { a: 10 }, tokenHashes: { a: "a".repeat(64) }, tokenInspectionMs: 0, rerankMs: 0 };
  const capture = { inputHash: "a".repeat(64), configHash: hash(config), models: config.models, modelLoadMs: 0,
    records: { query: { original: record, "runbook-context": record } } };
  const validate = (raw: unknown) => validateR23Capture(raw, capture.inputHash, hash(config), config.models, [{ id: "query", candidates: ["a"] }]);
  expect(validate(capture).records.query!.original.tokenCounts.a).toBe(10);
  expect(() => validate({ ...capture, inputHash: "b".repeat(64) })).toThrow();
  expect(() => validate({ ...capture, records: {} })).toThrow();
  for (const invalid of [{ ...record, logits: {} }, { ...record, tokenHashes: {} }, { ...record, tokenCounts: { a: 1.5 } }])
    expect(() => validate({ ...capture, records: { query: { original: invalid, "runbook-context": record } } })).toThrow();
  expect(() => diagnoseR23([], ["a"], { a: NaN })).toThrow();
});

test("R2.3 replay reproduces quality and rejects tampered logits and baseline overwrite", async () => {
  const source = "apps/ai_agent/evaluation/r23/runs/r23-v1-local";
  const out = `.tmp-turbo-user/r23-replay-${crypto.randomUUID()}`;
  const run = (scores: string, output: string) => execFileSync(process.execPath,
    ["apps/ai_agent/src/evaluation/retrieval-r23.ts", "--scores", scores, "--output", output], { stdio: "pipe", timeout: 30_000 });
  run(`${source}/scores.json`, out);
  const original = JSON.parse(await readFile(`${source}/report.json`, "utf8"));
  const replay = JSON.parse(await readFile(`${out}/report.json`, "utf8"));
  expect(replay.inputHash).toBe(original.inputHash);
  expect(replay.scoresHash).toBe(original.scoresHash);
  expect(replay.candidateHash).toBe(original.candidateHash);
  expect(replay.decision).toEqual(original.decision);
  const quality = (report: typeof original) => report.results.map((r: { variant: string; splits: { metrics: { latency?: unknown }; losses: unknown; truncation: unknown }[] }) => ({
    variant: r.variant, splits: r.splits.map(s => { const { latency: _latency, ...metrics } = s.metrics; return { metrics, losses: s.losses, truncation: s.truncation }; }) }));
  expect(quality(replay)).toEqual(quality(original));
  expect(() => run(`${source}/scores.json`, out)).toThrow();
  expect(() => run(`${source}/scores.json`, "apps/ai_agent/evaluation/r22/runs/r22-v1-local")).toThrow();
  const changed = `.tmp-turbo-user/r23-tampered-${crypto.randomUUID()}`;
  await mkdir(changed);
  const scores = JSON.parse(await readFile(`${source}/scores.json`, "utf8"));
  const record = scores.records[Object.keys(scores.records)[0]!].original;
  record.logits[Object.keys(record.logits)[0]!] += 1;
  await writeFile(`${changed}/scores.json`, JSON.stringify(scores));
  await writeFile(`${changed}/report.json`, JSON.stringify(original));
  expect(() => run(`${changed}/scores.json`, `.tmp-turbo-user/r23-rejected-${crypto.randomUUID()}`)).toThrow();
}, 30_000);
