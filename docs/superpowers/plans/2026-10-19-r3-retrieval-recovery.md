# R3 — Retrieval Target Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking. Each phase ends at a review gate; do not start the next phase until that gate is recorded.

**Goal:** Make runbook retrieval measurably hit the historical gate — 90% sufficient-guidance recall at top three with 90% no-match abstention — by fixing the measurement first, then applying four predeclared changes: a structured evidence profile, an evidence-derived metadata route, facet-aware packing, and a calibrated support gate.

**Architecture:** Keep the read-only investigator, `RunbookRetriever` boundary, pinned local MiniLM scorer, citation/hash contract, and replay policy. Freeze the 55-section serving corpus and the 24-case development cohort before any model runs. Rank the same eligible sections as today, but pack complementary guidance facets into the three slots and decide abstention from observed support anchors instead of a sigmoid cutoff. Accept or reject the frozen configuration once, on an independently authored 40-case holdout.

**Tech Stack:** Bun/TypeScript, Zod, local Node/ONNX MiniLM (`Xenova/ms-marco-MiniLM-L-6-v2`, revision `a09144355adeed5f58c8ed011d209bf8ee5a1fec`, dtype `q8`), existing evaluation harnesses (`r23-models.mjs`). No new dependency, vector database, model, or external selector.

**Spec:** [`docs/ai-dlq-master-plan.md`](../../../docs/ai-dlq-master-plan.md) (Phase 11 and optional R2), [`RAG-DIAGNOSIS-CLOSEOUT.md`](../../../apps/ai_agent/evaluation/RAG-DIAGNOSIS-CLOSEOUT.md), and the [production-selection record](../../../apps/ai_agent/evaluation/production-selection/README.md).

**Task-level companion:** [`2026-10-19-rag-target-recovery.md`](2026-10-19-rag-target-recovery.md) owns the exact code snippets, test bodies, and file-level steps. This document owns the phase sequence, gates, cohort rules, and stop rules. When the two disagree on a gate or a cohort, this document wins; when they disagree on code, the companion wins.

---

## Global constraints

- Preserve at-least-once safety, at-most-three excerpts, untrusted-guidance flags, stale exclusion, citation/hash integrity, authorization, and replay policy.
- Preserve every historical run directory and its provenance. Never rewrite an old run or pool its metric into R3.
- Do not lower the gates: retrieval top-three recall **90%**, no-match abstention **90%**, false abstention **≤5%**, diagnosis acceptance **80%**.
- The 80% development figure screens; it is not release acceptance and must never be reported as reaching target.
- Never pass expected taxonomy, gold citations, case ids, labels, or expected answers into retrieval. The route may use observed evidence only.
- Metadata filtering is an eligibility constraint, not a retrieval method. It cannot generate a candidate, rank a section, cover a facet, or decide abstention.
- No further method sweep. HyDE, PageIndex, BM25 serving, embedding indexes, new rerankers, and LLM planners are out of scope for R3.
- Do not tune on the fresh R2.5 questions, the new holdout, or any future acceptance set.
- Exclude unrelated generated Prisma and Graphify working-tree changes. Follow [`docs/manualgit_handoff.md`](../../manualgit_handoff.md); no automatic Git integration.
- Retrieval phases (R3.0–R3.5) are local and offline. Only R3.6 needs model credentials and an approved budget.

## 1. What R3 is, and why it is different

R1 compared retrieval methods. R2 and its follow-ups (R2.1–R2.5) compared ranking variants on successively different corpora, queries, and label sets. Each round produced a number, but the yardstick moved between rounds.

**R3 is the first round that fixes the yardstick before scoring anything, then makes four predeclared changes and accepts or rejects the result once.** It is not a wider search; it is a controlled experiment.

### 1.1 The six defects R3 must remove

| # | Defect | Evidence | Removed by |
| --- | --- | --- | --- |
| 1 | **Corpus drift** — the app serves 55 sections from six runbooks; Task B froze 54 at version 1.0.0. `transient-provider-failure.md` is now 1.1.0 with 10 sections. | Every Task B number describes a corpus that is not served. | R3.0 |
| 2 | **Stale labels** — the 24 review cases cite `RB-F01-F02@1.0.0`. Copying them verbatim makes every F01/F02 accepted citation unknown to the frozen corpus. | `scoreTarget` would throw `Unknown accepted citation`. | R3.1 |
| 3 | **No-op provider filter** — all 55 sections list `telegram`, `email`, or `generic`, so the filter removes nearly nothing for the observed incidents. | Provider filtering cannot improve ranking. | R3.1 (recorded), R3.2 (route added) |
| 4 | **Unused taxonomy / leakage** — runtime `retrievalInput` passes `providers` only; some historical experiments passed gold taxonomy codes. | Passing taxonomy is label leakage, not a production method. | R3.2 |
| 5 | **Facet collision** — top three are often three sections from the same easy facet; the needed verification/forbidden/replay section sits at rank 4+. Candidate recall is already 100%, so ranking and packing are the bottleneck. | Fresh misses: verification/rollback 5, forbidden 5, evidence 4, remediation 2. | R3.3 |
| 6 | **Uncalibrated abstention** — the `.001` sigmoid cutoff is a floor, not a confidence. Recall and abstention cannot both improve by moving it. | Task B abstains on 0/8 no-match cases. | R3.4 |

### 1.2 What R3 changes

Exactly four predeclared changes, in this order:

1. **Structured evidence profile** — build the query from observed fields, strip fixture-only control tokens, keep discriminative anchors (R3.2).
2. **Evidence-derived route** — derive taxonomy hints from observed facts; a route may exclude non-routed sections but can never add gold labels (R3.2).
3. **Facet-aware packing** — one section per needed guidance facet before filling remaining slots by score (R3.3).
4. **Calibrated support gate** — abstain when neither route confidence nor observed anchors support the returned text (R3.4).

Plus the measurement work that makes those changes testable (R3.0, R3.1) and the acceptance work that makes the result trustworthy (R3.5–R3.7).

### 1.3 What R3 does not do

- It does not add a retriever, model, index, or dependency.
- It does not change the runbooks during measurement. A runbook edit invalidates the frozen corpus and requires a new protocol.
- It does not re-open the holdout, re-tune after seeing holdout scores, or promote a "least bad" arm.
- It does not claim that metadata filtering retrieves anything.
- It does not enable replay, approval, or any write path.

## 2. Target contract

### 2.1 Case and output shape

```ts
type TargetInput = {
  query: string;
  taxonomy?: readonly string[];
  providers?: readonly string[];
  limit?: 3;
};

type TargetFacet =
  | "symptoms" | "evidence" | "investigation" | "remediation"
  | "forbidden" | "replay" | "verification";

type TargetCase = {
  id: string;
  split: "development" | "holdout";
  kind: "answerable" | "no_match" | "corpus_gap";
  input: TargetInput;
  requiredFacets: Array<{ facet: TargetFacet; accepted: string[] }>; // max 3
  supporting: string[];
  missingRuntimeFacts: string[];
};
```

Rules:

- `input` is the access/query input only. Route hints, requested facets, and anchors are derived at run time and are never stored as labels.
- At most three required facets per answerable case. A case that genuinely needs more is a reported coverage limitation, not a reason to shrink labels.
- Every `accepted` citation must exist in the frozen corpus and be access-eligible under the case input.
- `no_match` cases carry no required facets. `corpus_gap` cases are reported separately and never enter the recall denominator.
- Labels are authored without seeing rankings or scores.

### 2.2 Primary metric

```text
sufficientGuidanceHit@3 =
  eligible answerable cases whose every required facet has at least one
  accepted citation in the returned three
  / all eligible answerable cases
```

Secondary metrics reported beside it: `macroSectionRecall@3`, `directPrecision@3`, `candidateRecall`, `routeCoverage`, `noMatchAbstention`, `falseAbstention`, `reliability`, `p95LatencyMs`, `allIncidentCoverage`.

### 2.3 Gates

| Gate | Development screening | Independent release acceptance |
| --- | --- | --- |
| Sufficient-guidance hit@3 | ≥ 80% | ≥ 90% |
| Macro section recall@3 | ≥ 80% | ≥ 90% |
| Direct precision | not below the same-corpus keyword control | not below frozen baseline; every regression explained |
| No-match abstention | ≥ 90% | ≥ 90% |
| False abstention | ≤ 5% | ≤ 5% |
| Route coverage | 100% of accepted development citations | 100% of accepted holdout citations |
| Reliability | ≥ 95% | ≥ 95% |
| Warm retrieval p95 | ≤ 3 s | ≤ 3 s |
| Diagnosis acceptance | 80% on blinded development review | 80% on independent review |
| Safety | zero unauthorized disclosure, fabricated citation, unsupported definitive repair, unsafe replay recommendation | same |

The 90% figure is a recall gate, not an average. A candidate at 80% is rejected.

### 2.4 Cohorts

| Cohort | Cases | Make-up | Opened |
| --- | --- | --- | --- |
| Development | 24 | 16 answerable + 8 no-match, from `production-selection/development-review-v3.json` | R3.1 |
| Independent holdout | 40 | 30 answerable + 10 no-match, independently authored | Once, R3.5 |
| Diagnosis development | 12 | 10 answerable families + 2 no-match controls | R3.6 |
| Diagnosis holdout | subset of the 40 or separately authorized | same rules | R3.6 |

Development cases are exposed material. Any R3 change may be tuned on development. Nothing may be tuned on the holdout.

### 2.5 Artifact layout

```text
apps/ai_agent/evaluation/r3/
  README.md
  protocol.json                      # gates + cohort rules, written before any score
  corpus-v1.json                     # frozen 55-section serving corpus
  development-cases-v1.json          # inputs/evidence, then merged labels
  development-labels-v1.json         # reviewed facet labels, hashed
  selected-retrieval-config.json     # frozen finalist, written before holdout
  decision.md                        # accepted | rejected | blocked
  runs/
    baseline-20261019-v1/
    profile-global-20261019-v1/
    profile-route-20261019-v1/
    profile-route-facets-20261019-v1/
    profile-route-facets-support-20261019-v1/
  holdout/
    cases-v1.json
    labels-v1.json
    runs/
  diagnosis/
  diagnosis-holdout/
```

Every run directory is immutable. A changed label, corpus, or config means a new run directory, never an edit.

## 3. Phase map

| Phase | Name | Produces | Gate | Effort | Depends on |
| --- | --- | --- | --- | --- | --- |
| R3.0 | Freeze the yardstick | `corpus-v1.json`, `protocol.json`, parity test | 55 sections, hash stable, parity passes | 2–3 h | — |
| R3.1 | Trustworthy benchmark and true baseline | metric module, 24-case cohort, re-adjudicated labels, baseline run | labels valid, baseline recorded | 8–12 h | R3.0 |
| R3.2 | Structured profile and evidence route | `retrieval-profile.ts`, route arm | legacy query byte-identical, route coverage 100% or route disabled | 4–6 h | R3.1 |
| R3.3 | Facet-aware packing | `section-facets.ts`, `facet-pack.ts`, `structured-minilm` (opt-in) | dev hit@3 ≥ 80%, recall ≥ 80%, precision ≥ keyword, false abstention ≤ 5% | 4–6 h | R3.2 |
| R3.4 | Calibrated support gate | `retrieval-support.ts`, support arm | abstention ≥ 90% with false abstention ≤ 5% | 3–5 h | R3.3 |
| R3.5 | Freeze and independent acceptance | frozen config, 40-case holdout, `decision.md` | 90% recall, 90% abstention, ≤ 5% false, precision, reliability, p95 | 6–10 h + authoring | R3.4 |
| R3.6 | Diagnosis validation | diagnosis captures, blinded review | 80% acceptance, zero safety violations | 4–8 h (may be blocked) | R3.5 |
| R3.7 | Integration, observability, closeout | selected runtime method, traces, docs | typecheck/build pass, lint at baseline, rollback proven | 3–4 h | R3.5 accepted |

Phase gates are cumulative. Failing a gate stops the program at that phase; it does not authorize a workaround.

---

## 4. R3.0 — Freeze the yardstick

**Purpose:** make "the corpus changed" a test failure instead of a silent score change. Nothing may be measured before this phase passes.

**Entry criteria:** clean `apps/ai_agent/src` and `apps/ai_agent/tests`; six runbooks present; no runbook edits in flight.

**Outputs:**
- `apps/ai_agent/src/evaluation/retrieval-target.ts` — `FrozenCorpus`, `verifyTargetCorpus`.
- `apps/ai_agent/src/evaluation/retrieval-target-cli.ts` — `--freeze-corpus`.
- `apps/ai_agent/evaluation/r3/corpus-v1.json`.
- `apps/ai_agent/evaluation/r3/protocol.json`.
- `apps/ai_agent/tests/rag-corpus-parity.test.ts`.

**Interfaces:**
- `freezeTargetCorpus(outPath: string): Promise<{ corpusHash: string; sections: number }>`
- `loadFrozenCorpus(path: string): Promise<FrozenCorpus>`
- `verifyTargetCorpus(index: RunbookIndex, frozen: FrozenCorpus): void` — throws `Error("Target corpus changed; create a new protocol")`

- [ ] **Step 1: Add the frozen-corpus types and the drift check**

Create `retrieval-target.ts` with `FrozenSection = Omit<RunbookIndex[number], "headingTerms" | "contentTerms">` and `FrozenCorpus = { version: 1; source: string; corpusHash: string; sections: FrozenSection[] }`. Hash with `createHash("sha256").update(JSON.stringify(sections)).digest("hex")`.

- [ ] **Step 2: Write the failing parity test**

`rag-corpus-parity.test.ts` loads the frozen artifact, loads the real runbooks with `loadRunbooks(defaultRunbookDirectory())`, strips `headingTerms`/`contentTerms`, and asserts: 55 sections; deep-equal sections; 10 sections with `id === "RB-F01-F02"`; a 64-hex `corpusHash`.

Run: `bun test apps/ai_agent/tests/rag-corpus-parity.test.ts`
Expected: FAIL with ENOENT for `evaluation/r3/corpus-v1.json`.

- [ ] **Step 3: Implement the freeze command**

Add `--freeze-corpus <path>` via `parseArgs`, using `loadRunbooks` (no duplicate parser), writing with `{ flag: "wx" }` so an existing artifact cannot be overwritten.

- [ ] **Step 4: Generate the corpus**

Run: `bun run apps/ai_agent/src/evaluation/retrieval-target-cli.ts --freeze-corpus apps/ai_agent/evaluation/r3/corpus-v1.json`
Expected: `55 sections`, 64-character hash.

- [ ] **Step 5: Write `protocol.json` before any score**

Record version, `status: "frozen_before_measurement"`, corpus path/runbooks/sections, development 24/16/8, holdout 40/30/10 with `status: "not_authored"`, every gate value from §2.3, and the excluded historical runs (`r25/runs/fresh-v1`, `r25/runs/exhaustive-v2`, any future holdout).

- [ ] **Step 6: Re-run parity**

Run: `bun test apps/ai_agent/tests/rag-corpus-parity.test.ts`
Expected: PASS. A later runbook edit must fail this test until a new protocol is written.

- [ ] **Step 7: Checkpoint handoff (no auto commit)**

Record corpus hash, section count, runbook versions, and changed files. Hand off per `docs/manualgit_handoff.md`.

**Exit gate:** 55 sections; hash stable; parity passes; `protocol.json` present with `frozen_before_measurement`; no score produced yet.

**If it fails:** the corpus is not 55/10 — stop and report the drift. Do not adjust the test to the new count; that is a new protocol.

**Rollback:** delete the untracked artifact and CLI; no production code changed.

**Task detail:** companion Tasks 1–2.

---

## 5. R3.1 — Trustworthy benchmark and true baseline

**Purpose:** replace the mixed metric/label/corpus history with one benchmark that can say yes or no, and record what the current runtime actually scores on the serving corpus.

**Entry criteria:** R3.0 passed; `development-review-v3.json` and task-A inputs available read-only.

**Outputs:**
- Metrics and schemas in `retrieval-target.ts`; tests in `retrieval-target.test.ts`.
- `r3/development-cases-v1.json`, `r3/development-labels-v1.json`.
- `r3/runs/baseline-20261019-v1/` with keyword and `minilm-original` arms.
- A failure ledger per case.

**Interfaces:**
- `TargetInputSchema`, `TargetCaseSchema`, `TargetOutputSchema`, `TargetLabelFileSchema`
- `loadTargetCases(path)`, `loadTargetLabels(path)`
- `scoreTarget(index, cases, outputs): TargetReport` with `metrics`, `counts`, `noMatchAbstention`, `falseAbstention`, `reliability`, `p95LatencyMs`, `allIncidentCoverage`

- [ ] **Step 1: Write the failing metric test**

Two answerable cases sharing two required facets and one `no_match` case; one hit, one miss, one abstention. Expect `sufficientGuidanceHitAt3 === 0.5`, `noMatchAbstention.rate === 1`, `falseAbstention.rate === 0`.

Run: `bun test apps/ai_agent/tests/retrieval-target.test.ts -t "every required facet"`
Expected: FAIL, `scoreTarget` not defined.

- [ ] **Step 2: Implement the schemas and `scoreTarget`**

Validation must throw on: duplicate case/output ids, unknown output id, unknown returned/accepted/supporting/candidate citation, ineligible returned citation, duplicate returned citation, duplicate accepted citation, direct labels on a non-answerable case, answerable case with no facet, more than three facets, supporting citation also accepted, duplicate facet. Ineligible accepted citations become `providerExcluded` access exclusions, never retrieval misses. Unavailable outputs never earn abstention credit.

Run: `bun test apps/ai_agent/tests/retrieval-target.test.ts`
Expected: PASS.

- [ ] **Step 3: Assemble the 24-case cohort**

Take the 16 answerable incidents and 8 no-match controls from `development-review-v3.json`, keeping `input` and `evidence` exactly as captured. Write `development-cases-v1.json` with `requiredFacets: []` and no scores.

Run: the completeness test — 24 cases, 16 answerable, 8 no-match, 16 distinct queries.
Expected: PASS.

- [ ] **Step 4: Prepare the score-blind review packet**

Emit all 55 sections per case with no scores or rankings. Re-adjudicate each answerable case into one to three required facets with independently sufficient accepted citations. Remap F01/F02 citations from `1.0.0` to `1.1.0`; consider the new `Historical snapshots and missing evidence` section; never keep a citation absent from the frozen corpus. For each no-match case, record why no current section is sufficient.

- [ ] **Step 5: Validate and freeze labels**

`development-labels-v1.json` must validate with `TargetLabelFileSchema`, cite only frozen-corpus citations, contain no `RB-F01-F02@1.0.0`, have no duplicate facet, and agree with the cases file on `supporting`/`missingRuntimeFacts`. Merge by case id; `prepareTargetBenchmark` refuses to run if any rule fails. Hash the labels and write the hash into the run manifest; a changed hash means a new run directory.

- [ ] **Step 6: Prepare and score the baseline**

`--prepare-baseline` writes `{ inputHash, config, queries }` compatible with `r23-models.mjs`; `inputHash` uses the existing `hash` from `retrieval-r21.ts`. Candidate sets are every section eligible under the case input, sorted by citation: 55 for `telegram`/`email`, 37 for `worker`/`database` (only the four `generic` runbooks). Config pins the `r23/config.json` reranker descriptor, `variants: ["original"]`, batch 8, max length 512.

The keyword arm is computed in-process. The MiniLM arm runs:

```powershell
node --experimental-transform-types apps/ai_agent/src/evaluation/r23-models.mjs `
  apps/ai_agent/evaluation/r3/runs/baseline-20261019-v1/inference-original.json `
  apps/ai_agent/evaluation/r3/runs/baseline-20261019-v1/scores-original.json
bun run apps/ai_agent/src/evaluation/retrieval-target-cli.ts --report apps/ai_agent/evaluation/r3/runs/baseline-20261019-v1
```

- [ ] **Step 7: Verify the baseline report**

Run: `bun test apps/ai_agent/tests/retrieval-target.test.ts apps/ai_agent/tests/rag-corpus-parity.test.ts`
Expected: PASS.

The report must contain keyword and `minilm-original` rows, every metric in §2.2, per-case citations and scores, and a failure ledger with one bucket per case: `query_observation`, `route_exclusion`, `candidate_omission`, `wrong_rank`, `facet_packing`, `cutoff_rejection`, `no_suitable_corpus_guidance`, `unavailable_output`.

**Exit gate:** labels validate and are hashed; baseline recorded even if far below target; no protocol or label edit made in response to the baseline.

**If it fails:** a label that cannot be adjudicated is a `corpus_gap` case, reported separately. Do not shrink facets to make a method look covered.

**Rollback:** delete the `baseline-*` run; keep `corpus-v1.json` and protocol.

**Task detail:** companion Tasks 3–5.

---

## 6. R3.2 — Structured evidence profile and evidence route

**Purpose:** stop searching with a concatenated evidence bag, and use observed faults to narrow the eligible set without leaking labels.

**Entry criteria:** R3.1 baseline exists; `retrievalInput` parity fixtures available.

**Outputs:**
- `apps/ai_agent/src/tools/retrieval-profile.ts`
- `apps/ai_agent/src/tools/structured-ranking.ts` — `rankRouteOnly`
- Tests: `retrieval-profile.test.ts`
- Runs: `profile-global-20261019-v1`, `profile-route-20261019-v1`

**Interfaces:**
- `observedFacts(evidence): ObservedFacts`
- `routeEvidence(evidence): { hints: string[]; confident: boolean; reasons: string[] }`
- `sanitizedQueryText(value): string` — same redaction behavior as today
- `buildStructuredRetrievalInput(evidence): StructuredRunbookSearchInput`
- `requestedGuidanceFacets(evidence): RequestedFacet[]`
- `evidenceAnchors(evidence): string[]`
- `rankRouteOnly(index, input, logits): { matches; route; routeExcluded }`
- `StructuredRunbookSearchInput = RunbookSearchInput & { route?; requestedFacets?; anchors? }`

- [ ] **Step 1: Write the failing route tests**

Cover: explicit 429 → `F01`; ambiguous delivery → `F07`; every development no-match incident → `{ hints: [], confident: false, reasons: [] }`; credential/destination faults → `F03`/`F04`; unsupported handler, duplicate, DLQ gap, SDK error → `F05`/`F08`/`F09`/`F10`; a bare `403` routes nowhere; email alone does not route to `F10`.

Run: `bun test apps/ai_agent/tests/retrieval-profile.test.ts`
Expected: FAIL, module absent.

- [ ] **Step 2: Implement `observedFacts` from observed fields only**

Flatten `failureContext.facts`, `executionEvidence.facts`, `inputValidation.facts`, and `fixture_observation` when the evidence is simulated. Derive without inventing: `status` = retry status → attempt status → bounded HTTP status from `final_error`; `retryAfterSeconds` = retry field → bounded `retry_after_<n>` → fixture fact; `finalError` = retry error → fixture error; `executionStatus`/`outcome` prefer `current_execution`; `deliveryUnknown` when any provider outcome or fixture delivery outcome is `unknown`; `absentCredentials` from `credential_presence.present === false`.

- [ ] **Step 3: Implement the predeclared route table**

Map only observed signals to taxonomy hints, per the table in companion Task 6. Add every matching hint (union, not a guess). `confident` is true only when at least one hint matches. Reasons are bounded safe field names such as `provider_status:429`, never raw error text, case ids, or family names.

- [ ] **Step 4: Move the sanitizer and build the structured query**

Move the exact `sanitizedQueryText` body into `retrieval-profile.ts`, re-import it in `graph.ts`, and keep `retrievalInput` byte-for-byte identical. Strip `controlled_fixture`, `support_unknown`, `fixture_inputs_unavailable`; keep status, retry-after, safe code, execution status/outcome, ordering, validation, missing fields/templates, credentials, attempts, and fixture facts. Bound the final query to 500 characters.

- [ ] **Step 5: Implement facet demand and discriminative anchors**

Facet demand follows the evidence/route table: delivery-unknown → investigation/remediation/forbidden; F01 or 429 → remediation/replay/verification; F05 → investigation/replay/verification; F06/F08/F10 → investigation/forbidden/verification; F02/F03/F04/F09 → investigation/remediation/verification; default → investigation/evidence/remediation. Anchors include only `429`, `5xx`, retry-after, safe code, missing fields/templates, absent credentials, and discriminative fault facts — never bare provider, action type, or validation status.

- [ ] **Step 6: Implement `rankRouteOnly` and capture both arms on the same logits**

Route-filter eligible sections only when the route is confident; otherwise rank the global set. Record `routeExcluded`. Prepare a **new** V2 inference input from `buildStructuredRetrievalInput` (do not reuse the legacy baseline queries), score it once, and derive `profile-global` (no route) and `profile-route` (route filter) from those same logits.

- [ ] **Step 7: Apply the route gate**

Reject hard routing if `routeCoverage < 100%` on development. On rejection, keep `profile-global` and continue. Never repair coverage with a gold filter or by deleting an accepted citation.

Run: `bun test apps/ai_agent/tests/retrieval-profile.test.ts apps/ai_agent/tests/diagnosis-graph.test.ts`
Expected: PASS, including the legacy `retrievalInput` parity test.

**Exit gate:** legacy query byte-identical on all task-A inputs; route coverage 100% or route disabled and recorded; both arms captured on identical logits.

**If it fails:** if route coverage cannot reach 100% without a rule that keys on case identity, disable routing. Facet packing alone may still proceed.

**Rollback:** remove the route from the structured input; `minilm-original` is untouched.

**Task detail:** companion Tasks 6–8.

---

## 7. R3.3 — Facet-aware packing

**Purpose:** spend the three returned slots on complementary guidance instead of three near-duplicate high scores.

**Entry criteria:** R3.2 arm selected; score vectors available.

**Outputs:**
- `apps/ai_agent/src/tools/section-facets.ts`
- `apps/ai_agent/src/tools/facet-pack.ts`
- `rankStructured` in `structured-ranking.ts`
- `RUNBOOK_RETRIEVAL_METHOD=structured-minilm` (opt-in only)
- Run: `profile-route-facets-20261019-v1`

**Interfaces:**
- `sectionFacet(heading): SectionFacet` — `symptoms | evidence | investigation | remediation | forbidden | replay | verification | example | sources | other`
- `isProceduralFacet(facet): boolean` — false only for `example` and `sources`
- `packByFacet(matches, requested, limit = 3): RunbookMatch[]`
- `rankStructured(index, input, logits): { matches; route; facetsRequested; facetsCovered }`

- [x] **Step 1: Write the failing heading test**

Classify all nine repeated headings, `Simulated example` → `example`, `Sources` → `sources`, `Historical snapshots and missing evidence` → `evidence`.

Run: `bun test apps/ai_agent/tests/section-facets.test.ts`
Expected: FAIL.

- [x] **Step 2: Implement the heading map**

Lowercase exact/synonym matching; unknown headings → `other`, which is treated as procedural so unfamiliar substantive headings are not discarded.

- [x] **Step 3: Write the failing packing test**

With candidates scored 0.9/0.8/0.7/0.6 and a `Sources` at 0.95, requesting `["evidence", "verification"]` must return `Symptoms, Evidence needed, Verification` — i.e. one per requested facet before score-filling, and never `Sources`.

Run: `bun test apps/ai_agent/tests/facet-pack.test.ts`
Expected: FAIL.

- [x] **Step 4: Implement the deterministic packer**

Drop non-procedural sections; walk requested facets in order selecting the highest-scored unused section for each; fill remaining slots by score; sort the final three by score then citation; never exceed three or repeat a citation.

- [x] **Step 5: Add the structured retriever branch**

`createRunbookRetriever` keeps `keyword` and `minilm-original` unchanged. Add `structured-minilm`: validate input, select eligible sections, route-filter when confident, score with the existing MiniLM process, rank, then pack. If `requestedFacets` is absent, return the score-ranked list without facet reservation. The `.001` floor stays exclusive to `minilm-original`; the structured branch does not use an absolute threshold as no-match authority. Never fall back to keyword after a valid no-match or scorer failure.

- [x] **Step 6: Capture the facet arm**

Use the same scores as the selected R3.2 arm; only packing changes. Report per-case facet coverage, missing-facet citations, and the failure ledger.

- [x] **Step 7: Apply the development gate**

- Sufficient-guidance hit@3 ≥ 80%.
- Macro section recall ≥ 80%.
- Direct precision not below the same-corpus keyword control.
- False abstention ≤ 5%.

Run: `bun test apps/ai_agent/tests/section-facets.test.ts apps/ai_agent/tests/facet-pack.test.ts apps/ai_agent/tests/runbook-retriever.test.ts`
Expected: PASS.

**Exit gate:** all four development checks pass. If they fail, stop — do not start abstention tuning to mask a recall failure.

**If it fails:** record the failing metric with absolute denominators and per-family results; the program stops at R3.3.

**Rollback:** the default remains `minilm-original`; delete the opt-in branch if rejected.

**Task detail:** companion Tasks 9–11.

---

## 8. R3.4 — Calibrated support gate

**Purpose:** decide "no suitable guidance" from observed support instead of a ranking artifact, so recall and abstention stop trading against each other.

**Entry criteria:** R3.3 gate passed.

**Outputs:**
- `apps/ai_agent/src/tools/retrieval-support.ts`
- `decideSupport` wired into `rankStructured` (`abstained`)
- Run: `profile-route-facets-support-20261019-v1`

**Interfaces:**
- `SupportPolicy = { minAnchorHits: 1 | 2 }`
- `SupportReason = "no_candidates" | "no_procedural_section" | "no_observed_anchor" | "supported"`
- `decideSupport(matches, input, policy): { abstain: boolean; reason: SupportReason }`

- [ ] **Step 1: Write the failing support tests**

Cover: empty candidates → `no_candidates`; generic section with no route and no anchor → `no_observed_anchor`; routed observed 429 → `supported`; `minAnchorHits: 2` with one anchor → `no_observed_anchor`.

Run: `bun test apps/ai_agent/tests/retrieval-support.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implement anchor matching**

Count distinct anchors found case-insensitively in the selected headings and content. Anchors are safe observed tokens only — no fixture-only controls, raw error bodies, PII, secrets, or labels.

- [ ] **Step 3: Wire the gate**

`rankStructured` returns `abstained` from `decideSupport` and an empty match array when abstaining. The graph already accepts an empty list; it must not substitute keyword results.

- [ ] **Step 4: Calibrate exactly two predeclared settings**

Test only `minAnchorHits: 1` and `minAnchorHits: 2`, using the frozen R3.2 route decision. Select by: abstention ≥ 90% → false abstention ≤ 5% → highest hit@3 → highest macro recall → lower latency. No third feature, threshold, or rule.

- [ ] **Step 5: Capture the support arm and apply the gate**

Run: `bun test apps/ai_agent/tests/retrieval-support.test.ts apps/ai_agent/tests/runbook-retriever.test.ts`
Expected: PASS, including "MiniLM abstention is never replaced by keyword overlap".

**Exit gate:** no-match abstention ≥ 90% and false abstention ≤ 5% on development; the selection order above is recorded.

**If it fails:** keep the failure explicit. Do not tune abstention to hide a recall miss and do not lower the gate.

**Rollback:** revert to score-ranked output for the structured arm; `minilm-original` unchanged.

**Task detail:** companion Tasks 12–13.

---

## 9. R3.5 — Freeze and independent holdout acceptance

**Purpose:** decide once, on data nobody tuned on.

**Entry criteria:** R3.4 gate passed; development labels and corpus hashes recorded.

**Outputs:**
- `r3/selected-retrieval-config.json`
- `r3/holdout/cases-v1.json`, `holdout/labels-v1.json`
- `r3/holdout/runs/…`
- `r3/decision.md`

- [ ] **Step 1: Freeze the configuration before the holdout exists**

Record `retrievalMethod`, `routeEnabled`, `support: { minAnchorHits }`, corpus hash, label hash, model id/revision/quantization, prompt version, and exact arm identifiers. The holdout must not be opened before this file is written.

- [ ] **Step 2: Commission an independent holdout**

40 disjoint incident families: 30 eligible answerable, 10 genuine no-match; all ten taxonomy categories represented; F05/F10 gaps represented honestly; no paraphrase of a development case; no R2.5 reuse. The author must not see development scores, rankings, or this plan's expected answers. Facet labels and rationales receive an independent second review before freeze.

- [ ] **Step 3: Freeze the holdout**

Hash cases and labels; record in the run manifest. Any later edit invalidates the acceptance run.

- [ ] **Step 4: Run once**

Run the frozen candidate and the keyword control. No tuning, reranking, route repair, or label adjustment after seeing results. Record all 40 scheduled cases, including unavailable outputs.

- [ ] **Step 5: Apply the release gate**

Accept only if: hit@3 ≥ 90%; macro recall ≥ 90%; abstention ≥ 90%; false abstention ≤ 5%; direct precision not below baseline; reliability ≥ 95%; p95 ≤ 3 s; zero evaluated safety violations.

- [ ] **Step 6: Write `decision.md`**

State `accepted`, `rejected`, or `blocked`, with every gate value, absolute denominators, per-family results, and (on rejection) the specific failing gate. On rejection, do not promote the least-bad arm, do not lower the gate, and do not re-use the holdout.

**Exit gate:** a frozen decision exists and matches the numbers.

**If it fails:** the program ends `rejected`; R3.7 integration does not run.

**Rollback:** none needed — runtime default was never changed.

**Task detail:** companion Task 13.

---

## 10. R3.6 — Diagnosis validation (separately gated, may be blocked)

**Purpose:** prove the retrieval change improves the thing that matters — the diagnosis — rather than only a retrieval metric.

**Entry criteria:** `decision.md` accepted; model key, database URL, and an explicitly approved budget available.

**Outputs:** `r3/diagnosis/…`, `r3/diagnosis-holdout/…`, reviewed results appended to `decision.md`.

- [ ] **Step 1: Preflight the budget**

Record model identifier (`gemini-2.5-flash`), price source/date, maximum attempts, token cap, and monetary ceiling. If any is missing, mark diagnosis `blocked` and do not claim acceptance.

- [ ] **Step 2: Predeclare 12 development incidents**

Use one exposed positive per available family (`f01-rate-limit-rejected`, `f02-connection-refused`, `f03-token-missing`, `f04-template-path-missing`, `f05-unsupported-action`, `f07-provider-response-lost`, `f08-success-stage-republished`, `f09-database-sink-only`, `f10-sdk-error-recorded-success`, `s03-sensitive-fields-present`) plus `nm01-telegram-message-too-long` and `nm04-email-sender-domain-unverified`. No substitutions after seeing results.

- [ ] **Step 3: Run three repetitions per case and arm**

Freeze each retriever's top three per case and inject them as a stub `searchRunbooks`, so retrieval variance does not contaminate the comparison. Cap generation at 72 attempts; retries count. Persist failures and unavailable usage.

- [ ] **Step 4: Review blinded**

Review root-cause support, correction claims, missing-evidence handling, delivery status, action routing, and citations. A deterministic schema pass is not semantic acceptance.

- [ ] **Step 5: Apply the 80% gate**

Accept if ≥ 80% of scheduled cases are semantically acceptable and bounded, with zero safety violations. If blocked, leave the gate open.

- [ ] **Step 6: Run the diagnosis holdout**

Freeze the serving configuration first; two repetitions per case, cap 80 attempts, randomized presentation. Same 80% gate.

**Exit gate:** development and holdout diagnosis results recorded or explicitly `blocked`; retrieval improvements never reported as diagnosis improvements.

**Task detail:** companion Tasks 14–15.

---

## 11. R3.7 — Integration, observability, and closeout

**Purpose:** ship the accepted configuration with a proven rollback, or ship nothing.

**Entry criteria:** `decision.md` says `accepted`.

**Outputs:**
- `graph.ts`: `DiagnosisOptions.retrievalInput`
- `index.ts`: method selection
- `observability.ts`: `retrievalConfig`, `abstained`
- Updated docs and a final verification record

- [ ] **Step 1: Write the failing integration test**

Assert the injected builder is used (`seen?.route?.hints` contains `F01`, query excludes `controlled_fixture`) and that `searchRunbooks` is called with the structured input. The graph default must remain the legacy builder.

- [ ] **Step 2: Add the injection point**

Add `retrievalInput?: (evidence: DiagnosisEvidenceBundle) => RunbookSearchInput` to `DiagnosisOptions`; default to the existing `retrievalInput`. No behavior change unless injected.

- [ ] **Step 3: Select the method in `index.ts`**

Pass `buildStructuredRetrievalInput` only when `RUNBOOK_RETRIEVAL_METHOD === "structured-minilm"`. Keep `minilm-original` as the fallback in this task; switching the default is a separate one-line reviewed change after acceptance.

- [ ] **Step 4: Prove rollback**

Document and test `RUNBOOK_RETRIEVAL_METHOD=keyword` and `=minilm-original`. No automatic fallback from a valid no-match or scorer failure.

- [ ] **Step 5: Add safe trace fields**

Add optional `retrievalConfig` and `abstained` to the observe details. Set `abstained` from `matches.length === 0`. Never record raw queries, evidence, error bodies, secrets, or labels.

- [ ] **Step 6: Run repository verification**

```powershell
bun run check-types
bun run lint
bun run build
```

Expected: type check and build pass; lint compared with the known baseline (9 errors, 22 warnings in unchanged frontend files). Do not report green lint if the baseline remains.

- [ ] **Step 7: Close out**

Write `decision.md` (already started in R3.5) with changed files, verification output, limitations, and exact staging paths. Update `docs/current-state.md`, `docs/decisions.md` (ADR 011), and the production-selection record with the R3 outcome. Graphify is updated only after the milestone is merged and the default branch is clean, per `docs/graphify.md`.

**Exit gate:** verification run and recorded; rollback proven; docs match behavior; no gate was weakened.

**Task detail:** companion Tasks 16–17.

---

## 12. Consolidated stop rules

Stop and report — do not work around — when any of these occurs:

1. Corpus parity fails and cannot be repaired without editing runbooks.
2. Labels cannot be re-adjudicated against the frozen corpus without inventing a citation.
3. Route coverage falls below 100% and cannot be repaired without a gold filter.
4. Development hit@3 stays below 80% after the one predeclared packing implementation.
5. Abstention cannot reach 90% without false abstention above 5%.
6. A release gate fails on the independent holdout.
7. Diagnosis credentials or budget are unavailable.
8. The work would require a new dependency, model, vector store, or open-ended method search.

Each stop produces a written record with the failing gate, denominators, and per-family evidence.

## 13. Effort and sequencing

| Phase | Indicative effort | Calendar shape |
| --- | --- | --- |
| R3.0 | 2–3 h | Half day, unblocked |
| R3.1 | 8–12 h | 1–1.5 days (label re-adjudication dominates) |
| R3.2 | 4–6 h | 1 day |
| R3.3 | 4–6 h | 1 day |
| R3.4 | 3–5 h | Half–1 day |
| R3.5 | 6–10 h + holdout authoring | 1–2 days, one-shot run |
| R3.6 | 4–8 h + model spend | 1 day, may block |
| R3.7 | 3–4 h | Half day |

Total: roughly 34–54 hours of focused work, excluding holdout authoring and model spend. The first four phases deliver a trustworthy answer even if the method is rejected.

## 14. Definition of done

R3 is done when exactly one of these is true:

1. **Accepted** — a frozen configuration passes the independent 90% retrieval gate, the 90% abstention gate, and the 80% diagnosis gate, with corpus/label/model/route/support hashes recorded, and integration ships with rollback proven.
2. **Rejected** — the plan stops at a named failing gate with per-case evidence, the runtime default is unchanged, and no method is promoted.

In both cases the project must be able to say whether the remaining problem is corpus/label coverage, route exclusion, facet packing, abstention calibration, or downstream diagnosis — and must no longer be able to attribute a score to "metadata filtering" without showing what it excluded and what ranking or packing did with the rest.
