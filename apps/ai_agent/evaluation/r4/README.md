# R4 — measurement recovery and pipeline repair

**Status: R4 closed (R4.6, 2026-10-28). `structured-minilm` is `retrieval_accepted` (120/120 hit@3, 40/40 abstention) and promoted behind `RUNBOOK_RETRIEVAL_METHOD`. Diagnosis was accepted through D1 as `diagnosis_accepted_ai_reviewed`. See [`CLOSEOUT.md`](CLOSEOUT.md).**
R4 repairs four known pipeline/label defects and replaces the underpowered 30-case
holdout with a 120-answerable / 40-no-match benchmark analysed with confidence
intervals. It is not a method sweep: no new retriever, model, index, reranker,
planner, dependency, or corpus expansion.

The R4.1 label audit is AI-assisted, not an independent human review. The
seal records `provisional_ai_assisted_human_signoff_outstanding`; the operator
attestation accepting the holdout content before R4.4 is recorded in
[`reviewer-signoff-v1.json`](reviewer-signoff-v1.json), outside the seal.

Plan: [`docs/superpowers/plans/2026-10-21-r4-measurement-recovery.md`](../../../../docs/superpowers/plans/2026-10-21-r4-measurement-recovery.md).

## Current phase

| Phase | State | Exit |
| --- | --- | --- |
| R4.0 protocol and baseline | **complete** | protocol hash + reconciliation record |
| R4.2a reproduction matrix | **complete** | record which defects are already fixed |
| R4.1 benchmark + F04 label schema | **complete (AI-assisted audit; operator-attested 2026-10-21)** | 80 dev + 160 sealed holdout |
| R4.2b runtime fixes | **complete** | failing-then-passing tests |
| R4.3 development screening | **complete** | all dev gates pass (`runs/dev-20261021-v2`) |
| R4.4 holdout freeze and one run | **complete** | `retrieval_accepted` (`runs/holdout-20261021-v1`) |
| R4.5 diagnosis validation | **met via D1** (v1/v2 stay `blocked` pending human review; D1 `diagnosis_accepted_ai_reviewed`, [`../d1/CLOSEOUT.md`](../d1/CLOSEOUT.md)) | `diagnosis_accepted` |
| R4.6 integration and closeout | **complete** | [`CLOSEOUT.md`](CLOSEOUT.md) + rollback proof |

Do not open the holdout or tune thresholds again. The holdout has been consumed
by its single run. A new attempt requires a new protocol, a new candidate freeze,
and a new sealed holdout.

## Frozen inputs

| Input | Value |
| --- | --- |
| Corpus | `apps/ai_agent/evaluation/r3/corpus-v1.json`, 55 sections, six runbooks |
| Corpus hash | `45e85c3585607ebfd0e1ebd1f2b068e2fab7c889b1bdd3af3a565f20afcbd440` |
| Corpus parity test | `apps/ai_agent/tests/rag-corpus-parity.test.ts` (passes, 55 sections) |
| Reranker | `Xenova/ms-marco-MiniLM-L-6-v2` @ `a09144355adeed5f58c8ed011d209bf8ee5a1fec`, `q8` |
| Model config | `apps/ai_agent/evaluation/r23/config.json` |
| Development cohort (R3 carrier) | `apps/ai_agent/evaluation/r3/development-cases-v1.json` (24 cases) |
| Protocol hash (R4.0 freeze) | `2a750560b0c47a723094ef2d0bd5c112e5c464ee7f32bcf18d5951f91363c47c` |
| Protocol hash (after R4.1 seal) | `d47669b7f567a2436d13a0a7bc127898e9ad774f4082c047091e7dcdfc391b5e` |
| Holdout seal hash | `8d6cb47c3032e0ae051ad83c2009d007b644162d95f7f8e44d24ec61f558c886` |
| Baseline reconciliation hash | `a6eb1f4a7fa410518ee05c5e62b918eacd41dd3d05d9a33c98a30675d972b287` |

`protocol.json` is frozen before any R4 measurement. No runbook edit is allowed
after R4.0. A corpus edit is a stop: restart with `corpus-v2.json`, a new parity
hash, a new protocol, and re-adjudicated labels.

## Starting state

- Commit `da3b860e1a07866cbe34f9b1231c63ecc58d7a8c`, branch `main`, dirty tree.
- The working tree contains the uncommitted R3.5r changes to
  `retrieval-profile.ts`, `retrieval-target.ts`, `structured-ranking.ts`, their
  tests, and `r3/README.md`.
- The closed R3.5r recovery line is untracked (`r3/recovery/`,
  `recovery-screening.ts`, `recovery-score.mjs`, `recovery-screening.test.ts`).
- Generated Prisma and Graphify changes are excluded from this record.

## Baseline reconciliation (R4.0 Step 4)

The current tree was run through the existing R3 capture/replay path on the
frozen 24-case development cohort. It was compared to the frozen R3.4 run
`apps/ai_agent/evaluation/r3/runs/profile-route-facets-support-20261019-v1`.

| Check | Result |
| --- | --- |
| Query input hash vs R3.4 | identical (`325c380a…ce881`) |
| Inference logits | 1230 compared, max absolute delta 0 (bit-identical) |
| Route hints / confident routes | identical on all 24 cases |
| Sufficient-guidance hit@3 | 13/16 (0.8125) in both |
| No-match abstention | 8/8 in both |
| False abstention | 0/16 in both |
| Reliability / route coverage | 24/24 / 1.0 in both |
| Macro section recall@3 | 0.875 → 0.84375 |
| Direct precision@3 | 0.5 → 0.47917 |
| p95 latency | 217.7 ms → 282.6 ms (environment only) |

Six cases changed only their requested facets: `f07-provider-response-lost`,
`f09-database-sink-only`, `f10-sdk-error-recorded-success`,
`s02-error-prompt-injection`, `s03-sensitive-fields-present`, and
`s05-expired-email-dedup-window`. All six are explained by the R3.5r per-signal
facet demands ordering `verification` ahead of `forbidden` (and, for `s05`,
filling all three slots before `investigation`). No hit/miss verdict flipped.
The entire recall/precision delta comes from `f10`, which no longer returns its
accepted `forbidden-actions` section.

Decision: freeze the current tree as the R4 baseline. Keep the label-schema
precursor and the inert instrumentation; gate the transport vocabulary and the
facet-demand change on R4.2a. There is nothing to revert safely, and a broad
revert is explicitly not attempted. Full per-case detail is in
[`baseline-reconciliation.json`](baseline-reconciliation.json).

**R4.2a note.** The transport vocabulary and route guard are already present in
the tree and already inert on the 24-case cohort. R4.2a must still reproduce the
five defects against the sealed-safe synthetic fixtures before any code changes.
**R4.2b note (resolved).** The facet union no longer truncates blindly. It sheds
`evidence`, then `symptoms`, then `replay`, keeps `verification` for every fault
signal, and falls back to the lowest-priority tail entry only when no
discretionary facet is left. `forbidden` is preserved because it is not on the
drop list and is always inserted before the fallback tail. The result is
identical on all 24 R3 development cases (see R4.2b below).

## R4.2a reproduction matrix (2026-10-21)

`reproduce-r4-defects.ts` reruns the five plan fixtures against the current tree
and writes [`runs/reproduction-matrix.json`](runs/reproduction-matrix.json). The
harness does not import the retriever, the model, or either holdout. Fixtures are
synthetic and cloned from a real no-signal no-match evidence bundle.

```powershell
bun run apps/ai_agent/evaluation/r4/reproduce-r4-defects.ts
```

| Fixture | Required | Current | Verdict |
| --- | --- | --- | --- |
| `DNS lookup returned EAI_AGAIN`, pre-send, no provider | F02 route | F02, confident, `dns:eai_again` | already_fixed |
| `timed out`, pre-send, provider observed | F02 route | F02, confident, phase corroborator | already_fixed |
| `timed out`, pre-send, no provider | F02 route | F02, confident, `phase:pre_send` alone | already_fixed |
| `worker admission refused: local queue capacity`, provider observed | no route, abstain | no route, no anchors, support abstains | already_fixed |
| `timed out`, provider observed, **no phase/status/fact** | no route | F02, confident, `provider:smtp` corroborator | **still_broken** |
| publication + bookkeeping-only unknown | `verification` retained, 3 facets | retained, 3 facets | already_fixed |
| three-way equivalent accepted facet | parses; second accepted scores sufficient | parse fails (`<=2`), scoring already sufficient | **not_implemented (R4.1)** |

Findings:

1. The only remaining runtime defect is the provider-as-corroborator loophole.
   A provider name still satisfies the weak-token corroborator check, so
   `timed out` plus any provider sets `route.confident` and reopens the no-match
   bypass. R4.2b must remove the provider from the corroborator set; the
   `worker admission` fixture only passes because the non-provider subsystem
   regex rejects it first.
2. `f02-timeout-presend` currently cites the provider as the corroborator even
   though the phase is present. The route is correct; the reason is misleading.
   After the guard fix the reason must name `phase:pre_send`.
3. The F09 verification invariant holds for every fault-signal subset, not only
   the publication fixture. Section 3.2's prescribed drop order is still not
   implemented: selection is a first-occurrence union truncated to three. No
   signal ever requests `symptoms`, so the literal drop list cannot be applied
   as written; R4.2b must reconcile the order rather than add dead branches.
4. Neither required trace field exists: rejected weak tokens are silent, and the
   dropped facets are not exposed. Adding them changes the evaluation output
   shape, so R4.2b must decide the minimal carrier (for example a field on
   `StructuredRunbookSearchInput`) and keep `routeEvidence.reasons` empty for an
   unrouted observation.
5. F04 is a schema cap, not a scoring defect. `scoreTarget` already treats the
   second accepted citation as sufficient. R4.1 owns the `max(4)` change and the
   v2 label file.

No `src/` file changed in R4.2a. Focused verification:
`bun test apps/ai_agent/tests/retrieval-profile.test.ts
apps/ai_agent/tests/retrieval-support.test.ts
apps/ai_agent/tests/retrieval-target.test.ts` → 53 pass, 0 fail;
`bun run check-types` → pass.

## R4.2b runtime fixes (2026-10-21)

Three authorized runtime fixes, each written as a failing test first.

| Fix | Behavior | Test |
| --- | --- | --- |
| Provider-as-corroborator loophole | A provider name no longer corroborates a weak token; `timed out` + `smtp` and no phase/status/fact stays unrouted. `routeEvidence.reasons` stays empty. | `a provider name alone does not corroborate a weak token`, `worker admission refusal stays unrouted even with a provider` |
| Facet drop order | `selectRequestedFacets` sheds `evidence`, then `symptoms`, then `replay`; `verification` is never dropped for a fault signal; the tail fallback only runs when no discretionary facet remains. | `drop order removes evidence before verification`, `drop order removes replay before investigation`, exhaustive fault-signal subset test |
| Trace fields | `StructuredRunbookSearchInput.trace.facetSelection` carries `requested`/`dropped`; `trace.weakTokenRejected` carries `weak_token_rejected:no_transport_corroborator` (or `:non_provider_subsystem`). The trace is observation-only and never enters ranking. | `bare refused does not set route.confident`, `the trace exposes dropped facets` |

The weak route reason now names the transport corroborator (`phase:pre_send`)
instead of the provider, as R4.2a finding 2 required.

**Development reconciliation.** [`reconcile-r4-2b.ts`](reconcile-r4-2b.ts)
re-derives routes and facets for the 24 R3 development cases and compares them
to the frozen R4.0 capture. Result: **24/24 unchanged** (hints, confidence, and
requested facets), recorded in
[`runs/r4-2b-reconciliation.json`](runs/r4-2b-reconciliation.json). No
development-case regression.

**Reproduction rerun.** The harness now reports every fixture `already_fixed`
and records both trace fields. The R4.2a snapshot is preserved at
[`runs/reproduction-matrix-r4.2a.json`](runs/reproduction-matrix-r4.2a.json); the
current [`runs/reproduction-matrix.json`](runs/reproduction-matrix.json) is the
post-fix R4.2b record.

**Verification.** `bun test` over
`retrieval-profile`, `retrieval-support`, `retrieval-target`, `retrieval-r4`,
and `rag-corpus-parity` → 88 pass, 0 fail; `bun run check-types` → pass. No
retriever, model, corpus, or holdout was touched.

## R4.1 benchmark (2026-10-21)

Generated by [`authoring/build-cohorts.ts`](authoring/build-cohorts.ts). The
script validates expected facets and routes with deterministic helpers, but it
does not import or run the retriever, the reranker model, a candidate, or a
scoring report. Route hints are not stored in the labels and do not affect
scoring.

| Cohort | Cases | Answerable | No-match | Distribution |
| --- | ---: | ---: | ---: | --- |
| Development | 80 | 60 | 20 | 24 re-adjudicated R3 cases + 56 newly authored; at least 5 answerable per family |
| Holdout | 160 | 120 | 40 | 12 answerable per family; 10 no-match per bucket |
| Diagnosis subset | 40 | 30 | 10 | 3 answerable per family; all four no-match causes |

The holdout no-match buckets are missing guidance, missing runtime fact,
out-of-scope, and adversarial/ambiguous, 10 each. The pre-registered diagnosis
subset is [`holdout/diagnosis-subset-v1.json`](holdout/diagnosis-subset-v1.json):
the first three answerable cases per family plus three/three/two/two no-match
cases across the four buckets.

### Label audit

[`authoring/audit-holdout.ts`](authoring/audit-holdout.ts) performs a rule-based
second pass on a stratified 20% sample (32 cases: two answerable per family plus
three per no-match bucket) and a full structural review of all 160 holdout
cases. The second pass judges binary sufficient guidance from the case input,
the frozen corpus, and runbook access eligibility. Result: 32/32 agreement,
Cohen's kappa 1.00 (expected agreement 0.531), zero structural defects.

This is an **AI-assisted consistency audit, not an independent human review**.
Perfect agreement is expected because the second pass is rule-based when every
answerable case has an eligible accepted citation. It confirms internal
consistency, not human inter-rater reliability. `review-v1.json` records the
limitation and the outstanding human sign-off.

### Seal

[`holdout/seal.json`](holdout/seal.json) hashes the raw bytes of the cases,
labels, evidence, review, diagnosis subset, fingerprints, and authoring
attestation. The seal hash is recorded in `protocol.json.holdoutSeal`. No
candidate or retrieval run touched the holdout before sealing.

| File | SHA-256 |
| --- | --- |
| `holdout/cases-v1.json` | `a8f5794ab778ddbbd7de0a10181854fb8b2d611439a3a4f688192e314e44bebd` |
| `holdout/labels-v2.json` | `fecf0bd40e2ad1a39cd409499c9380256ec73b5b2ab5f71f2f9d22ced7be05a2` |
| `holdout/evidence-v1.json` | `8fdc05be0b36b03f1fec97bb34eedd8e981b719e94df869e6e07d59d6e3d83b8` |
| `holdout/review-v1.json` | `9c245fc27b31212baf7ff8609b2c8d0eff41d86c3377e61f6e9edc19dc873a4c` |
| `holdout/diagnosis-subset-v1.json` | `02a26f320afe95d02ab13eecceb6536bf220756680ae5aaba220529360659e40` |
| `holdout/fingerprints-v1.json` | `e8f4dca164fad8eecbc62c5f0f3182b46b19da7028983f57e56c6d3a1ceb7864` |
| `holdout/authoring-attestation-v1.json` | `4d3315e1a4be6491ce5967c42e4878f4617aafd892688144900d19a7b4316f76` |

### Verification

`bun test apps/ai_agent/tests/retrieval-r4.test.ts` → 17 pass, 0 fail at R4.1;
the same file holds 27 tests after the R4.3 additions.

The test validates v2 labels, case/evidence parity, corpus membership, facet and
accepted-citation caps, rationale lines, provider eligibility, no-match
rationales, id-free fingerprint uniqueness across both splits (writing
`holdout/fingerprints-v1.json`), the diagnosis subset, the F04 sibling
equivalence, and the sealed hashes.

## R4.3 development screening (2026-10-21)

Driver: [`apps/ai_agent/src/evaluation/retrieval-r4.ts`](../../src/evaluation/retrieval-r4.ts).
It loads the frozen protocol, development cases, v2 labels, and evidence; runs
the frozen `structured-minilm` candidate and the same-corpus keyword control on
the same inputs; calls `scoreTarget` instead of duplicating scoring; computes
Wilson 95% intervals and per-family metrics; and writes `report.json`,
`failure-ledger.json`, `decision.md`, and a hashed `manifest.json`. It refuses to
overwrite an existing run directory and rejects `--split holdout`, so the sealed
holdout cannot be reached from this driver.

```powershell
bun run apps/ai_agent/src/evaluation/retrieval-r4.ts --split development --out apps/ai_agent/evaluation/r4/runs/dev-20261021-v2
```

Result: **`retrieval_accepted`**. Development exit: **`proceed_to_freeze`**.
Every development gate passed; no route, facet, packer, support, corpus, label,
or threshold changed during the run.

| Gate | Value | Numerator/denominator | Threshold | Result |
| --- | ---: | ---: | ---: | --- |
| Safety violations | 0 | n/a | 0 | pass |
| Reliability | 100.00% | 80/80 | 95.00% | pass |
| Sufficient-guidance hit@3 | 96.67% | 58/60 | 80.00% | pass |
| Macro section recall@3 | 92.50% | 157/176 | 80.00% | pass |
| Direct precision@3 | 87.22% | 157/180 | 19.44% (keyword) | pass |
| No-match abstention | 100.00% | 20/20 | 90.00% | pass |
| False abstention | 0.00% | 0/60 | 5.00% | pass |
| Route coverage | 100.00% | 60/60 | 100.00% | pass |
| Warm p95 | 2175.4 ms | n/a | 3000 ms | pass |

| Arm | Hit@3 | 95% Wilson | Macro recall | Direct precision | No-match abstention | Reliability |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Candidate | 96.67% (58/60) | 88.64–99.08% | 92.50% (157/176) | 87.22% (157/180) | 100.00% (20/20) | 100.00% (80/80) |
| Keyword | 3.33% (2/60) | 0.92–11.36% | 21.81% (35/176) | 19.44% (35/180) | 0.00% (0/20) | 100.00% (80/80) |

The macro-recall and direct-precision intervals are citation-weighted; the point
estimates are the macro means used by the gates. Every metric row in
`report.json` carries an absolute numerator and denominator.

### Per-family results

| Family | Cases | Hit@3 | Macro recall | Direct precision |
| --- | ---: | ---: | ---: | ---: |
| F01 | 6 | 100.00% (6/6) | 100.00% (16/16) | 88.89% (16/18) |
| F02 | 6 | 100.00% (6/6) | 100.00% (17/17) | 94.44% (17/18) |
| F03 | 6 | 100.00% (6/6) | 100.00% (14/14) | 77.78% (14/18) |
| F04 | 6 | 100.00% (6/6) | 50.00% (16/32) | 88.89% (16/18) |
| F05 | 6 | 100.00% (6/6) | 100.00% (16/16) | 88.89% (16/18) |
| F06 | 6 | 100.00% (6/6) | 100.00% (18/18) | 100.00% (18/18) |
| F07 | 6 | 100.00% (6/6) | 100.00% (17/17) | 94.44% (17/18) |
| F08 | 5 | 100.00% (5/5) | 100.00% (12/12) | 80.00% (12/15) |
| F09 | 5 | 100.00% (5/5) | 100.00% (14/14) | 93.33% (14/15) |
| F10 | 5 | 80.00% (4/5) | 80.00% (12/14) | 80.00% (12/15) |
| S | 3 | 66.67% (2/3) | 83.33% (5/6) | 55.56% (5/9) |

F04's hit@3 is 100% while its macro recall is 50% (16/32). The labels accept
either of two independently sufficient sibling sections; returning one is a
primary hit, but the unreturned sibling stays in the citation-level recall
denominator. This is an equivalence artifact, not a guidance failure, and the
denominator must not be "fixed" by deleting siblings.

The per-family Hit@3 ≥ 70% floor is an R4.4 holdout check, not a development
gate. On the three development safety cases S is 2/3 (66.67%), so that floor is
a known holdout risk to watch rather than a development failure.

### Superseded v1 run and the latency spike

`runs/dev-20261021-v1` is retained, not deleted. It produced a
`retrieval_rejected` decision with `p95LatencyMs = 24049.9 ms` as the sole failing
gate. All quality metrics were identical to v2: 58/60 hit@3, 157/176 recall,
157/180 precision, 20/20 abstention, 0/60 false abstention, 80/80 reliability,
and the same two ledger misses.

The two runs share the same input hash and bit-identical inference and logits;
the only difference is `rerankMs` on all 80 records. In v1, 21 consecutive cases
(case 7 through case 27) took 13.9–32.4 s of rerank time, while cases 28–80
returned to 1.2–2.4 s. v2, in a fresh directory with no code change, had p95
2175.4 ms and a maximum of 2456 ms, with no multi-second spike beyond that. The
v1 failure is host contention in the offline scorer, not a candidate regression,
and the rerun is justified by the bit-identical scores. It is not a gate
relaxation: no threshold, input, or candidate changed. The stop rule's "fix on
development only and re-run in a new dev directory" is satisfied by the fresh
v2 directory.

### Failure ledger

Two answerable misses, both `facet_dropped`; zero no-match false positives and
zero corpus gaps. Every miss carries exactly one stage.

| Case | Family | Stage | Cause |
| --- | --- | --- | --- |
| `f10-sdk-error-recorded-success` | F10 | `facet_dropped` | Labels accept `investigation` + `forbidden`. The route requested `investigation`, `remediation`, `verification`; the three-slot facet cap dropped `forbidden`, so the accepted forbidden section was never requested. |
| `s03-sensitive-fields-present` | S | `facet_dropped` | Labels accept `investigation` + `forbidden`. The route (F03, F07 hints) requested `investigation`, `remediation`, `verification`; `forbidden` was never requested and no drop was recorded. |

### Limitations

- The 80-case development cohort is exposed and may be tuned on. This is
  screening, not the sealed-holdout acceptance decision.
- Wilson bounds describe sampling uncertainty on this cohort; a point estimate
  is not a certification.
- `p95LatencyMs` is per-case rerank time over the frozen candidate set in the
  offline scorer, the same basis as R3, not warm HTTP service latency.
- The two misses show the facet cap can still displace `forbidden` on an F10/S
  case. They are recorded for R4.4 diagnosis; R4.3 does not change facet policy
  after seeing them, because the development gates passed and the stop rule did
  not fire.

## R4.4 sealed holdout (2026-10-21)

The candidate was frozen in
[`selected-retrieval-config.json`](selected-retrieval-config.json) (sha256
`a56ae39c3053f954aebbb7318034fc39408f72f85198e8cc13e5620f78ec2805`) before the
holdout was opened. The driver verified the config hashes, the accepted
development run (`runs/dev-20261021-v2`), the model config, and all seven sealed
file hashes before reading a holdout case.

```powershell
bun run apps/ai_agent/src/evaluation/retrieval-r4.ts --split holdout --config apps/ai_agent/evaluation/r4/selected-retrieval-config.json --out apps/ai_agent/evaluation/r4/runs/holdout-20261021-v1
```

Result: **`retrieval_accepted`**. One run only; no re-scoring, threshold edit, or
candidate change after the score exists.

| Gate | Value | Numerator/denominator | Threshold |
| --- | ---: | ---: | ---: |
| Sufficient-guidance hit@3 (point) | 100.00% | 120/120 | >= 90.00% |
| Sufficient-guidance hit@3 (Wilson lower) | 96.90% | 120/120 | >= 82.00% |
| Macro section recall@3 (point) | 95.00% | 360/396 (macro) | >= 90.00% |
| Macro section recall@3 (Wilson lower) | 87.67% | 360/396 | >= 82.00% |
| No-match abstention (point) | 100.00% | 40/40 | >= 90.00% |
| No-match abstention (Wilson lower) | 91.24% | 40/40 | >= 75.00% |
| False abstention | 0.00% | 0/120 | <= 5.00% |
| Direct precision@3 | 100.00% | 360/360 | >= 18.06% (keyword) |
| Per-family hit@3 (F01–F10) | 100.00% each | 12/12 each | >= 70.00% |
| Route coverage | 100.00% | all eligible accepted citations | 100.00% |
| Reliability | 100.00% | 160/160 | >= 95.00% |
| Warm p95 | 1910.1 ms | n/a | <= 3000 ms |
| Safety violations | 0 | n/a | 0 |

The paired keyword comparison was 120 candidate-only hits and 0 keyword-only
hits (exact McNemar two-sided p ≈ 1.5e-36). The failure ledger is empty. The
run-level record is in [`runs/holdout-20261021-v1/decision.md`](runs/holdout-20261021-v1/decision.md)
and [`decision.md`](decision.md); the ledger is [`failure-ledger.json`](failure-ledger.json).

Binding limitations (also recorded in `decision.md`): the 120 answerable cases
cluster into 10 family-level label signatures, so case-level Wilson bounds are
anti-conservative; no-match abstention is structurally guaranteed; F04 dual
acceptance is lenient by up to 10% of the answerable set; the development `S`
cohort is not held out. R4.5 diagnosis validation may now run; promotion requires
`diagnosis_accepted` as well.

## Gates

Development screening (80 cases), from `protocol.json`:

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

Acceptance is decided once on the sealed 160-case holdout plus the 40-case
diagnosis subset. The exact point and Wilson-lower bounds are in
`protocol.json.gates.acceptance`. The Wilson bounds are evidence rules, not a
lowered target; a pass is a decision rule, not a 95% certification of 90%
performance. Tier B (≈300 answerable cases) is out of scope for R4.

## Artifacts

```text
apps/ai_agent/evaluation/r4/
  README.md                       this file
  protocol.json                   frozen protocol and starting state
  baseline-reconciliation.json    R3.4 vs current-tree diff and keep/gate decisions
  reproduce-r4-defects.ts         R4.2a/R4.2b reproduction harness
  reconcile-r4-2b.ts              R4.2b 24-case route/facet reconciliation
  runs/
    baseline-reconciliation-20261021-v1/
      capture/                    current-tree inference, scores, route audit
      route/                      route arm report
      support/                    support arm report (baseline metrics)
    reproduction-matrix-r4.2a.json  pre-fix snapshot
    reproduction-matrix.json      post-fix fixture verdicts and trace
    r4-2b-reconciliation.json     24-case before/after route and facet diff
    dev-20261021-v1/                superseded R4.3 run; sole failure p95 24.05 s
      inference-original.json
      scores-original.json
      report.json
      failure-ledger.json
      decision.md
      manifest.json
    dev-20261021-v2/                accepted R4.3 development screening
      inference-original.json
      scores-original.json
      report.json
      failure-ledger.json
      decision.md
      manifest.json
    holdout-20261021-v1/            accepted R4.4 sealed holdout (single run)
      inference-original.json
      scores-original.json
      report.json
      failure-ledger.json
      decision.md
      manifest.json
  authoring/
    build-cohorts.ts              R4.1 case/label/evidence generator
    audit-holdout.ts              R4.1 rule-based audit and structural review
    audit-holdout-reviewer.ts     read-only reviewer audit; reproduces the sign-off numbers
    seal-holdout.ts               R4.1 raw-byte seal writer
  development-cases-v1.json       R4.1, 80 cases
  development-labels-v2.json      R4.1, 80 v2 labels
  development-evidence-v1.json    R4.1, 80 evidence entries
  development-label-diff-v1.md    R4.1 Step 2 diff plus Steps 3-8 addendum
  holdout/
    cases-v1.json                 160 cases
    labels-v2.json                160 v2 labels
    evidence-v1.json              160 evidence entries
    review-v1.json                sealed AI-assisted audit; humanIndependentReview=outstanding
    diagnosis-subset-v1.json      pre-registered 40-case subset
    fingerprints-v1.json          id-free SHA-256 list, 240 cases
    authoring-attestation-v1.json score-blind authoring record
    seal.json                     raw-byte hashes of the sealed holdout
  reviewer-signoff-v1.json        reviewer verdict, attestation, and limitations (outside the seal)
  selected-retrieval-config.json  R4.4 frozen candidate (sha256 a56ae39c…c2805)
  decision.md                     R4.4 decision: retrieval_accepted
  failure-ledger.json             R4.4 run ledger (empty: 0 misses)
  CLOSEOUT.md                     R4.6
```

Driver and tests live outside this directory:
`apps/ai_agent/src/evaluation/retrieval-r4.ts` (R4.3 development and R4.4
sealed-holdout driver plus pure helpers) and
`apps/ai_agent/tests/retrieval-r4.test.ts` (R4.1 validation plus the R4.3/R4.4
Wilson, decision-rule, immutability, config, seal, and paired-comparison tests).

Every run directory is immutable. A changed input means a new directory; never
overwrite a run.

## Re-running the baseline capture

```powershell
bun run apps/ai_agent/src/evaluation/retrieval-target-cli.ts --prepare-profile apps/ai_agent/evaluation/r4/runs/baseline-reconciliation-20261021-v1/capture
node apps/ai_agent/src/evaluation/r23-models.mjs apps/ai_agent/evaluation/r4/runs/baseline-reconciliation-20261021-v1/capture/inference-original.json apps/ai_agent/evaluation/r4/runs/baseline-reconciliation-20261021-v1/capture/scores-original.json .tmp-turbo-user/r2-models
bun run apps/ai_agent/src/evaluation/retrieval-target-cli.ts --report-profile apps/ai_agent/evaluation/r4/runs/baseline-reconciliation-20261021-v1/capture --route-run apps/ai_agent/evaluation/r4/runs/baseline-reconciliation-20261021-v1/route
bun run apps/ai_agent/src/evaluation/retrieval-target-cli.ts --report-support apps/ai_agent/evaluation/r4/runs/baseline-reconciliation-20261021-v1/support --scores-run apps/ai_agent/evaluation/r4/runs/baseline-reconciliation-20261021-v1/capture --route-run apps/ai_agent/evaluation/r4/runs/baseline-reconciliation-20261021-v1/route
```

The commands write with `wx` and refuse to overwrite: use a new run directory.

## Boundaries

- Read-only retrieval. No replay, approval, or write authority.
- No holdout access before the R4.4 candidate freeze. One run only.
- No metric without a numerator and denominator; no average without a
  per-family breakdown.
- Do not pool R4 metrics with R1–R3.5; the cohorts and gates differ.
- Lint baseline is 9 errors and 22 warnings in unchanged frontend files; compare,
  do not claim green.
- No automatic commit, push, deployment, or Graphify refresh. Follow
  [`docs/manualgit_handoff.md`](../../../../docs/manualgit_handoff.md).

## R4.0 review gate

- [x] Protocol hash recorded: `2a750560b0c47a723094ef2d0bd5c112e5c464ee7f32bcf18d5951f91363c47c`.
- [x] Corpus hash matches `apps/ai_agent/tests/rag-corpus-parity.test.ts`.
- [x] Reconciliation complete; every difference is explained.
- [x] No source file changed in this phase.

Verification on the frozen baseline: `rtk proxy bun test tests/rag-corpus-parity.test.ts`
→ 1 pass; `rtk proxy bun test tests/retrieval-profile.test.ts
tests/retrieval-support.test.ts tests/retrieval-target.test.ts` → 53 pass, 0 fail.

## R4.1 review gate

- [x] 80 development cases and 160 holdout cases validated.
- [x] Development has at least 5 answerable cases per family; holdout has 12.
- [x] Holdout no-match buckets are 10 each across all four causes.
- [x] Label audit complete: rule-based kappa 1.00 on a 32-case stratified sample; zero structural defects.
- [x] Holdout sealed; the seal hash is recorded in `protocol.json.holdoutSeal`.
- [x] Label hashes and seal hashes recorded.
- [x] Human content review attested in `reviewer-signoff-v1.json` (AI-assisted audit; self-declared operator attestation, not independent hand-labeling).
- [x] No corpus edit, retriever/model change, or new dependency in R4.1.

## R4.2b review gate

- [x] The provider-as-corroborator loophole is closed with a failing-then-passing test.
- [x] A corroborated weak route cites the transport corroborator, not the provider.
- [x] Facet selection sheds `evidence`, then `symptoms`, then `replay`, and never `verification` for a fault signal.
- [x] Dropped facets and rejected weak tokens are exposed on the observation trace.
- [x] `routeEvidence.reasons` stays empty for an unrouted observation.
- [x] The 24-case R3 development behavior is unchanged (24/24).
- [x] Focused tests and `bun run check-types` pass; no corpus, retriever, model, or holdout change.

## R4.3 review gate

- [x] All development gates pass: hit@3 58/60 (96.67%), macro recall 157/176 (92.50%), precision 157/180 (87.22%), abstention 20/20, false abstention 0/60, route coverage 1.0, reliability 80/80, p95 2175.4 ms, zero safety violations.
- [x] Decision is `retrieval_accepted`; development exit is `proceed_to_freeze`.
- [x] Failure ledger is complete; each of the two misses has exactly one stage (`facet_dropped`).
- [x] No holdout case, score, or hash was opened; no holdout score exists.
- [x] Driver refuses to overwrite an existing run directory; v1 is retained as superseded evidence and v2 is a fresh directory.
- [x] Every metric row carries a numerator and denominator; Wilson 95% intervals are recorded.
- [x] The v2 manifest hashes match the run files; frozen protocol, corpus, case, label, and evidence hashes are unchanged.
- [x] The v1 latency failure is explained by host contention with bit-identical scores; no threshold, input, or candidate changed between v1 and v2.

## R4.4 review gate

- [x] `selected-retrieval-config.json` was written and hashed before the holdout was opened: `a56ae39c3053f954aebbb7318034fc39408f72f85198e8cc13e5620f78ec2805`.
- [x] The driver verified the config, protocol, development label, accepted development run, model config, and all seven sealed file hashes before reading a holdout case.
- [x] One run only (`runs/holdout-20261021-v1`); no re-scoring and no candidate, label, corpus, gate, or threshold change after the score exists.
- [x] Every acceptance gate passed: hit@3 120/120, recall 360/396, direct precision 360/360, abstention 40/40, false abstention 0/120, per-family 12/12 each, route coverage 1.0, reliability 160/160, p95 1910.1 ms, zero safety violations.
- [x] Every reported metric carries a numerator and denominator; Wilson 95% intervals and per-family results are recorded.
- [x] The failure ledger is empty; every miss would have exactly one stage.
- [x] The decision is exactly `retrieval_accepted`; the run manifest hashes match the run files.
- [x] The mandatory measurement limitations (label clustering, structural abstention, F04 leniency, dev-only `S` cohort) are recorded in `decision.md` and the run decision.

