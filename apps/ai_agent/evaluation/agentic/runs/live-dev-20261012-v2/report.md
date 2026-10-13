# Bounded agentic development experiment

Mode: live; model: gemini-3.5-flash-lite.

Keep production retrieval. Interpret only completed live diagnoses as quality evidence; planner fallbacks and provider failures are operational outcomes. Development results require manual review and independent validation, including regressions, cost and latency.

| Variant | Section recall | Precision among returns | No-match abstention |
| --- | ---: | ---: | ---: |
| baseline | 0.6666666666666666 | 0.22222222222222218 | 0.25 |
| agentic | 0.6666666666666666 | 0.22222222222222218 | 0.25 |

baseline: coarse family coverage 16/16; deterministic diagnosis acceptance 15/16; grounding-reference checks 16/16; safety violations 0; calls 16; local end-to-end mean 4323.7113222222215 ms; planner searches/fallbacks 0/0 of 0 attempts.

agentic: coarse family coverage 16/16; deterministic diagnosis acceptance 16/16; grounding-reference checks 16/16; safety violations 0; calls 32; local end-to-end mean 8915.383916666664 ms; planner searches/fallbacks 0/0 of 16 attempts.

Regressions: {"noMatchAbstention":[],"sectionPrecision":[],"sectionRecall":[],"familyCoverage":[],"diagnosisAcceptance":[]}. Per-case context, output, quality issues and timing: report.json. Calls: 76; provider requests: 152; tokens: {"input_tokens":170288,"output_tokens":14265,"total_tokens":184553}; cost USD: unmeasured.

- Existing development cases and section labels were previously inspected. No fresh held-out inputs were opened. No independent generalization claim.
- Section metrics use separate question-based retrieval probes; they do not measure diagnosis or identical incident evidence. Family coverage in the paired evaluator is coarse any-family coverage, not section relevance.
- Stub diagnosis acceptance/grounding are mechanical regression checks. Real grounded diagnosis quality, paid token/cost behavior and live end-to-end latency remain unmeasured in stub mode. No baseline diagnoses were loaded.
- Provider defaults are used for both fresh diagnosis variants, with 4096 output tokens, 64000 per-call total-token preflight, at most one repair. Planner: 512 output tokens, 4000 total tokens, one call. Aggregate run budgets are reserved conservatively before invocation; unknown failed-call usage remains null.
- Cost is null for live calls; no rate or pricing claim. Local wall-clock timings include graph and model wrappers and are single samples, not an SLO benchmark.
- Lexical gap coverage cannot prove semantic relevance. No adoption based on recall alone.
