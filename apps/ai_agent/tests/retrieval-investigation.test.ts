import { expect, test } from "bun:test";
import { loadRunbooks, searchRunbooks } from "../src/tools/search-runbooks.ts";
import { retrieveVariant } from "../src/evaluation/retrieval-multi-query.ts";
import {
  retrieveInvestigation,
  oracleContext,
  evidenceQueries,
} from "../src/evaluation/retrieval-investigation.ts";
import { parseRunbook } from "../src/tools/search-runbooks.ts";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { compareOracleDiagnoses } from "../src/evaluation/oracle-diagnosis.ts";
import { stubDiagnosis } from "../src/evaluation/agentic-experiment.ts";
import {
  CapturedEvaluationContextSchema,
  EvaluationCaseSchema,
} from "../src/evaluation/checks.ts";
import { investigateRetrieval } from "../src/evaluation/investigate-retrieval.ts";
import { randomUUID } from "node:crypto";

const directory = fileURLToPath(
  new URL("../../../docs/AI/runbooks", import.meta.url),
);

test("uncertain evidence-gaps intent must not exclude the forbidden-actions answer", async () => {
  const index = await loadRunbooks(directory.replace(/^\/(\w:)/, "$1"));
  const input = {
    query:
      "What actions are forbidden for evidence gaps, including bulk republishing, fabricating errors and reinterpreting SUCCESS from an error substring?",
    providers: [],
  };
  expect(
    retrieveVariant(index, input, "metadata").map((m) => m.citation),
  ).not.toContain("RB-F09-F10@1.0.0#forbidden-actions");
  expect(
    retrieveInvestigation(index, input, "soft-intent").map((m) => m.citation),
  ).toContain("RB-F09-F10@1.0.0#forbidden-actions");
});

test("wording equivalence recovers a zero-overlap procedure without relaxing provider eligibility", () => {
  const index = parseRunbook(
    "---\nid: RB-TEST\nversion: 1.0.0\nsimulated: true\nstatus: current\nowner: test\nreviewed: 2026-10-13\ntaxonomy: F01\nproviders: email\ncode_version: test\n---\n## Symptoms\nRate limit.\n",
    "test",
  );
  expect(
    searchRunbooks(index, { query: "throttling", providers: ["email"] }),
  ).toEqual([]);
  expect(
    retrieveVariant(
      index,
      { query: "throttling", providers: ["email"] },
      "multi-query",
    ),
  ).toEqual([]);
  expect(
    retrieveInvestigation(
      index,
      { query: "throttling", providers: ["email"] },
      "focused-query",
    ),
  ).toHaveLength(1);
  expect(
    retrieveInvestigation(
      index,
      { query: "throttling", providers: ["telegram"] },
      "focused-query",
    ),
  ).toEqual([]);
});

test("generic task wording is insufficient evidence of a runbook match", async () => {
  const index = await loadRunbooks(directory.replace(/^\/(\w:)/, "$1"));
  expect(
    retrieveInvestigation(
      index,
      { query: "Which repair is allowed for a broken dishwasher pump?" },
      "relevance",
    ),
  ).toEqual([]);
});

test("baseline parity, provider bounds and oracle isolation", async () => {
  const index = await loadRunbooks(directory.replace(/^\/(\w:)/, "$1"));
  const input = {
    query: "provider receipts",
    providers: ["unknown"],
    limit: 3,
  };
  expect(retrieveInvestigation(index, input, "baseline")).toEqual(
    searchRunbooks(index, input),
  );
  expect(() =>
    oracleContext(index, input, ["RB-F07@1.0.0#evidence-needed"]),
  ).toThrow("ineligible");
  expect(() => oracleContext(index, input, ["absent"])).toThrow("absent");
  for (const variant of [
    "soft-intent",
    "focused-query",
    "relevance",
  ] as const) {
    expect(
      retrieveInvestigation(index, input, variant).some(
        (m) => m.runbookId === "RB-F07",
      ),
    ).toBe(false);
    expect(() =>
      retrieveInvestigation(index, { query: "a".repeat(501) }, variant),
    ).toThrow();
  }
});

test("vocabulary variants are bounded and preserve the first two original passages", async () => {
  const index = await loadRunbooks(directory.replace(/^\/(\w:)/, "$1"));
  const input = {
    query: "throttling retry_after_30_seconds",
    providers: ["telegram"],
  };
  const baseline = searchRunbooks(index, input);
  const result = retrieveInvestigation(index, input, "focused-query");
  expect(evidenceQueries(input).at(-1)!.query).toContain("rate limit");
  expect(result.slice(0, 2)).toEqual(baseline.slice(0, 2));
  expect(result.length).toBeLessThanOrEqual(3);
  for (const m of result)
    expect(m.contentHash).toBe(
      index.find((s) => s.citation === m.citation)!.contentHash,
    );
});

test("oracle pairs preserve evidence and instructions, keep annotations out of prompts, and enforce call caps", async () => {
  const index = await loadRunbooks(directory);
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const cases = EvaluationCaseSchema.array()
    .parse(
      JSON.parse(
        await readFile(
          `${root}/apps/ai_agent/evaluation/phase-11a-baseline-v6/cases.json`,
          "utf8",
        ),
      ),
    )
    .filter((c) => c.case_id === "f07-provider-response-lost");
  const contexts = CapturedEvaluationContextSchema.array()
    .parse(
      JSON.parse(
        await readFile(
          `${root}/apps/ai_agent/evaluation/phase-11a-baseline-v6/contexts.json`,
          "utf8",
        ),
      ),
    )
    .filter((c) => c.case_id === cases[0]!.case_id);
  const prompts: { instructions: string; input: string }[] = [];
  const result = await compareOracleDiagnoses({
    cases,
    contexts,
    index,
    oracleCitations: { [cases[0]!.case_id]: ["RB-F07@1.0.0#evidence-needed"] },
    repetitions: 1,
    maxCalls: 2,
    model: {
      async close() {},
      generate: async (p, s) => {
        prompts.push(p);
        return stubDiagnosis.generate(p, s);
      },
    },
  });
  expect(result.calls).toBe(2);
  expect(prompts[0]!.instructions).toBe(prompts[1]!.instructions);
  expect(JSON.parse(prompts[0]!.input).evidence).toEqual(
    JSON.parse(prompts[1]!.input).evidence,
  );
  expect(
    prompts.every(
      (p) =>
        !p.input.includes("oracleCitations") &&
        !p.input.includes("expected_diagnoses"),
    ),
  ).toBe(true);
  expect(result.rows.every((r) => r.semanticQuality === null)).toBe(true);
  const capped = await compareOracleDiagnoses({
    cases,
    contexts,
    index,
    oracleCitations: { [cases[0]!.case_id]: ["RB-F07@1.0.0#evidence-needed"] },
    repetitions: 1,
    maxCalls: 1,
    model: stubDiagnosis,
  });
  expect(capped.calls).toBe(1);
  expect(capped.rows[1]!.result).toBeNull();
  expect(capped.rows[1]!.failure).toBe("budget_exhausted");
  expect(
    result.rows.every(
      (r) => r.knownUsage.length === r.calls && r.unknownUsageCalls === 0,
    ),
  ).toBe(true);
});

test("offline investigation reproduces both baselines, traces provider loss, and refuses overwrite", async () => {
  const output = fileURLToPath(
    new URL(
      `../../../.tmp-turbo-user/investigation-test-${randomUUID()}`,
      import.meta.url,
    ),
  );
  const report = await investigateRetrieval(output);
  expect(report.baselineParity).toEqual({
    directQuestions: 28,
    projectedQuestions: 28,
    incidentContexts: 16,
    passed: true,
  });
  const projected = report.cohorts[1]!.results[0]!;
  expect(
    projected.rows
      .flatMap((r) => r.traces)
      .filter((t) => t.lostAt === "provider-eligibility"),
  ).toHaveLength(8);
  expect(report.planner.historicalDecisions).toHaveLength(44);
  expect(report.planner.searches).toBe(0);
  expect(report.oraclePlumbing.calls).toBe(32);
  expect(
    report.oraclePlumbing.rows.every(
      (r) => r.schemaValid && r.semanticQuality === null,
    ),
  ).toBe(true);
  await expect(investigateRetrieval(output)).rejects.toThrow();
}, 20_000);
