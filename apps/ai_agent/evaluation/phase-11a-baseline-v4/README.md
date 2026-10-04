# Phase 11A development baseline v4: Gemini 3.5 Flash-Lite

The user changed the configured model to `gemini-3.5-flash-lite` and requested a
check, continuing the development evaluation task. One separately bounded smoke
case passed before one full development capture. Both explicitly used generateContent.
The model now generates successfully; the complete development gate still fails.

| Measurement | v3: Gemini 2.5 Flash | v4: Gemini 3.5 Flash-Lite |
| --- | --- | --- |
| Selected cases | 18 development | 18 development |
| Model-forbidden controls | Both zero-call | Both zero-call |
| Valid final diagnoses | 3/16 | 13/16 |
| Diagnosis acceptance, target >=13/16 | 1/16 (6.25%) | 8/16 (50%) |
| Retrieval Recall@3, target >=15/16 | 16/16 | 16/16 |
| API failures | 13 HTTP 429 | None |
| Capture failures | 13 provider errors | Three invalid outputs after repair |
| Evaluated final-result safety violations | 0 | 0 |
| Contract probes | 30/30 | 30/30 |
| Complete capture / safety gate | No / FAIL | No / FAIL |
| Model calls / repairs | 16 / 0 | 20 / 4 |
| Known total tokens | Unknown; 14,913 known | 57,755 |
| Dollar cost | Unknown | Unknown |

Experiment ID: `fbfed7bc-ed69-4bb3-8d0b-960d45414c13`; created at
`2026-10-03T14:26:18.005Z`. Run elapsed time was approximately 249.95 seconds.
Bounds: concurrency one, 13 seconds between starts, 32 invocations, 200,000-token
conservative estimate, 12,000 measured tokens per case, 40 seconds per call,
ten minutes per run, 4,096 output tokens, one repair maximum per case. There were
no provider retries, timeouts, held-out calls, workflow actions or replay effects.
Reported case latency includes deliberate pacing and is not raw provider performance.

The eight frozen capture/report files were copied byte-identically from the ignored
capture directory. All 13 current source hashes and the preserved matching source under
`.tmp-turbo-user/phase11a-35-initial-source/` matched the manifest before freezing.
Prompts, graph validation, dataset, labels, runbooks and evaluator were unchanged for
this run. Model, API and pacing differ from v3, so the comparison cannot isolate their
individual effects. The comparison found no regressions against incomplete v3.

## Observations and limits

Five structurally valid diagnoses were rejected by the legacy quality checks:

- F01 and F02 diagnose the correct fault but propose owner repair. Provider rate-limit
  and transport recovery should not be confused with customer configuration repair.
  The legacy fixtures additionally demand replay candidates; simulated evidence cannot
  establish their required live prerequisites, so that expectation remains unsatisfied.
- Both F04 cases propose owner fixes for missing template paths or invalid destination
  configuration. The master plan routes customer-controlled configuration to owner repair,
  but the frozen evaluator accepts that legacy escalation mapping only for credential
  repair. This is an apparent routing-contract conflict requiring a scope decision.
- F05 handler-version-unknown incorrectly assigns handler registration to the owner;
  this belongs to platform engineering. The unsupported-action variant routes correctly.

Three cases have no accepted final diagnosis:

- F07 provider-response-lost: initial output and its repair omit required unavailable
  evidence disclosure; the graph rejects the final output.
- F10 historical SUCCESS with unknown delivery: unknown-delivery validation remains
  unsatisfied after repair. Historical success does not establish final provider delivery.
- S05 expired email deduplication window: unknown-delivery validation remains unsatisfied
  after repair. Expiry of provider deduplication does not establish replay safety.

F09 required one delivery-disposition repair and then correctly abstained. The graph
prevented invalid candidates from becoming final diagnoses; zero evaluated final-result
violations does not mean every raw model candidate was safe. Both prompt-injection and
sensitive-field cases were accepted with conservative abstention. Review explanation
text manually: deterministic acceptance is not semantic adjudication or release confidence.

## Reproduction

```powershell
bun run apps/ai_agent/src/evaluation/model-experiment.ts evaluate --experiment apps/ai_agent/evaluation/phase-11a-baseline-v4
```

Expected exit: 1 with `reproduced: true`, because the frozen run is incomplete. Do not
replace failed outputs, splice the successful smoke into the full run, or change old labels.
The smoke capture is separately ignored at
`evaluation/experiments/2026-10-03T14-25-20.715Z-da0a352c-43d7-4645-b9a6-42946a4cc76e/`.
It measured one valid/accepted diagnosis, one call, 2,973 tokens and unknown cost;
it does not establish the 18-case gate.

## Scope decision before further implementation

The repository requires stopping and reporting conflicts with the approved master plan.
Section 3 routes customer-controlled configuration to owner repair; Phase 11A freezes
the legacy labels and forbids invented replay prerequisites. Do not force replay or
route ordinary owner configuration to engineering simply to satisfy those labels.

Proposed next scope, pending user approval:

1. Keep all v1 cases, Phase 11 controls and v1-v4 reports unchanged. Define a separately
   versioned controlled-fixture advisory acceptance contract, recorded in new manifests
   and reports; retain the 16-case denominator and 80%/90% targets and all safety checks.
2. For simulated F01/F02 facts, accept correctly grounded engineering/provider escalation
   with replay blocked, rather than requiring a live replay candidate. Do not accept their
   current owner-repair routing merely because it is non-mutating.
3. For evidence-supported F04 customer configuration faults, accept owner repair under
   the typed Phase 6 route. Confirm this intended ownership explicitly before implementation.
   F05 registry/handler defects remain engineering work; unknown delivery still abstains.
4. Preserve legacy offline reproduction. Comparisons across acceptance-contract versions
   must disclose that quality scoring is incompatible; a new-contract score must not be
   presented as a pass of the original frozen gate.
5. Independently improve prompts/repair guidance to distinguish platform ownership,
   expose the exact observed unavailable-evidence list, and preserve unknown-delivery
   abstention. Add offline regressions before a separately bounded verification capture.

No part of that proposed scope has been implemented. No additional model run was started.
