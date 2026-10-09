# R2.5 diagnostic evaluation

Production retrieval is unchanged. Candidate coverage is no longer the limiting factor in the exhaustive control; ranking and no-match behavior still miss the goals. None of these results justify adopting a new retriever.

| Method / labels | Recall@3 | No-match abstention | Candidate recall |
| --- | ---: | ---: | ---: |
| Exhaustive MiniLM, original reused held-out labels | 65.28% | 83.33% | 100% |
| Exhaustive MiniLM, audited reused held-out labels | 76.39% | 83.33% | 100% |
| Section descriptions, audited reused held-out labels | 73.84% | 83.33% | 100% |
| Frozen MiniLM, fresh independent synthetic scenarios | 73.96% | 87.50% | 100% |

## Label audit

A separate Codex reviewer received 96 questions and 211 shuffled sections, with model scores, ranks, splits and gold/returned roles withheld. The reviewer classified 128 direct answers, 62 supporting sections and 21 irrelevant sections. Version `r25-audited-v1` credits direct answers only: 32 questions changed, 44 direct labels added, none removed. The original benchmark remains intact. Review independence does not mean human adjudication; that remains pending.

The packet reviews the union of existing gold sections and returned sections, not every section in the corpus. Corrections therefore do not establish exhaustive label completeness. Artifacts and provenance are in `runs/audit-v1/` and `runs/exhaustive-v2/`.

## Exhaustive control and representation experiment

Every section eligible under the existing current-version, taxonomy and provider filters is scored, with at most three results returned. The 60-section corpus is a diagnostic control, not a production retrieval change. MiniLM uses its pinned cached revision, quantization, 512-token limit and fixed .001 cutoff. On audited reused held-out labels, zero cutoff raises recall to 79.17% but destroys no-match abstention (0%).

`section-descriptions-v1.json` contains concise descriptions specific to each section, derived from corpus content. It preserves section text and citations. The experiment changes only the passage prefix, using the same candidates, model and cutoff. Audited development recall falls from 99.07% to 94.44%; development-only selection rejects the descriptions. These separate runs are not a paired latency benchmark.

## Gemini free-tier pilot: incomplete

The user authorized the synthetic question/runbook payload export and specified their configured free-tier Gemini project. The runner uses `gemini-3.5-flash-lite`, low bounded thinking, explicit procedural section selection and an empty-selection option. Labels are absent from inference inputs. Count-tokens preflight, serial pacing, per-request deadlines and attempt/token budgets constrain calls. No retries, paid fallback, billing changes or production integration occurred. Billing status was not independently inspected; cost is unknown rather than assumed zero.

The first run stopped after 29 successes at a generic bounded failure whose subtype was not retained. One continuation skipped that failed question without retrying it and stopped on HTTP 503 after seven more successes. Totals: 36 successful generations, at most 38 generation attempts and 76 HTTP requests, 176,655 reported successful tokens, two failures with unknown usage, 58 unattempted questions. No held-out generation was attempted. The complete reasoning-versus-MiniLM quality comparison cannot be made and Gemini was excluded from method selection. No further calls were made after the second failure. See `runs/reasoning-partial-report-v3/report.json`; successful-only metrics must not be read as full benchmark results.

## Bounded recovery outcome (2026-10-08)

An explicit, verified recovery policy preserved the original continuation guard and all captures. Both historical failed questions recovered, as did one new question. The next question returned HTTP 503 twice and exhausted its single retry; the run stopped after five new generation requests and ten HTTP requests. Totals: 39/96 successful questions, at most 43 cumulative generation attempts and 86 HTTP requests, one currently failed question and 56 unattempted questions. No held-out question was attempted. Reported successful tokens total 191,818 (15,163 new); failure usage and cost remain unknown. No billing, model, production retrieval or frozen-method changes occurred.

All 36 answerable development questions are now available. Audited development recall is 83.33% for Gemini versus 99.07% for MiniLM on identical questions/candidates. The three available no-match questions all abstain, but nine development no-match questions are unavailable, so complete no-match performance cannot be claimed. Successful request latency, excluding pacing/retries, averages 3,831 ms with p95 15,288 ms across the combined capture. The full comparison remains incomplete; the current Gemini method has no demonstrated improvement warranting fresh method promotion or production adoption. Retain production retrieval. Fresh semantic downstream evaluation remains unfinished.

See `RECOVERY.md`, `RECOVERY-HANDOFF.md` and immutable `runs/reasoning-recovery-v1/` artifacts. Offline recovery replay passed; the initial 184-file hash snapshot remained unchanged before this README update. The original method freeze passed its read-only consistency check. Further calls require a separate explicit policy; this run is not automatically resumed.

## Freeze and fresh evaluation

`method-freeze.json` selects original MiniLM using audited development recall plus no-match abstention, with ties preferring original. Selection does not load fresh scenarios. The selected configuration, corpus and implementation hashes were fixed before fresh evaluation. Final review added capture-to-freeze rejection checks; a read-only consistency verification confirmed the existing freeze matches its development captures. It was not rewritten.

A separate author received only the corpus, not earlier questions, labels or scores, and produced 32 unique scenario groups: 24 answerable, including 11 multi-section cases, and eight no-match cases. `fresh-scenarios-author-v1.json` preserves the author output. `fresh-scenarios-v1.json` mechanically normalizes the schema's kind field without changing question text, filters, groups or labels; `fresh-label-rationales-v1.json` preserves rationales.

Fresh recall is 73.96%, MRR 91.67%, candidate recall 100%, no-match abstention 7/8 (87.5%), and answerable abstention 0%. Mean local rerank time is 377 ms and p95 483 ms in this run. The 98% candidate engineering goal is met; the 90% final recall goal and complete no-match preservation are not. Scenarios are independently authored synthetic cases over a shared corpus, with author labels and human adjudication pending; they do not establish production release confidence.

## Downstream verification and limits

Four controlled cases ran through the actual diagnosis graph with exhaustive local retrieval and recorded diagnosis outputs whose citations were refreshed. All four passed contract and read-only safety checks with zero external model calls. This verifies graph integration and output contracts, not fresh semantic diagnosis quality or model adaptation. A complete reasoning comparison and fresh semantic downstream evaluation remain unfinished.

## Verification and reproducibility

The scoped R2.5 tests pass (7 tests / 34 assertions), including altered-description/source/config freeze rejection. Root type check, direct ai_agent TypeScript check and root build pass. Root lint retains the existing frontend baseline; see `HANDOFF.md` for final verification details and exact file scope. Exhaustive, description and fresh captures have passed offline score replay. Frozen score captures include provenance, token hashes/counts and timing; no model downloads are needed with the existing local cache.

Read-only freeze check: `rtk proxy bun apps/ai_agent/src/evaluation/r25-freeze.ts --verify`.

Canonical captures are `exhaustive-v2`, `descriptions-v1`, `fresh-v1`, `downstream-contract-v1`, both Gemini failure captures and `reasoning-partial-report-v3`. Earlier exhaustive-v1 and partial-report-v1/v2 files remain preserved as provisional captures, excluded from the proposed staging scope. This phase depends on pre-existing uncommitted R2–R2.4 experiment sources and artifacts; resolve their separate handoff before integrating R2.5.

Graphify required: no. No Git integration actions were performed. Recommended next implementation model/effort: Sol, medium, for the remaining bounded evaluation work; do not tune against fresh labels.
