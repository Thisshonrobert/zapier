# Bounded agentic development experiment

Mode: stub; model: deterministic-stubs-v1.

Keep production retrieval. Stub results cannot establish LLM benefit; live development results require manual diagnosis review and independent validation, including regressions, cost and latency.

| Variant | Section recall | Precision among returns | No-match abstention |
| --- | ---: | ---: | ---: |
| baseline | 0.6666666666666666 | 0.22222222222222218 | 0.25 |
| agentic | 0.6666666666666666 | 0.22222222222222218 | 0 |

baseline: coarse family coverage 16/16; stub/deterministic diagnosis acceptance 2/16; grounding-reference checks 16/16; safety violations 0; calls 16; local end-to-end mean 9.378477777777764 ms; planner searches/fallbacks 0/0 of 0 attempts.

agentic: coarse family coverage 16/16; stub/deterministic diagnosis acceptance 2/16; grounding-reference checks 16/16; safety violations 0; calls 32; local end-to-end mean 6.132055555555553 ms; planner searches/fallbacks 16/0 of 16 attempts.

Regressions: {"noMatchAbstention":["intent-no-match-4"],"sectionPrecision":[],"sectionRecall":[],"familyCoverage":[],"diagnosisAcceptance":[]}. Per-case context, output, quality issues and timing: report.json. Calls: 76; provider requests: 0; tokens: {"input_tokens":0,"output_tokens":0,"total_tokens":0}; cost USD: 0.

- Existing development cases and section labels were previously inspected. No fresh held-out inputs were opened. No independent generalization claim.
- Section metrics use separate question-based retrieval probes; they do not measure diagnosis or identical incident evidence. Family coverage in the paired evaluator is coarse any-family coverage, not section relevance.
- Stub diagnosis acceptance/grounding are mechanical regression checks. Real grounded diagnosis quality, paid token/cost behavior and live end-to-end latency remain unmeasured in stub mode. No baseline diagnoses were loaded.
- Provider defaults are used for both fresh diagnosis variants, with 4096 output tokens, 64000 per-call total-token preflight, at most one repair. Planner: 512 output tokens, 4000 total tokens, one call. Aggregate run budgets are reserved conservatively before invocation; unknown failed-call usage remains null.
- Cost is null for live calls; no rate or pricing claim. Local wall-clock timings include graph and model wrappers and are single samples, not an SLO benchmark.
- Lexical gap coverage cannot prove semantic relevance. No adoption based on recall alone.
