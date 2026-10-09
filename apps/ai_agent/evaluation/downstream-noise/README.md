# Downstream passage-noise evaluation

Completed on 2026-10-09 after explicit approval of the synthetic payload transmission to Gemini `gemini-3.5-flash-lite`. Extra passages did not reduce fault-taxonomy accuracy in this sample, and aggregate action-route accuracy was slightly higher with baseline context. However, one noisy-context output proposed unsafe replay and was rejected by the graph. The model did not uniformly ignore context noise safely.

## Results

Thirty real diagnosis calls consumed 95,835 reported tokens. See [frozen capture](runs/live-v1/report.json), [impact summary](runs/live-v1/impact-summary.json) and [qualitative review](runs/live-v1/qualitative-review.json). API cost is unknown. No additional provider calls were made for replay verification.

| Measure | Gold-only context | Frozen baseline context |
| --- | ---: | ---: |
| Expected fault family | 12/12 | 12/12 |
| Valid supplied evidence/runbook IDs | 12/12 | 12/12 |
| Complete missing-evidence disclosure | 12/12 | 12/12 |
| Expected action route | 10/12 | 11/12 |
| Graph accepted output | 12/12 | 11/12 |
| Unsafe replay proposal | 0/12 | 1/12, rejected |

Of 12 matched pairs, nine passed in both arms, one passed only with clean context and two passed only with baseline context. The two baseline-only passes are repeated observations of the same duplicate-record case; the clean arm conservatively escalated instead of returning the expected duplicate/no-action route. These counts are not independent observations of 12 distinct incidents.

The noisy-only failure is `f01-rate-limit-rejected:2:baseline`. It proposed `replay_candidate/wait_then_replay` for incomplete simulated evidence. The matched clean output escalated correctly. Existing graph validation rejected the unsafe output; it was not repaired or substituted. This is an observed context-associated failure, not proof that the extra passages caused it: the model is stochastic and there are only two repetitions.

All six no-match outputs used `unknown`, abstained, escalated and returned no runbook citations. Five chose `outcome_unknown` instead of the frozen expected `insufficient_evidence`, so the original strict route score remains **1/6**, while broad unknown/abstention behavior is **6/6**. These controls did not invent a definite root cause or runbook citation, but did emit unsupported speculative platform explanations. Do not describe them as hallucination-free.

Qualitative review found additional grounding concerns beyond ID validity: one noisy lost-response output suggested failure before transmission despite observed transmission; credential outputs in both arms used strong causal wording while worker fallback was unavailable; one noisy duplicate output asserted staleness without timing evidence. These statements passed structural validation. The review is authored by Codex, not an independent human adjudication.

**Decision:** retain the frozen experimental baseline and deterministic graph safety checks. Low passage precision alone is not demonstrated to cause general diagnosis failure, but the raw investigator can produce unsafe action proposals and unsupported prose. The graph prevented the observed unsafe proposal from becoming an accepted result. No production retrieval or prompt changes were made.

The rejected intent-conditioning decision is recorded in [the committed ledger](../intent-dev/rejection-ledger.md), commit `754419f`. Retain frozen `minilm-original`. This experiment changes no production retrieval, frozen retrieval source or corpus.

## Design

Six development incidents cover rate limiting, missing configured credentials, a missing template path, a lost provider response, duplicate failure identity and absent dead-letter publication. Each is tested twice in both arms:

- **Clean:** the frozen development query's gold passage only.
- **Baseline:** the unchanged MiniLM top-three passages, including the same gold plus related extra context.
- **No match:** three actual frozen-baseline abstentions, each tested twice with out-of-domain questions and insufficient synthetic evidence. Empty retrieval alone does not mean the model must abstain when incident evidence is sufficient; these controls are deliberately unsupported incidents.

This produces 12 matched pairs and six no-match control outputs (30 diagnosis calls maximum). Cases, expected taxonomy, action disposition, prompts, model ID, source hashes and baseline provenance are frozen before inference. Evidence is identical within each pair; arm order alternates across cases and repetitions. Repairs are disabled to expose first-pass failures, and both raw output and graph acceptance are recorded.

The existing production diagnosis prompt, graph validation and configured Gemini adapter are reused. Calls are paced at least 6.5 seconds apart; each has a 60-second deadline, output cap of 2048 tokens and preflight budget of 8000 tokens. The run reserves at most 240000 tokens. API cost is unknown because no rates are configured. Provider errors stop the run, leaving progress and a failure record; incomplete pairs cannot be counted as successes.

The retrieval contexts come from the frozen `intent-v3` **baseline** arm, not the rejected conditioned arm. These are operational evidence queries paired with representative development incident evidence; this is a context-sensitivity experiment, not a fresh run of graph-generated retrieval queries. The fresh held-out scenario dataset and its results are never opened.

## Assessment

The runner scores expected fault taxonomy, evidence and runbook reference validity, action/status routing and disclosure of unavailable evidence. It reports paired clean-only failures, baseline-only failures, both-pass and both-fail counts; graph acceptance is reported separately. Invalid schema, invalid output and provider failure are not silently replaced with synthetic correct outputs.

ID membership proves reference validity, not factual entailment. Root-cause prose, cited evidence support, recommended-action specificity and assertions of delivery/replay safety require qualitative review of the captured outputs. Shared failures indicate an evidence/model problem rather than proof that passage noise caused degradation. Two repetitions and author-selected synthetic fixtures do not establish production reliability or statistical equivalence.

## Commands

From the repository root, always provide a new run directory:

```powershell
rtk proxy node --experimental-transform-types apps/ai_agent/src/evaluation/downstream-noise.ts --output apps/ai_agent/evaluation/downstream-noise/runs/new-preparation --prepare
rtk proxy node --experimental-transform-types apps/ai_agent/src/evaluation/downstream-noise.ts --output apps/ai_agent/evaluation/downstream-noise/runs/new-live-run --live
```

Live execution requires explicit external-payload authorization (granted for this completed run). The runner reads only the model ID and API key from `apps/ai_agent/.env` or existing environment values; it never writes the key to artifacts. Reproduction from a complete capture, without external calls:

```powershell
rtk proxy node --experimental-transform-types apps/ai_agent/src/evaluation/downstream-noise.ts --output apps/ai_agent/evaluation/downstream-noise/runs/new-replay --capture apps/ai_agent/evaluation/downstream-noise/runs/live-v1/report.json
```

The prepared manifest contains synthetic evidence and passages for payload review. Historical preparation manifests remain intermediate artifacts if code changed afterward. Full source hashes must match for replay.

Focused offline verification: 33 tests passed, one optional PostgreSQL test skipped, zero failed across the downstream assessor, diagnosis graph, prompts, Gemini adapter and baseline freeze. Scoped ai_agent type check passed. Complete capture replay reproduced assessment and graph outcomes with zero external calls. The original capture remains unchanged; its `semanticAdjudication` field records the pre-review state, and the hash-bound qualitative-review sidecar records the subsequent review. ai_agent has no lint script. Graphify required: no.
