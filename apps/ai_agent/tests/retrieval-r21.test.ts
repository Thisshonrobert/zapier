import { expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  loadExperiment,
  metrics,
  calibrate,
  hash,
  validateCapture,
} from "../src/evaluation/retrieval-r21.ts";
import { rankR2 } from "../src/evaluation/retrieval-r2.ts";

test("R2.1 freezes the original corpus and uses 96 new queries with disjoint scenario groups", async () => {
  const experiment = await loadExperiment();
  expect(experiment.queries).toHaveLength(96);
  expect(experiment.queries.filter((q) => q.split === "held_out")).toHaveLength(
    48,
  );
  expect(new Set(experiment.index.map((s) => s.id)).size).toBe(12);
  expect(hash(experiment.corpus)).toBe(experiment.config.corpusHash);
  const dev = new Set(
    experiment.queries
      .filter((q) => q.split === "development")
      .map((q) => q.scenarioGroup),
  );
  expect(
    experiment.queries
      .filter((q) => q.split === "held_out")
      .some((q) => dev.has(q.scenarioGroup)),
  ).toBe(false);
});

test("no-match metrics distinguish correct abstention from abstaining on answerable queries", () => {
  const result = metrics([
    { relevant: ["a", "b"], returned: ["b"], latencyMs: 1 },
    { relevant: ["a"], returned: [], latencyMs: 2 },
    { relevant: [], returned: [], latencyMs: 3 },
    { relevant: [], returned: ["a"], latencyMs: 4 },
  ]);
  expect(result.recallAt3).toBe(0.25);
  expect(result.mrr).toBe(0.5);
  expect(result.noMatchAccuracy).toBe(0.5);
  expect(result.noMatchPrecision).toBe(0.5);
  expect(result.noMatchAbstentionRate).toBe(0.5);
  expect(result.answerableAbstentionRate).toBe(0.5);
  expect(result.latency.p95Ms).toBe(4);
  expect(
    metrics([{ relevant: ["a"], returned: ["a"], latencyMs: 0 }])
      .noMatchPrecision,
  ).toBeNull();
});

test("calibration ignores held-out labels and prefers the less restrictive plateau threshold", async () => {
  const { index, queries, config } = await loadExperiment();
  const scores = Object.fromEntries(
    queries
      .filter((q) => q.split === "development")
      .map((q) => {
        const semantic = Object.fromEntries(
          index.map((s) => [s.citation, 0.5]),
        );
        const candidates = rankR2(
          index,
          q,
          "hybrid",
          semantic,
          {},
          { semantic: config.semanticThreshold, rerank: 0 },
          12,
        );
        const logits = Object.fromEntries(
          candidates.map((s) => [
            s.citation,
            q.relevantCitations.includes(s.citation) ? 1 : -20,
          ]),
        );
        return [
          q.id,
          {
            semantic,
            logits,
            candidates: candidates.map((s) => s.citation),
            embeddingMs: 0,
            rerankMs: 0,
            candidateMs: 0,
          },
        ];
      }),
  );
  const first = calibrate(index, queries, scores, config);
  const changed = queries.map((q) =>
    q.split === "held_out" ? { ...q, relevantCitations: ["fake"] } : q,
  );
  expect(calibrate(index, changed, scores, config)).toEqual(first);
  expect(first.threshold).toBeLessThan(0.3);
});

test("frozen score validation rejects changed inputs, missing scores and inconsistent candidates", async () => {
  const { index, queries, config } = await loadExperiment();
  expect(() =>
    validateCapture(
      { inputHash: "changed", records: {} },
      "expected",
      index,
      [],
    ),
  ).toThrow();
  const q = queries[0]!;
  const semantic = Object.fromEntries(index.map((s) => [s.citation, 0.5]));
  const candidates = rankR2(
    index,
    q,
    "hybrid",
    semantic,
    {},
    { semantic: config.semanticThreshold, rerank: 0 },
    12,
  ).map((s) => s.citation);
  const valid = {
    inputHash: "a".repeat(64),
    configHash: hash(config),
    models: config.models,
    modelLoadMs: 0,
    corpusEmbeddingMs: 0,
    records: {
      [q.id]: {
        semantic,
        candidates,
        logits: Object.fromEntries(candidates.map((c) => [c, 0])),
        embeddingMs: 0,
        candidateMs: 0,
        rerankMs: 0,
      },
    },
  };
  expect(
    validateCapture(valid, valid.inputHash, index, [q], config).records[q.id]
      ?.candidates,
  ).toEqual(candidates);
  expect(() =>
    validateCapture(valid, "b".repeat(64), index, [q], config),
  ).toThrow();
  expect(() =>
    validateCapture(
      {
        ...valid,
        records: { [q.id]: { ...valid.records[q.id], semantic: {} } },
      },
      valid.inputHash,
      index,
      [q],
      config,
    ),
  ).toThrow();
  expect(() =>
    validateCapture(
      {
        ...valid,
        records: {
          [q.id]: {
            ...valid.records[q.id],
            candidates: [...candidates].reverse(),
          },
        },
      },
      valid.inputHash,
      index,
      [q],
      config,
    ),
  ).toThrow();
});

test("local frozen replay preserves selected thresholds and quality metrics without inference", async () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const source = "apps/ai_agent/evaluation/r21/runs/r21-v1-local";
  const output = `.tmp-turbo-user/r21-replay-${crypto.randomUUID()}`;
  execFileSync(
    process.execPath,
    [
      "apps/ai_agent/src/evaluation/retrieval-r21.ts",
      "--scores",
      `${source}/scores.json`,
      "--output",
      output,
    ],
    { cwd: root, stdio: "pipe", timeout: 30_000 },
  );
  const original = JSON.parse(
    await readFile(`${root}/${source}/report.json`, "utf8"),
  );
  const replay = JSON.parse(
    await readFile(`${root}/${output}/report.json`, "utf8"),
  );
  expect(replay.inputHash).toBe(original.inputHash);
  expect(replay.datasetHash).toBe(original.datasetHash);
  expect(replay.calibration).toEqual(original.calibration);
  const quality = (report: typeof original) =>
    report.results.map(
      (r: {
        variant: string;
        heldOut: {
          recallAt3: number;
          mrr: number;
          noMatchAccuracy: number;
          noMatchPrecision: number | null;
        };
      }) => ({
        variant: r.variant,
        recall: r.heldOut.recallAt3,
        mrr: r.heldOut.mrr,
        accuracy: r.heldOut.noMatchAccuracy,
        precision: r.heldOut.noMatchPrecision,
      }),
    );
  expect(quality(replay)).toEqual(quality(original));
  expect(replay.externalCostUsd).toBe(0);
}, 30_000);
