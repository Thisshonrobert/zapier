# Phase 11A: controlled-fixture model observations

Current measured model: `gemini-3.5-flash-lite` through explicit generateContent.
A smoke case passed; the full [v4 baseline](phase-11a-baseline-v4/README.md) records
13/16 valid diagnoses, 8/16 accepted and retrieval 16/16, with no API errors.
The gate still fails because three final diagnoses were rejected. Further implementation
is paused at the documented master-plan/routing-contract conflict; historical artifacts,
labels, thresholds and graph safety validation are unchanged.

The experiment runs the current diagnosis graph, prompt, weighted-keyword retrieval
and Gemini adapter. Interactions remains the default; `--api generate-content` explicitly
selects the standard generation endpoint. Only the selected diagnosis-model API is called.
No backend, database, Kafka, action sends, approval mutation or replay is used.
Expected diagnoses, policy and relevance labels stay outside model inputs and queries.

From the repository root, first run the offline tests and repository checks:

```powershell
bun test apps/ai_agent/tests/model-experiment.test.ts apps/ai_agent/tests/evaluation-report.test.ts apps/ai_agent/tests/checks.test.ts apps/ai_agent/tests/diagnosis-checks.test.ts apps/ai_agent/tests/diagnosis-graph.test.ts apps/ai_agent/tests/gemini-model.test.ts apps/ai_agent/tests/search-runbooks.test.ts
bun run check-types
bun run lint
bun run build
```

Tests use local stubs; they never invoke a paid model. Root lint has a known frontend
baseline; report its exact diagnostics rather than describing a failing check as passed.

## Capture

Set `GEMINI_API_KEY` and an explicit `GEMINI_MODEL` in the process environment or a
locally ignored Bun environment file. From the repository root, explicitly use
`bun --env-file=apps/ai_agent/.env run ...` to load the agent's environment file;
the runner's `--model` overrides `GEMINI_MODEL`. Do not put credentials in arguments or artifacts.
There is no automatic model fallback. The CLI prints bounds before any API call.

Use `--api generate-content` when deliberately selecting that protocol. It records the
exact model endpoint in the manifest; both protocols use the same schema and validation.
GenerateContent is stateless and does not send an Interactions `store` parameter. The
manifest's `store: false` describes the absence of stored interaction state, not a provider
data-retention guarantee. Changing only `GEMINI_MODEL` does not change the API mode.
See [the current Flash-Lite generation-access report](phase-11a-generation-access.md):
both protocols returned HTTP 404 in the newly authorized attempts, so no new valid
diagnoses or gate pass were recorded.

```powershell
# No --live: zero paid calls; writes an explicitly incomplete no-model capture.
bun run apps/ai_agent/src/evaluation/model-experiment.ts capture --output apps/ai_agent/evaluation/experiments

# Exactly one development experiment; save the directory printed on completion.
bun run apps/ai_agent/src/evaluation/model-experiment.ts capture --live --output apps/ai_agent/evaluation/experiments
```

Default selection is all 18 development cases. The malformed-envelope and owner-mismatch
controls are gated from observed facts, with zero model invocations. The other 16 cases
use controlled evidence. Concurrency is one, with a default minimum of 13 seconds
between request starts, including repairs (at most five starts in a 60-second window).
The first request starts immediately. Pacing is local to this experiment process;
other applications using the same project also consume quota. Default limits are 32 invocations including
one possible repair per case, 40 seconds per call, 10 minutes per run, 200,000 total
token budget, 12,000 measured tokens per case, 32,000 prompt-input characters, and
4,096 output tokens per call. There are no provider retries. HTTP 401, 403, 404 or 429
stops subsequent model requests and records a fixed manifest `stop_reason`. Remaining
allowed cases are `not_executed`; deterministic controls are still checked with zero
calls. The complete failed experiment is saved and the gate remains incomplete.
Pacing waits count toward
case/run elapsed time and the total run deadline, but not the 40-second model-call
deadline or provider-call latency. Cancelling or reaching the run deadline during
a wait records no pending invocation, token reservation or provider cost. New manifests
record `minCallIntervalMs`; legacy frozen manifests retain their original bounds.

New invocation records include `error_details` for provider failures: a fixed category
(`network_error`, `http_error`, `malformed_json`, `invalid_response`,
`response_too_large`, `malformed_output`, or `unknown`) and nullable `http_status`.
No provider message, response body or credential is saved. Timeouts and cancellation
retain their separate outcomes. Older captures may lack `error_details`; their cause
cannot be recovered retrospectively. The frozen v1 baseline retains its 20-second limit.

V3 optionally adds `error_details.output_diagnostics` for `malformed_output`:
`text_length` is the first selected model text length, `text_block_count` counts
model-output text blocks, `supported_fence` reports a supported whole-response
JSON/unlabelled fence, and `parse_failure` is the fixed `json_syntax` category.
No raw text, parse-error messages or causes are retained. First-block extraction
is unchanged; multiple blocks were not established as the v2 failure cause.

Before each call, the runner reserves UTF-8 input/instruction/schema bytes plus capped
output tokens. Known usage replaces that reservation; unknown usage retains it. This
is a conservative budgeting estimate, not a provider tokenizer or a guaranteed billed
token ceiling. Invocation, output and time limits still bound calls when usage is unknown;
a reported usage overrun stops subsequent calls. Unknown cost stays null: no pricing rates
are configured and no dollar-spend guarantee is implied.

Bounds may be reduced with `--max-invocations`, `--max-tokens`, `--call-timeout-ms` and
`--run-timeout-ms`. Configure spacing with `--min-call-interval-ms <milliseconds>`
(0 through 60,000; zero disables pacing for offline tests). Keep 13,000 for a 5-RPM
quota; 7,000 leaves some margin for a 10-RPM quota when this process is the only user.
Spacing cannot restore exhausted daily quota or guarantee provider capacity.
Use `--cases <comma-separated-development-ids>` for a deliberate
targeted experiment. An explicitly requested `--held-out` run selects only the eight
held-out cases and records a separate assessment. Never use held-out outputs to tune
prompts, retrieval, labels or case selection.

The approved version-1 simulated contracts preserve aggregate fixture facts. Synthetic
UUID/stage carriers identify fixtures only. Missing execution records, per-attempt
history, registry, input values and fingerprints are not invented. All fixture evidence
is incomplete and simulated; production schemas and default graph validation are
unchanged. Such evidence cannot establish a replay candidate's live prerequisites.
This deliberately limits quality acceptance, including cases with legacy replay labels.
`missing_evidence` is supplied observational context; expected answers are not supplied.

## Frozen artifacts and offline evaluation

Each run gets a new directory; existing experiments cannot be overwritten. Frozen
files contain a versioned manifest, selected cases, runbook corpus, strict Phase 11
observations, captured evidence/retrieval context, and per-invocation sanitized output,
repair issue, usage, latency and prompt hash. Source hashes, Git revision/dirty state,
runtime versions, dataset/corpus hashes and model settings describe the capture.
No credentials, provider response bodies or hidden reasoning are stored. Known structured
outputs are allowlisted and credential-like/PII-like strings are redacted; malformed
output is represented by a failure code. `progress.jsonl` preserves completed cases
during cancellation or abrupt interruption; hard process termination may leave only
this partial local journal, which is not a complete frozen experiment.

Raw/local output is ignored under `evaluation/experiments/` and `evaluation/local/`.
Only reviewed sanitized baseline files should be copied into the checked-in baseline
directory. Do not copy the local progress journal or environment files.

```powershell
# No network or model initialization. Validates hashes and reproduces the frozen report.
bun run apps/ai_agent/src/evaluation/model-experiment.ts evaluate --experiment <frozen-directory>

# Optionally write a new report prefix without overwriting the capture.
bun run apps/ai_agent/src/evaluation/model-experiment.ts evaluate --experiment <frozen-directory> --output apps/ai_agent/evaluation/local/re-evaluation

# Compare two deliberately captured runs; never modifies model inputs or labels.
bun run apps/ai_agent/src/evaluation/model-experiment.ts compare --previous <old-directory> --experiment <new-directory> --output apps/ai_agent/evaluation/local/comparison.json
```

The comparison includes changed settings/source hashes, per-case regressions and
aggregate metrics. Different dataset, corpus, split or case selections are disclosed as
incomparable. Same inputs do not guarantee identical fresh model outputs. Offline
re-evaluation requires compatible version-1 graph query construction, weighted-keyword
ranker and deterministic evaluation. Changes that cannot reproduce the captured query,
retrieval or report are rejected explicitly; preserve the original code revision/source
inventory to reproduce an older version. Prompt changes are detected through invocation
hashes as well. Comparing runs across such incompatible code versions requires evaluating
each with its recorded source version and comparing their reports; the CLI does not
silently reinterpret an older experiment with different algorithms.

All selected cases remain in the report, including failed/not-executed cases. Provider
outages, invalid output, cancellation and budget exhaustion are sanitized and leave the
baseline gate incomplete. Rejection controls are excluded from the 16-case development
quality denominator. Actual captured citations and graph queries are scored separately
from Phase 11 fixture-query recall; neither measures live-system retrieval quality.
Targets remain 80% deterministic diagnosis acceptance and 90% retrieval Recall@3.
Review explanation text manually: deterministic acceptance is not semantic adjudication,
and this small dataset provides no statistical release confidence. Live replay remains
disabled and provider non-delivery semantics remain unproven.

## Frozen v3 result and cross-version reproduction

The single explicitly approved v3 run is saved in `phase-11a-baseline-v3/`.
It accounts for all 18 cases with both controls zero-call. Retrieval is 16/16;
diagnosis acceptance is 1/16 and valid diagnoses 3/16 because 13 model API calls
returned HTTP 429. Zero evaluated violations and 30/30 probes do not override
the incomplete gate. No paid retry or additional run was performed. Unknown
total tokens/cost remain null; 14,913 tokens are known from three calls.

V2 source was preserved in ignored `.tmp-turbo-user/phase11a-v2-source/` before
editing and matched all 13 recorded hashes. V1/v2 capture artifacts, case labels,
the dataset and Phase 11 controls remain frozen. Changed prompts/queries make
current-source v2 re-evaluation incompatible; do not bypass its validation.

```powershell
bun run apps/ai_agent/src/evaluation/model-experiment.ts evaluate --experiment apps/ai_agent/evaluation/phase-11a-baseline-v3
bun run .tmp-turbo-user/phase11a-v3-source/apps/ai_agent/evaluation/phase-11a-baseline-v3/reproduce-comparison.ts .tmp-turbo-user/phase11a-v2-source apps/ai_agent/evaluation/phase-11a-baseline-v3 apps/ai_agent/evaluation/local/v2-v3-reproduced.json
```

Exit 1 with `reproduced: true` is expected for v3's incomplete gate. The comparison
script verifies both source inventories and independently validates both captures
and reports before using the existing comparison helper. Outputs use exclusive
creation; choose a new path when repeating offline comparison. See the v3 README
and comparison for measured improvements, HTTP failures and semantic limitations.

## Next experiment: quota readiness and quality improvement

The pacing change does not alter prompts, retrieval, labels, policy or gate thresholds.
No new live experiment is included in this change. Each live command below needs its
own explicitly bounded run authorization; do not loop or retry until a score passes.

1. In AI Studio, select the project associated with the configured API key and check
   the exact model's RPM, input TPM and remaining RPD. A full development capture needs
   16 initial requests, and may use up to 32 with repairs. Allow headroom for other
   project users and any separately approved smoke run. If daily quota is exhausted,
   wait for its reset or use a model with available quota; pacing alone cannot help.
2. Run the offline tests and required repository checks first. Ensure the CLI's printed
   model is the intended model and its bounds include the configured interval. Explicit
   `--env-file` loading avoids accidentally running a root invocation with a stale model.
3. Optionally authorize a separate one-case development smoke capture to verify model
   access and structured output. It does not establish full-run quality or gate success.
   If it returns 429, stop and inspect AI Studio; do not spend another full capture.
4. Once quota is ready, authorize one fresh full development experiment. Keep all 18
   cases, both controls, the same 200,000-token/32-invocation bounds and a new output
   directory. Keep held-out cases excluded. Save model changes and pacing changes as
   different settings when comparing to v3; do not overwrite or splice into v3.

```powershell
# Optional smoke only: at most one initial request plus one graph repair.
bun --env-file=apps/ai_agent/.env run apps/ai_agent/src/evaluation/model-experiment.ts capture --live --cases f07-provider-response-lost --max-invocations 2 --max-tokens 30000 --run-timeout-ms 120000 --min-call-interval-ms 13000 --output apps/ai_agent/evaluation/experiments

# One full development capture; run only after separate authorization and quota readiness.
bun --env-file=apps/ai_agent/.env run apps/ai_agent/src/evaluation/model-experiment.ts capture --live --max-invocations 32 --max-tokens 200000 --call-timeout-ms 40000 --run-timeout-ms 600000 --min-call-interval-ms 13000 --output apps/ai_agent/evaluation/experiments
```

5. Evaluate the new frozen directory offline. Check capture completeness first:
   16 valid final diagnoses, both controls zero-call, no capture failures, zero safety
   violations and all 30 contract probes passed. The current report's `safety.passed`
   means complete capture with zero evaluated safety violations; inspect quality
   separately. Development quality targets require at least 13/16 accepted diagnoses
   (80%) and 15/16 retrieval hits (90%). A safety pass alone is not quality-target success.
6. Review each rejected development diagnosis and its explanation manually. Separate
   schema/parse failures, unsupported taxonomy, routing errors and unnecessary abstention
   from missing real replay prerequisites. V3 already measured retrieval at 16/16;
   do not change retrieval speculatively. Use actual completed development outputs to
   choose one bounded prompt/output change at a time, add an offline regression check,
   and compare a separately authorized experiment. Never inject expected labels into
   prompts or lower thresholds to force a pass.
7. Simulated evidence cannot support live replay, even where a legacy fixture expects
   it. Preserve that restriction and report the mismatch. If legitimate quality work
   requires changing the approved evidence/label contract, stop and report a master-plan
   conflict before changing it. A model switch or pacing fix cannot promise gate success.

Before pacing edits, all 13 v3 sources were preserved with matching hashes under ignored
`.tmp-turbo-user/phase11a-v3-source/`. The historical v3 comparison script expects matching
v3 source at its repository root; run it from that preserved tree for historical
source-verified comparison. The eight frozen v3 capture/report files still reproduce
with current code because prompt, evidence mapping, retrieval and evaluator are unchanged.
