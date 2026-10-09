import { expect, test } from "bun:test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { loadExperiment } from "../src/evaluation/retrieval-r21.ts";
import { rankR2 } from "../src/evaluation/retrieval-r2.ts";
import { candidatesR22 } from "../src/evaluation/r22-candidates.ts";
import { hash } from "../src/evaluation/retrieval-r21.ts";
import { loadR22, rerankR22, validateR22Capture } from "../src/evaluation/retrieval-r22.ts";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("R2.2 retains baseline top 12 and lets branch-only evidence reach the reranker", async () => {
  const { index, queries } = await loadExperiment();
  const capture = JSON.parse(await readFile("apps/ai_agent/evaluation/r21/runs/r21-v1-local/scores.json", "utf8"));
  for (const q of queries) {
    const candidates = candidatesR22(index, q, capture.records[q.id].semantic);
    expect(candidates.slice(0, 12).map(s => s.citation)).toEqual(capture.records[q.id].candidates);
    expect(candidates.length).toBeLessThanOrEqual(24);
    expect(new Set(candidates.map(s => s.citation)).size).toBe(candidates.length);
  }
  const q = queries.find(q => q.id === "r21-superseded-evidence-1")!;
  const candidates = candidatesR22(index, q, capture.records[q.id].semantic);
  expect(candidates.map(s => s.citation)).toContain("RB-F08@1.0.0#read-only-investigation");
});

test("R2.2 keeps stale exclusion and metadata eligibility", async () => {
  const { index, queries } = await loadExperiment();
  const semantic = Object.fromEntries(index.map(s => [s.citation, 1]));
  const q = { ...queries[0]!, taxonomy: ["F08"], providers: ["telegram"] };
  const candidates = candidatesR22(index, q, semantic);
  expect(candidates.length).toBeGreaterThan(0);
  for (const s of candidates) {
    expect(rankR2(index.filter(row => row.citation === s.citation), q, "semantic", semantic)).toHaveLength(1);
  }
  const stale = index.map(s => ({ ...s, status: "stale" as const }));
  expect(candidatesR22(stale, q, semantic)).toEqual([]);
});

test("R2.2 rejects changed provenance, candidate order, missing logits and extra scores", async () => {
  const { config, index, queries, baselineCapture } = await loadR22();
  const q = queries[0]!;
  const semantic = baselineCapture.records[q.id]!.semantic;
  const candidates = candidatesR22(index, q, semantic).map(s => s.citation);
  const record = { semantic, candidates, logits: Object.fromEntries(candidates.map(c => [c, 0])),
    embeddingMs: 0, candidateMs: 0, rerankMs: 0 };
  const capture = { inputHash: "a".repeat(64), configHash: hash(config), models: config.models,
    modelLoadMs: 0, corpusEmbeddingMs: 0, records: { [q.id]: record } };
  const validate = (raw: unknown) => validateR22Capture(raw, capture.inputHash, index, [q], config);
  expect(validate(capture).records[q.id]!.candidates).toEqual(candidates);
  expect(() => validate({ ...capture, inputHash: "b".repeat(64) })).toThrow();
  expect(() => validate({ ...capture, configHash: "b".repeat(64) })).toThrow();
  expect(() => validate({ ...capture, records: {} })).toThrow();
  for (const broken of [ { ...record, candidates: [...candidates].reverse() },
    { ...record, logits: {} }, { ...record, logits: { ...record.logits, unknown: 1 } },
    { ...record, semantic: { ...semantic, unknown: 0 } } ]) {
    expect(() => validate({ ...capture, records: { [q.id]: broken } })).toThrow();
  }
});

test("R2.2 reranking preserves sigmoid ordering and citation ties", () => {
  const ranking = rerankR22({ semantic: {}, candidates: ["z", "a", "b"], logits: { z: -8, a: -8, b: 0 },
    embeddingMs: 0, candidateMs: 0, rerankMs: 0 });
  expect(ranking.map(r => r.citation)).toEqual(["b", "a", "z"]);
  expect(ranking.filter(r => r.score >= 0.001).slice(0, 3).map(r => r.citation)).toEqual(["b"]);
});

test("R2.2 frozen replay reproduces quality and cannot overwrite the baseline", async () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const source = "apps/ai_agent/evaluation/r22/runs/r22-v1-local";
  const output = `.tmp-turbo-user/r22-replay-${crypto.randomUUID()}`;
  const run = (target: string) => execFileSync(process.execPath, ["apps/ai_agent/src/evaluation/retrieval-r22.ts",
    "--scores", `${source}/scores.json`, "--output", target], { cwd: root, stdio: "pipe", timeout: 30_000 });
  run(output);
  const original = JSON.parse(await readFile(`${root}/${source}/report.json`, "utf8"));
  const replay = JSON.parse(await readFile(`${root}/${output}/report.json`, "utf8"));
  expect(replay.inputHash).toBe(original.inputHash);
  expect(replay.scoresHash).toBe(original.scoresHash);
  expect(replay.datasetHash).toBe(original.datasetHash);
  const quality = (report: typeof original) => report.comparisons.map((c: { r22: { latency?: unknown } }) => {
    const { latency: _latency, ...result } = c.r22;
    return result;
  });
  expect(quality(replay)).toEqual(quality(original));
  expect(() => run(output)).toThrow();
  expect(() => run("apps/ai_agent/evaluation/r21/runs/r21-v1-local")).toThrow();
  const tampered = `.tmp-turbo-user/r22-tampered-${crypto.randomUUID()}`;
  await mkdir(`${root}/${tampered}`);
  const scores = JSON.parse(await readFile(`${root}/${source}/scores.json`, "utf8"));
  const record = scores.records[Object.keys(scores.records)[0]!];
  record.logits[record.candidates[0]] += 1;
  await writeFile(`${root}/${tampered}/scores.json`, JSON.stringify(scores));
  await writeFile(`${root}/${tampered}/report.json`, JSON.stringify(original));
  expect(() => execFileSync(process.execPath, ["apps/ai_agent/src/evaluation/retrieval-r22.ts", "--scores",
    `${tampered}/scores.json`, "--output", `.tmp-turbo-user/r22-rejected-${crypto.randomUUID()}`],
    { cwd: root, stdio: "pipe", timeout: 30_000 })).toThrow();
}, 30_000);
