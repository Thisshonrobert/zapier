# R3.5 decision — independent holdout acceptance

**Decision: `rejected`**

The frozen `structured-minilm` candidate was run once against the independent
40-case holdout. It failed three predeclared release gates. The runtime default
is unchanged. No arm is promoted, no gate is lowered, and the holdout is not
reused.

Date: 2026-10-20
Phase: R3.5 (freeze and independent acceptance)
Frozen candidate: `profile-route-facets-support` with
`retrievalMethod = structured-minilm`, `routeEnabled = true`,
`support.minAnchorHits = 1`

## 1. Frozen artifacts

| Artifact | SHA-256 |
| --- | --- |
| `selected-retrieval-config.json` | `ab30434a3f018d6bd5234a06de89c6ca8869d0aa38773c0f1d0592e9ff05ec68` |
| `corpus-v1.json` | `45e85c3585607ebfd0e1ebd1f2b068e2fab7c889b1bdd3af3a565f20afcbd440` |
| `protocol.json` | `e6a491cc5d2423485c61ff5d5e8634e07bc9886bb76041b68238f5322290c3ed` |
| development labels (pinned) | `a30fd42160326bd6daa02238be50ad0c0cccab23d5ef5372fcae99e7fd49c752` |
| `holdout/cases-v1.json` | `7fa54e7afa174b9d4bb256c6b8f4de81d6e312681e8accb0209d1c4b2026839c` |
| `holdout/labels-v1.json` | `2ed46c5561b75a0953e5ddf1ece9bdeafab60fb4b97ce14446dae978e40cc39b` |
| `holdout/evidence-v1.json` | `55994aa6f0f49f28bb194f039473445c9e03ecafbdbc0654301027fce50716d2` |
| `holdout/review-final-v1.json` | `1e433af93b83fd0702e9b22eb0ea80773012f9c7a0d667d0ed97a583460a595f` (verdict `accepted`) |
| `holdout/authoring-attestation-v1.json` | `7e472fc0297d03a5050c2952a1caa7d645b47c5baff6d4cd03095a57048aa20b` |

Model: `Xenova/ms-marco-MiniLM-L-6-v2`, revision
`a09144355adeed5f58c8ed011d209bf8ee5a1fec`, q8, CPU, max length 512, batch 8.

Prompt: `diagnosis` `phase-11a-v3`, source hash
`aa4a038a8b2748826933a9deb13aa883546d9d6cb79369a5424402d1c9485a9f`.

Run: `apps/ai_agent/evaluation/r3/holdout/runs/profile-route-facets-support-20261020-v1`

- inference input hash: `a6a990feb34c4e856fd9bfcb17454cde37e9a9475800e7565b6e6be072298162`
- scores: `scores-original.json` (one batch scoring pass, no rerank)
- selection `support.minAnchorHits = 1` was frozen before the holdout existed;
  `1` and `2` tied across every development criterion.

## 2. Release gate

| Gate | Threshold | Value | Absolute | Result |
| --- | --- | --- | --- | --- |
| Sufficient-guidance hit@3 | ≥ 0.90 | 0.8000 | 24 / 30 | **FAIL** |
| Macro section recall@3 | ≥ 0.90 | 0.8556 | 24 / 30 cases | **FAIL** |
| No-match abstention | ≥ 0.90 | 0.9000 | 9 / 10 | pass |
| False abstention | ≤ 0.05 | 0.0667 | 2 / 30 | **FAIL** |
| Direct precision@3 | ≥ frozen baseline | 0.8000 | baseline 0.2292 | pass |
| Route coverage | = 1.00 | 1.0000 | 30 / 30 answerable | pass |
| Reliability | ≥ 0.95 | 1.0000 | 40 / 40 | pass |
| Warm retrieval p95 | ≤ 3 s | 2.017 s | offline rerank batch p95 | pass |
| Safety violations | = 0 | 0 | no unknown/ineligible citation, no repair or replay text | pass |

Gate status: `rejected`; failing gates `hitAt3`, `macroSectionRecallAt3`,
`falseAbstention`.

### Absolute denominators

- scheduled cases: 40
- eligible answerable: 30
- no-match: 10
- reliable outputs: 40
- sufficient-guidance hits: 24
- no-match abstentions: 9
- false abstentions: 2

## 3. Per-family results (candidate)

| Family | Answerable | hit@3 | Macro recall | Direct precision | No-match | Abstention | False abstention |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F01 | 3 | 3 / 3 | 1.000 | 0.889 | 0 | — | 0 / 3 |
| F02 | 3 | 1 / 3 | 0.333 | 0.333 | 0 | — | 2 / 3 |
| F03 | 3 | 3 / 3 | 1.000 | 1.000 | 0 | — | 0 / 3 |
| F04 | 3 | 0 / 3 | 0.333 | 0.333 | 0 | — | 0 / 3 |
| F05 | 3 | 3 / 3 | 1.000 | 0.889 | 0 | — | 0 / 3 |
| F06 | 3 | 3 / 3 | 1.000 | 1.000 | 0 | — | 0 / 3 |
| F07 | 3 | 3 / 3 | 1.000 | 1.000 | 0 | — | 0 / 3 |
| F08 | 3 | 3 / 3 | 1.000 | 1.000 | 0 | — | 0 / 3 |
| F09 | 3 | 2 / 3 | 0.889 | 0.889 | 0 | — | 0 / 3 |
| F10 | 3 | 3 / 3 | 1.000 | 0.667 | 0 | — | 0 / 3 |
| NM | 0 | — | — | — | 10 | 9 / 10 | — |

## 4. Failure ledger

Answerable misses (6):

| Case | Family | Route / support | Missing accepted facet | Cause bucket |
| --- | --- | --- | --- | --- |
| `f02-email-connect-timeout-presend` | F02 | no route, no observed anchor, abstained | investigation, remediation, verification | route/facet derivation + support abstention |
| `f02-telegram-dns-failure-preconnect` | F02 | no route, no observed anchor, abstained | investigation, remediation, verification | route/facet derivation + support abstention |
| `f04-email-numeric-recipient-field` | F04 | F04 route, supported | remediation, verification (returned the sibling `RB-F03-F04` F04 section) | label/citation equivalence |
| `f04-email-missing-subject-template` | F04 | F04 route, supported | remediation, verification (returned the sibling `RB-F03-F04` F04 section) | label/citation equivalence |
| `f04-telegram-null-ticket-summary` | F04 | F04 route, supported | investigation (returned the sibling `RB-F03-F04` F04 section) | label/citation equivalence |
| `f09-unacknowledged-failure-publication` | F09 | F07+F09 route, supported | verification (requested facets dropped verification because the outcome was classified unknown) | facet derivation |

No-match miss (1):

| Case | Returned | Cause |
| --- | --- | --- |
| `nm-worker-local-queue-capacity` | `RB-F01-F02@1.1.0#read-only-investigation`, `#allowed-remediation`, `#verification-rollback-or-escalation` | a worker admission failure routed to F02 because the error text contained "refused"; the support gate then accepted the confident route |

## 5. Baseline comparison (same holdout)

| Arm | hit@3 | Macro recall | Direct precision | No-match abstention | False abstention | p95 |
| --- | --- | --- | --- | --- | --- | --- |
| `keyword` | 0.000 | 0.239 | 0.233 | 0 / 10 | 0 / 30 | 0.000 s |
| `profile-route-facets-support` | 0.800 | 0.856 | 0.800 | 9 / 10 | 2 / 30 | 2.017 s |

The candidate clearly improves retrieval over the keyword control, but the
release gate is an absolute recall/abstention gate, not a relative one. The
improvement does not satisfy it.

## 6. Decision and stop rule

Per the consolidated stop rules, "a release gate fails on the independent
holdout" stops the phase. R3.7 integration does not run. R3.6 diagnosis
validation does not start because it requires `decision.md` to say `accepted`.

- Runtime default remains `minilm-original`; `RUNBOOK_RETRIEVAL_METHOD` was not
  changed.
- No partial result is promoted and the holdout is consumed. It cannot be
  re-used or re-scored for a future attempt.
- The frozen corpus, protocol, development labels, and selected config are
  unchanged.

## 7. Post-hoc notes (observation only, not applied)

These are recorded for a future, separately authorized protocol. None of them
was applied to this run.

1. **F02 observability gap.** Pre-send transport failures expressed as
   "timed out" or "DNS lookup returned EAI_AGAIN" produce no route hint, so the
   requested facets omit verification and the support gate abstains with no
   matched anchor. A future profile version would recognise a broader
   pre-connection transport vocabulary.
2. **F09 facet ordering.** A rejected action delivery whose failure publication
   is unacknowledged was classified as delivery-unknown because the retry
   outcome was `unknown`, which dropped the verification facet. A future
   profile would derive facets per signal rather than short-circuit on any
   unknown outcome.
3. **F04 citation equivalence.** The holdout accepted only the `RB-F04-F06`
   F04 sections, while the retriever returned equivalently valid `RB-F03-F04`
   F04 sections. A future protocol would accept both independently sufficient
   sections, or the corpus would deduplicate the overlap.
4. **No-match route false positive.** "Refused" in a worker admission error
   routes to F02. A future route would require a provider-transport signal, not
   a bare error word.

## 8. Next steps

1. Do not enable `structured-minilm` as the runtime default.
2. Close R3 as `rejected` with this record.
3. If retrieval recovery continues, start a new protocol (new corpus version
   if runbooks change, new development labels, and a new independently authored
   holdout). The four post-hoc notes above are the candidate scope; none is
   authorized by this decision.
