# R3.5r.3 â€” development screening report

**Status: `failed`. Do not freeze the candidate and do not commission holdout v2.**

Date: 2026-10-20
Phase: R3.5r.3 (development screening, `dev-24` and `dev-32`)
Candidate: `profile-route-facets-support-r3.5r`, profile `r3.5r-v1`,
`structured-minilm`, route enabled, support `minAnchorHits: 1`, packing `r3.3-v1`
Protocol: `protocol-r3.5r.json` revision 3 (`ae513bbfâ€¦e9481e`)
Run: [`runs/dev-20261020-v5`](./runs/dev-20261020-v5)

## 1. Gate result

| Gate | Value | Threshold | Result |
| --- | ---: | ---: | --- |
| `dev-24` hit@3 | 56.25% (9/16) | 80% | **FAIL** |
| `dev-24` macro section recall@3 | 75.00% | 80% | **FAIL** |
| `dev-32` hit@3 | 59.09% (13/22) | 80% | **FAIL** |
| `dev-32` macro section recall@3 | 78.03% | 80% | **FAIL** |
| `dev-32` no-match abstention | 100.00% (10/10) | 90% | pass |
| `dev-32` false abstention | 0.00% (0/22) | â‰¤ 5% | pass |
| Direct precision `dev-24` | 41.67% | â‰¥ keyword 22.92% | pass |
| Direct precision `dev-32` | 54.55% | â‰¥ keyword 24.24% | pass |
| Facet invariant | 100% | 100% | pass |
| Typed-route audit | 100% | 100% | pass |
| Equivalence provenance | 100% | 100% | pass |
| Route coverage | 100% | 100% | pass |

The candidate fails four of the eight Â§7.1 screening checks. Per the protocol
stop rules, R3.5r.3 stops here: R3.5r.4 freeze does not run, holdout v2 is not
commissioned, and no gate is lowered.

## 2. Findings from the R3.5r.0â€“r.2 audit

### F1 â€” Blocking: `deliveryUnknown` facet demand regresses four pinned cases

`protocol-addendum.md` Â§3.2 declares the `deliveryUnknown` demand as
`investigation, forbidden, verification` (line 217). The implementation follows
it (`retrieval-profile.ts`, `signalDemands`). The pinned development labels,
which were frozen before this change, require `remediation` for three of those
cases and `remediation + forbidden` for the fourth:

| Case | Label facets | New requested facets | Missing | Old R3.4 result |
| --- | --- | --- | --- | --- |
| `f07-provider-response-lost` | investigation, remediation | investigation, forbidden, verification | remediation | hit |
| `f09-database-sink-only` | investigation, remediation | investigation, forbidden, verification | remediation | hit |
| `s02-error-prompt-injection` | investigation, remediation | investigation, forbidden, verification | remediation | hit |
| `s05-expired-email-dedup-window` | remediation, forbidden | investigation, forbidden, verification | remediation | hit |

Replaying the frozen R3.2 scores through the new profile gives `dev-24`
hit@3 **56.25% (9/16)** and macro recall **75.00%**, versus the R3.4
development result of **81.25% (13/16)** and **87.5%**. The four cases above
are new misses; the three pre-existing misses (`f04-template-path-missing`,
`f10-sdk-error-recorded-success`, `s03-sensitive-fields-present`) remain.

The three-slot ceiling cannot satisfy all four labels plus the Â§3.3 invariant
(`verification âˆˆ requestedFacets` when a fault signal is present) with the
declared single demand. This is a protocol-table conflict, not a coding typo.
It must be resolved by a recorded protocol revision before another screening
run; the implementation must not be silently retuned to fit the labels.

### F2 â€” Blocking implementation gap: extension cases had no observed evidence

R3.5r.1 authored the 8 extension cases and labels but no evidence. The pinned
24 evidence lives in `development-review-v3.json`; the extension cases had only
`input` and `requiredFacets`. A screening run cannot derive route hints,
requested facets, anchors, or support for `dev-32` without evidence.

This report closes the gap with
[`development-evidence-v2.json`](./development-evidence-v2.json): the 24 pinned
bundles are referenced from the frozen review capture, and the 8 extension
bundles are authored controlled fixtures. The extension bundles were written
after the labels were frozen and before any extension ranking or score existed.
They were not part of the R3.5r.1 independent review, so `dev-32` results carry
that limitation. `dev-24` does not: it uses only reviewed pinned evidence.

### F3 â€” Blocking tooling gap: no `dev-32` screening path existed

`retrieval-target-cli.ts` hardcodes `development-cases-v1.json`,
`development-labels-v1.json`, and the pinned evidence map. It has no command
that loads the recovery cohort, builds the v2 inference, scores it, and reports
`dev-24`/`dev-32`. R3.5r.3 could not have been executed with the R3.5r.2 code.

This report adds:

- `apps/ai_agent/src/evaluation/recovery-screening.ts` â€” cohort loading, freeze
  checks, profile audit, inference build, ranking, gate evaluation, report;
- `apps/ai_agent/src/evaluation/recovery-score.mjs` â€” pinned local MiniLM
  scoring with model-integrity checks;
- `apps/ai_agent/tests/recovery-screening.test.ts` â€” cohort, invariants, and
  gate tests.

### F4 â€” Blocking label-equivalence gaps in the extension set

Two extension answerable cases miss only because the returned sibling section
is not in the frozen `accepted` list:

| Case | Missing facet | Returned section | Accepted section |
| --- | --- | --- | --- |
| `f04-sibling-destination-repair` | verification | `RB-F03-F04@1.0.0#verification-rollback-or-escalation` | `RB-F04-F06@1.0.0#verification-rollback-or-escalation` |
| `f03-f04-credential-and-template-overlap` | investigation | `RB-F04-F06@1.0.0#read-only-investigation` | `RB-F03-F04@1.0.0#read-only-investigation` |

R3.5r.1's Option A equivalence table added only the F04 `remediation` sibling
(`RB-F03-F04@1.0.0#allowed-remediation`). The verification and investigation
siblings were not adjudicated. Even if F1 were fixed, `dev-32` would reach at
most 77.27% (17/22) with these two misses, still below 80%. A protocol
amendment must either accept one or both siblings with the required
per-citation rationale and second-review signature, or add independently
sufficient sections to the corpus/equivalence table.

### F5 â€” Verified strengths (not findings)

- Corpus sections hash, cases hash, label hash, and protocol hash all match the
  frozen values; the run fails closed on mismatch.
- The facet invariant holds over the full cohort; the typed-route audit passes
  for every fired hint; equivalence provenance validates; accepted citations
  are 100% route-eligible.
- No-match abstention is 10/10 and false abstention is 0/22.
- Direct precision beats the same-corpus keyword control on both cohorts.
- No holdout file is read or referenced by the screening path.

### F6 â€” Lower-severity observations

1. **Publication vocabulary mismatch.** The extension F09 query names
   `publication_acknowledgement_missing` and `dlqPublishedAt_absent`, but
   `computeSignals.publication` only recognises `dead_letter_absent`,
   `dlq_publication_missing`, `source_kind: reconciled_execution`, or a
   dead-letter token in `finalError`. The evidence artifact therefore uses
   `dead_letter_absent`. If the query tokens are meant to be observed facts, the
   signal vocabulary and the case query disagree.
2. **Conclusive-outcome check.** `hasConclusiveOutcome` inspects observed
   provider outcomes but not `executionStatus` (`FAILED`/`SUCCESS`). Current
   cases are unaffected; a future fixture with only a terminal execution status
   and a retry-level `unknown` could be misclassified as `deliveryUnknown`.
3. **Property-test arithmetic.** The addendum (Â§3.3) says 2â¸ signal subsets;
   the implementation correctly enumerates 10 fault signals (2Â¹â°âˆ’1). The
   implementation is stronger; the addendum text is stale.
4. **Provenance naming.** `development-labels-v2.constituents.json` still uses
   `artifactId: development-extension-labels-v2` and the extension status text
   is now `authored_reviewed`. This is a provenance-only inconsistency.

## 3. What must happen next

1. **Do not run R3.5r.4.** The candidate is not frozen and holdout v2 does not
   exist.
2. **Resolve F1 by protocol revision.** The likely shape is a different
   `deliveryUnknown` demand (for example, restoring `remediation` and adding
   `verification`) plus a signal that preserves `forbidden` for
   dedup/sensitive-field cases, or an explicit decision that these four pinned
   labels are re-adjudicated in v2 (the protocol currently forbids editing
   pinned labels).
3. **Resolve F4 by label equivalence or corpus deduplication** with the same
   guardrails as R3.5r.1: same family/facet, per-citation independent-sufficiency
   rationale, second review, maximum two citations.
4. **Re-run R3.5r.3 in a new run directory** after the protocol revision. Do not
   reuse this run, lower a gate, or edit the frozen labels/cases/corpus.
5. If the protocol owner rejects both amendments, stop the `structured-minilm`
   recovery line per stop rule 14; do not spend holdout v2 on a candidate that
   cannot pass development.

## 4. Reproduction

```text
bun run apps/ai_agent/src/evaluation/recovery-screening.ts \
  --out apps/ai_agent/evaluation/r3/recovery/runs/<new-run> \
  --cache-dir .tmp-turbo-user/r2-models
```

The scoring script verifies the four pinned MiniLM files before loading and
refuses remote download. A changed input requires a new run directory.


