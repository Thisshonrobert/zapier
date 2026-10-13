# Multi-query and metadata development experiment

Keep the production weighted-keyword retriever. The combined candidate regressed on the fixed development inputs; this experiment does not authorize or implement production adoption.

## Scope

This separately requested offline comparison uses the production six-runbook corpus (54 current sections), the existing 28-question operational-intent development benchmark, and the frozen Phase 11A v6 development capture (18 cases, including two rejection controls). It never opens the fresh held-out scenarios, scores or reports. No corpus, label, prompt, production graph, dependency, threshold, or replay-policy changes are included.

Four variants isolate the interventions:

- **Baseline:** exact production weighted-keyword search and provider filtering.
- **Metadata:** existing provider filtering plus section intent derived from headings. Explicit task wording selects a heading category; ambiguous incident queries retain operational headings, excluding sources and simulated examples. Expected taxonomy and benchmark intent labels never select filters.
- **Multi-query:** original query plus two fixed procedural prefixes for remediation and constraints. Search each bounded query, merge by citation using reciprocal rank fusion (`k=60`), and return at most three excerpts.
- **Combined:** metadata filtering followed by multi-query fusion.

Query expansion admits only candidates with a positive score for the original query. A prefix cannot create a match for a completely unmatched query. This preserves lexical no-match cases but cannot eliminate incidental lexical matches or recover zero-overlap paraphrases. Provider filters continue admitting generic guidance. Expanded variants preserve original content, hashes, citations, and untrusted-guidance markers; their fusion scores are ranking values, not diagnosis confidence.

The original graph query builder sanitizes captured evidence before retrieval. The existing task classifier is reused unchanged. No benchmark taxonomy, expected diagnosis, relevance label or requested-intent annotation enters query construction. Gold labels enter scoring only.

## Frozen development results

Artifacts: `runs/dev-v1/report.json`, `report.md`, and `manifest.json`. The manifest records input/source hashes, corpus identity, and report hashes. Existing output directories are rejected rather than overwritten. The run contains no model calls or external API cost.

| Variant     | Section Recall@3 (24 positives) | Precision among returned sections | No-match abstention (4 controls) | Heading-based wrong-intent flags | Incident-family coverage (16 cases) |
| ----------- | ------------------------------: | --------------------------------: | -------------------------------: | -------------------------------: | ----------------------------------: |
| Baseline    |                            100% |                            33.33% |                              1/4 |                               18 |                               16/16 |
| Metadata    |                          95.83% |                            31.94% |                              1/4 |                                0 |                               16/16 |
| Multi-query |                            100% |                            33.33% |                              1/4 |                               30 |                               13/16 |
| Combined    |                          95.83% |                            31.94% |                              1/4 |                                0 |                               12/16 |

All four variants meet the targeted development recall target of 80%, but target attainment does not justify a change that worsens other measures. The combined candidate fails the improvement gate: recall, precision and incident-family coverage regress; no-match abstention stays poor. Zero heading-based flags do not establish semantic relevance.

The lost section is `intent-gaps-3`: the unchanged classifier interprets "evidence gaps" in a forbidden-actions question as an evidence-gathering task, so filtering removes the direct answer. The combined candidate also loses family coverage for missing credentials, duplicate retry rows, an SDK error recorded as success, and the sensitive-fields control. Broad procedural prefixes promote generic replay/remediation passages over incident-specific sections. These are recorded regressions, not fixes tuned against the benchmark.

Section recall is mean labeled-section coverage across answerable questions. Precision is the mean relevant fraction among returned sections on answerable questions. Graph family coverage counts any matching runbook family, which is much coarser than section relevance. Heading flags exclude mixed/unknown headings and are only diagnostic heuristics. Local timing is recorded per query in the JSON; a single CPU run is not a production latency benchmark.

Downstream diagnosis quality and grounding remain **unmeasured**. The experiment constructs the existing diagnosis prompt for each captured evidence bundle and candidate context but does not invoke a diagnosis model. Frozen baseline diagnoses cannot be reused as evidence that a changed retrieval context preserves model behavior.

## Reproduce

From the repository root, use a new output directory:

```powershell
rtk proxy node --experimental-transform-types apps/ai_agent/src/evaluation/retrieval-multi-query.ts --output .tmp-turbo-user/multi-query-reproduction
```

No model weights, credentials, downloads, network access or action providers are needed. The CLI accepts only new output directories under `.tmp-turbo-user/` or `apps/ai_agent/evaluation/multi-query/runs/`.

## Verification and limits

19 tests passed across `retrieval-multi-query.test.ts`, `retrieval-intent.test.ts`, `retrieval-experiment.test.ts` and `search-runbooks.test.ts`. Tests cover exact baseline parity, bounded/deduplicated rankings, generic-provider eligibility, stale exclusion, hash/content preservation, input bounds, label isolation, development-only selection, CLI capture completeness, and overwrite refusal.

The explicit agent TypeScript check and required root type check/build passed. Root Turbo checks only declared scripts; the frontend build was cached and replayed its existing package-manager/SWC warnings. Root lint failed with the existing 9 errors and 22 warnings in unchanged frontend files. Bun's sandbox could not read the working/temp directories, so the required Bun checks and focused regressions were rerun outside the sandbox; no dependency repair was needed.

These are previously inspected, synthetic, author-labeled development inputs. They cannot establish independent generalization or production acceptance. Production retrieval remains unchanged. Any future production adoption requires separate scope and independent validation. Vectorless tree retrieval and agentic retrieval were not implemented.
