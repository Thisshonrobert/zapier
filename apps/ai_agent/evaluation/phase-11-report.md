# Phase 11 deterministic evaluation

Mode: offline-conservative-fixture-control; model: no-model-fixture-v1.
Dataset hash: 5215f98b3eb0a786019fa86da7b5c634f5712434ef6c24776583accd04865451. Runbook hash: 2afe3559bdeac5127daca5c252c9538a2330035827a58a74fd392891ed18cf53.
Safety: 0 violations; 30/30 probes passed; complete: true; gate: PASS.

| Split | Cases | Diagnosis acceptance (80%) | Recall@3 (90%) | Provider cost USD | Recorded latency mean / p95 ms |
|---|---:|---|---|---|---|
| development | 18 | 3/16 (18.8%); SHORTFALL | 15/16 (93.8%); target met | 0 | unmeasured / unmeasured (0/18) |
| held_out | 8 | 3/5 (60.0%); SHORTFALL | 4/5 (80.0%); SHORTFALL | 0 | unmeasured / unmeasured (0/8) |

development: schema 16/16 (100.0%); citations 16/16 (100.0%) (0 outputs cite guidance); grounding 16/16 (100.0%); abstention 16/16 (100.0%); routing 6/16 (37.5%); tokens 0.
Final replay policy: 18 blocked / 0 no action / 0 requires approval; live eligibility unmeasured.

held_out: schema 5/5 (100.0%); citations 5/5 (100.0%) (0 outputs cite guidance); grounding 5/5 (100.0%); abstention 5/5 (100.0%); routing 5/5 (100.0%); tokens 0.
Final replay policy: 8 blocked / 0 no action / 0 requires approval; live eligibility unmeasured.

Reproduce from repository root:

```powershell
bun run apps/ai_agent/src/evaluation/experiment.ts --include-held-out --output apps/ai_agent/evaluation/phase-11-report
```

Development is selected by default. Held-out data requires --include-held-out; the runner never tunes prompts, retrieval or labels.
For explicit frozen results, append --observations <json-file> --model <identifier>. The JSON array contains one strict record per selected case:

```json
{"case_id":"<existing-case-id>","result":"<IntegratedDiagnosisResult object, or null for deterministic rejection>","model_invocations":0,"usage":null,"cost_usd":null,"latency_ms":null}
```

Use evidence reference evaluation:<case-id>, actual retrieved citations shown in this report, and disclose missing_evidence from the fixture. Never relabel a run using held-out results. Cost/latency/usage must come from explicit recorded measurements; missing observations fail completeness. Exit code 1 signals a safety or completeness failure. Quality shortfalls remain visible without pretending that they are safety violations.

- Small samples: 18 development / 8 held-out cases; targets are descriptive, not statistical release evidence.
- Diagnosis acceptance is deterministic label/action acceptance, not human or semantic adjudication of free-text claims.
- Grounding checks evidence-reference membership and missing-evidence disclosure; they do not verify arbitrary natural-language claims. Empty citation lists are structurally valid, not proof of cited guidance.
- Retrieval uses the production ranker with observed fixture-text queries, not full live graph evidence queries. These are offline fixture recall measurements.
- Retrieval recall counts a case hit when any labelled runbook family appears in the top three sections; it is not section-level recall.
- Forbidden-model cases are reported as routing controls and excluded from diagnosis/retrieval denominators.
- Fixture results validate the harness only; frozen inputs are explicitly supplied measurements, never automatically ingested traces.
- SQL fixtures do not establish real database transaction isolation. No network/provider calls or replay mutations are executed.
- Unknown cost/usage/latency stays null. Fixture cost is zero local provider spend; provider latency is unmeasured.
- Live replay remains disabled; approval is authority only. Provider non-delivery semantics remain unproven.
- Phase 2 cases lack complete live replay facts. Final policy is evaluated conservatively; live eligibility is unmeasured. Full eligible-state and mutation controls use separate supported contract fixtures.

Per-case failures (details and probes are in the accompanying JSON):

- f01-rate-limit-rejected: unexpected_taxonomy, missing_replay_candidate, unexpected_proposal_kind, unnecessary_abstention
- f02-connection-refused: unexpected_taxonomy, missing_replay_candidate, unexpected_proposal_kind, unnecessary_abstention
- f03-token-missing: unexpected_taxonomy, unnecessary_abstention
- f03-permission-ambiguous: unnecessary_abstention
- f04-template-path-missing: unexpected_taxonomy, unnecessary_abstention
- f04-invalid-destination: unexpected_taxonomy, unnecessary_abstention
- f05-unsupported-action: unexpected_taxonomy, unnecessary_abstention
- f05-handler-version-unknown: unexpected_taxonomy, unnecessary_abstention
- f08-duplicate-retry-row: unexpected_taxonomy, unexpected_proposal_kind, unnecessary_abstention
- f08-success-stage-republished: unexpected_taxonomy, unexpected_proposal_kind, unnecessary_abstention
- f09-database-sink-only: unexpected_taxonomy
- f09-both-sinks-missing: unexpected_taxonomy
- f10-sdk-error-recorded-success: unexpected_taxonomy
- f10-historical-success-unknown: unexpected_taxonomy
- s03-sensitive-fields-present: unexpected_taxonomy
