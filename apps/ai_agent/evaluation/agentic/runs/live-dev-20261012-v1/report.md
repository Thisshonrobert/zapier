# Bounded agentic development experiment

Mode: live; model: gemini-3.5-flash-lite.

Keep production retrieval. Stub results cannot establish LLM benefit; live development results require manual diagnosis review and independent validation, including regressions, cost and latency.

| Variant | Section recall | Precision among returns | No-match abstention |
| --- | ---: | ---: | ---: |
| baseline | 0.6666666666666666 | 0.22222222222222218 | 0.25 |
| agentic | 0.6666666666666666 | 0.22222222222222218 | 0.25 |

baseline: coarse family coverage 16/16; stub/deterministic diagnosis acceptance 16/16; grounding-reference checks 16/16; safety violations 0; calls 16; local end-to-end mean 2276.4870722222227 ms; planner searches/fallbacks 0/0 of 0 attempts.

agentic: coarse family coverage 16/16; stub/deterministic diagnosis acceptance 0/16; grounding-reference checks 0/16; safety violations 0; calls 32; local end-to-end mean 921.834433333333 ms; planner searches/fallbacks 0/16 of 16 attempts.

Regressions: {"noMatchAbstention":[],"sectionPrecision":[],"sectionRecall":[],"familyCoverage":[],"diagnosisAcceptance":["f01-rate-limit-rejected","f02-connection-refused","f03-token-missing","f03-permission-ambiguous","f04-template-path-missing","f04-invalid-destination","f05-unsupported-action","f05-handler-version-unknown","f07-provider-response-lost","f08-duplicate-retry-row","f08-success-stage-republished","f09-database-sink-only","f10-sdk-error-recorded-success","s02-error-prompt-injection","s03-sensitive-fields-present","s05-expired-email-dedup-window"]}. Per-case context, output, quality issues and timing: report.json. Calls: 76; provider requests: 152; tokens: null; cost USD: unmeasured.

- Existing development cases and section labels were previously inspected. No fresh held-out inputs were opened. No independent generalization claim.
- Section metrics use separate question-based retrieval probes; they do not measure diagnosis or identical incident evidence. Family coverage in the paired evaluator is coarse any-family coverage, not section relevance.
- Stub diagnosis acceptance/grounding are mechanical regression checks. Real grounded diagnosis quality, paid token/cost behavior and live end-to-end latency remain unmeasured in stub mode. No baseline diagnoses were loaded.
- Provider defaults are used for both fresh diagnosis variants, with 4096 output tokens, 64000 per-call total-token preflight, at most one repair. Planner: 512 output tokens, 4000 total tokens, one call. Aggregate run budgets are reserved conservatively before invocation; unknown failed-call usage remains null.
- Cost is null for live calls; no rate or pricing claim. Local wall-clock timings include graph and model wrappers and are single samples, not an SLO benchmark.
- Lexical gap coverage cannot prove semantic relevance. No adoption based on recall alone.
