# Free-tier oracle pilot — 13 October 2026

Completed exactly four initial generations on the confirmed existing free-tier project with unchanged gemini-3.5-flash-lite. Four separate token-count requests; eight provider requests total, all HTTP 200. Zero failed provider generations, zero planner/judge/repair/retry calls. One completed baseline output failed service validation for an ungrounded evidence reference; it is retained and was not repaired.

| Case | Variant | Input tokens | Output tokens | Total tokens | Call latency seconds | Schema valid | Service accepted |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| f03-permission-ambiguous | baseline | 3125 | 317 | 3442 | 2.294 | yes | no |
| f03-permission-ambiguous | oracle | 3094 | 418 | 3512 | 2.586 | yes | yes |
| f07-provider-response-lost | oracle | 3087 | 317 | 3404 | 2.818 | yes | yes |
| f07-provider-response-lost | baseline | 3116 | 424 | 3540 | 2.346 | yes | yes |

Measured total: 13898 tokens (12422 input, 1476 output), no unknown usage. Mean call latency including preflight: 2.511 s; generation HTTP mean 2.235 s. Preflight HTTP total 0.773 s; provider span 32.340 s. Actual generation start gaps: 10012, 10013, 10006 ms. Per-call 64,000 total / 4,096 output limits were safety ceilings, not expected usage. Generation cost $0 under confirmed free-tier terms; billing invoice not independently audited.

Both reviewed oracle contexts were provider-eligible and different from baseline. Frozen input/report/corpus hashes and exact prompts matched offline-v4. Within each pair, evidence, instructions and generation settings were identical; only retrieved passages differed. Order: f03 baseline → oracle, f07 oracle → baseline.

For **f03-permission-ambiguous**, oracle reduced confidence from high to medium and added a bot-permissions alternative and operator access check. It fixed the sampled malformed evidence-reference outcome, but both variants still overclaimed a configuration/destination cause and prescribed correction despite unavailable destination validity, permissions and status. Oracle's read-only citation supports investigation and operator confirmation, not the asserted defect. Service acceptance increased from rejected to accepted, but does not establish semantic correctness.

For **f07-provider-response-lost**, both variants correctly preserved unknown delivery, abstained and escalated. Oracle explicitly refused replay and added a relevant forbidden-actions citation; no clear material semantic improvement. A minor procedural regression is its requirement for independent logs before further classification, even though F07 is already justified; baseline more directly requests receipts. Baseline's before-any-further-action language is also overbroad. All four outputs were schema-valid and cited supplied passages; membership alone does not establish entailment.

This is an **agent review, not independent human validation**. Shuffled packets hid variant names before mapping was read; cases, passages and citations remained visible to assess support and could reveal variants. Prior knowledge also limits blinding. The label-based assessments were saved in blind-review.json before unmasking.

The pilot gives only a weak, mixed qualitative signal that relevant retrieval may improve uncertainty and procedural detail. It does not demonstrate better causal diagnosis: the ambiguous case still overclaims even with the reviewed oracle. **Two development cases and one repetition cannot establish reliable improvement or justify production adoption.**

Verification: 22 focused tests passed; required check-types and build passed. Frontend build was cached and includes existing warnings. Required lint failed in unchanged frontend files (9 errors, 22 warnings), matching documented counts; no ai_agent lint task and no independently established exact historic diagnostic equality. Full lint log: .tmp-turbo-user/oracle-pilot-lint.log.

Changed source files: apps/ai_agent/src/evaluation/oracle-pilot.ts and apps/ai_agent/tests/oracle-pilot.test.ts. This new run directory contains the preparation, request audit, raw redacted attempts, final service outcomes, review and report; frozen artifacts were not overwritten. Unrelated edits preserved. No fresh held-out data, production changes, staging, commits, pushes, branch changes, Graphify refresh or dependencies. Graphify required: no. Pilot complete; no further generations.
