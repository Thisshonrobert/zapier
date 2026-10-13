import { expect, test } from "bun:test";
import { readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import {
  compareCaptures,
  stubDiagnosis,
  stubPlanner,
  createPlannerGemini,
  runAgenticExperiment,
  replayAgentic,
} from "../src/evaluation/agentic-experiment.ts";
import { loadRunbooks } from "../src/tools/search-runbooks.ts";
import {
  createFixtureTools,
  fixtureInput,
  fixtureRejection,
} from "../src/evaluation/fixture-tools.ts";
import {
  EvaluationCaseSchema,
  CapturedEvaluationContextSchema,
} from "../src/evaluation/checks.ts";
import {
  GEMINI_DIAGNOSIS_SCHEMA,
  ModelProviderError,
} from "../src/gemini-model.ts";

const base = "apps/ai_agent/evaluation/phase-11a-baseline-v6";
async function inputs() {
  const cases = EvaluationCaseSchema.array().parse(
    JSON.parse(await readFile(`${base}/cases.json`, "utf8")),
  );
  const contexts = CapturedEvaluationContextSchema.array().parse(
    JSON.parse(await readFile(`${base}/contexts.json`, "utf8")),
  );
  const index = await loadRunbooks("docs/AI/runbooks");
  return { cases, contexts, index };
}
test("paired fresh diagnoses use identical evidence, label-isolated planners and zero-call rejection gates", async () => {
  const input = await inputs();
  let planned = 0;
  const result = await compareCaptures({
    ...input,
    planner: {
      close: async () => {},
      generate: async (prompt, signal) => {
        planned++;
        expect(prompt.input).not.toMatch(
          /expected_diagnoses|expected_policy|relevantCitations|benchmark|support:/,
        );
        return stubPlanner.generate(prompt, signal);
      },
    },
    diagnosis: stubDiagnosis,
  });
  expect(planned).toBe(16);
  expect(result.variants[0]!.observations).toHaveLength(18);
  for (const variant of result.variants) {
    for (const context of variant.contexts) {
      const item = input.cases.find((c) => c.case_id === context.case_id)!;
      const observation = variant.observations.find(
        (o) => o.case_id === context.case_id,
      )!;
      expect(context.rejection).toBe(fixtureRejection(fixtureInput(item)));
      if (context.rejection) expect(observation.model_invocations).toBe(0);
      else
        expect(observation.model_invocations).toBe(
          variant.name === "baseline" ? 1 : 2,
        );
    }
  }
  expect(result.variants[0]!.contexts.map((c) => c.evidence)).toEqual(
    result.variants[1]!.contexts.map((c) => c.evidence),
  );
  const mutated = structuredClone(input.cases);
  mutated[0]!.expected_diagnoses = ["unknown"];
  const again = await compareCaptures({
    ...input,
    cases: mutated,
    planner: stubPlanner,
    diagnosis: stubDiagnosis,
  });
  expect(
    again.variants.map((v) => v.observations.map((o) => o.result)),
  ).toEqual(result.variants.map((v) => v.observations.map((o) => o.result)));
});

test("rejects non-development, incomplete, mismatched and invented rejection captures", async () => {
  const input = await inputs();
  await expect(
    compareCaptures({
      ...input,
      contexts: input.contexts.slice(1),
      planner: stubPlanner,
      diagnosis: stubDiagnosis,
    }),
  ).rejects.toThrow();
  const cases = structuredClone(input.cases);
  cases[0]!.split = "held_out";
  await expect(
    compareCaptures({
      ...input,
      cases,
      planner: stubPlanner,
      diagnosis: stubDiagnosis,
    }),
  ).rejects.toThrow();
  const contexts = structuredClone(input.contexts);
  contexts[0]!.rejection = "owner_context_rejected";
  contexts[0]!.evidence = null;
  contexts[0]!.retrieval = null;
  await expect(
    compareCaptures({
      ...input,
      contexts,
      planner: stubPlanner,
      diagnosis: stubDiagnosis,
    }),
  ).rejects.toThrow();
});

test("bounds preserve failure records and planner fallback; no unbounded repair", async () => {
  const input = await inputs();
  const result = await compareCaptures({
    ...input,
    planner: stubPlanner,
    diagnosis: stubDiagnosis,
    settings: { maxInvocations: 1 },
  });
  expect(result.calls).toHaveLength(1);
  expect(
    result.variants[1]!.plannerRows.filter((r) => r.record?.fallback),
  ).toHaveLength(16);
  expect(
    result.variants.flatMap((v) => v.contexts).filter((c) => c.failure),
  ).toHaveLength(31);
});

test("evaluation-only Gemini planner replaces schema and instruction suffix without changing diagnosis adapter", async () => {
  let calls = 0;
  const model = createPlannerGemini(
    "fake",
    "gemini-test",
    async (_url, init) => {
      calls++;
      const request = JSON.parse(String(init?.body));
      expect(JSON.stringify(request)).not.toContain(
        JSON.stringify(GEMINI_DIAGNOSIS_SCHEMA),
      );
      expect(JSON.stringify(request)).toContain("search_once");
      if (String(_url).endsWith(":countTokens"))
        return new Response(JSON.stringify({ totalTokens: 5 }));
      return new Response(
        JSON.stringify({
          candidates: [
            {
              finishReason: "STOP",
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      decision: "use_current_context",
                      evidence_ids: [],
                      gap: "",
                      query: null,
                    }),
                  },
                ],
              },
            },
          ],
          usageMetadata: {
            promptTokenCount: 5,
            candidatesTokenCount: 5,
            totalTokenCount: 10,
          },
        }),
      );
    },
  );
  const generation = await model.generate(
    { instructions: "test", input: "{}" },
    new AbortController().signal,
  );
  expect(generation.usage.total_tokens).toBe(10);
  expect(calls).toBe(2);
});

test("default CLI artifacts are stubbed, frozen before invocation, reproducible and never overwritten", async () => {
  const out = `.tmp-turbo-user/agentic-test-${randomUUID()}`;
  const report = await runAgenticExperiment(out);
  expect(report.mode).toBe("stub");
  expect(report.totals.providerRequests).toBe(0);
  expect(report.totals.modelInvocations).toBe(76);
  expect(report.totals.costUsd).toBe(0);
  expect(report.regressions.noMatchAbstention.length).toBeGreaterThan(0);
  expect(await replayAgentic(out)).toHaveLength(2);
  await expect(runAgenticExperiment(out)).rejects.toThrow();
  await writeFile(`${out}/report.json`, "{}");
  await expect(replayAgentic(out)).rejects.toThrow("Artifact hash mismatch");
  await expect(
    replayAgentic("apps/ai_agent/evaluation/r25/runs/fresh-v1"),
  ).rejects.toThrow("Not an agentic artifact directory");
});

test("shared run deadline bounds models that ignore abort and token exhaustion makes no calls", async () => {
  const input = await inputs();
  const stalled = await compareCaptures({
    ...input,
    planner: stubPlanner,
    diagnosis: {
      close: async () => {},
      generate: async () => new Promise<never>(() => {}),
    },
    settings: { runTimeoutMs: 5, callTimeoutMs: 5 },
  });
  expect(stalled.calls.length).toBeLessThanOrEqual(1);
  expect(
    stalled.variants.flatMap((v) => v.contexts).filter((c) => c.failure),
  ).toHaveLength(32);
  const exhausted = await compareCaptures({
    ...input,
    planner: stubPlanner,
    diagnosis: stubDiagnosis,
    settings: { maxTokens: 1 },
  });
  expect(exhausted.calls).toHaveLength(0);
  expect(
    exhausted.variants[1]!.plannerRows.filter(
      (r) => r.record?.fallback === "token_budget",
    ),
  ).toHaveLength(16);
});

test("provider quota failures record safe HTTP status and stop subsequent paid requests", async () => {
  const input = await inputs();
  let requests = 0;
  const result = await compareCaptures({
    ...input,
    planner: stubPlanner,
    diagnosis: {
      close: async () => {},
      generate: async () => {
        requests++;
        throw new ModelProviderError(
          "sensitive provider response",
          undefined,
          null,
          { category: "http_error", http_status: 429 },
        );
      },
    },
  });
  expect(requests).toBe(1);
  expect(result.calls).toHaveLength(1);
  expect(result.calls[0]?.errorDetails).toEqual({
    category: "http_error",
    http_status: 429,
  });
  expect(JSON.stringify(result)).not.toContain("sensitive provider response");
});

test("global pacing covers planner and diagnosis starts without changing prompts or labels", async () => {
  const input = await inputs();
  const starts: number[] = [];
  const diagnosis = {
    close: async () => {},
    generate: async (...args: Parameters<typeof stubDiagnosis.generate>) => {
      starts.push(performance.now());
      return stubDiagnosis.generate(...args);
    },
  };
  const planner = {
    close: async () => {},
    generate: async (...args: Parameters<typeof stubPlanner.generate>) => {
      starts.push(performance.now());
      return stubPlanner.generate(...args);
    },
  };
  const result = await compareCaptures({
    ...input,
    diagnosis,
    planner,
    settings: { minCallIntervalMs: 10 },
  });
  expect(result.calls).toHaveLength(48);
  expect(starts.slice(1).every((time, i) => time - starts[i]! >= 9)).toBe(true);
});
