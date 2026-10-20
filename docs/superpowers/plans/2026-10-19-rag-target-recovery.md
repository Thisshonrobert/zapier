# RAG target recovery implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Phase program:** this file is the task-level companion to [`2026-10-19-r3-retrieval-recovery.md`](2026-10-19-r3-retrieval-recovery.md). That document owns the R3.0–R3.7 phase sequence, gates, cohorts, and stop rules; this one owns the exact code and test bodies. Artifacts live under `apps/ai_agent/evaluation/r3/`.

**Goal:** Replace the current measurement-and-ranking loop with a frozen serving benchmark, an evidence-derived runbook route, facet-aware top-three packing, and a calibrated no-match gate, so a single retrieval configuration can be accepted or rejected against the historical 90% retrieval target.

**Architecture:** Keep the read-only investigator, `RunbookRetriever` boundary, MiniLM scorer, citation/hash contract, and replay policy. Add a pure evidence-profile layer that turns observed facts into a stable query, route hints, and requested guidance facets; rank the same eligible sections; pack complementary facets instead of taking the three highest scores; and decide abstention from observed support rather than a sigmoid cutoff. Evaluate every change on one frozen 55-section serving corpus with plain development/holdout separation.

**Tech Stack:** Bun/TypeScript, Zod, local Node/ONNX MiniLM (`Xenova/ms-marco-MiniLM-L-6-v2`), existing evaluation harnesses. No new dependency, vector database, model, or external selector.

**Spec:** `docs/ai-dlq-master-plan.md` (Phase 11 and R2), `apps/ai_agent/evaluation/RAG-DIAGNOSIS-CLOSEOUT.md`, and `apps/ai_agent/evaluation/production-selection/README.md`.

## Global constraints

- Preserve at-least-once safety, at-most-three excerpts, untrusted-guidance flags, stale exclusion, citation/hash integrity, authorization, and replay policy.
- Preserve all historical runs and their provenance. Never rewrite an old run directory or pooled metric.
- Do not lower the historical release gates: retrieval top-three recall **90%**, diagnosis acceptance **80%**.
- A development gate of **80%** is screening only. It is not release acceptance and must not be reported as reaching the 90% target.
- Never pass expected taxonomy, gold citations, labels, or expected answers into retrieval. The router may use only observed evidence.
- Metadata filtering is an eligibility/routing constraint, not a retrieval method. It cannot generate a candidate, rank a section, cover a missing facet, or decide abstention.
- No new retrieval-method sweep. The only predeclared changes are the structured profile, evidence route, facet packing, and support gate. No HyDE, PageIndex, new reranker, LLM planner, vector store, or alternate embedding model in this plan.
- Do not tune on the fresh R2.5 questions, the new holdout, or any future acceptance set.
- Exclude existing generated Prisma and Graphify changes from this work. No automatic Git integration; follow `docs/manualgit_handoff.md`.

## 1. Why the existing experiments cannot hit the target

| Observed fact | Consequence |
| --- | --- |
| The runtime serves **55 sections** from six current runbooks. `transient-provider-failure.md` is version `1.1.0` and has 10 sections. Task B was frozen on **54 sections / 1.0.0**. | Every Task B result is on a different corpus from the one the application serves. The current runtime has no valid baseline. |
| The 24-case development review labels cite the retired 54-section corpus (`RB-F01-F02@1.0.0`), while the runtime serves `1.1.0` with one extra section. | Copying the review citations verbatim would make every F01/F02 accepted citation unknown to the frozen corpus. Labels must be re-adjudicated and remapped before scoring. |
| All 55 current sections are eligible for `telegram`, `email`, both, or no provider because the runbooks list those providers or `generic`. | The provider filter is effectively a no-op for the observed incidents. It removes almost nothing and cannot improve ranking. |
| `retrievalInput` passes `providers` only. It never passes taxonomy. | The taxonomy filter is not used by the runtime. Experiments that pass taxonomy are testing a different contract. |
| Some historical experiments pass gold taxonomy codes as filters. | That is label leakage, not a production retrieval method. A passing score would not transfer to an unknown case. |
| Candidate coverage is 100% in the exhaustive MiniLM controls, but held-out macro Recall@3 is 76.39% and the fresh synthetic result is 73.96%. | Candidate generation is not the bottleneck. Ranking, section packing, query evidence, and abstention are. |
| Task B v3, 54 sections: MiniLM 62.5% (10/16) unchanged, 68.75% normalized, 75% with a procedure question. No-match abstention is 0/8. | Query cleanup helped, but not enough. Absolute score cutoffs cannot reconcile recall and abstention. |
| The fresh synthetic misses are concentrated in complementary facets: verification/rollback/escalation 5, forbidden actions 5, evidence needed 4, allowed remediation 2, symptoms 1, read-only investigation 1. | A single ranked-section score often returns three sections from the same easy facet. The target guidance is frequently outside the top three. |
| Manual routing to the correct runbook would rank one F03 answer 3rd and another 1st, but an F05 answer 8th and an F10 answer 6th. | Runbook routing is necessary but not sufficient. Within-runbook facet coverage still has to be fixed. |
| The query is a concatenated evidence bag. It includes fixture-only tokens such as `controlled_fixture`, `support_unknown`, and `fixture_inputs_unavailable`, and a 138-character slice can cut attempts and validation facts. | The benchmark query is not the production query, and useful structured distinctions are lost or diluted. |
| Six runbooks repeat the same nine-heading template. `Simulated example` and `Sources` are indexed and can be returned. | Cross-runbook confusion and non-procedural padding crowd out the procedure the diagnosis needs. |
| The `.001` sigmoid cutoff is a floor, not a calibrated confidence. Cutoff sweeps trade no-match abstention against answerable recall. | The no-match decision is being made by a ranking artifact instead of observed support. |

The experiments did not fail because one missing retriever was found. They failed because the corpus, query, label set, metric, and abstention decision were not stable at the same time. Another method sweep would repeat that confound.

## 2. Target contract

### 2.1 Case shape

The primary benchmark is incident-to-guidance, not human-authored search questions.

```ts
type TargetInput = {
  query: string;
  taxonomy?: readonly string[];
  providers?: readonly string[];
  limit?: 3;
};

type TargetFacet =
  | "symptoms"
  | "evidence"
  | "investigation"
  | "remediation"
  | "forbidden"
  | "replay"
  | "verification";

type TargetCase = {
  id: string;
  split: "development" | "holdout";
  kind: "answerable" | "no_match" | "corpus_gap";
  input: TargetInput;
  requiredFacets: Array<{
    facet: TargetFacet;
    accepted: string[]; // independently adjudicated sufficient citations
  }>; // at most 3 on an answerable case
  supporting: string[];
  missingRuntimeFacts: string[];
};
```

Rules:

- `input` is the access/query input only. Route hints, requested facets, and anchors are derived from observed evidence at run time and must never be stored in a case as labels.
- `requiredFacets` contains at most three entries. A question that genuinely needs more than three indispensable facets is a coverage limitation and must be reported separately, not hidden by shrinking a label set after the run.
- Every `accepted` citation must exist in the frozen corpus and be access-eligible under the case input. Provider/taxonomy ineligibility is an access exclusion, not a retrieval miss. Route exclusion is a separate failure reported by `routeCoverage`, never hidden by changing the label.
- `no_match` cases have no required facets and no direct labels.
- `corpus_gap` cases are reported separately and never enter the recall denominator.
- Labels are authored without seeing rankings or scores. Ambiguous labels require a second reviewer.
- Re-adjudicate against the frozen corpus, not the historical 54-section capture. Remap historical `RB-F01-F02@1.0.0` citations to `1.1.0` and consider the new `Historical snapshots and missing evidence` section. A current section that independently supplies sufficient guidance for a required facet is accepted even when the historical answer set named a different runbook. Never keep a citation that does not exist in the frozen corpus.
- The existing Task B/Phase 11A cases are exposed development material. The holdout must be authored separately and remain unopened until the configuration is frozen.

### 2.2 Metrics

Primary:

```text
sufficientGuidanceHit@3 =
  eligible answerable cases whose every required facet has at least one
  accepted citation in the returned three
  / all eligible answerable cases
```

Secondary, reported beside the primary metric:

- `macroSectionRecall@3`: mean over eligible answerable cases of the fraction of all accepted citations returned. This preserves the historical section-recall comparison.
- `directPrecision@3`: mean over eligible answerable cases of accepted citations returned divided by returned citations.
- `candidateRecall`: fraction of accepted citations present before the final top-three selection.
- `routeCoverage`: fraction of accepted citations still eligible after routing.
- `noMatchAbstention`: no-match cases with zero returned sections divided by all no-match cases. Unavailable outputs never receive abstention credit.
- `falseAbstention`: eligible answerable cases with zero returned sections divided by all eligible answerable cases.
- `reliability`: available scheduled outputs divided by all scheduled outputs.
- `p95LatencyMs`: measured retrieval latency.
- `allIncidentCoverage`: sufficient hit or correct no-match, across all scheduled cases.

The primary metric is intentionally stricter than macro section recall. A 90% sufficient-guidance result is not evidence that the old macro metric reached 90%, and vice versa.

### 2.3 Gates

| Gate | Development screening | Independent release acceptance |
| --- | --- | --- |
| Sufficient-guidance hit@3 | at least 80% | at least 90% |
| Macro section recall@3 | at least 80% | at least 90% |
| Direct precision | not below the same-corpus keyword control | not below the frozen baseline; every scenario regression explained |
| No-match abstention | at least 90% | at least 90% |
| False abstention | at most 5% | at most 5% |
| Route coverage | 100% of accepted development citations | 100% of accepted holdout citations |
| Reliability | at least 95% | at least 95% |
| Warm retrieval p95 | at most 3 seconds | at most 3 seconds |
| Diagnosis acceptance | 80% on blinded development review | 80% on independent review |
| Safety | zero evaluated unauthorized disclosure, fabricated citation, unsupported definitive repair, or unsafe replay recommendation | same |

The 80% development figure is the master plan's R2 follow-up screening target. The historical 90% release target remains in force. A candidate that reaches only 80% is not accepted.

### 2.4 Stop rule

This plan stops without adding another method when any of the following occurs:

1. The frozen-corpus parity check fails. Fix the measurement before running any model.
2. The route excludes accepted development citations and cannot be repaired as a predeclared soft/global fallback. Do not hide the exclusion with a gold filter.
3. Facet-aware development hit@3 remains below 80% after the one predeclared facet-packing implementation. Do not tune abstention to make a recall failure look acceptable.
4. The support gate cannot reach 90% no-match abstention without more than 5% false abstention on development. Keep the failure explicit.
5. The frozen candidate misses a release gate on the independent holdout. Do not lower the gate, reuse the holdout, or promote the least-bad method.
6. Diagnosis calls are unavailable or the budget is not explicitly approved. Mark diagnosis blocked and do not claim diagnosis acceptance.
7. The work would require a new dependency, model, vector database, or open-ended method search. Stop and request a new scope.

## 3. File map

### Create

- `apps/ai_agent/src/evaluation/retrieval-target.ts` — target benchmark schemas, metric functions, corpus/provenance validation.
- `apps/ai_agent/src/evaluation/retrieval-target-cli.ts` — freeze/prepare/capture/report CLI for immutable runs.
- `apps/ai_agent/src/tools/retrieval-profile.ts` — sanitization, structured query, evidence route, requested facets, anchors.
- `apps/ai_agent/src/tools/section-facets.ts` — heading-to-facet classification and procedural filter.
- `apps/ai_agent/src/tools/facet-pack.ts` — deterministic facet-aware top-three packing.
- `apps/ai_agent/src/tools/structured-ranking.ts` — route-filtered MiniLM ranking, packing, and support decision.
- `apps/ai_agent/src/tools/retrieval-support.ts` — calibrated abstention decision from observed support.
- `apps/ai_agent/src/evaluation/target-diagnosis.ts` — bounded development diagnosis capture using the frozen retrieval configuration.
- `apps/ai_agent/tests/rag-corpus-parity.test.ts` — serving corpus must equal the frozen corpus.
- `apps/ai_agent/tests/retrieval-target.test.ts` — metric and label validation.
- `apps/ai_agent/tests/retrieval-profile.test.ts` — query, route, and facet profile tests.
- `apps/ai_agent/tests/section-facets.test.ts` — heading classification tests.
- `apps/ai_agent/tests/facet-pack.test.ts` — packing tests.
- `apps/ai_agent/tests/retrieval-support.test.ts` — abstention tests.
- `apps/ai_agent/evaluation/r3/protocol.json` — frozen gates and cohort rules.
- `apps/ai_agent/evaluation/r3/corpus-v1.json` — frozen 55-section serving corpus.
- `apps/ai_agent/evaluation/r3/development-cases-v1.json` — unlabeled/inputs and reviewed labels, split by file as below.
- `apps/ai_agent/evaluation/r3/development-labels-v1.json` — independently reviewed facet labels.
- `apps/ai_agent/evaluation/r3/runs/...` — immutable baseline and arm captures.
- `apps/ai_agent/evaluation/r3/selected-retrieval-config.json` — frozen finalist, route flag, support setting, and hashes.
- `apps/ai_agent/evaluation/r3/holdout/...` — separately authored acceptance cases.
- `apps/ai_agent/evaluation/r3/decision.md` — final accepted/rejected result.

### Modify

- `apps/ai_agent/src/tools/search-runbooks.ts` — extract the eligibility boundary; keep legacy behavior.
- `apps/ai_agent/src/tools/runbook-retriever.ts` — add `structured-minilm` only after selection.
- `apps/ai_agent/src/graph.ts` — inject the selected retrieval-input builder without changing the legacy default.
- `apps/ai_agent/src/index.ts` — select the accepted method; keep keyword rollback.
- `apps/ai_agent/src/runner.ts` — only if the injection requires it.
- `apps/ai_agent/src/observability.ts` — retrieval configuration and abstention metadata.
- `apps/ai_agent/tests/search-runbooks.test.ts`, `runbook-retriever.test.ts`, `diagnosis-graph.test.ts` — regression coverage.

### Do not modify

- `docs/AI/runbooks/` during measurement. A corpus edit invalidates the frozen run and requires a new protocol.
- Historical evaluation run directories.
- Generated Prisma files, Graphify caches, replay policy, external action providers.

## 4. Phase 0 — Freeze the corpus before any experiment

### Task 1: Freeze the 55-section serving corpus and the protocol

**Files:**
- Create: `apps/ai_agent/src/evaluation/retrieval-target-cli.ts`
- Create: `apps/ai_agent/evaluation/r3/protocol.json`
- Create: `apps/ai_agent/evaluation/r3/corpus-v1.json` (generated)
- Test: `apps/ai_agent/tests/rag-corpus-parity.test.ts`

**Interfaces:**
- Produces: `freezeTargetCorpus(outPath: string): Promise<{ corpusHash: string; sections: number }>`
- Produces: `loadFrozenCorpus(path: string): Promise<FrozenCorpus>`
- `FrozenSection` is the runtime section without `headingTerms` and `contentTerms`.
- `FrozenCorpus` is `{ version: 1; source: string; corpusHash: string; sections: FrozenSection[] }`.

- [ ] **Step 1: Write the failing parity test**

```ts
import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadRunbooks } from "../src/tools/search-runbooks.ts";
import { defaultRunbookDirectory } from "../src/paths.ts";

const artifact = join(import.meta.dir, "../evaluation/r3/corpus-v1.json");

describe("frozen target-recovery corpus", () => {
  test("matches the six runbooks actually served", async () => {
    const frozen = JSON.parse(await readFile(artifact, "utf8")) as {
      corpusHash: string;
      sections: unknown[];
    };
    const index = await loadRunbooks(defaultRunbookDirectory());
    const sections = index.map(({ headingTerms, contentTerms, ...section }) => section);

    expect(index).toHaveLength(55);
    expect(sections).toEqual(frozen.sections);
    expect(index.filter((section) => section.id === "RB-F01-F02")).toHaveLength(10);
    expect(frozen.corpusHash).toMatch(/^[a-f0-9]{64}$/);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails because the artifact is absent**

Run: `bun test apps/ai_agent/tests/rag-corpus-parity.test.ts`

Expected: FAIL with `ENOENT` for `evaluation/r3/corpus-v1.json`.

- [ ] **Step 3: Implement the freeze command**

Use the existing loader; do not duplicate runbook parsing.

```ts
// retrieval-target-cli.ts
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { loadRunbooks } from "../tools/search-runbooks.ts";
import { defaultRunbookDirectory } from "../paths.ts";

const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

export async function freezeTargetCorpus(outPath: string) {
  const index = await loadRunbooks(defaultRunbookDirectory());
  const sections = index.map(({ headingTerms, contentTerms, ...section }) => section);
  const corpusHash = hash(sections);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(
    outPath,
    JSON.stringify({ version: 1, source: "docs/AI/runbooks", corpusHash, sections }, null, 2) + "\n",
    { flag: "wx" },
  );
  return { corpusHash, sections: sections.length };
}
```

Add a `--freeze-corpus <path>` branch with `parseArgs`. Refuse to overwrite an existing artifact.

- [ ] **Step 4: Generate the frozen corpus**

Run: `bun run apps/ai_agent/src/evaluation/retrieval-target-cli.ts --freeze-corpus apps/ai_agent/evaluation/r3/corpus-v1.json`

Expected: `55 sections` and a 64-character `corpusHash`.

- [ ] **Step 5: Write `protocol.json` before seeing any scores**

```json
{
  "version": 1,
  "status": "frozen_before_measurement",
  "createdAt": "2026-10-19",
  "corpus": {
    "path": "apps/ai_agent/evaluation/r3/corpus-v1.json",
    "runbooks": 6,
    "sections": 55
  },
  "development": { "cases": 24, "answerable": 16, "noMatch": 8 },
  "holdout": { "cases": 40, "answerable": 30, "noMatch": 10, "status": "not_authored" },
  "gates": {
    "developmentSufficientGuidanceHitAt3": 0.8,
    "releaseSufficientGuidanceHitAt3": 0.9,
    "releaseMacroSectionRecallAt3": 0.9,
    "noMatchAbstention": 0.9,
    "falseAbstentionMax": 0.05,
    "diagnosisAcceptance": 0.8,
    "reliability": 0.95,
    "p95LatencyMs": 3000
  },
  "excluded": [
    "apps/ai_agent/evaluation/r25/runs/fresh-v1",
    "apps/ai_agent/evaluation/r25/runs/exhaustive-v2",
    "any future holdout until configuration freeze"
  ]
}
```

- [ ] **Step 6: Re-run the parity test**

Run: `bun test apps/ai_agent/tests/rag-corpus-parity.test.ts`

Expected: PASS. A later runbook edit must fail this test until a new corpus artifact and protocol are explicitly created.

- [ ] **Step 7: Checkpoint handoff**

Inspect the diff. Record the corpus hash, section count, and exact files. Do not commit automatically.

### Task 2: Fail closed on corpus drift in the evaluation harness

**Files:**
- Create: `apps/ai_agent/src/evaluation/retrieval-target.ts`
- Test: `apps/ai_agent/tests/retrieval-target.test.ts`

**Interfaces:**
- Produces: `export type FrozenSection = Omit<RunbookIndex[number], "headingTerms" | "contentTerms">`
- Produces: `export type FrozenCorpus = { version: 1; source: string; corpusHash: string; sections: FrozenSection[] }`
- Produces: `verifyTargetCorpus(index: RunbookIndex, frozen: FrozenCorpus): void`
- Throws `Error("Target corpus changed; create a new protocol")` when the canonical section list differs.

- [ ] **Step 1: Write the failing test**

```ts
import { verifyTargetCorpus } from "../src/evaluation/retrieval-target.ts";

test("rejects a corpus that differs from the frozen artifact", () => {
  const frozen = { corpusHash: "a".repeat(64), sections: [] };
  expect(() => verifyTargetCorpus([], frozen as never)).toThrow("Target corpus changed");
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `bun test apps/ai_agent/tests/retrieval-target.test.ts -t "rejects a corpus"`

Expected: FAIL because `verifyTargetCorpus` is not defined.

- [ ] **Step 3: Implement canonical comparison**

```ts
export function verifyTargetCorpus(index: RunbookIndex, frozen: FrozenCorpus) {
  const sections = index.map(({ headingTerms, contentTerms, ...section }) => section);
  const actualHash = createHash("sha256").update(JSON.stringify(sections)).digest("hex");
  if (actualHash !== frozen.corpusHash || JSON.stringify(sections) !== JSON.stringify(frozen.sections)) {
    throw new Error("Target corpus changed; create a new protocol");
  }
}
```

- [ ] **Step 4: Run the test**

Run: `bun test apps/ai_agent/tests/retrieval-target.test.ts`

Expected: PASS.

## 5. Phase 1 — Build a trustworthy benchmark and re-baseline the runtime

### Task 3: Extract one eligibility boundary

**Files:**
- Modify: `apps/ai_agent/src/tools/search-runbooks.ts`
- Test: `apps/ai_agent/tests/search-runbooks.test.ts`

**Interfaces:**
- Produces: `eligibleRunbookSections(index: RunbookIndex, input: RunbookSearchInput): RunbookIndex`
- Produces: `toRunbookMatch(section: RunbookIndex[number], score: number): RunbookMatch`
- `eligibleRunbookSections` applies current-status, taxonomy, and provider eligibility only. It does not apply query scoring, route hints, facets, or a cutoff.

- [ ] **Step 1: Write the failing test**

```ts
test("exposes the same eligibility boundary used by keyword search", async () => {
  const index = await loadRunbooks(repositoryRunbooks);
  const input = { query: "HTTP 429", providers: ["telegram"], taxonomy: ["F01"] } as const;
  const eligible = eligibleRunbookSections(index, input);

  expect(eligible.length).toBeGreaterThan(0);
  expect(eligible.every((section) => section.taxonomy.includes("F01"))).toBe(true);
  expect(eligible.every((section) => section.providers.includes("telegram") || section.providers.includes("generic"))).toBe(true);
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `bun test apps/ai_agent/tests/search-runbooks.test.ts -t "exposes the same eligibility"`

Expected: FAIL because the export does not exist.

- [ ] **Step 3: Extract validation and filtering without changing legacy output**

```ts
function validatedSearchInput(input: RunbookSearchInput) {
  const query = input.query.trim();
  if (!query || query.length > maximumQueryLength) {
    throw new RangeError(`Runbook query must contain 1-${maximumQueryLength} characters`);
  }
  const limit = input.limit ?? 3;
  if (!Number.isInteger(limit) || limit < 1 || limit > 3) {
    throw new RangeError("Runbook result limit must be between 1 and 3");
  }
  return {
    query,
    limit,
    taxonomy: normalizedFilters(input.taxonomy, "Taxonomy"),
    providers: normalizedFilters(input.providers, "Provider"),
  };
}

export function eligibleRunbookSections(index: RunbookIndex, input: RunbookSearchInput): RunbookIndex {
  const { taxonomy, providers } = validatedSearchInput(input);
  return index.filter(
    (section) =>
      section.status === "current" &&
      intersects(taxonomy, section.taxonomy) &&
      (section.providers.includes("generic") || intersects(providers, section.providers)),
  );
}

export function toRunbookMatch(section: RunbookIndex[number], score: number): RunbookMatch {
  return {
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
  };
}
```

Have `searchRunbooks` call `eligibleRunbookSections` and map through `toRunbookMatch`. The keyword output and ordering must remain identical.

- [ ] **Step 4: Run the focused search and retriever tests**

Run: `bun test apps/ai_agent/tests/search-runbooks.test.ts apps/ai_agent/tests/runbook-retriever.test.ts`

Expected: PASS, including the existing citation-order and provider-filter tests.

### Task 4: Implement target metrics and strict label validation

**Files:**
- Modify: `apps/ai_agent/src/evaluation/retrieval-target.ts`
- Modify: `apps/ai_agent/tests/retrieval-target.test.ts`

**Interfaces:**
- Produces: `TargetInputSchema`, `TargetCaseSchema`, `TargetOutputSchema`, `loadTargetCases(path)`
- Produces: `TargetLabelFileSchema`, `loadTargetLabels(path)` (defined with the label workflow in Task 5)
- Produces: `scoreTarget(index, cases, outputs): TargetReport`
- `TargetReport.metrics` includes `sufficientGuidanceHitAt3`, `macroSectionRecallAt3`, `directPrecisionAt3`, `candidateRecall`, `routeCoverage`.
- `TargetReport` also carries `noMatchAbstention`, `falseAbstention`, `reliability`, `allIncidentCoverage`, `p95LatencyMs`, and `counts` (scheduled, eligible answerable, no-match, corpus-gap, provider-excluded, unavailable).

- [ ] **Step 1: Write the failing metric test**

```ts
import type { RunbookIndex } from "../src/tools/search-runbooks.ts";
import { scoreTarget, type TargetCase, type TargetOutput } from "../src/evaluation/retrieval-target.ts";

const section = (id: string): RunbookIndex[number] => ({
  id: "RB-A", version: "1.0.0", simulated: true, status: "current",
  owner: "AI operations", reviewed: "2026-10-19", taxonomy: ["F01"],
  providers: ["generic"], codeVersion: "test", citation: `RB-A@1.0.0#${id}`,
  heading: id, content: `${id} content`, contentHash: "a".repeat(64),
  headingTerms: new Set([id]), contentTerms: new Set([id]),
});
const index = [section("a"), section("b"), section("c"), section("x")];
const input = { query: "observed failure", limit: 3 } as const;
const base = { split: "development", supporting: [], missingRuntimeFacts: [] } as const;

test("counts a hit only when every required facet is covered", () => {
  const cases: TargetCase[] = [
    { ...base, id: "hit", kind: "answerable", input,
      requiredFacets: [
        { facet: "evidence", accepted: ["RB-A@1.0.0#a"] },
        { facet: "verification", accepted: ["RB-A@1.0.0#b"] },
      ] },
    { ...base, id: "miss", kind: "answerable", input,
      requiredFacets: [
        { facet: "evidence", accepted: ["RB-A@1.0.0#a"] },
        { facet: "verification", accepted: ["RB-A@1.0.0#b"] },
      ] },
    { ...base, id: "negative", kind: "no_match", input, requiredFacets: [] },
  ];
  const outputs: TargetOutput[] = [
    { id: "hit", returned: ["RB-A@1.0.0#a", "RB-A@1.0.0#b"], latencyMs: 10 },
    { id: "miss", returned: ["RB-A@1.0.0#a", "RB-A@1.0.0#c"], latencyMs: 10 },
    { id: "negative", returned: [], latencyMs: 10 },
  ];
  const report = scoreTarget(index, cases, outputs);

  expect(report.metrics.sufficientGuidanceHitAt3).toBe(0.5);
  expect(report.noMatchAbstention.rate).toBe(1);
  expect(report.falseAbstention.rate).toBe(0);
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `bun test apps/ai_agent/tests/retrieval-target.test.ts -t "every required facet"`

Expected: FAIL because `scoreTarget` is not defined.

- [ ] **Step 3: Implement the schema and score function**

```ts
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { eligibleRunbookSections, type RunbookIndex } from "../tools/search-runbooks.ts";

export const TargetInputSchema = z.object({
  query: z.string().min(1).max(500),
  taxonomy: z.array(z.string()).optional(),
  providers: z.array(z.string()).optional(),
  limit: z.literal(3).optional(),
}).strict();

const FacetSchema = z.enum([
  "symptoms", "evidence", "investigation", "remediation",
  "forbidden", "replay", "verification",
]);

export const TargetCaseSchema = z.object({
  id: z.string().min(1),
  split: z.enum(["development", "holdout"]),
  kind: z.enum(["answerable", "no_match", "corpus_gap"]),
  input: TargetInputSchema,
  requiredFacets: z.array(z.object({
    facet: FacetSchema,
    accepted: z.array(z.string().min(1)).min(1),
  })).max(3),
  supporting: z.array(z.string().min(1)),
  missingRuntimeFacts: z.array(z.string().min(1)),
}).strict();

export type TargetCase = z.infer<typeof TargetCaseSchema>;

export const TargetOutputSchema = z.union([
  z.object({
    id: z.string().min(1),
    returned: z.array(z.string().min(1)).max(3),
    latencyMs: z.number().finite().nonnegative(),
    candidates: z.array(z.string().min(1)).optional(),
    routeExcluded: z.array(z.string().min(1)).optional(),
  }).strict(),
  z.object({ id: z.string().min(1), error: z.string().min(1) }).strict(),
]);

export type TargetOutput = z.infer<typeof TargetOutputSchema>;

export async function loadTargetCases(path: string): Promise<TargetCase[]> {
  return TargetCaseSchema.array().parse(JSON.parse(await readFile(path, "utf8")));
}

const fraction = (numerator: number, denominator: number) => ({
  numerator,
  denominator,
  rate: denominator ? numerator / denominator : null,
});

export function scoreTarget(
  index: RunbookIndex,
  rawCases: readonly TargetCase[],
  rawOutputs: readonly TargetOutput[],
) {
  const cases = TargetCaseSchema.array().parse(rawCases);
  const outputs = TargetOutputSchema.array().parse(rawOutputs);
  if (new Set(cases.map((item) => item.id)).size !== cases.length)
    throw new Error("Duplicate target case");
  if (new Set(outputs.map((item) => item.id)).size !== outputs.length)
    throw new Error("Duplicate target output");
  if (outputs.some((output) => !cases.some((item) => item.id === output.id)))
    throw new Error("Unknown target output");
  const known = new Set(index.map((section) => section.citation));

  const rows = cases.map((item) => {
    const output = outputs.find((candidate) => candidate.id === item.id);
    const available = Boolean(output && "returned" in output);
    const returned = output && "returned" in output ? output.returned : [];
    if (new Set(returned).size !== returned.length)
      throw new Error(`Duplicate returned citation: ${item.id}`);
    if (returned.some((citation) => !known.has(citation)))
      throw new Error(`Unknown returned citation: ${item.id}`);
    const eligible = new Set(
      eligibleRunbookSections(index, item.input).map((section) => section.citation),
    );
    if (returned.some((citation) => !eligible.has(citation)))
      throw new Error(`Ineligible returned citation: ${item.id}`);

    if (item.kind !== "answerable") {
      if (item.requiredFacets.length)
        throw new Error(`Direct labels on ${item.kind} case: ${item.id}`);
      if (item.supporting.some((citation) => !known.has(citation)))
        throw new Error(`Unknown supporting citation: ${item.id}`);
      return {
        id: item.id, kind: item.kind, available, returned,
        eligibleAnswerable: false, sufficient: false, sectionRecall: null,
        directPrecision: 0, candidateRecall: null, routeCoverage: null,
        providerExcluded: false, accepted: 0,
      };
    }
    if (!item.requiredFacets.length)
      throw new Error(`Answerable case has no required facet: ${item.id}`);

    const feasible = item.requiredFacets.map((facet) => {
      if (new Set(facet.accepted).size !== facet.accepted.length)
        throw new Error(`Duplicate accepted citation: ${item.id}`);
      if (facet.accepted.some((citation) => !known.has(citation)))
        throw new Error(`Unknown accepted citation: ${item.id}`);
      return {
        ...facet,
        accepted: facet.accepted.filter((citation) => eligible.has(citation)),
      };
    });
    const accepted = [...new Set(feasible.flatMap((facet) => facet.accepted))];
    if (item.supporting.some((citation) => !known.has(citation)))
      throw new Error(`Unknown supporting citation: ${item.id}`);
    if (item.supporting.some((citation) => accepted.includes(citation)))
      throw new Error(`Supporting citation is also accepted: ${item.id}`);

    const eligibleAnswerable = feasible.every((facet) => facet.accepted.length > 0);
    if (!eligibleAnswerable) {
      return {
        id: item.id, kind: item.kind, available, returned,
        eligibleAnswerable: false, sufficient: false, sectionRecall: null,
        directPrecision: 0, candidateRecall: null, routeCoverage: null,
        providerExcluded: true, accepted: accepted.length,
      };
    }

    const hits = accepted.filter((citation) => returned.includes(citation));
    const facetsCovered = feasible.filter((facet) =>
      facet.accepted.some((citation) => returned.includes(citation)),
    );
    const candidates = output && "returned" in output ? output.candidates : undefined;
    if (candidates?.some((citation) => !known.has(citation)))
      throw new Error(`Unknown candidate citation: ${item.id}`);
    const routeExcluded = (output && "returned" in output ? output.routeExcluded : []) ?? [];
    if (routeExcluded.some((citation) => !known.has(citation)))
      throw new Error(`Unknown route exclusion: ${item.id}`);
    const candidateHits = candidates
      ? accepted.filter((citation) => candidates.includes(citation)).length
      : accepted.length;
    const routeExcludedAccepted = accepted.filter((citation) =>
      routeExcluded.includes(citation),
    ).length;

    return {
      id: item.id,
      kind: item.kind,
      available,
      returned,
      eligibleAnswerable: true,
      sufficient: facetsCovered.length === feasible.length,
      sectionRecall: hits.length / accepted.length,
      directPrecision: returned.length ? hits.length / returned.length : 0,
      candidateRecall: candidateHits / accepted.length,
      routeCoverage: accepted.length
        ? (accepted.length - routeExcludedAccepted) / accepted.length
        : 1,
      providerExcluded: false,
      accepted: accepted.length,
    };
  });

  const positives = rows.filter((row) => row.eligibleAnswerable);
  const negatives = rows.filter((row) => row.kind === "no_match");
  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
  const mean = (values: number[]) =>
    values.length ? sum(values) / values.length : null;
  const latencies = rows
    .flatMap((row) => {
      const output = outputs.find((item) => item.id === row.id);
      return output && "latencyMs" in output ? [output.latencyMs] : [];
    })
    .sort((left, right) => left - right);

  return {
    rows,
    counts: {
      scheduled: rows.length,
      eligibleAnswerable: positives.length,
      noMatch: negatives.length,
      corpusGap: rows.filter((row) => row.kind === "corpus_gap").length,
      providerExcluded: rows.filter((row) => row.providerExcluded).length,
      unavailable: rows.filter((row) => !row.available).length,
    },
    metrics: {
      sufficientGuidanceHitAt3: fraction(
        positives.filter((row) => row.sufficient).length,
        positives.length,
      ).rate,
      macroSectionRecallAt3: mean(positives.map((row) => row.sectionRecall ?? 0)),
      directPrecisionAt3: mean(positives.map((row) => row.directPrecision)),
      candidateRecall: mean(positives.map((row) => row.candidateRecall ?? 1)),
      routeCoverage: mean(positives.map((row) => row.routeCoverage ?? 1)),
    },
    noMatchAbstention: fraction(
      negatives.filter((row) => row.available && row.returned.length === 0).length,
      negatives.length,
    ),
    falseAbstention: fraction(
      positives.filter((row) => row.available && row.returned.length === 0).length,
      positives.length,
    ),
    reliability: fraction(
      rows.filter((row) => row.available).length,
      rows.length,
    ),
    allIncidentCoverage: fraction(
      rows.filter((row) =>
        row.sufficient ||
        (row.kind === "no_match" && row.available && row.returned.length === 0),
      ).length,
      rows.length,
    ),
    p95LatencyMs: latencies.length
      ? latencies[Math.ceil(latencies.length * 0.95) - 1]
      : null,
  };
}
```

The implementation is intentionally explicit: labels that lose eligibility are reported as access exclusions, never as retrieval misses, and unavailable outputs never count as successful abstention.

- [ ] **Step 4: Run the metric test**

Run: `bun test apps/ai_agent/tests/retrieval-target.test.ts`

Expected: PASS.

### Task 5: Prepare the 24-case development cohort and capture the true baseline

**Files:**
- Create/modify: `apps/ai_agent/src/evaluation/retrieval-target-cli.ts`
- Create: `apps/ai_agent/evaluation/r3/development-cases-v1.json`
- Create: `apps/ai_agent/evaluation/r3/development-labels-v1.json`
- Create: `apps/ai_agent/evaluation/r3/runs/baseline-20261019-v1/`
- Test: `apps/ai_agent/tests/retrieval-target.test.ts`

**Interfaces:**
- Consumes: `retrievalInput` and the frozen corpus.
- Produces: `prepareTargetBenchmark(outDir: string): Promise<void>`
- Produces: `prepareBaselineInference(outDir: string): Promise<void>`
- Produces: `reportTargetRun(runDir: string): Promise<void>`

- [ ] **Step 1: Assemble the cohort without changing evidence**

Use all 24 cases in `apps/ai_agent/evaluation/production-selection/development-review-v3.json`. Its `input` and `evidence` fields are the frozen production capture aligned to the prior 54-section corpus; the 16 answerable cases overlap `runs/task-a-20261013-v1/development-inputs.json`, while the 8 no-match controls are the review's `new_development_no_match` cases:

- 16 answerable incidents with exact production `retrievalInput` evidence;
- 8 new development no-match controls with their captured evidence and provider filters;
- no fresh R2.5 question or label.

The review labels and `answerSets` still cite `RB-F01-F02@1.0.0`, while the frozen benchmark uses `1.1.0` with one added section. Do not copy those citations. Re-adjudicate every accepted citation against the 55-section frozen corpus and remap the F01/F02 version before the labels are hashed.

F06 and S01 are not added as development positives: their Phase 11A development contexts are authorization rejections with no evidence bundle. The independent holdout must cover F06 and the other missing families. Record the 24-case provenance and do not pool these cases with the 54-section Task B scores.

- [ ] **Step 2: Add the failing completeness test**

```ts
test("development cohort covers the exposed answerable set and eight no-match cases", async () => {
  const cases = await loadTargetCases("apps/ai_agent/evaluation/r3/development-cases-v1.json");
  expect(cases).toHaveLength(24);
  expect(cases.filter((c) => c.kind === "answerable")).toHaveLength(16);
  expect(cases.filter((c) => c.kind === "no_match")).toHaveLength(8);
  expect(new Set(cases.filter((c) => c.kind === "answerable").map((c) => c.input.query)).size).toBe(16);
});
```

- [ ] **Step 3: Prepare the score-blind review packet**

`prepareTargetBenchmark` must emit all 55 sections for every case with no scores or rankings. The existing `answerSets`/`direct` lists are prior section-level labels, not facet labels. Re-adjudicate them into required facets and accepted citations without seeing scores: decide whether the incident genuinely requires one facet or several complementary facets, and record the rationale. Do not invent a facet just to make a method's output look covered.

`development-labels-v1.json` must use a validated shape, not free-form text:

```json
{
  "version": 1,
  "cases": [
    {
      "id": "f01-rate-limit-rejected",
      "requiredFacets": [
        {
          "facet": "remediation",
          "accepted": ["RB-F01-F02@1.1.0#allowed-remediation"],
          "rationale": "The observed 429 needs the bounded wait/replay procedure."
        }
      ],
      "supporting": [],
      "missingRuntimeFacts": [],
      "noMatchRationale": null
    }
  ]
}
```

For each answerable case, record the required facet order, every independently sufficient accepted citation per facet, supporting-only citations, missing runtime facts, and a rationale per accepted citation. A facet may have several accepted citations when more than one current section supplies sufficient guidance, including equivalent sections from different runbooks. For every no-match case, record why no current section is sufficient. Do not mark a section irrelevant merely because it was not returned by a method.

Define `TargetLabelFileSchema` and `loadTargetLabels(path)` in `retrieval-target.ts` and validate the file before merging. The cases file initially carries `requiredFacets: []`. After review, `prepareTargetBenchmark` merges the labels into `development-cases-v1.json` by case id. It must refuse to run if an answerable case lacks a label, a no-match case carries one, a label carries a citation absent from the frozen corpus, a facet appears twice, or the two files disagree on `supporting` or `missingRuntimeFacts`. The labels file remains the source of truth for the frozen hash.

Add the corpus/version guard before any score:

```ts
test("reviewed labels cite only the frozen corpus", async () => {
  const frozen = JSON.parse(await readFile(corpusPath, "utf8")) as FrozenCorpus;
  const labels = await loadTargetLabels(labelsPath);
  const known = new Set(frozen.sections.map((section) => section.citation));
  const cited = labels.cases.flatMap((item) =>
    item.requiredFacets.flatMap((facet) => facet.accepted),
  );
  expect(cited.every((citation) => known.has(citation))).toBe(true);
  // Other runbooks remain 1.0.0; only the remapped F01/F02 citations are stale.
  expect(JSON.stringify(labels)).not.toContain("RB-F01-F02@1.0.0");
});
```

- [ ] **Step 4: Freeze labels before scoring**

Compute the label file hash and write it into the run manifest. The baseline must refuse to run if the hash changes after capture. A label change requires a new run directory.

- [ ] **Step 5: Generate the baseline inference input**

Run:

```powershell
bun run apps/ai_agent/src/evaluation/retrieval-target-cli.ts --prepare-baseline apps/ai_agent/evaluation/r3/runs/baseline-20261019-v1
```

This writes one inference file compatible with `r23-models.mjs`:

```text
{ inputHash, config, queries: [{ id, query, candidates, passages: { original: { [citation]: heading + content } } }] }
```

`candidates` is every section eligible under the case input, sorted by citation. That is 55 for `telegram`/`email`, but 37 for `worker`/`database`, where only the four `generic` runbooks are eligible. `config` is `{ models: { reranker: <pinned descriptor from apps/ai_agent/evaluation/r23/config.json> }, variants: ["original"], batchSize: 8, maxLength: 512 }`. Compute `inputHash` with the existing `hash` from `retrieval-r21.ts` so `r23-models.mjs` accepts the file. Also write the corpus, protocol, and label hashes to the run manifest.

- [ ] **Step 6: Score the two baseline arms**

The keyword arm is computed in-process by the report command. The `minilm-original` arm is scored from the prepared input with the pinned MiniLM scorer:

```powershell
node --experimental-transform-types apps/ai_agent/src/evaluation/r23-models.mjs apps/ai_agent/evaluation/r3/runs/baseline-20261019-v1/inference-original.json apps/ai_agent/evaluation/r3/runs/baseline-20261019-v1/scores-original.json
bun run apps/ai_agent/src/evaluation/retrieval-target-cli.ts --report apps/ai_agent/evaluation/r3/runs/baseline-20261019-v1
```

The report must contain:

- keyword and `minilm-original` rows;
- sufficient-guidance hit@3, macro section recall, direct precision, candidate recall, no-match abstention, false abstention, route coverage, reliability, p95;
- per-case returned citations and scores;
- a failure ledger with `query_observation`, `route_exclusion`, `candidate_omission`, `wrong_rank`, `facet_packing`, `cutoff_rejection`, `no_suitable_corpus_guidance`, and `unavailable_output`.

- [ ] **Step 7: Verify the baseline**

Run: `bun test apps/ai_agent/tests/retrieval-target.test.ts apps/ai_agent/tests/rag-corpus-parity.test.ts`

Expected: PASS. Record the baseline result even if it is below target. Do not alter the protocol or labels in response to the baseline.

## 6. Phase 2 — Structured evidence profile and metadata route

### Task 6: Extract observed facts and derive the evidence route

**Files:**
- Create: `apps/ai_agent/src/tools/retrieval-profile.ts`
- Test: `apps/ai_agent/tests/retrieval-profile.test.ts`

**Interfaces:**
- Produces: `observedFacts(evidence: DiagnosisEvidence): ObservedFacts`
- Produces: `routeEvidence(evidence: DiagnosisEvidence): { hints: string[]; confident: boolean; reasons: string[] }`
- `hints` are taxonomy codes present in the runbook metadata. `reasons` are safe field names such as `provider_status:429`, never raw error text.

- [ ] **Step 1: Write the failing route tests**

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { DiagnosisEvidence } from "../src/contracts.ts";
import { routeEvidence } from "../src/tools/retrieval-profile.ts";

const taskA = JSON.parse(readFileSync(
  join(import.meta.dir, "../evaluation/production-selection/runs/task-a-20261013-v1/development-inputs.json"),
  "utf8",
)) as Array<{ id: string; input: import("../src/tools/search-runbooks.ts").RunbookSearchInput; evidence: DiagnosisEvidence }>;
const review = JSON.parse(readFileSync(
  join(import.meta.dir, "../evaluation/production-selection/development-review-v3.json"),
  "utf8",
)) as { cases: Array<{ id: string; kind: "answerable" | "no_match"; evidence: DiagnosisEvidence }> };

const evidenceFor = (id: string) =>
  taskA.find((item) => item.id === id)?.evidence ??
  review.cases.find((item) => item.id === id)!.evidence;

test("routes an explicit 429 to F01", () => {
  expect(routeEvidence(evidenceFor("f01-rate-limit-rejected"))).toMatchObject({
    hints: ["F01"],
    confident: true,
  });
});

test("routes ambiguous delivery to F07 without inventing a cause", () => {
  expect(routeEvidence(evidenceFor("f07-provider-response-lost")).hints).toContain("F07");
});

test("returns no route for every development no-match incident", () => {
  for (const item of review.cases.filter((c) => c.kind === "no_match")) {
    expect(routeEvidence(item.evidence)).toEqual({
      hints: [],
      confident: false,
      reasons: [],
    });
  }
});

test("routes credential and destination faults from fixture observations", () => {
  expect(routeEvidence(evidenceFor("f03-token-missing")).hints).toContain("F03");
  expect(routeEvidence(evidenceFor("f03-permission-ambiguous")).hints).toContain("F03");
  expect(routeEvidence(evidenceFor("f04-template-path-missing")).hints).toContain("F04");
  expect(routeEvidence(evidenceFor("f04-invalid-destination")).hints).toContain("F04");
});

test("routes unsupported handlers, duplicates, DLQ gaps, and SDK errors", () => {
  expect(routeEvidence(evidenceFor("f05-unsupported-action")).hints).toContain("F05");
  expect(routeEvidence(evidenceFor("f05-handler-version-unknown")).hints).toContain("F05");
  expect(routeEvidence(evidenceFor("f08-duplicate-retry-row")).hints).toContain("F08");
  expect(routeEvidence(evidenceFor("f09-database-sink-only")).hints).toContain("F09");
  expect(routeEvidence(evidenceFor("f10-sdk-error-recorded-success")).hints).toContain("F10");
});
```

- [ ] **Step 2: Run the tests and confirm they fail for the new module**

Run: `bun test apps/ai_agent/tests/retrieval-profile.test.ts`

Expected: FAIL because the module and `routeEvidence` do not exist.

- [ ] **Step 3: Implement `observedFacts` and the predeclared route table**

`observedFacts` flattens only observed evidence fields:

```ts
export type ObservedFacts = {
  finalError: string | null;
  actionType: string | null;
  provider: string | null;
  phase: string | null;
  outcome: string | null;
  status: number | null;
  retryAfterSeconds: number | null;
  safeCode: string | null;
  executionStatus: string | null;
  executionOutcome: string | null;
  ordering: string | null;
  missingPredecessors: number[];
  validationStatus: string | null;
  supported: boolean | null;
  blockedReasons: string[];
  missingFields: string[];
  invalidFields: string[];
  missingTemplates: string[];
  absentCredentials: string[];
  attempts: string[];
  providers: string[];
  sourceKind: string | null;
  fixtureFacts: string[];
  deliveryUnknown: boolean;
};
```

Use `failureContext.facts`, `executionEvidence.facts`, and `inputValidation.facts`; include `fixture_observation` only when the evidence is simulated. The fixture observation is observed evidence, not a label: use its `observed_facts`, `execution_status`, and `delivery_outcome` exactly like captured facts. In the development fixtures, validation often reports `blocked` with `supported: null`, so the fixture facts and bounded `finalError` carry the discriminating signal.

Derive the flattened values without inventing facts:

- `status` is `retry.provider_status`, then an attempt status, then a bounded HTTP status parsed from `final_error` (for example `429`), in that order.
- `retryAfterSeconds` is `retry.retry_after_seconds`, then a bounded `retry_after_<n>` value parsed from `final_error`, then a `retry_after_<n>_seconds` fixture fact.
- `finalError` is `retry.final_error`, falling back to the fixture's `final_error`.
- `executionStatus` and `outcome` prefer `current_execution`, then the fixture observation.
- `deliveryUnknown` is true when any observed `provider_outcome` or fixture `delivery_outcome` is `unknown`.
- `absentCredentials` contains fields whose `credential_presence.present` is false.

These derivations make the 429 and retry-after fixture visible without reading a case id or label. Map the route table to those fields:

| Observed signal | Hints |
| --- | --- |
| `status === 429`, `retryAfterSeconds !== null`, or `fixtureFacts` contains `retry_after_`/`all_attempts_rejected` | `F01` |
| `status >= 500`, or `safeCode`/`finalError` matches `timeout|network|connection|refused`, or `fixtureFacts` contains `failure_before_send`/`all_attempts_not_delivered` | `F02` |
| `status === 401`, `absentCredentials.length > 0`, `fixtureFacts` contains `configured_token_absent`/`resolver_error_generic`/`credential_`/`permission_`, or `finalError` matches `token|credential|permission|channel username`. A bare `403` never routes; it must also carry one of the credential/permission/channel signals. | `F03` |
| `validationStatus === "invalid"`, `missingFields.length > 0`, `invalidFields.length > 0`, `missingTemplates.length > 0`, or `fixtureFacts` contains `template_path_missing`/`resolved_destination_empty`/`destination_format_invalid`/`missing_template` | `F04` |
| `supported === false`, `fixtureFacts` contains `handler_not_registered`/`unsupported_action_type`, or `finalError` matches `unsupported action type|no action handler` | `F05` |
| `ordering === "invalid"`, `missingPredecessors.length > 0`, or `fixtureFacts` contains `ordering_invalid`/`missing_predecessor` | `F06` |
| `deliveryUnknown`, execution status `UNKNOWN`/`PENDING`, `fixtureFacts` contains `request_transmitted`/`response_missing`, or `finalError` matches `response was lost` | `F07` |
| `safeCode`/`finalError`/`fixtureFacts` contains `duplicate`, `stale`, `already_success`, `same_retry_identity_seen_twice`, or `success_stage_republished` | `F08` |
| `sourceKind === "reconciled_execution"`, `fixtureFacts` contains `dead_letter_absent`/`dlq_publication_missing`, or `finalError` matches `dead-letter|dlq|kafka.*publication` | `F09` |
| `fixtureFacts` contains `sdk_error_value_discarded`/`success_status_recorded`, or execution status is `SUCCESS` together with an SDK error observation | `F10` |

Do not use case ids, family names, or scenario labels to select hints.

Rules:

- Add every matching hint. The route is a union, not a single guess.
- `confident` is true only when at least one hint matches.
- A generic phrase such as "failure" or "workflow failed" produces no hint.
- Do not use `taxonomy_id`, expected labels, `expectedDiagnosis`, or citation lists.
- Keep the reason list bounded and safe: field names plus the matched status/code, never the raw error body.

- [ ] **Step 4: Run the route tests**

Run: `bun test apps/ai_agent/tests/retrieval-profile.test.ts`

Expected: PASS.

### Task 7: Build the structured query and keep the legacy query unchanged

**Files:**
- Modify: `apps/ai_agent/src/tools/retrieval-profile.ts`
- Modify: `apps/ai_agent/src/graph.ts` (move/import sanitizer only; keep `retrievalInput` output identical)
- Test: `apps/ai_agent/tests/retrieval-profile.test.ts`

**Interfaces:**
- Produces: `sanitizedQueryText(value: string): string` with the current redaction behavior.
- Produces: `RequestedFacet`, the seven guidance facets the packer may request.
- Produces: `EvidenceRoute = { hints: string[]; confident: boolean; reasons: string[] }`.
- Produces: `StructuredRunbookSearchInput = RunbookSearchInput & { route?: EvidenceRoute; requestedFacets?: readonly RequestedFacet[]; anchors?: readonly string[] }`.
- Produces: `buildStructuredRetrievalInput(evidence: DiagnosisEvidence): StructuredRunbookSearchInput`.
- Produces: `requestedGuidanceFacets(evidence: DiagnosisEvidence): RequestedFacet[]`
- Produces: `evidenceAnchors(evidence: DiagnosisEvidence): string[]`
- `retrievalInput(evidence)` remains the legacy function and is not replaced in this task.

- [ ] **Step 1: Write the failing profile tests**

```ts
import { retrievalInput } from "../src/graph.ts";
import {
  buildStructuredRetrievalInput,
  requestedGuidanceFacets,
} from "../src/tools/retrieval-profile.ts";

test("legacy retrievalInput remains byte-for-byte stable over all task-A inputs", () => {
  for (const item of taskA) expect(retrievalInput(item.evidence)).toEqual(item.input);
});

test("structured input removes fixture-only controls and keeps observed anchors", () => {
  const input = buildStructuredRetrievalInput(evidenceFor("f01-rate-limit-rejected"));
  expect(input.query).not.toContain("controlled_fixture");
  expect(input.query).not.toContain("support_unknown");
  expect(input.query).not.toContain("fixture_inputs_unavailable");
  expect(input.query).toContain("429");
  expect(input.route?.hints).toContain("F01");
  expect(input.anchors).toContain("429");
  expect(input.requestedFacets).toEqual(["remediation", "replay", "verification"]);
});

test("requests the facets each evidence family needs", () => {
  expect(requestedGuidanceFacets(evidenceFor("f02-connection-refused"))).toEqual([
    "investigation", "remediation", "verification",
  ]);
  expect(requestedGuidanceFacets(evidenceFor("f05-unsupported-action"))).toEqual([
    "investigation", "replay", "verification",
  ]);
  expect(requestedGuidanceFacets(evidenceFor("f07-provider-response-lost"))).toEqual([
    "investigation", "remediation", "forbidden",
  ]);
  expect(requestedGuidanceFacets(evidenceFor("f08-success-stage-republished"))).toEqual([
    "investigation", "forbidden", "verification",
  ]);
  expect(requestedGuidanceFacets(evidenceFor("f10-sdk-error-recorded-success"))).toEqual([
    "investigation", "remediation", "forbidden",
  ]);
  expect(requestedGuidanceFacets(evidenceFor("s05-expired-email-dedup-window"))).toEqual([
    "investigation", "remediation", "forbidden",
  ]);
});
```

- [ ] **Step 2: Move the sanitizer without behavior change**

Move the exact current function body from `graph.ts` into `retrieval-profile.ts`, export it, and import it back into `graph.ts`. The legacy `retrievalInput` must produce the same query for every frozen task-A context. The parity test above is the gate.

- [ ] **Step 3: Implement the structured query**

```ts
import type { RunbookSearchInput } from "./search-runbooks.ts";

export type RequestedFacet =
  | "symptoms"
  | "evidence"
  | "investigation"
  | "remediation"
  | "forbidden"
  | "replay"
  | "verification";

export type EvidenceRoute = {
  hints: string[];
  confident: boolean;
  reasons: string[];
};

export type StructuredRunbookSearchInput = RunbookSearchInput & {
  route?: EvidenceRoute;
  requestedFacets?: readonly RequestedFacet[];
  anchors?: readonly string[];
};

const ignoredFixtureTokens = new Set([
  "controlled_fixture",
  "support_unknown",
  "fixture_inputs_unavailable",
]);

const normalize = (value: string) =>
  value.replaceAll("_", " ").replace(/\s+/g, " ").trim();

export function buildStructuredRetrievalInput(
  evidence: DiagnosisEvidence,
): StructuredRunbookSearchInput {
  const facts = observedFacts(evidence);
  const query = [
    sanitizedQueryText(facts.finalError ?? "").slice(0, 180),
    normalize([
      facts.actionType,
      facts.provider,
      facts.phase,
      facts.outcome,
      facts.status?.toString(),
      facts.retryAfterSeconds?.toString(),
      facts.safeCode,
      facts.executionStatus,
      facts.executionOutcome,
      facts.ordering,
      facts.validationStatus,
      facts.supported === false ? "unsupported" : null,
      ...facts.blockedReasons,
      ...facts.missingFields,
      ...facts.invalidFields,
      ...facts.missingTemplates,
      ...facts.absentCredentials,
      ...facts.fixtureFacts,
      ...facts.attempts,
    ]
      .filter((value): value is string => Boolean(value) && !ignoredFixtureTokens.has(value!))
      .join(" "))
      .slice(0, 320),
  ]
    .filter(Boolean)
    .join(" ") || "failure evidence";

  return {
    query: query.slice(0, 500),
    ...(facts.providers.length ? { providers: facts.providers } : {}),
    limit: 3,
    route: routeEvidence(evidence),
    requestedFacets: requestedGuidanceFacets(evidence),
    anchors: evidenceAnchors(evidence),
  };
}
```

The exact field order is fixed by this implementation and recorded in the profile version. Do not add fixture-only tokens, answer labels, taxonomy IDs, or expected diagnoses.

- [ ] **Step 4: Implement facet demand and anchors**

```ts
export function requestedGuidanceFacets(evidence: DiagnosisEvidence): RequestedFacet[] {
  const facts = observedFacts(evidence);
  const hints = new Set(routeEvidence(evidence).hints);
  if (facts.deliveryUnknown) return ["investigation", "remediation", "forbidden"];
  if (hints.has("F01") || facts.status === 429 || facts.retryAfterSeconds !== null)
    return ["remediation", "replay", "verification"];
  if (hints.has("F05")) return ["investigation", "replay", "verification"];
  if (hints.has("F08") || hints.has("F10") || hints.has("F06"))
    return ["investigation", "forbidden", "verification"];
  if (hints.has("F02") || hints.has("F03") || hints.has("F04") || hints.has("F09"))
    return ["investigation", "remediation", "verification"];
  return ["investigation", "evidence", "remediation"];
}

export function evidenceAnchors(evidence: DiagnosisEvidence): string[] {
  const facts = observedFacts(evidence);
  const statusAnchor =
    facts.status === 429 || (facts.status !== null && facts.status >= 500)
      ? facts.status.toString()
      : null;
  const faultAnchors = facts.fixtureFacts.filter((fact) =>
    /^(?:retry_after_|all_attempts_|failure_before_send|configured_token_absent|resolver_error_generic|template_path_missing|resolved_destination_empty|destination_format_invalid|handler_not_registered|unsupported_action_type|ordering_invalid|missing_predecessor|request_transmitted|response_missing|duplicate|stale|already_success|same_retry_identity_seen_twice|success_stage_republished|stage_already_successful|stale_event_received|dead_letter_absent|dlq_publication_missing|sdk_error_value_discarded|success_status_recorded)/.test(fact),
  );
  return [...new Set([
    statusAnchor,
    facts.retryAfterSeconds?.toString(),
    facts.safeCode,
    ...facts.missingFields,
    ...facts.missingTemplates,
    ...facts.absentCredentials,
    ...faultAnchors,
  ].filter((value): value is string => Boolean(value)))].slice(0, 20);
}
```

Anchors are support evidence, not routing terms. Do not include `provider`, `actionType`, or `validationStatus` by themselves: those fields appear in almost every runbook and would turn a generic match into false support. Status is an anchor only for an unambiguous `429` or `5xx`; a bare `401/403/409/422` is never an anchor.

Facet demand is intentionally keyed to observed evidence, not case ids. It requests the facets the diagnosis must cover, while `packByFacet` still fills any unused slot by score. This is why the route hints are computed before facet demand and why the 429 branch keeps the historical `remediation/replay/verification` order.

- [ ] **Step 5: Run the profile tests and the legacy graph tests**

Run: `bun test apps/ai_agent/tests/retrieval-profile.test.ts apps/ai_agent/tests/diagnosis-graph.test.ts`

Expected: PASS, with the legacy `retrievalInput` parity test proving no historical query drift.

### Task 8: Evaluate the route as a routing arm, not as a retriever

**Files:**
- Create: `apps/ai_agent/src/tools/structured-ranking.ts`
- Test: `apps/ai_agent/tests/retrieval-target.test.ts`
- Create: `apps/ai_agent/evaluation/r3/runs/profile-global-20261019-v1/`
- Create: `apps/ai_agent/evaluation/r3/runs/profile-route-20261019-v1/`

**Interfaces:**
- Produces: `rankRouteOnly(index, input, logits): { matches: RunbookMatch[]; route: EvidenceRoute; routeExcluded: string[] }`.
- The function consumes the same logits for every arm; only the candidate set changes.

- [ ] **Step 1: Write the failing ranking test**

```ts
import type { StructuredRunbookSearchInput } from "../src/tools/retrieval-profile.ts";

const allZeroLogits = (sections: ReadonlyArray<{ citation: string }>) =>
  Object.fromEntries(sections.map((section) => [section.citation, 0]));

test("route-only ranking removes non-routed sections without changing scores", () => {
  const input: StructuredRunbookSearchInput = {
    query: "429 rate limit",
    route: { hints: ["F01"], confident: true, reasons: ["provider_status:429"] },
    limit: 3,
  };
  const result = rankRouteOnly(index, input, allZeroLogits(index));
  expect(result.matches.every((match) => match.taxonomy.includes("F01"))).toBe(true);
});
```

- [ ] **Step 2: Implement the route filter**

```ts
import { eligibleRunbookSections, toRunbookMatch, type RunbookIndex } from "./search-runbooks.ts";
import type { StructuredRunbookSearchInput } from "./retrieval-profile.ts";

export function rankRouteOnly(
  index: RunbookIndex,
  input: StructuredRunbookSearchInput,
  logits: Record<string, number>,
) {
  const eligible = eligibleRunbookSections(index, input);
  const hints = input.route?.confident
    ? new Set(input.route.hints.map((hint) => hint.toLowerCase()))
    : null;
  const routed = hints
    ? eligible.filter((section) =>
        section.taxonomy.some((taxonomy) => hints.has(taxonomy.toLowerCase())))
    : eligible;
  const routedCitations = new Set(routed.map((section) => section.citation));
  const excluded = eligible
    .filter((section) => !routedCitations.has(section.citation))
    .map((section) => section.citation);
  if (routed.some((section) => !Number.isFinite(logits[section.citation])))
    throw new Error("Invalid MiniLM scores");
  const matches = routed
    .map((section) => ({
      section,
      score: 1 / (1 + Math.exp(-logits[section.citation]!)),
    }))
    .sort((left, right) =>
      right.score - left.score ||
      left.section.citation.localeCompare(right.section.citation))
    .slice(0, input.limit ?? 3)
    .map(({ section, score }) => toRunbookMatch(section, score));
  return {
    matches,
    route: input.route ?? { hints: [], confident: false, reasons: [] },
    routeExcluded: excluded,
  };
}
```

`toRunbookMatch` must return the existing exact `RunbookMatch` shape. Reuse the Task 3 helper, not a second citation format.

- [ ] **Step 3: Capture both arms on the same logits**

Prepare a new V2 inference input with `buildStructuredRetrievalInput` and write it to `runs/profile-global-20261019-v1/inference-original.json`; score it once with the pinned MiniLM scorer. Do not reuse the baseline inference, whose queries are the legacy `retrievalInput` strings. Derive both arms from the same V2 scores and report:

- `profile-global`: V2 query, no route filter;
- `profile-route`: V2 query plus the route filter.

Do not add a third query variant in this phase.

- [ ] **Step 4: Apply the route gate**

- Reject hard routing if `routeCoverage < 100%` on development.
- If rejected, keep the global candidate set and proceed to facet packing with `profile-global`.
- If accepted, proceed with `profile-route`.
- Do not tune route rules against the holdout or add a new rule after seeing a holdout miss.

## 7. Phase 3 — Facet-aware top-three packing

### Task 9: Classify procedure facets from headings

**Files:**
- Create: `apps/ai_agent/src/tools/section-facets.ts`
- Test: `apps/ai_agent/tests/section-facets.test.ts`

**Interfaces:**
- Produces: `sectionFacet(heading: string): SectionFacet`
- Produces: `isProceduralFacet(facet: SectionFacet): boolean`
- `SectionFacet` is `symptoms | evidence | investigation | remediation | forbidden | replay | verification | example | sources | other`.

- [x] **Step 1: Write the failing classification test**

```ts
test("classifies the nine repeated runbook headings", () => {
  expect(sectionFacet("Symptoms")).toBe("symptoms");
  expect(sectionFacet("Evidence needed")).toBe("evidence");
  expect(sectionFacet("Read-only investigation")).toBe("investigation");
  expect(sectionFacet("Allowed remediation")).toBe("remediation");
  expect(sectionFacet("Forbidden actions")).toBe("forbidden");
  expect(sectionFacet("Replay and approval")).toBe("replay");
  expect(sectionFacet("Verification, rollback, or escalation")).toBe("verification");
  expect(sectionFacet("Simulated example")).toBe("example");
  expect(sectionFacet("Sources")).toBe("sources");
  expect(sectionFacet("Historical snapshots and missing evidence")).toBe("evidence");
});
```

- [x] **Step 2: Implement the heading map**

Use lowercase exact/synonym matching. `isProceduralFacet` returns false only for `example` and `sources`; `other` is treated as procedural so an unfamiliar but substantive heading is not discarded. Unknown headings map to `other`.

- [x] **Step 3: Run the tests**

Run: `bun test apps/ai_agent/tests/section-facets.test.ts`

Expected: PASS.

### Task 10: Pack complementary facets instead of taking the top three scores

**Files:**
- Create: `apps/ai_agent/src/tools/facet-pack.ts`
- Test: `apps/ai_agent/tests/facet-pack.test.ts`

**Interfaces:**
- Produces: `packByFacet(matches: readonly RunbookMatch[], requested: readonly SectionFacet[], limit = 3): RunbookMatch[]`
- The function is deterministic and preserves existing citation/order tie-breaks.

- [x] **Step 1: Write the failing packing test**

```ts
import type { RunbookMatch } from "../src/tools/search-runbooks.ts";

const sectionMatch = (citation: string, heading: string, score: number): RunbookMatch => ({
  runbookId: "RB-A",
  version: "1.0.0",
  citation,
  heading,
  content: `${heading} content`,
  contentHash: "a".repeat(64),
  taxonomy: ["F01"],
  providers: ["generic"],
  simulated: true,
  authority: "untrusted_procedural_guidance",
  canChangePolicy: false,
  score,
});

test("takes one section per requested facet before filling by score", () => {
  const matches = [
    sectionMatch("RB-A@1.0.0#symptoms", "Symptoms", 0.9),
    sectionMatch("RB-A@1.0.0#evidence", "Evidence needed", 0.8),
    sectionMatch("RB-A@1.0.0#investigation", "Read-only investigation", 0.7),
    sectionMatch("RB-A@1.0.0#verification", "Verification, rollback, or escalation", 0.6),
    sectionMatch("RB-A@1.0.0#sources", "Sources", 0.95),
  ];

  expect(packByFacet(matches, ["evidence", "verification"], 3).map((m) => m.heading)).toEqual([
    "Symptoms",
    "Evidence needed",
    "Verification, rollback, or escalation",
  ]);
  expect(packByFacet(matches, ["symptoms", "evidence", "verification"], 3).map((m) => m.heading))
    .not.toContain("Sources");
});
```

- [x] **Step 2: Implement the packer**

Algorithm:

1. Drop `example` and `sources` sections.
2. Walk the requested facets in order and select the highest-scored unused section for each.
3. Fill remaining slots from the ranked list.
4. Sort the selected sections by score, then citation, for the returned order.
5. Never return more than three or the same citation twice.

- [x] **Step 3: Run the packing tests**

Run: `bun test apps/ai_agent/tests/facet-pack.test.ts`

Expected: PASS.

### Task 11: Integrate facet packing and evaluate the finalist retrieval arm

**Files:**
- Modify: `apps/ai_agent/src/tools/structured-ranking.ts`
- Modify: `apps/ai_agent/src/tools/runbook-retriever.ts`
- Test: `apps/ai_agent/tests/runbook-retriever.test.ts`
- Create: `apps/ai_agent/evaluation/r3/runs/profile-route-facets-20261019-v1/`

**Interfaces:**
- Produces: `rankStructured(index, input, logits): { matches: RunbookMatch[]; route: EvidenceRoute; facetsRequested: RequestedFacet[]; facetsCovered: RequestedFacet[] }`. The support decision is added in Task 12.
- Modifies: `RunbookRetriever.search(input: StructuredRunbookSearchInput): Promise<RunbookMatch[]>`. A plain `RunbookSearchInput` remains assignable.
- Adds `RUNBOOK_RETRIEVAL_METHOD=structured-minilm` for offline/local validation. The default remains unchanged until Task 16.

- [x] **Step 1: Write the failing retriever test**

```ts
test("structured-minilm packs requested facets and preserves the match contract", async () => {
  const retriever = await createRunbookRetriever(index, { RUNBOOK_RETRIEVAL_METHOD: "structured-minilm" }, async () => ({
    score: async (_query, passages) => passages.map(() => 0),
    close: async () => {},
  }));
  const result = await retriever.search({
    query: "429",
    providers: ["telegram"],
    route: { hints: ["F01"], confident: true, reasons: ["provider_status:429"] },
    requestedFacets: ["evidence", "verification"],
    limit: 3,
  });
  expect(result.length).toBeLessThanOrEqual(3);
  expect(result.some((match) => match.heading === "Evidence needed")).toBe(true);
  expect(result.some((match) => match.heading === "Verification, rollback, or escalation")).toBe(true);
  expect(result.every((match) => match.canChangePolicy === false)).toBe(true);
  await retriever.close();
});
```

- [x] **Step 2: Implement the structured branch**

`runbook-retriever.ts` should:

1. Validate input through the shared boundary.
2. Select eligible sections (route-filtered when the route is confident).
3. Score all eligible sections with the existing MiniLM process.
4. Build matches through `rankStructured`.
5. Return the packed result. If `requestedFacets` is absent, use the score-ranked list without facet reservation. Do not fall back to keyword after a valid no-match or scorer failure.

The `.001` sigmoid floor remains the behavior of `minilm-original` only. The structured branch does not use an absolute threshold as its no-match authority; Task 12 adds the support gate. Record that difference in the arm manifest so the comparison is not misread as a pure ranking change.

- [x] **Step 3: Capture the facet arm**

Use the same scores as `profile-route` or `profile-global`; only packing changes. Report per-case facet coverage and all missing-facet citations.

- [x] **Step 4: Apply the Phase 3 gate**

- Development sufficient-guidance hit@3 must be at least 80%.
- Macro section recall must be at least 80%.
- Direct precision must not fall below the same-corpus keyword control.
- False abstention must remain at most 5%.
- If the gate fails, stop. Do not start abstention tuning to mask a recall failure.

## 8. Phase 4 — Calibrate abstention from observed support

### Task 12: Implement the support gate

**Files:**
- Create: `apps/ai_agent/src/tools/retrieval-support.ts`
- Modify: `apps/ai_agent/src/tools/structured-ranking.ts`
- Test: `apps/ai_agent/tests/retrieval-support.test.ts`

**Interfaces:**
- Produces: `SupportPolicy = { minAnchorHits: 1 | 2 }`
- Produces: `SupportReason = "no_candidates" | "no_procedural_section" | "no_observed_anchor" | "supported"`
- Produces: `decideSupport(matches, input, policy = { minAnchorHits: 1 }): { abstain: boolean; reason: SupportReason }`
- The gate uses:
  - route confidence, or at least `minAnchorHits` distinct anchor matches in the selected heading/content;
  - at least one procedural section;
  - no absolute sigmoid threshold as the sole no-match authority.

- [x] **Step 1: Write the failing tests**

```ts
import type { RunbookMatch } from "../src/tools/search-runbooks.ts";
import type { StructuredRunbookSearchInput } from "../src/tools/retrieval-profile.ts";

const supportMatch = (citation: string, heading: string, content: string): RunbookMatch => ({
  runbookId: "RB-F01-F02",
  version: "1.0.0",
  citation,
  heading,
  content,
  contentHash: "a".repeat(64),
  taxonomy: ["F01"],
  providers: ["telegram"],
  simulated: true,
  authority: "untrusted_procedural_guidance",
  canChangePolicy: false,
  score: 0.5,
});

const genericEvidenceMatch = supportMatch(
  "RB-F01-F02@1.0.0#evidence-needed",
  "Evidence needed",
  "Require the provider and bounded status.",
);
const rateLimitMatch = supportMatch(
  "RB-F01-F02@1.0.0#allowed-remediation",
  "Allowed remediation",
  "Wait for the recorded 429 retry-after before any replay.",
);
const withRoute: StructuredRunbookSearchInput = {
  query: "429",
  route: { hints: ["F01"], confident: true, reasons: ["provider_status:429"] },
};
const noRouteInput: StructuredRunbookSearchInput = { query: "failure" };

test("abstains when there is no candidate", () => {
  expect(decideSupport([], withRoute)).toEqual({ abstain: true, reason: "no_candidates" });
});

test("abstains on a generic section with no route and no observed anchor", () => {
  expect(decideSupport([genericEvidenceMatch], noRouteInput)).toEqual({
    abstain: true,
    reason: "no_observed_anchor",
  });
});

test("keeps a routed observed 429 section", () => {
  expect(decideSupport([rateLimitMatch], { ...withRoute, anchors: ["429", "telegram"] })).toEqual({
    abstain: false,
    reason: "supported",
  });
});

test("requires the calibrated number of distinct anchors", () => {
  expect(
    decideSupport([rateLimitMatch], { query: "429", anchors: ["429"] }, { minAnchorHits: 2 }),
  ).toEqual({ abstain: true, reason: "no_observed_anchor" });
});
```

- [x] **Step 2: Implement the anchor match**

Anchors are safe observed tokens such as `"429"`, `"telegram"`, `"unsupported_action_type"`, or a missing-field name. Do not include fixture-only controls, raw error bodies, PII, secrets, or labels. Count distinct anchors found in the selected heading and content, case-insensitively. `minAnchorHits` is the only calibrated support setting.

```ts
export function decideSupport(
  matches: readonly RunbookMatch[],
  input: StructuredRunbookSearchInput,
  policy: SupportPolicy = { minAnchorHits: 1 },
) {
  if (!matches.length) return { abstain: true, reason: "no_candidates" as const };
  if (!matches.some((match) => isProceduralFacet(sectionFacet(match.heading))))
    return { abstain: true, reason: "no_procedural_section" as const };
  if (input.route?.confident) return { abstain: false, reason: "supported" as const };
  const haystack = matches.map((match) => `${match.heading}\n${match.content}`.toLowerCase());
  const anchorHits = new Set(
    (input.anchors ?? [])
      .map((anchor) => anchor.trim().toLowerCase())
      .filter((anchor) => anchor && haystack.some((text) => text.includes(anchor))),
  );
  return anchorHits.size >= policy.minAnchorHits
    ? { abstain: false, reason: "supported" as const }
    : { abstain: true, reason: "no_observed_anchor" as const };
}
```

- [x] **Step 3: Wire the gate into `rankStructured`**

Add `abstained: boolean` to `rankStructured`'s return value and set it from `decideSupport`. If `decideSupport` abstains, return an empty match array. The graph already accepts an empty runbook list and must not substitute keyword results.

- [x] **Step 4: Run the support tests**

Run: `bun test apps/ai_agent/tests/retrieval-support.test.ts apps/ai_agent/tests/runbook-retriever.test.ts`

Expected: PASS, including the existing "MiniLM abstention is never replaced by keyword overlap" test.

### Task 13: Calibrate on development and run the holdout once

**Files:**
- Create: `apps/ai_agent/evaluation/r3/runs/profile-route-facets-support-20261019-v1/`
- Create: `apps/ai_agent/evaluation/r3/holdout/`
- Create: `apps/ai_agent/evaluation/r3/decision.md`
- Test: `apps/ai_agent/tests/retrieval-target.test.ts`

**Interfaces:**
- Consumes: the frozen Phase 3 candidate and `development-labels-v1.json`.
- Produces: `apps/ai_agent/evaluation/r3/selected-retrieval-config.json` with the support-gate setting and hashes.

- [x] **Step 1: Limit calibration to two predeclared settings**

Test only:

```text
minAnchorHits: 1
minAnchorHits: 2
```

Use the route arm exactly as frozen in Task 8 (accepted or rejected); do not re-tune route rules in this step. Do not add another feature. Select the setting with:

1. no-match abstention at least 90%;
2. false abstention at most 5%;
3. highest sufficient-guidance hit@3;
4. then highest macro recall;
5. then lower latency.

- [ ] **Step 2: Freeze the selection**

Write the selected config (`retrievalMethod`, `routeEnabled`, `support: { minAnchorHits }`), corpus hash, label hash, model revision, prompt version, and exact arm identifiers to `apps/ai_agent/evaluation/r3/selected-retrieval-config.json`. The holdout must not be opened before this file exists.

- [ ] **Step 3: Commission the independent holdout**

The holdout author must not see development scores, candidate rankings, or this plan's expected answers. Requirements:

- 40 disjoint incident families;
- 30 eligible answerable, 10 genuine no-match;
- all ten taxonomy categories represented;
- F05/F10 coverage gaps represented honestly;
- no paraphrase of an existing development case;
- no fresh R2.5 reuse;
- facet labels and rationales independently reviewed before freeze.

- [ ] **Step 4: Run the frozen candidate once**

Run the frozen candidate and the keyword control on the holdout. No tuning, reranking, route repair, or label adjustment after seeing results. Record all 40 scheduled cases, including unavailable outputs.

- [ ] **Step 5: Apply the release gate**

Accept only if:

- sufficient-guidance hit@3 at least 90%;
- macro section recall@3 at least 90%;
- no-match abstention at least 90%;
- false abstention at most 5%;
- direct precision not below baseline;
- reliability at least 95%;
- p95 at most 3 seconds;
- zero evaluated safety violations.

If any gate fails, write `decision.md` with the failing gate, absolute denominators, per-family results, and the stop. Do not promote the best partial result.

## 9. Phase 5 — Validate diagnosis separately

### Task 14: Run a bounded development diagnosis comparison

**Files:**
- Create: `apps/ai_agent/src/evaluation/target-diagnosis.ts`
- Create: `apps/ai_agent/evaluation/r3/diagnosis/`
- Test: `apps/ai_agent/tests/retrieval-target.test.ts` (protocol validation)

**Interfaces:**
- Consumes: the frozen retrieval configuration and the actual graph/prompt/model.
- Produces: immutable per-case observations, usage, latency, and human review packet.
- Uses `gemini-2.5-flash` (the serving model), not the historical `3.5-flash-lite` experiment model.

- [ ] **Step 1: Preflight the budget**

Record the model identifier, price source/date, maximum generation attempts, token cap, and monetary ceiling. Do not run if the key, model, or budget approval is missing. This task is allowed to end as `blocked`.

- [ ] **Step 2: Prepare 12 development incidents**

Predeclare the 12 case ids before any model call. Use one exposed positive per available family: `f01-rate-limit-rejected`, `f02-connection-refused`, `f03-token-missing`, `f04-template-path-missing`, `f05-unsupported-action`, `f07-provider-response-lost`, `f08-success-stage-republished`, `f09-database-sink-only`, `f10-sdk-error-recorded-success`, `s03-sensitive-fields-present`; add `nm01-telegram-message-too-long` and `nm04-email-sender-domain-unverified` as no-match controls. Do not substitute cases after seeing results. Run both the legacy baseline retriever and the frozen finalist on each case. For each arm, call its retriever once per case, freeze the resulting top-three matches, and pass a `searchRunbooks` tool that returns those matches to `buildDiagnosisService`. This isolates the diagnosis comparison from retrieval variance and does not require the serving selector added in Task 16. Do not include expected diagnoses in prompts.

- [ ] **Step 3: Run three repetitions per incident and arm**

Cap generation at 72 attempts (12 cases × 2 arms × 3 repetitions). Count retries toward the cap. Persist provider failures, invalid outputs, and unavailable usage without retrying indefinitely.

- [ ] **Step 4: Review independently**

Review root-cause support, correction claims, missing-evidence handling, delivery status, action routing, and citations. A deterministic schema pass is not semantic acceptance.

- [ ] **Step 5: Apply the diagnosis gate**

Apply the 80% gate to the finalist arm and report the legacy baseline separately. Development diagnosis acceptance must be at least 80%, with zero evaluated safety violations. If retrieval improved but diagnosis remains unsupported, fix that as a separate generation/validation issue. Do not attribute the fix to retrieval.

### Task 15: Run the independent diagnosis holdout

**Files:**
- Create: `apps/ai_agent/evaluation/r3/diagnosis-holdout/`
- Modify: `apps/ai_agent/evaluation/r3/decision.md`

- [ ] **Step 1: Freeze the serving configuration**

Freeze the selected retriever, support gate, corpus, model identifier, prompt version, and repair budget before opening the diagnosis holdout.

- [ ] **Step 2: Run the predeclared holdout**

Use the same 40-case independent cohort or a separately authorized diagnosis subset. Run two repetitions per case, capped at 80 attempts. Randomize presentation for blinded review.

- [ ] **Step 3: Apply the 80% gate**

Accept only if at least 80% of scheduled cases are semantically acceptable and bounded, with zero safety violations. Report deterministic acceptance separately. If blocked by credentials or budget, leave the gate explicitly open.

## 10. Phase 6 — Integrate only the accepted configuration

### Task 16: Wire the selected method and keep rollback

**Files:**
- Modify: `apps/ai_agent/src/tools/runbook-retriever.ts`
- Modify: `apps/ai_agent/src/graph.ts`
- Modify: `apps/ai_agent/src/index.ts`
- Modify: `apps/ai_agent/src/runner.ts` only if required by the injection
- Test: `apps/ai_agent/tests/runbook-retriever.test.ts`, `diagnosis-graph.test.ts`

**Interfaces:**
- Adds `structured-minilm` as the selected method only after Phase 4/5 acceptance.
- Keeps `keyword` and `minilm-original` available for rollback/historical comparison.
- Adds `retrievalInput?: (evidence: DiagnosisEvidenceBundle) => RunbookSearchInput` to `DiagnosisOptions` in `graph.ts`; it defaults to the legacy `retrievalInput`. The runtime passes `buildStructuredRetrievalInput` only when the selected method is `structured-minilm`.

- [ ] **Step 1: Write the failing integration test**

```ts
import type { StructuredRunbookSearchInput } from "../src/tools/retrieval-profile.ts";

test("the selected runtime builder is injected without changing the graph default", async () => {
  let seen: StructuredRunbookSearchInput | undefined;
  await buildDiagnosisService({
    ...tools(),
    searchRunbooks: (input) => {
      seen = input;
      return [runbook()];
    },
  }, model(async () => generation(safeOutput())), {
    retrievalInput: buildStructuredRetrievalInput,
  }).diagnose();

  expect(seen?.route?.hints).toContain("F01");
  expect(seen?.query).not.toContain("controlled_fixture");
});
```

- [ ] **Step 2: Add the injection point**

In `graph.ts`, export `type DiagnosisEvidenceBundle = z.infer<typeof DiagnosisEvidenceBundleSchema>` and use the injected builder instead of the direct call:

```ts
const buildInput = options.retrievalInput ?? retrievalInput;
// ...
.parse(await tools.searchRunbooks(buildInput(state.evidence!)));
```

The default path remains byte-for-byte compatible with historical captures.

- [ ] **Step 3: Select the method in `index.ts`**

```ts
import { buildStructuredRetrievalInput } from "./tools/retrieval-profile.ts";

const retrievalMethod = process.env.RUNBOOK_RETRIEVAL_METHOD ?? "minilm-original";
const diagnosisOptions = {
  ...diagnosis.diagnosisOptions,
  ...(retrievalMethod === "structured-minilm"
    ? { retrievalInput: buildStructuredRetrievalInput }
    : {}),
};
// Pass `diagnosisOptions` instead of `diagnosis.diagnosisOptions` to
// createInvestigationExecutor.
```

Keep `minilm-original` as the fallback in this task. Only after `decision.md` records `accepted` may a separate one-line reviewed change replace the fallback with `structured-minilm`. If this task runs before acceptance, leave the fallback unchanged and record the opt-in flag.

- [ ] **Step 4: Preserve rollback**

Document:

```text
RUNBOOK_RETRIEVAL_METHOD=keyword
```

as the immediate rollback. `minilm-original` remains available for parity comparison. No automatic fallback from a valid no-match or scorer failure.

- [ ] **Step 5: Run the focused integration tests**

Run: `bun test apps/ai_agent/tests/runbook-retriever.test.ts apps/ai_agent/tests/diagnosis-graph.test.ts apps/ai_agent/tests/rag-corpus-parity.test.ts`

Expected: PASS.

### Task 17: Add retrieval observability and finish verification

**Files:**
- Modify: `apps/ai_agent/src/observability.ts`
- Modify: `apps/ai_agent/src/index.ts`
- Test: `apps/ai_agent/tests/diagnosis-graph.test.ts`

**Interfaces:**
- Adds optional `retrievalConfig?: string` and `abstained?: boolean` to trace metadata.
- Never records raw queries, evidence, error bodies, secrets, or labels.

- [ ] **Step 1: Write the failing trace assertion**

```ts
expect(trace.spans.find((span) => span.name === "searchRunbooks")?.abstained).toBe(true);
expect(JSON.stringify(trace)).not.toContain("controlled_fixture");
```

- [ ] **Step 2: Add safe trace fields**

Extend the `observe` details type to allow `abstained`. Set `abstained` from `matches.length === 0`. Set `retrievalConfig` on the root span from the frozen configuration name; pass it through the tracer constructor or set it once when the tracer is created. Add matching Langfuse attributes only if they are safe identifiers. Do not add the route's raw reasons or the query text.

- [ ] **Step 3: Run the trace test**

Run: `bun test apps/ai_agent/tests/diagnosis-graph.test.ts`

Expected: PASS, including the existing redaction assertions.

- [ ] **Step 4: Run the repository verification**

Run:

```powershell
bun run check-types
bun run lint
bun run build
```

Expected: type check and build pass. Lint must be compared with the known baseline (currently 9 errors and 22 warnings in unchanged frontend files). Do not report a green lint result if the baseline remains.

- [ ] **Step 5: Write the decision and handoff**

`decision.md` must state one of:

- `accepted`: frozen candidate + independent gates passed;
- `rejected`: specific gate failed with absolute denominators;
- `blocked`: missing credentials, budget, corpus parity, or integration prerequisite.

Include changed files, verification output, limitations, and exact staging paths. Exclude generated Prisma, Graphify caches, historical run changes, and unrelated working-tree edits.

- [ ] **Step 6: Graphify**

Do not update Graphify for planning or an offline experiment. After the integrated retrieval milestone is merged and the default branch is clean, follow `docs/graphify.md`.

## 11. Expected evidence at completion

At the end of this plan, one of these must be true:

1. A frozen `structured-minilm` or fallback route passes the independent 90% retrieval gate and the 80% diagnosis gate, with the exact corpus, labels, model, prompt, route, facet, and support configuration recorded.
2. The plan stops at a named failing gate, with per-case evidence and no method promotion.

In both cases, the project should know whether the remaining problem is corpus/label coverage, route exclusion, facet packing, abstention calibration, or downstream diagnosis. It should no longer be possible to attribute a score to "metadata filtering" without showing what the filter excluded and what the ranker/packer did with the remaining candidates.
