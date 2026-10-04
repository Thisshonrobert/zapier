# Phase 11A Flash-Lite generation access: 2026-10-03

## Follow-up: Gemini 3.5 Flash-Lite

The user subsequently changed the environment to `gemini-3.5-flash-lite` and asked
for a check. An explicit generateContent smoke case completed and passed. The full
development capture made 20 calls with no HTTP 404/429 errors: 13/16 valid diagnoses,
8/16 accepted, retrieval 16/16, both controls zero-call, 30/30 probes and zero evaluated
final-result safety violations. Three invalid final diagnoses leave the gate incomplete.
The new model-access blocker is resolved for this measured run; quality and an apparent
legacy routing-contract conflict remain. See [v4 baseline](phase-11a-baseline-v4/README.md).
The earlier access-failure account below is historical and remains unchanged.

The user authorized running the configured model, reviewing observations and making
focused improvements. The configured identifier was `gemini-2.5-flash-lite`.
Generation failed before producing any diagnosis; the development gate is still unmet.
No label, threshold, prompt, retrieval rule or replay restriction was changed.

| Check | Observed result |
| --- | --- |
| Model metadata, authenticated GET | HTTP 200; `generateContent` listed |
| Interactions capture | Seven journaled calls, all HTTP 404; interrupted |
| Explicit generateContent capture | Twelve journaled calls, all HTTP 404; interrupted |
| Minimal generateContent diagnostic, 16-output-token cap | HTTP 404, error status `NOT_FOUND`; no generation |
| Authenticated model list | HTTP 200; configured model and Gemini 3 Flash Preview listed |

The first progress journal accounts for seven cases. The second accounts for thirteen
cases, including the zero-call malformed-envelope control. These are partial journals,
not complete frozen experiments. Both processes were verified stopped. No partial
journal was spliced into a baseline or scored as a complete run. Recorded failed-call
usage and dollar cost remain unknown. Exact availability/access cause is unresolved;
model-list presence does not demonstrate successful generation. These failures are
HTTP 404, not the HTTP 429 failures of the original v3 baseline.

Local interrupted directories (ignored):

- `evaluation/experiments/2026-10-03T10-07-48.539Z-ffe7ab62-e8f3-429f-bf7e-b2c14d21cba9/`
- `evaluation/experiments/2026-10-03T10-15-21.704Z-c7ebd0de-b575-43d6-b99d-3dc8babe92c1/`

## Runner improvements

- Added explicit `--api generate-content` and matching adapter support. The default
  remains Interactions; there is no automatic API or model fallback. The manifest records
  the exact selected endpoint and checks that its model matches the recorded model.
- Both APIs use the same diagnosis schema, output cap, graph validation and sanitation.
  The generateContent response must have one completed `STOP` candidate and valid usage.
  Thought parts are excluded; candidate and thought token counts are included in measured
  output usage. Incomplete results retain known usage but cannot become valid diagnoses.
- The runner now stops sending subsequent requests after HTTP 401, 403, 404 or 429.
  It preserves the failing invocation, records a fixed `stop_reason`, accounts for all
  remaining cases as `not_executed`, and still runs both deterministic zero-call controls.
  A stopped run remains incomplete and cannot pass the gate. Legacy manifests are unchanged.
- The existing 13-second start spacing, 32-invocation/200,000-token-estimate limits,
  40-second call deadline, ten-minute run deadline and one repair maximum remain in force.

## Verification and next step

Offline suite: 95 passed, one PostgreSQL integration test skipped, zero failed across
seven files. Type check and build passed. Lint still fails with the unchanged frontend
baseline of nine errors and 22 warnings. Frozen v1/v2/v3, dataset and Phase 11 controls
remain unchanged; historical v3 can still be evaluated offline.

An explicit model choice is pending: either resolve this model's generation access,
or authorize a bounded evaluation with another model that has available quota. The
user's screenshot showed Gemini 3 Flash at 0/5 RPM; its remaining daily quota was cropped
and is not verified. A model list alone is insufficient to claim that alternative works.
No third capture or model fallback was started. Once a healthy full development capture
exists, inspect its actual diagnoses before changing prompts. Full targets remain complete
capture, both controls zero-call, zero safety violations, >=13/16 accepted diagnoses and
>=15/16 retrieval hits. Do not manufacture a gate pass from missing observations.

Reference: [Google's generateContent API](https://ai.google.dev/api/generate-content)
documents the explicit protocol and usage metadata;
[structured output documentation](https://ai.google.dev/gemini-api/docs/generate-content/structured-output)
lists Flash-Lite schema support. Those documentation claims do not override the observed
404 failures for this configured project/model.
