# Development comparison: v1 -> v2

Both runs used the same 18 development cases, dataset and runbook corpus. Each
report reproduced with its matching source. No held-out evaluation was performed.

Diagnosis acceptance improved from **4/16 (25%) to 7/16 (43.75%)**, below the 80%
target. Valid diagnoses improved from **8/16 to 14/16**; timeouts fell from **4 to 0**.
Retrieval stayed at **10/16 (62.5%)**, below the 90% target. Both gates remain
incomplete, with zero evaluated final-result safety violations.

The model stayed `gemini-2.5-flash`. The call timeout increased from 20 to 40 seconds;
the prompt now specifies escalation for unknown outcomes/evidence gaps; provider-error
instrumentation changed. These changes were simultaneous, and model responses are
stochastic, so the comparison cannot isolate a causal effect.

Four newly accepted cases: `f07-provider-response-lost`, `s02-error-prompt-injection`,
`s03-sensitive-fields-present`, `s05-expired-email-dedup-window`.

Two regressions: `f05-handler-version-unknown` changed from accepted to unnecessary
abstention; `f08-duplicate-retry-row` changed from a valid rejected result to a capture
failure. V2's two failed captures (`f08-duplicate-retry-row`,
`f09-database-sink-only`) record `malformed_output` rather than an unknown provider
error. S05 succeeded, but this does not identify its historical v1 failure cause.

V2 made 18 calls including two repairs and reported 84,881 tokens across all calls.
V1 made 22 calls including six repairs; total usage was unknown, with 80,166 known
tokens. Neither run has calculated dollar cost. Mean case latency fell from 17.80
to 13.47 seconds; this includes controls and repairs, not pure provider latency.

`comparison-v1-v2.json` contains per-case differences and both aggregate reports.
Pass@k/pass^k were not measured: these runs used different configurations and are
not independent repeated trials of a fixed configuration.
