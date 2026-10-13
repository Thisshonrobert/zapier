# Authorized live development results — 2026-10-12

The completed Gemini run demonstrates no retrieval benefit from this planner on these development inputs. Every planner chose `use_current_context`: 16 paired incidents and 28 retrieval-only probes. No follow-up search ran, no planner fallback occurred, and the paired retrieval contexts were identical. Keep production retrieval unchanged.

Model: `gemini-3.5-flash-lite`, through the existing Gemini adapter. Inputs are previously inspected development captures and operational-intent questions, not independent validation. Fresh held-out scenarios, labels, scores and reports were never opened. Both variants generated fresh diagnoses; baseline diagnoses were not reused as quality evidence.

| Measurement                                                             | A: production retrieval | B: bounded planner |
| ----------------------------------------------------------------------- | ----------------------: | -----------------: |
| Section recall (24 positive probes)                                     |                  66.67% |             66.67% |
| Section precision                                                       |                  22.22% |             22.22% |
| No-match abstention                                                     |                     1/4 |                1/4 |
| Incident-family coverage (coarse)                                       |                   16/16 |              16/16 |
| Deterministic diagnosis acceptance                                      |                   15/16 |              16/16 |
| Reference/disclosure grounding checks                                   |                   16/16 |              16/16 |
| Evaluated safety violations                                             |                       0 |                  0 |
| Paired generation calls                                                 |                      16 |                 32 |
| Paired total tokens                                                     |                  55,897 |             82,804 |
| Mean recorded case latency, including pacing and two rejection controls |                  4.32 s |             8.92 s |
| Mean model-call wall time per eligible incident, excluding pacing       |                  2.35 s |             3.42 s |

The one-case acceptance difference concerns `s03-sensitive-fields-present`: A returned taxonomy F02, B returned unknown. Since the contexts were identical, this is diagnosis sampling variability, not evidence that follow-up retrieval improved diagnosis. The checks validate existing deterministic criteria, citation membership and disclosure; they do not establish semantic correctness of every explanation. No independent semantic judge or full human quality review was run.

B used 48.1% more paired tokens and twice as many paired model generations. Across both variants and the 28 planner probes, all 76 generations succeeded: 32 diagnosis and 44 planner calls, 152 provider HTTP requests including token preflight, and 184,553 total tokens. The probes account for 45,852 tokens. Wall-clock duration was 377.53 seconds. Dollar cost is **unmeasured**, because no pricing rate was configured. Five-second generation-start pacing contributes to the recorded end-to-end latency; this is not an unpaced production latency estimate.

The first live attempt is preserved under `runs/live-dev-20261012-v1/`. Its baseline completed, but all paired B diagnoses failed with provider errors; only 32 of 76 generations succeeded. HTTP statuses were not retained by that implementation, so the cause is unconfirmed. Its apparent B acceptance of 0/16 must not be interpreted as a retrieval-quality regression. The second run added safe status diagnostics, five-second pacing and a stop on blocking provider statuses, without changing retrieval selection or diagnosis prompts.

The completed artifacts are under `runs/live-dev-20261012-v2/`: `freeze.json`, `manifest.json`, `report.json` and `report.md`. Inputs and method were frozen before calls. Offline replay verified hashes and reproduced both paired evaluator reports and retrieval metrics without provider calls. Both live attempts are immutable and retained for audit.

Focused regression verification: 62 tests passed, none failed. Root type checks and build passed. Root lint remains blocked by the unchanged frontend baseline of 9 errors and 22 warnings; no frontend files changed. Default tests and experiment runs remain stubbed. No production adoption, Git integration or further live run was performed.
