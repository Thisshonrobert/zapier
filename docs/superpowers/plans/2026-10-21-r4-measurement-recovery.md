# R4 — Measurement Recovery and Pipeline Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking. Each phase ends at a review gate; do not start the next phase until that gate is recorded.

**Goal:** Produce a decision-grade `accepted | rejected | blocked` result for the structured runbook retrieval candidate by repairing the four known pipeline/label defects and replacing the underpowered 30-case holdout with a 120-answerable / 40-no-match benchmark analyzed with confidence intervals.

**Architecture:** Keep the read-only investigator, `RunbookRetriever` boundary, pinned local MiniLM cross-encoder, citation/hash contract, top-three limit, eligibility filters, and replay policy. Start from the R3.5 candidate behavior (`profile-route-facets-support`: profile `r3.2-v1`, packing `r3.3-v1`, support `r3.4-v1`). Add only the four R4 fixes. Do not add a retriever, model, index, reranker, planner, or dependency.

**Tech Stack:** Bun/TypeScript, Zod, local Node/ONNX MiniLM (`Xenova/ms-marco-MiniLM-L-6-v2`, revision `a09144355adeed5f58c8ed011d209bf8ee5a1fec`, `q8`), existing `retrieval-target.ts` scoring and `r23-models.mjs` inference. R4.0–R4.4 are offline and local.

**Spec:** [`docs/ai-dlq-master-plan.md`](../../../docs/ai-dlq-master-plan.md), [`RAG-DIAGNOSIS-CLOSEOUT.md`](../../../apps/ai_agent/evaluation/RAG-DIAGNOSIS-CLOSEOUT.md), [`r3/decision.md`](../../../apps/ai_agent/evaluation/r3/decision.md), [`r3/README.md`](../../../apps/ai_agent/evaluation/r3/README.md), and the [production-selection record](../../../apps/ai_agent/evaluation/production-selection/README.md).

---

## Execution order

1. **R4.0** — freeze the protocol and measurement rules.
2. **R4.2a** — reproduce the four defects against the current working tree. Record what is already fixed and what is not.
3. **R4.1** — author the 80-case development cohort and the sealed 160-case holdout, and implement the F04 label-schema fix. Seal the holdout before R4.3.
4. **R4.2b** — implement only the three confirmed runtime fixes, with failing tests first.
5. **R4.3** — run the 80-case development screening. If it fails, stop.
6. **R4.4** — freeze the candidate, open the holdout once, run once, decide.
7. **R4.5** — only if retrieval is accepted, run the 40-case blinded diagnosis validation.
8. **R4.6** — integrate behind the existing flag and close out.

**Start here (first working session):**

1. R4.0 — create `r4/README.md` and `r4/protocol.json`, record the starting Git state, and freeze the corpus/model references. Do not edit the corpus or the profile yet.
2. R4.2a — run the reproduction matrix on the current tree. Record which of the four defects are already fixed. This prevents rewriting working code.
3. R4.1 — implement the v2 label schema, re-adjudicate the 24 R3 development cases, then author the new development and holdout cases. Start the holdout authoring score-blind.

Do not run the holdout or tune thresholds until R4.3 passes and the candidate is frozen.

---

## Global constraints

- No HyDE, PageIndex, vector database, embedding index, BM25 serving path, new reranker, LLM planner, GraphRAG, whole-repo ingestion, or corpus expansion in R4.
- No runbook edits after R4.0. A runbook edit is a stop: restart with `corpus-v2.json`, a new parity hash, a new protocol, and re-adjudicated labels.
- No holdout access before the R4.4 candidate freeze. The holdout is authored score-blind and sealed with hashes.
- One holdout run only. No re-scoring, no peeking, no "fix and re-run" on the same holdout.
- Do not tune thresholds, routes, facets, labels, or prompts after any holdout score exists.
- Do not pass case ids, family names, expected diagnoses, gold citations, or labels into retrieval. The route may use observed evidence only.
- Preserve at-most-three excerpts, versioned citations, SHA-256 content hashes, stale exclusion, provider eligibility, untrusted-guidance flags, authorization, and replay policy.
- R4.0–R4.4 use local models only. R4.5 needs model credentials and a separately approved budget.
- Exclude generated Prisma and Graphify working-tree changes. Follow [`docs/manualgit_handoff.md`](../../manualgit_handoff.md); no automatic Git integration.
- Lint has a known baseline of 9 errors and 22 warnings in unchanged frontend files. Compare against the baseline; do not call lint green if those remain.

---

## 0. Starting point: R3.5, not R3.5r.3

R3.5 ended `rejected`, but the rejection is narrower than it looks:

| Holdout metric | Keyword | `profile-route-facets-support` | R3.5 gate |
| --- | ---: | ---: | ---: |
| Sufficient-guidance hit@3 | 0.000 | **0.800 (24/30)** | 0.90 |
| Macro section recall@3 | 0.239 | **0.8556** | 0.90 |
| Direct precision@3 | 0.233 | **0.800** | ≥ baseline |
| No-match abstention | 0/10 | **9/10** | 0.90 |
| False abstention | 0/30 | 2/30 (0.0667) | ≤ 0.05 |
| Reliability | — | 40/40 | ≥ 0.95 |
| Warm p95 | — | 2.017 s | ≤ 3 s |
| Safety violations | — | 0 | 0 |

All six answerable misses and the one no-match miss are attributable to known causes:

| Case | Cause | Category |
| --- | --- | --- |
| `f02-email-connect-timeout-presend` | No route; support gate abstained | F02 transport vocabulary |
| `f02-telegram-dns-failure-preconnect` | No route; support gate abstained | F02 transport vocabulary |
| `f04-email-numeric-recipient-field` | Returned sibling `RB-F03-F04` F04 section; label accepted only `RB-F04-F06` | Label equivalence |
| `f04-email-missing-subject-template` | Same sibling-section issue | Label equivalence |
| `f04-telegram-null-ticket-summary` | Same sibling-section issue | Label equivalence |
| `f09-unacknowledged-failure-publication` | `verification` dropped by facet truncation | F09 facet ordering |
| `nm-worker-local-queue-capacity` | Bare "refused" routed to F02; support gate accepted | No-match route guard |

The later **R3.5r.3 recovery line is closed**. Its development screening regressed to 56.25% hit@3 and 75.00% recall (`r3/recovery/screening-report.md`). R4 does not re-open it and does not inherit its changes automatically.

### 0.1 Reconciliation rule

The current working tree may contain R3.5r profile changes. R4 must establish its starting behavior before editing:

1. Run the current `structured-minilm` path on the frozen 24-case R3 development cohort.
2. Compare the result to the frozen R3.4 run (`r3/runs/profile-route-facets-support-20261019-v1`).
3. Record every behavioral difference in `r4/baseline-reconciliation.json`.
4. Keep an R3.5r change only if it is one of the four R4 fixes and passes the R4 reproduction tests. Revert or gate everything else.
5. Record the reconciled baseline hash in `r4/protocol.json`.

If the baseline cannot be reproduced, stop and report. Do not build R4 on an unidentified profile.

If an R3.5r change cannot be isolated safely, do not attempt a broad revert. Record the behavior, freeze it as the R4 baseline, and make the four fixes relative to that baseline. The goal is a reproducible starting point, not a clean historical tree.

---

## 1. What R4 is, and what it is not

R4 is a **measurement recovery and pipeline repair**, not another method sweep.

### 1.1 The decision R4 must make

> Is the repaired structured retrieval candidate good enough to become the serving default, with the remaining uncertainty stated honestly?

R4 produces one of three overall outcomes:

- `accepted` — `retrieval_accepted` on the sealed holdout and `diagnosis_accepted` on the pre-registered subset; integrate behind the flag.
- `rejected` — at least one retrieval or diagnosis quality gate fails; do not promote; publish the failure ledger.
- `blocked` — reliability or safety fails, or required credentials/data are unavailable; do not claim quality.

### 1.2 What R4 is not

- It is not a search for a better retriever. The R3.5 candidate already beats keyword by 60+ points on hit@3.
- It is not a corpus-expansion project. The 55-section corpus stays frozen.
- It is not a diagnosis-prompt project. Diagnosis is validated only after retrieval passes.
- It is not a license to lower the 90% target. It changes how the target is evidenced, not what the target is.

### 1.3 Why the previous rounds could not pick a winner

| Cause | Evidence | R4 response |
| --- | --- | --- |
| Underpowered holdout | 30 answerable cases; one case = 3.3 points; Wilson 95% CI for 24/30 is roughly 63–90% | 120 answerable holdout cases |
| Moving yardstick | 54/55/60-section corpora, direct/projected/procedure queries, labels v1/v2/v3 | One frozen corpus, one query construction, one label schema |
| Proxy metric | Section recall measured; diagnosis acceptance barely measured | Case-level hit@3 plus a 40-case diagnosis gate |
| Label ambiguity | F04 accepted only one of two independently sufficient sibling sections | Label schema v2 with up to four equivalent accepted citations |
| Conjunctive absolute gate | No arm dominates recall, abstention, precision, and latency | Point gates plus Wilson bounds and per-family floors |
| Holdout consumption | R3.5 holdout sealed after one run | New sealed holdout; one run, no reuse |

---

## 2. Measurement design

### 2.1 Primary and secondary metrics

**Primary:** `sufficientGuidanceHit@3` — an eligible answerable case is a hit when every required facet has at least one accepted citation in the returned three. This is the existing `scoreTarget` metric; do not invent a second definition.

**Secondary, always reported beside the primary:**

- `macroSectionRecall@3`
- `directPrecision@3`
- `candidateRecall` and `routeCoverage`
- `noMatchAbstention` and `falseAbstention`
- `reliability` and `p95LatencyMs`
- per-family hit@3 and recall
- provider-excluded and corpus-gap counts
- diagnosis acceptance (R4.5 only)

### 2.2 Cohorts

| Cohort | Total | Answerable | No-match | Make-up | Opened |
| --- | ---: | ---: | ---: | --- | --- |
| Development | 80 | 60 | 20 | 24 re-adjudicated R3 cases + 56 new; at least 5 per family | R4.1 |
| Independent holdout | 160 | 120 | 40 | 12 per family F01–F10; 40 no-match (10 missing guidance, 10 missing runtime fact, 10 out-of-scope, 10 adversarial/ambiguous) | Once, R4.4 |
| Diagnosis validation | 40 | 30 | 10 | Pre-registered holdout subset; never used for retrieval tuning | R4.5 |

The 160-case holdout is four times the R3.5 holdout. If authoring capacity cannot reach 120 answerable cases, the fallback is 120 total (90 answerable + 30 no-match), but the result must be labelled **screening**, not acceptance, and cannot claim ±5-point precision.

Provider-ineligible cases are `corpus_gap`, reported separately, and excluded from the no-match abstention denominator. They are not counted as retrieval misses.

### 2.3 Precision and power

At 120 answerable cases and a 90% observed rate:

- Wilson 95% CI half-width is approximately **±5.4 points**.
- The lower bound is approximately **83%**.
- A 95% lower bound of 90% would require roughly **300 answerable cases**; that is a separate Tier B budget and is out of scope.

At 40 no-match cases and a 90% observed abstention rate:

- Wilson 95% CI half-width is approximately **±9.3 points**.
- The lower bound is approximately **77%**.

**What this buys:** the design can distinguish a clearly under-target system from a clearly on-target one. It cannot certify a true 90% system with 95% confidence. A true 90% system lands at or above 108/120 only about half the time, so the gate is a decision rule, not a certification. R4 must state that limitation in the decision record rather than converting a point estimate into a certification. If the team needs a higher acceptance probability at the boundary, use the Tier B budget (~300 answerable cases).

**What it does not buy:** a reliable 5-point difference between two close candidates. R4 compares the candidate to the keyword control, not to another near-equal arm. Paired bootstrap results are reported as decision support, not as proof of superiority.

### 2.4 Gates and decision rule

| Gate | Development screening (80) | Independent acceptance (160 + diagnosis 40) |
| --- | ---: | ---: |
| Sufficient-guidance hit@3 | ≥ 80% | point ≥ 90%; Wilson lower ≥ 82% |
| Macro section recall@3 | ≥ 80% | point ≥ 90%; Wilson lower ≥ 82% |
| Direct precision@3 | ≥ same-corpus keyword control | ≥ keyword control; no family regression > 10 points |
| No-match abstention | ≥ 90% | point ≥ 90%; Wilson lower ≥ 75% |
| False abstention | ≤ 5% | point ≤ 5%; Wilson upper reported |
| Per-family hit@3 | report only | ≥ 70% in every family |
| Route coverage | 100% | 100% |
| Reliability | ≥ 95% | ≥ 95% |
| Warm retrieval p95 | ≤ 3 s | ≤ 3 s |
| Safety violations | 0 | 0 |
| Diagnosis acceptance | — | R4.5 only, after retrieval passes: point ≥ 80%; Wilson lower ≥ 62% (30 answerable cases) |

**Decision rule (retrieval, R4.4):**

```text
retrievalAccepted =
  hitAt3.point >= 0.90
  and hitAt3.wilsonLower95 >= 0.82
  and recall.point >= 0.90
  and recall.wilsonLower95 >= 0.82
  and noMatchAbstention.point >= 0.90
  and noMatchAbstention.wilsonLower95 >= 0.75
  and falseAbstention.point <= 0.05
  and everyFamilyHitAt3 >= 0.70
  and directPrecision >= keywordControl
  and routeCoverage == 1.00
  and reliability >= 0.95
  and p95LatencyMs <= 3000
  and safetyViolations == 0
```

**Decision rule (diagnosis, R4.5, only if `retrievalAccepted`):**

```text
diagnosisAccepted =
  diagnosisAcceptance.point >= 0.80
  and diagnosisAcceptance.wilsonLower95 >= 0.62
  and diagnosisSafetyViolations == 0
```

Overall promotion requires `retrievalAccepted && diagnosisAccepted`. Retrieval and diagnosis are separate decisions so a diagnosis failure never causes retrieval re-tuning. A failed retrieval gate yields `retrieval_rejected`; a failed diagnosis gate yields `diagnosis_rejected`. A reliability or safety failure yields `blocked` until the operational cause is fixed and a new holdout is commissioned. The overall R4 outcome is `accepted` only if both sub-decisions are accepted, `rejected` if either is rejected, and `blocked` otherwise.

**Why the CI bounds are not the target.** The 90% point gates preserve the historical requirement. The Wilson bounds prevent a lucky 108/120 from being reported as certain 90% performance. They are evidence rules, not a lowered target.

### 2.5 Labeling and adjudication

Every case and label follows the existing R3 separation: the case file holds the input and accepted citations; the label file holds the reviewer rationale and no-match rationale. Do not add a new required field to `TargetCaseSchema`.

```ts
type R4Case = {
  id: string;
  split: "development" | "holdout";
  kind: "answerable" | "no_match" | "corpus_gap";
  input: { query: string; providers?: string[]; limit?: 3 };
  requiredFacets: Array<{ facet: TargetFacet; accepted: string[] }>; // max 3
  supporting: string[];
  missingRuntimeFacts: string[];
};

type R4Label = {
  id: string;
  requiredFacets: Array<{ facet: TargetFacet; accepted: string[]; rationale: string }>;
  supporting: string[];
  missingRuntimeFacts: string[];
  noMatchRationale: string | null;
};
```

A **fingerprint** is a validator-computed SHA-256 of the id-free normalized case content (input, required facets, supporting, missing runtime facts). It is not stored in the case schema. The validator rejects exact duplicates and writes the fingerprint list to `holdout/fingerprints-v1.json`.

Label rules:

1. **Accept every independently sufficient section.** If `RB-F03-F04` and `RB-F04-F06` each independently satisfy the same facet, both go in `accepted`. This is the F04 fix.
2. **Only jointly sufficient sections go in `supporting`.** A section that needs another section to answer is not accepted.
3. **At most three required facets.** If a case genuinely needs four, split it into two cases or record it as a coverage limitation. Never create an impossible three-slot case.
4. **Only access-eligible citations may be accepted.** If a relevant section is provider-ineligible, the case is `corpus_gap` with a rationale; it does not enter the recall denominator.
5. **No-match rationales are mandatory.** State whether the cause is missing corpus guidance, missing runtime fact, provider ineligibility, or adversarial/ambiguous input.
6. **Labels are authored score-blind.** The author must not see rankings, scores, candidate outputs, or the failure ledger before labeling.
7. **Content fingerprints are unique.** The validator computes an id-free SHA-256 for each case and rejects exact duplicates. A reviewer checks near-duplicates manually; more than 10% near-duplicates is a benchmark defect.

**Audit:**

- A second reviewer independently labels a 20% sample; compute Cohen's kappa on the binary "sufficient guidance" judgment.
- The second reviewer then reviews 100% of holdout cases for adjudication.
- Require kappa ≥ 0.70. If lower, adjudicate disagreements, revise the label guide, and re-review before sealing.
- Record the audit in `holdout/review-v1.json` and the label hash in `holdout/seal.json`.

### 2.6 Holdout sealing and one-shot rule

- The holdout is authored before the candidate freeze and stored under `r4/holdout/`.
- `holdout/seal.json` records SHA-256 hashes of cases, labels, evidence, review, the diagnosis subset, fingerprints, and the authoring attestation.
- No one working on the candidate opens the holdout files before R4.4. Only the hashes are cited.
- R4.4 writes `selected-retrieval-config.json` first, then opens the holdout, then runs once.
- A label defect discovered after the run consumes the holdout. A new sealed holdout is required (repeat R4.1); do not re-score.
- A corpus edit consumes the holdout and restarts R4.0 with `corpus-v2.json`.

### 2.7 Analysis plan

The R4 driver writes `report.json` with:

- per-case returned citations, scores, eligible/accepted sets, hit/miss, abstain reason;
- absolute numerators and denominators for every metric;
- Wilson 95% intervals for the primary, recall, abstention, and false abstention;
- per-family breakdown;
- corpus_gap and provider-excluded counts;
- failure ledger with one stage per miss: `no_corpus_guidance`, `query_observation_loss`, `candidate_omission`, `wrong_rank`, `cutoff_rejection`, `facet_dropped`, `support_abstention`, `label_equivalence`; provider-ineligible cases are reported separately as `corpus_gap`, not as retrieval misses;
- paired comparison against the keyword control on the same cases (McNemar counts and paired bootstrap difference);
- reliability and latency distribution.

No metric is reported without its numerator and denominator. No average is reported without the per-family breakdown.

---

## 3. Pipeline and label fixes

Only four changes are authorized. Each must be reproduced first.

**The current working tree may already contain some of these fixes.** The transport vocabulary, the no-match weak-token guard, and the verification invariant already have tests in `retrieval-profile.test.ts`. R4.2a is therefore a verification step, not a rewrite. Use the tests as the contract: if a behavior already passes, record it as `already_fixed` in the reproduction matrix and do not change the code. Only implement the behaviors that fail.

### 3.1 F02 — pre-connection transport route

**Files:** `apps/ai_agent/src/tools/retrieval-profile.ts`, `apps/ai_agent/tests/retrieval-profile.test.ts`.

**Required behavior:**

- A final error with a typed transport token (`EAI_AGAIN`, `ENOTFOUND`, `getaddrinfo`, `DNS lookup`, `ECONNREFUSED`, `ECONNRESET`, `ETIMEDOUT`, `connection refused`, `connection reset`, `TLS handshake`, `socket hang up`, `502/503/504`) routes to F02.
- A weak token (`timed out`, `timeout`, `network`, `refused`, `reset`) routes only with a **transport-specific** corroborator: phase `pre_send`/`connect`/`dns`/`resolve`, a 5xx status, or fixture facts `failure_before_send` / `all_attempts_not_delivered`.
- A provider name alone is **not** a transport corroborator. This is the no-match guard.
- A non-provider subsystem (`worker admission`, `queue capacity`, `database`, `postgres`, `prisma`, `advisory lock`, `scheduler`, `heap`, `out of memory`) never routes from a weak token.

**Tests to add:**

```ts
test("EAI_AGAIN pre-send routes to F02", () => {
  const route = routeEvidence(
    transportEvidence({ finalError: "DNS lookup returned EAI_AGAIN" }),
  );
  expect(route.hints).toEqual(["F02"]);
});

test("timed out with pre_send phase routes to F02", () => {
  const route = routeEvidence(
    transportEvidence({
      finalError: "timed out",
      provider: "smtp",
      phase: "pre_send",
    }),
  );
  expect(route.hints).toEqual(["F02"]);
});

test("a provider name alone does not corroborate a weak token", () => {
  expect(
    routeEvidence(
      transportEvidence({ finalError: "timed out", provider: "smtp" }),
    ),
  ).toEqual({ hints: [], confident: false, reasons: [] });
});

test("worker admission refusal stays unrouted even with a provider", () => {
  expect(
    routeEvidence(
      transportEvidence({
        finalError: "worker admission refused: local queue capacity",
        provider: "smtp",
      }),
    ),
  ).toEqual({ hints: [], confident: false, reasons: [] });
});

test("TLS handshake failure routes to F02", () => {
  expect(
    routeEvidence(
      transportEvidence({ finalError: "TLS handshake failed" }),
    ).hints,
  ).toEqual(["F02"]);
});
```

### 3.2 F09 — facet derivation must not drop verification

**Files:** `apps/ai_agent/src/tools/retrieval-profile.ts`, `apps/ai_agent/tests/retrieval-profile.test.ts`.

**Required behavior:**

- Derive facets per signal, then apply a hard invariant: if any fault signal is present, `verification` is in the requested facets.
- If the union exceeds three, drop `evidence` first, then `symptoms`, then `replay`; never drop `verification` for a fault signal.
- Record the dropped facets in the evaluation trace (`facetSelection.dropped`) so the failure ledger can attribute a miss.
- A no-match case must not gain a fault facet merely because the query contains generic words.

**Tests to add** (inside the existing `per-signal facet derivation` block, using its `emptySignals` helper):

```ts
test("publication plus unknown outcome keeps verification", () => {
  const facets = requestedFacetsForSignals({
    ...emptySignals(),
    publication: true,
    outcomeUnknown: true,
  });
  expect(facets).toContain("verification");
  expect(facets).toHaveLength(3);
});

test("facet selection never drops verification for a fault signal", () => {
  for (const key of faultSignalKeys) {
    const signals = { ...emptySignals(), [key]: true };
    expect(requestedFacetsForSignals(signals)).toContain("verification");
  }
});

test("empty signals keep the unchanged default demand", () => {
  expect(requestedFacetsForSignals(emptySignals())).toEqual([
    "investigation",
    "evidence",
    "remediation",
  ]);
});
```

### 3.3 No-match — weak-token route guard

**Files:** `apps/ai_agent/src/tools/retrieval-profile.ts`, `apps/ai_agent/src/tools/retrieval-support.ts`, tests.

**Required behavior:**

- A bare `refused` or `reset` cannot make `route.confident` true without a transport-specific corroborator.
- When a weak token is rejected, record the rejection in the evaluation trace as `weak_token_rejected:no_transport_corroborator`. Do not add it to `routeEvidence.reasons`; that array stays empty for an unrouted observation.
- `decideSupport` may still accept a confident route, but only a route produced under the rule above.
- The no-match worker-admission case returns `abstain: true`, reason `no_observed_anchor` or `no_procedural_section`.

**Tests to add:**

Extend the `transportEvidence` test helper with an optional `providerOutcome` override (default `"rejected"`) so the no-match fixture can clear it. The reproduction must isolate the weak token, not a provider rejection.

```ts
test("worker admission refused does not set a confident route", () => {
  const input = buildStructuredRetrievalInput(
    transportEvidence({
      finalError: "worker admission refused: local queue capacity",
      provider: "smtp",
      providerOutcome: null,
    }),
  );
  expect(input.route?.confident).toBe(false);
});

test("bare refused does not set route.confident", () => {
  const input = buildStructuredRetrievalInput(
    transportEvidence({ finalError: "request refused" }),
  );
  expect(input.route?.confident).toBe(false);
});

test("confident transport route sets route.confident", () => {
  const input = buildStructuredRetrievalInput(
    transportEvidence({ finalError: "connect ECONNREFUSED 10.0.0.4:25" }),
  );
  expect(input.route?.confident).toBe(true);
});
```

### 3.4 F04 — label equivalence schema

**Files:** `apps/ai_agent/src/evaluation/retrieval-target.ts`, `apps/ai_agent/tests/retrieval-target.test.ts`, `apps/ai_agent/tests/retrieval-r4.test.ts`.

This is a **measurement fix**, not a runtime fix.

**Required behavior:**

- Increase `RequiredFacetSchema.accepted` from `max(2)` to `max(4)` for case files.
- Increase `LabelFacetSchema.accepted` from `max(2)` to `max(4)` for label files.
- Add `TargetLabelFileV2Schema` with `version: 2`, reusing the updated `LabelFacetSchema`. Add `loadTargetLabelsV2(path)` or make `loadTargetLabels` version-aware. Keep `TargetLabelFileSchema` (v1) parsing intact for historical runs.
- Require one rationale line per accepted citation. Keep the existing line-based provenance check.
- `scoreTarget` continues to treat any accepted citation as covering the facet; no scoring change is needed.
- A case whose facet has three equivalent sections must parse, score, and pass when any one is returned.

**Tests to add:**

```ts
test("a facet may accept four equivalent sections", () => {
  const parsed = TargetCaseSchema.parse({
    id: "synthetic-equivalence",
    split: "development",
    kind: "answerable",
    input: { query: "missing template path", limit: 3 },
    requiredFacets: [
      {
        facet: "remediation",
        accepted: ["RB-A#a", "RB-A#b", "RB-B#c", "RB-B#d"],
      },
    ],
    supporting: [],
    missingRuntimeFacts: [],
  });
  expect(parsed.requiredFacets[0]?.accepted).toHaveLength(4);
});

test("v1 labels still parse", () => {
  const v1LabelFixture = {
    version: 1,
    cases: [
      {
        id: "synthetic-v1",
        requiredFacets: [
          { facet: "remediation", accepted: ["RB-A#a"], rationale: "sufficient" },
        ],
        supporting: [],
        missingRuntimeFacts: [],
        noMatchRationale: null,
      },
    ],
  };
  expect(() => TargetLabelFileSchema.parse(v1LabelFixture)).not.toThrow();
});

test("v2 labels require one rationale line per citation", () => {
  expect(() =>
    TargetLabelFileV2Schema.parse({
      version: 2,
      cases: [
        {
          id: "synthetic-equivalence",
          requiredFacets: [
            {
              facet: "remediation",
              accepted: ["RB-A#a", "RB-B#b"],
              rationale: "only one line",
            },
          ],
          supporting: [],
          missingRuntimeFacts: [],
          noMatchRationale: null,
        },
      ],
    }),
  ).toThrow();
});
```

After R4.1 labels exist, add one integration test that uses a real F04-equivalent **development** case: return the second accepted citation and assert that the resulting `sufficientGuidanceHitAt3` is 1. Never use holdout citations in this test.

### 3.5 Explicitly not fixed

- The corpus is not deduplicated. Deduplication is a corpus v2 change and belongs in R5.
- The `.001` sigmoid cutoff is not re-tuned. The support gate is the abstention mechanism.
- The diagnosis prompt is not changed in R4.1–R4.4. R4.5 measures it as-is.
- The retrieval method is not changed. No HyDE, PageIndex, vector DB, reranker, or planner.

---

## 4. Phases

### R4.0 — Freeze the protocol and baseline

**Files:**

- Create: `apps/ai_agent/evaluation/r4/README.md`
- Create: `apps/ai_agent/evaluation/r4/protocol.json`
- Create: `apps/ai_agent/evaluation/r4/baseline-reconciliation.json`
- Modify: none in `src/`

**Tasks:**

- [x] **Step 1: Record the starting state**

```powershell
git status --short
git rev-parse HEAD
```

Write the commit, branch, and working-tree summary into `protocol.json.startingState`.

- [x] **Step 2: Freeze the corpus and model references**

Copy the R3 corpus hash and model revision into `protocol.json`. Do not copy the corpus file; reference `apps/ai_agent/evaluation/r3/corpus-v1.json` and its `sectionsHash`.

- [x] **Step 3: Write the protocol**

`protocol.json` must contain:

```json
{
  "version": 1,
  "status": "frozen_before_measurement",
  "createdAt": "2026-10-21",
  "primaryMetric": "sufficientGuidanceHitAt3",
  "corpus": {
    "path": "apps/ai_agent/evaluation/r3/corpus-v1.json",
    "sectionsHash": "45e85c3585607ebfd0e1ebd1f2b068e2fab7c889b1bdd3af3a565f20afcbd440",
    "sections": 55
  },
  "development": { "cases": 80, "answerable": 60, "noMatch": 20 },
  "holdout": { "cases": 160, "answerable": 120, "noMatch": 40, "status": "not_authored" },
  "gates": {
    "development": {
      "sufficientGuidanceHitAt3": 0.8,
      "macroSectionRecallAt3": 0.8,
      "noMatchAbstention": 0.9,
      "falseAbstentionMax": 0.05,
      "routeCoverage": 1.0,
      "reliability": 0.95,
      "p95LatencyMs": 3000
    },
    "acceptance": {
      "sufficientGuidanceHitAt3Point": 0.9,
      "sufficientGuidanceHitAt3WilsonLower": 0.82,
      "macroSectionRecallAt3Point": 0.9,
      "macroSectionRecallAt3WilsonLower": 0.82,
      "noMatchAbstentionPoint": 0.9,
      "noMatchAbstentionWilsonLower": 0.75,
      "falseAbstentionPointMax": 0.05,
      "perFamilyHitAt3Min": 0.7,
      "routeCoverage": 1.0,
      "reliability": 0.95,
      "p95LatencyMs": 3000,
      "safetyViolationsMax": 0
    }
  },
  "diagnosis": {
    "cases": 40,
    "answerable": 30,
    "acceptancePoint": 0.8,
    "acceptanceWilsonLower": 0.62,
    "safetyViolationsMax": 0
  },
  "statistics": { "interval": "wilson", "confidence": 0.95, "pairedBootstrapResamples": 10000 },
  "decisionRule": "retrievalAccepted and diagnosisAccepted exactly as defined in section 2.4; a failed retrieval gate is rejected, and reliability, safety, or credential failures are blocked",
  "excluded": ["hyde", "pageindex", "vector_db", "embedding_index", "bm25_serving", "new_reranker", "llm_planner", "corpus_expansion"],
  "holdoutSeal": null
}
```

After Steps 1 and 4, add `startingState` (commit, branch, working-tree summary) and `baselineReconciliationHash` to the same file.

- [x] **Step 4: Run the reconciliation**

Run the current `structured-minilm` path on the 24 R3 development cases and compare to the frozen R3.4 run. Use the existing R3 capture/replay path or a small script that imports `scoreTarget` and the frozen retriever; do not create a second scoring system. Write `baseline-reconciliation.json` with per-case deltas and a keep/revert decision for any R3.5r change.

- [x] **Step 5: Review gate**

- [x] Protocol hash recorded.
- [x] Corpus hash matches `tests/rag-corpus-parity.test.ts`.
- [x] Reconciliation is complete; every difference is explained.
- [x] No source file changed in this phase.

**Exit:** protocol hash + reconciliation record + reviewer sign-off.

**Stop rule:** if the baseline cannot be reproduced, stop. Do not author cases or edit the profile on an unidentified baseline.

---

### R4.1 — Build the benchmark

**Files:**

- Create: `apps/ai_agent/evaluation/r4/development-cases-v1.json`
- Create: `apps/ai_agent/evaluation/r4/development-labels-v2.json`
- Create: `apps/ai_agent/evaluation/r4/development-evidence-v1.json`
- Create: `apps/ai_agent/evaluation/r4/holdout/cases-v1.json`
- Create: `apps/ai_agent/evaluation/r4/holdout/labels-v2.json`
- Create: `apps/ai_agent/evaluation/r4/holdout/evidence-v1.json`
- Create: `apps/ai_agent/evaluation/r4/holdout/review-v1.json`
- Create: `apps/ai_agent/evaluation/r4/holdout/diagnosis-subset-v1.json`
- Create: `apps/ai_agent/evaluation/r4/holdout/fingerprints-v1.json`
- Create: `apps/ai_agent/evaluation/r4/holdout/authoring-attestation-v1.json`
- Create: `apps/ai_agent/evaluation/r4/holdout/seal.json`
- Modify: `apps/ai_agent/src/evaluation/retrieval-target.ts`
- Modify: `apps/ai_agent/tests/retrieval-target.test.ts`

**Tasks:**

- [ ] **Step 1: Implement the label schema v2**

Modify `retrieval-target.ts` before authoring labels:

- increase `RequiredFacetSchema.accepted` from `max(2)` to `max(4)` for case files;
- increase `LabelFacetSchema.accepted` from `max(2)` to `max(4)` for label files;
- add `TargetLabelFileV2Schema` with `version: 2`, reusing the updated `LabelFacetSchema`;
- add `loadTargetLabelsV2(path)` or make `loadTargetLabels` version-aware;
- keep v1 parsing intact;
- add the schema tests from section 3.4 to `retrieval-target.test.ts`.

Run:

```powershell
rtk proxy bun test apps/ai_agent/tests/retrieval-target.test.ts
```

- [ ] **Step 2: Re-adjudicate the 24 R3 development cases**

Apply the R4 label rules, especially equivalent accepted citations and the three-facet ceiling. Record every change from `r3/development-labels-v1.json` in a diff note. Reuse the existing 24 development evidence entries; do not alter the frozen corpus.

- [ ] **Step 3: Add 56 new development cases**

Target 60 answerable + 20 no-match. At least 5 answerable cases per family F01–F10. Use sanitized evidence shapes from the existing fixtures and runbooks. Do not use holdout material. Create one `development-evidence-v1.json` entry per case.

- [ ] **Step 4: Author the 160-case holdout**

Target 120 answerable + 40 no-match. Use 12 answerable cases per family F01–F10. Use 40 no-match cases in four equal buckets: missing guidance, missing runtime fact, out-of-scope, adversarial/ambiguous. Provider-ineligible cases are `corpus_gap`, not `no_match`, and are reported separately. Pre-register a 40-case diagnosis subset (30 answerable + 10 no-match) inside the holdout before sealing. Create one `holdout/evidence-v1.json` entry per case.

Authoring rules:

- The author must not open candidate outputs, scores, or the R3.5 failure ledger beyond the published aggregate table.
- Each case gets a unique content fingerprint; the validator writes the list to `holdout/fingerprints-v1.json`.
- Each required facet lists every independently sufficient eligible citation, up to four.
- Each accepted citation gets a rationale line.
- No case may require more than three facets.

- [ ] **Step 5: Run the label audit**

A second reviewer independently labels a 20% sample; compute Cohen's kappa on the binary sufficient-guidance judgment. The second reviewer then reviews 100% of holdout cases for adjudication. Require kappa ≥ 0.70. Adjudicate disagreements and revise the guide if needed.

- [ ] **Step 6: Validate the files**

Add `apps/ai_agent/tests/retrieval-r4.test.ts` with these assertions:

- The development and holdout labels parse through `TargetLabelFileV2Schema`.
- Every development and holdout case has a matching evidence entry, and every evidence entry has a matching case.
- Every development and holdout case parses through `TargetCaseSchema`.
- Every citation in `requiredFacets[].accepted` and `supporting` exists in the frozen corpus.
- No case has more than three required facets.
- No facet has more than four accepted citations.
- Every multi-citation facet has one rationale line per accepted citation.
- A case whose accepted citations are all provider-ineligible is `corpus_gap`, never `answerable` or `no_match`.
- Case content fingerprints are unique across both splits; the validator computes them with an id-free SHA-256 and writes the list to `holdout/fingerprints-v1.json`.
- A synthetic F04-equivalent case with two accepted sibling citations scores as sufficient when either is returned.

Example for the first three checks:

```ts
import { createHash } from "node:crypto";

const runbooksDir = join(import.meta.dir, "../../../docs/AI/runbooks");
const devCasesPath = join(import.meta.dir, "../evaluation/r4/development-cases-v1.json");
const holdoutCasesPath = join(import.meta.dir, "../evaluation/r4/holdout/cases-v1.json");

const fingerprint = (item: TargetCase): string =>
  createHash("sha256")
    .update(
      JSON.stringify({
        input: item.input,
        requiredFacets: item.requiredFacets,
        supporting: item.supporting,
        missingRuntimeFacts: item.missingRuntimeFacts,
      }),
    )
    .digest("hex");

test("R4 benchmark files are internally consistent", async () => {
  const index = await loadRunbooks(runbooksDir);
  const known = new Set(index.map((section) => section.citation));
  for (const path of [devCasesPath, holdoutCasesPath]) {
    const cases = await loadTargetCases(path);
    expect(new Set(cases.map(fingerprint)).size).toBe(cases.length);
    for (const item of cases) {
      expect(item.requiredFacets.length).toBeLessThanOrEqual(3);
      for (const facet of item.requiredFacets) {
        expect(facet.accepted.length).toBeLessThanOrEqual(4);
        for (const citation of facet.accepted) {
          expect(known.has(citation)).toBe(true);
        }
      }
    }
  }
});
```

Run:

```powershell
rtk proxy bun test apps/ai_agent/tests/retrieval-r4.test.ts
```

- [ ] **Step 7: Seal the holdout**

Write `holdout/seal.json` with SHA-256 hashes for cases, labels, evidence, review, the diagnosis subset, fingerprints, and the authoring attestation. Hash the raw label file bytes or widen `targetLabelHash` to accept v1 and v2; record the exact method in the seal. Record the seal in `protocol.json.holdoutSeal`.

- [x] **Step 8: Review gate**

- [ ] 80 development cases and 160 holdout cases validated.
- [ ] Label audit complete; kappa ≥ 0.70.
- [ ] Holdout sealed; no candidate author has opened it.
- [ ] Label hash and seal hash recorded.

**Exit:** benchmark hashes + audit report + sealed holdout.

**Stop rule:** if fewer than 90 answerable holdout cases can be authored, downgrade the claim to screening and do not run R4.4 as an acceptance event.

---

### R4.2 — Implement the runtime fixes (F02, F09, no-match)

The F04 label-schema fix was completed in R4.1 because the benchmark cannot be validated without it. This phase implements the three runtime fixes.

Do not edit the historical `r3.2-v1` version labels in `retrieval-target-cli.ts` or any R3 artifact. The R4 driver records `profileVersion: "r4-v1"` for the new candidate.

**Files:**

- Modify: `apps/ai_agent/src/tools/retrieval-profile.ts`
- Modify: `apps/ai_agent/src/tools/retrieval-support.ts` (only if the route guard requires it)
- Modify: `apps/ai_agent/tests/retrieval-profile.test.ts`
- Modify: `apps/ai_agent/tests/retrieval-support.test.ts`
- Modify: `apps/ai_agent/tests/retrieval-r4.test.ts`

**Tasks:**

- [x] **Step 1: Write the reproduction matrix**

Use synthetic fixtures derived from the published failure ledger. Do not open the sealed holdout. Record the current behavior in `r4/runs/reproduction-matrix.json`.

| Defect | Fixture | Current | Required |
| --- | --- | --- | --- |
| F02 DNS | `DNS lookup returned EAI_AGAIN`, no provider, pre-send | record | F02 route, no abstain |
| F02 timeout | `timed out`, pre-send, provider observed | record | F02 route, no abstain |
| F02 no-match | `worker admission refused: local queue capacity`, provider observed | record | no F02 route, abstain |
| F09 publication | outcome unknown + unacknowledged publication | record | `verification` retained |
| F04 equivalence | two sibling sections independently sufficient | record | either accepted |

- [x] **Step 2: Write the failing tests**

Add the tests from sections 3.1–3.3. Run them and confirm each test fails only where the behavior is still broken. Record already-fixed behaviors as `already_fixed` in the reproduction matrix; do not rewrite working code. The section 3.4 label-schema tests were added in R4.1.

- [x] **Step 3: Implement F02 transport routing**

Minimal change in `transportObservation` and `routeEvidence`:

- add any missing pre-connection tokens;
- require a transport-specific corroborator for weak tokens;
- do not treat provider presence alone as corroboration;
- preserve the non-provider subsystem exclusion.

- [x] **Step 4: Implement F09 facet invariant**

Minimal change in `signalDemands` / `requestedFacetsForSignals`:

- select facets per signal;
- enforce `verification` for any fault signal;
- drop `evidence`, then `symptoms`, then `replay` before dropping `verification`;
- expose the dropped facets for the trace.

- [x] **Step 5: Implement the no-match route guard**

Minimal change in `transportObservation` / `routeEvidence`:

- a bare `refused` or `reset` is a weak token and cannot set `route.confident`;
- require a transport-specific corroborator before routing;
- preserve the non-provider subsystem exclusion;
- record the rejection in the evaluation trace for the failure ledger;
- keep `routeEvidence.reasons` empty for an unrouted observation.

If this behavior is already covered by the F02 corroborator change, record it as `already_fixed` and add only the missing test.

- [x] **Step 6: Run focused tests**

```powershell
rtk proxy bun test apps/ai_agent/tests/retrieval-profile.test.ts apps/ai_agent/tests/retrieval-support.test.ts apps/ai_agent/tests/retrieval-target.test.ts apps/ai_agent/tests/retrieval-r4.test.ts
```

Expected: all pass. If an already-fixed defect passes without a change, record that in the reproduction matrix and move on.

- [x] **Step 7: Type check**

```powershell
bun run check-types
```

- [x] **Step 8: Review gate**

- [x] All three runtime fixes have a failing-then-passing test.
- [x] The R4.1 label-schema fix still passes.
- [x] No change outside the authorized fixes.
- [x] The 24-case R3 development behavior is recorded; any regression is explained.
- [x] Type check passes.

**Exit:** code + tests + reproduction matrix.

**Stop rule:** if a fix requires a corpus edit, stop and restart R4.0 with corpus v2. Do not edit runbooks inside R4.2.

---

### R4.3 — Development screening

**Files:**

- Create: `apps/ai_agent/src/evaluation/retrieval-r4.ts`
- Modify: `apps/ai_agent/tests/retrieval-r4.test.ts`
- Create: `apps/ai_agent/evaluation/r4/runs/dev-20261021-v1/` (immutable run directory)

**Tasks:**

- [ ] **Step 1: Build the R4 driver**

The driver must:

- load `protocol.json`, development cases, development labels, and development evidence;
- run the frozen `structured-minilm` candidate and the keyword control on the same cases;
- call `scoreTarget` rather than duplicating scoring;
- compute Wilson 95% intervals and per-family metrics;
- write `report.json`, `failure-ledger.json`, and `decision.md`;
- refuse to overwrite an existing run directory.

Do not duplicate `scoreTarget`, `eligibleRunbookSections`, or the retriever.

- [ ] **Step 2: Add driver tests**

Required test cases:

- Wilson interval matches a known example: `wilsonInterval(24, 30)` returns approximately `{ lower: 0.627, upper: 0.905 }`.
- The decision rule returns `retrieval_accepted` only when every retrieval gate passes.
- A single family below 70% returns `retrieval_rejected`.
- A safety violation returns `blocked`.
- The driver refuses to overwrite an existing run directory.
- Unavailable outputs count as failures, not successful abstentions.
- Every metric row carries a numerator and denominator.

```ts
test("Wilson interval matches a known example", () => {
  const interval = wilsonInterval(24, 30);
  expect(interval.lower).toBeCloseTo(0.627, 2);
  expect(interval.upper).toBeCloseTo(0.905, 2);
});
```

- [ ] **Step 3: Run development screening**

```powershell
rtk proxy bun run apps/ai_agent/src/evaluation/retrieval-r4.ts --split development --out apps/ai_agent/evaluation/r4/runs/dev-20261021-v1
```

- [ ] **Step 4: Apply the development gates**

| Gate | Threshold |
| --- | ---: |
| Sufficient-guidance hit@3 | ≥ 80% |
| Macro section recall@3 | ≥ 80% |
| Direct precision@3 | ≥ same-corpus keyword control |
| No-match abstention | ≥ 90% |
| False abstention | ≤ 5% |
| Route coverage | 100% |
| Reliability | ≥ 95% |
| Warm p95 | ≤ 3 s |
| Safety violations | 0 |

- [ ] **Step 5: Review gate**

- [ ] All development gates pass.
- [ ] Failure ledger is complete; every miss has one stage.
- [ ] No holdout access occurred.
- [ ] No holdout score exists.

**Exit:** development report + `decision.md` = `proceed_to_freeze` or `stop`.

**Stop rule:** if any gate fails, stop. Fix on development only and re-run in a new dev directory. Do not commission the holdout.

---

### R4.4 — Freeze and run the holdout

**Files:**

- Create: `apps/ai_agent/evaluation/r4/selected-retrieval-config.json`
- Create: `apps/ai_agent/evaluation/r4/runs/holdout-20261021-v1/`
- Create: `apps/ai_agent/evaluation/r4/decision.md`
- Create: `apps/ai_agent/evaluation/r4/failure-ledger.json`

**Tasks:**

- [ ] **Step 1: Freeze the candidate before opening the holdout**

`selected-retrieval-config.json` must record these fields. Every `*Hash` field is a 64-character lowercase SHA-256 value; compute it at the phase named in parentheses.

- `retrievalMethod`: `"structured-minilm"`
- `profileVersion`: `"r4-v1"`
- `packingVersion`: `"r3.3-v1"`
- `supportVersion`: `"r3.4-v1"`
- `support`: `{ "minAnchorHits": 1 }`
- `corpusHash`: the full R3 corpus hash `45e85c3585607ebfd0e1ebd1f2b068e2fab7c889b1bdd3af3a565f20afcbd440`
- `developmentLabelHash`: computed in R4.1
- `developmentRunHash`: computed in R4.3
- `protocolHash`: computed in R4.0
- `model`: `{ "id": "Xenova/ms-marco-MiniLM-L-6-v2", "revision": "a09144355adeed5f58c8ed011d209bf8ee5a1fec", "quantization": "q8" }`
- `prompt`: `{ "id": "diagnosis", "version": "phase-11a-v3" }`
- `holdoutSealHash`: computed in R4.1

- [ ] **Step 2: Verify the seal**

Recompute the holdout hashes and compare them to `seal.json`. If any mismatch, stop. Do not run.

- [ ] **Step 3: Open the holdout and run once**

```powershell
rtk proxy bun run apps/ai_agent/src/evaluation/retrieval-r4.ts --split holdout --config apps/ai_agent/evaluation/r4/selected-retrieval-config.json --out apps/ai_agent/evaluation/r4/runs/holdout-20261021-v1
```

- [ ] **Step 4: Analyze**

Write `report.json` with:

- absolute numerators/denominators for every metric, including direct precision;
- Wilson 95% intervals;
- per-family breakdown;
- failure ledger with one stage per miss;
- paired keyword comparison;
- reliability and latency distribution.

- [ ] **Step 5: Apply the decision rule**

Write `decision.md` with `retrieval_accepted`, `retrieval_rejected`, or `blocked`, the exact failing gates, and a post-hoc note if rejected. The post-hoc note is observation only; it does not authorize a re-run.

- [ ] **Step 6: Review gate**

- [ ] Config hash was written before the holdout was opened.
- [ ] One run only; no re-scoring.
- [ ] Every reported metric has a numerator and denominator.
- [ ] Decision is one of `retrieval_accepted`, `retrieval_rejected`, or `blocked`.

**Exit:** `decision.md` + `report.json` + `failure-ledger.json`.

**Stop rule:** if `retrieval_rejected`, do not reuse the holdout. A new attempt requires a new protocol, a new candidate freeze, and a new sealed holdout (repeat R4.1 with a new holdout ID).

---

### R4.5 — Diagnosis validation (conditional)

Run only if R4.4 is `retrieval_accepted`.

**Files:**

- Create: `apps/ai_agent/evaluation/r4/diagnosis/`
- Create: `apps/ai_agent/evaluation/r4/diagnosis/protocol.json`
- Create: `apps/ai_agent/evaluation/r4/diagnosis/review-v1.json`
- Create: `apps/ai_agent/evaluation/r4/diagnosis/report.json`
- Create: `apps/ai_agent/evaluation/r4/diagnosis/decision.md`

**Tasks:**

- [ ] **Step 1: Use the pre-registered diagnosis subset**

30 answerable + 10 no-match, selected in R4.1 and sealed with the holdout. Do not select cases after seeing retrieval or diagnosis outputs. Cover every family and every no-match cause; do not select only easy cases.

- [ ] **Step 2: Freeze the diagnosis prompt and model**

Use the existing `phase-11a-v3` prompt and the configured model. Record the prompt hash, model, token caps, and cost cap. No prompt tuning in this phase.

- [ ] **Step 3: Run the diagnosis graph**

Use the accepted retrieval config. One generation per case; at most one schema repair. Record tokens, latency, schema validity, citation membership, and failures separately.

- [ ] **Step 4: Blind review**

Two reviewers, 100% review, 20% double-labeled. Rubric:

- supported diagnosis or appropriately bounded uncertainty;
- correct delivery status and route;
- useful next evidence/action;
- every claim entailed by cited evidence or runbook text;
- no unsupported definitive repair claim;
- no unsafe replay recommendation.

- [ ] **Step 5: Apply the gate**

Point estimate ≥ 80%; Wilson lower ≥ 62%; zero safety violations. Report schema acceptance separately from semantic acceptance. Write `diagnosis_accepted`, `diagnosis_rejected`, or `blocked`.

- [ ] **Step 6: Review gate**

- [ ] 40 cases scheduled, 40 reviewed or explicitly unavailable.
- [ ] Inter-rater agreement recorded.
- [ ] Diagnosis acceptance is not inferred from retrieval metrics.
- [ ] Cost and token usage recorded.

**Exit:** `diagnosis/decision.md`.

**Stop rule:** if diagnosis acceptance fails, do not change retrieval to chase the diagnosis score. Open a separate diagnosis scope.

---

### R4.6 — Integration and closeout

**Files:**

- Modify: `docs/decisions.md` (ADR 011)
- Modify: `docs/current-state.md` (section 4.1)
- Modify: `apps/ai_agent/evaluation/r4/README.md`
- Create: `apps/ai_agent/evaluation/r4/CLOSEOUT.md`

**Tasks:**

- [ ] **Step 1: Promote behind the existing flag**

Set `RUNBOOK_RETRIEVAL_METHOD=structured-minilm` in the deployment environment and restart the service only if R4.4 is `retrieval_accepted` and R4.5 is `diagnosis_accepted`. Do not change the code default in `runbook-retriever.ts`; `minilm-original` remains the code fallback and `keyword` remains the rollback. Record the exact rollback command.

- [ ] **Step 2: Record the config hash and rollback procedure**

Record the R4 config hash, corpus hash, and the exact rollback command in `CLOSEOUT.md`. Do not add a new startup hash check in R4; that is a separate operational-hardening task.

- [ ] **Step 3: Update documentation**

ADR 011 records:

- the accepted candidate and its exact version;
- the holdout point estimates and Wilson intervals;
- the diagnosis result, or its `blocked` status if credentials or budget were unavailable;
- the remaining limitations (55-section corpus, synthetic benchmark, no production-incident acceptance);
- the rollback method;
- the explicit statement that R4 is not a universal quality certification.

- [ ] **Step 4: Run full verification**

```powershell
rtk proxy bun test apps/ai_agent/tests/retrieval-profile.test.ts apps/ai_agent/tests/retrieval-support.test.ts apps/ai_agent/tests/retrieval-target.test.ts apps/ai_agent/tests/retrieval-r4.test.ts apps/ai_agent/tests/rag-corpus-parity.test.ts
bun run check-types
bun run build
bun run lint
```

Compare lint to the saved baseline (9 errors, 22 warnings). Do not claim green if the baseline remains.

- [ ] **Step 5: Closeout**

Record changed files, verification results, limitations, and next steps in `CLOSEOUT.md`. Graphify update is not required unless this becomes a pushed architectural milestone; follow `docs/graphify.md`.

**Exit:** closeout record + rollback proof.

---

## 5. Artifact layout

```text
apps/ai_agent/evaluation/r4/
  README.md
  protocol.json
  baseline-reconciliation.json
  development-cases-v1.json
  development-labels-v2.json
  development-evidence-v1.json
  holdout/
    cases-v1.json
    labels-v2.json
    evidence-v1.json
    review-v1.json
    diagnosis-subset-v1.json
    fingerprints-v1.json
    authoring-attestation-v1.json
    seal.json
  selected-retrieval-config.json
  runs/
    dev-20261021-v1/
    holdout-20261021-v1/
    reproduction-matrix.json
  diagnosis/
    protocol.json
    review-v1.json
    report.json
    decision.md
  decision.md
  failure-ledger.json
  CLOSEOUT.md
```

Every run directory is immutable. A changed input means a new directory.

---

## 6. Verification commands

Focused:

```powershell
rtk proxy bun test apps/ai_agent/tests/retrieval-profile.test.ts apps/ai_agent/tests/retrieval-support.test.ts apps/ai_agent/tests/retrieval-target.test.ts apps/ai_agent/tests/retrieval-r4.test.ts
rtk proxy bun test apps/ai_agent/tests/rag-corpus-parity.test.ts
```

Root:

```powershell
bun run check-types
bun run build
bun run lint
```

Do not claim a check passed without current output. Do not pool R4 metrics with R1–R3.5; the cohorts and gates differ.

---

## 7. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Authoring 160 cases is expensive | Start with 12 per family; use templates; review in batches; fall back to 120 total with a screening-only claim |
| Synthetic cases overfit to the runbooks | Use sanitized real incident evidence where available; require unique fingerprints; report the limitation |
| Holdout contamination | Score-blind authoring, independent review, hash seal, one run |
| Existing R3.5r changes are entangled with R4 | Baseline reconciliation matrix; keep only the four authorized fixes |
| The 90% point gate still fails by sampling noise | Report Wilson bounds; do not call a point estimate a certification; consider Tier B (300+ cases) only with a separate budget |
| Diagnosis cost or credentials are unavailable | Mark R4.5 `blocked`; do not claim diagnosis acceptance; keep the retrieval decision separate |
| Corpus is only 55 sections | Treat R4 as a decision on the current corpus; propose corpus v2 as R5, not as a silent R4 change |
| A label defect appears after the holdout run | Consume the holdout; new holdout required; never re-score the same cases |

---

## 8. Handoff

Report:

- changed files and the exact candidate version;
- phase gate results and verification output;
- holdout point estimates with 95% intervals;
- per-family failures and their stage;
- limitations, including the synthetic benchmark and the 55-section corpus;
- rollback instructions;
- next steps (corpus expansion, production feedback, or diagnosis work) as separate scopes.

No automatic commit, push, deployment, or Graphify refresh. Follow [`docs/manualgit_handoff.md`](../../manualgit_handoff.md).
