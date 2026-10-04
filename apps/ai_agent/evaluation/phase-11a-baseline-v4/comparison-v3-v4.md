# Development comparison: v3 to v4

V4 uses Gemini 3.5 Flash-Lite through explicit generateContent with 13-second pacing.
V3 uses Gemini 2.5 Flash through Interactions without pacing. Source instrumentation
also differs; dataset, selected development cases and runbook corpus match. The existing
comparison helper reports comparable inputs and no regressions against incomplete v3.

Valid diagnoses rose from 3/16 to 13/16 and accepted diagnoses from 1/16 to 8/16.
Retrieval stayed at 16/16. V3 had thirteen HTTP 429 failures; v4 had no API failures,
but three diagnoses remained invalid after repair. Both runs have zero evaluated final
safety violations and 30/30 probes, yet remain incomplete and fail their safety gates.

Changed settings: `minCallIntervalMs`, `model`, `source_hashes`, `model_settings`.
The combined model/API/pacing change and stochastic output prevent attribution of the
improvement to one variable. V4 case latency includes pacing. These single captures do
not measure repeated-trial success or statistical release confidence. See README for
the unchanged legacy-contract conflicts and proposed scope decision.
