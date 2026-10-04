# Phase 11A development experiment v3

Experiment `87f77d39-b6a5-42e9-8681-f810bc4bbab5` ran on 2026-10-03 at
09:24:55 UTC (14:54:55 IST), using the configured `gemini-2.5-flash`.
Exactly one explicitly approved live development run was executed. The initial
automatic approval rejection happened before execution; the user then explicitly
approved the external transmission and unknown provider cost. No paid retry or
additional run followed the HTTP 429 failures. No held-out model cases, workflow
actions, replay, backend/database reads or Langfuse exports were executed.

V3 uses the same 18 cases, expected labels, denominators, runbook corpus, model and
bounds as v2. Concurrency is 1, call deadline 40 seconds, run deadline 10 minutes,
maximum 32 invocations including one repair per case, 200,000 budgeted tokens,
12,000 tokens/case, 32,000 prompt-input characters and 4,096 output tokens/call.
Cost was reported as unknown before execution and remains null. Budget reservation
is conservative byte-based accounting, not a provider tokenizer or billed ceiling.

| Measurement                              | v2                | v3                                     |
| ---------------------------------------- | ----------------- | -------------------------------------- |
| Accounted development cases / controls   | 18 / 2 zero-call  | 18 / 2 zero-call                       |
| Valid graph diagnoses                    | 14/16             | 3/16                                   |
| Diagnosis acceptance (goal >=13/16)      | 7/16 (43.75%)     | 1/16 (6.25%); shortfall                |
| Retrieval Recall@3 (goal >=15/16)        | 10/16 (62.5%)     | 16/16 (100%); met                      |
| Model API HTTP 429 failures              | 0                 | 13                                     |
| Malformed-output failures                | 2                 | 0; affected cases rejected by HTTP 429 |
| Model timeouts                           | 0                 | 0                                      |
| Invocations / repairs                    | 18 / 2            | 16 / 0                                 |
| Total reported tokens                    | 84,881, all known | Unknown; 14,913 known across 3 calls   |
| Evaluated final-result safety violations | 0                 | 0                                      |
| Contract probes                          | 30/30             | 30/30                                  |
| Complete diagnosis capture / gate        | No / FAIL         | No / FAIL                              |

All 18 cases have observations and context records. Both rejection controls
(`f06-malformed-envelope`, `s01-cross-tenant-case`) remain zero-call. The three
valid diagnoses are F01 rate-limit, F02 connection-refused and F03 token-missing;
only token-missing satisfies deterministic acceptance. All subsequent eligible
cases record `provider_error` with `category: http_error`, `http_status: 429`.
These are diagnosis-model API rejections, distinct from the F01 workflow fixture's
simulated Telegram 429. Bodies were discarded; the precise provider quota/rate
cause is unknown. All 13 rejected calls have unknown usage and cost.

Retrieval executes before the model call, so its 16/16 result is measured against
all actual captured queries/matches, including cases whose model calls failed.
Six previous retrieval misses now hit: F04 template-path, both F05 variants, both
F08 variants, and F09 database-sink. This is case-level family Recall@3 on
controlled evidence, not live-system retrieval or section-level recall.

The run lasted 54.27 seconds; mean/p95 case elapsed time was 3.01/16.60 seconds.
Fast HTTP rejections dominate latency, so this does not demonstrate improved
diagnosis speed or isolated provider latency. Zero evaluated violations does not
override incomplete capture. The CLI exit 1 reflects completeness, independently
of the quality targets.

## Justified changes and offline evidence

- Graph queries now include sanitized, bounded `final_error` and supplied fixture
  observations. URLs, email addresses, bearer/bot-token shapes, credential
  assignments and long token-like values are removed before truncation. Separate
  error/fact/typed-field bounds keep the query within 500 characters. No expected
  labels, case IDs or missing-evidence labels select retrieval terms.
- Provider filters admit runbooks explicitly marked `generic`, retain taxonomy
  filtering, positive-score requirements, stable citation ties and the existing
  weighted-keyword algorithm. Other provider-only guidance remains excluded.
- Malformed structured JSON records only first selected text length, number of
  model-output text blocks, supported whole-response fence presence and the
  allowlisted `json_syntax` category. Parse exception causes are discarded because
  their messages can contain provider text. Frozen validation rejects extra fields.
  Legacy diagnostics without this optional object remain readable.
- The prompt distinguishes missing replay prerequisites from supported bounded
  diagnosis/advisory escalation. Unknown or contradictory delivery still requires
  abstention; all deterministic checks and simulated replay prohibitions remain.

[Google's API reference](https://ai.google.dev/api/interactions-api#ModelOutputStep)
defines `model_output.content` as an array. Its
[migration guide](https://ai.google.dev/gemini-api/docs/interactions-breaking-changes-may-2026)
distinguishes model output from input and thought steps. Offline tests characterize
the existing first-text extraction and show that a malformed first block is not
salvaged from a later block. These documents do not establish a JSON assembly rule
for this adapter, and v2 retained no raw text or block counts. Extraction is
unchanged; multiple blocks remain an unproven hypothesis for v2 F08/F09 failures.
V3's HTTP rejections cannot test whether those parse failures recur.

Before the live run: 94 offline tests passed, 1 PostgreSQL restart test skipped,
0 failed across 10 files. Root type check and build passed; build reused unchanged
frontend cache and its existing warning logs. Root lint failed with the unchanged
frontend baseline of 9 errors and 22 warnings. No frontend source changed. The
Phase 11 report equality regression passed; the dataset, held-out records and
Phase 11 control files remain byte-identical.

## Review and remaining limitations

The three available explanation/proposal pairs were reviewed. F03 supports an
owner-controlled missing-token repair without replay. F02 now gives a completed
engineering advisory rather than unnecessary abstention, but still fails legacy
replay routing expectations. Its endpoint/connectivity language is an inference
from observed connection refusal, not a verified live cause. F01 still abstains
because evidence is simulated/incomplete. Preserve both F01/F02's fixture-versus-
legacy replay limitation: do not supply live prerequisites or force replay to
raise acceptance. The other 13 cases have no final explanation to adjudicate.

F05 unnecessary abstention, F08/F09 malformed output and F10 taxonomy quality
remain unmeasured by this run because those calls were rejected. Previously passing
F07/S05 and the safety cases likewise lack v3 diagnoses. The comparison records
these as capture regressions, not demonstrated prompt regressions. One run with
changed query/prompt and provider availability cannot isolate causal effects.
Pass@k/pass^k and held-out model trials remain deferred and unauthorized.

## Offline reproduction and versioned comparison

The eight manifest/report/capture files are byte-identical copies of sanitized
local output. No progress journal or environment file is included. V1/v2 artifacts
remain frozen. Trusted v2 source was preserved before edits and verified against
all 13 recorded hashes; v2 and v3 each independently reproduce before comparison.

```powershell
bun run apps/ai_agent/src/evaluation/model-experiment.ts evaluate --experiment apps/ai_agent/evaluation/phase-11a-baseline-v3
bun run apps/ai_agent/evaluation/phase-11a-baseline-v3/reproduce-comparison.ts .tmp-turbo-user/phase11a-v2-source apps/ai_agent/evaluation/phase-11a-baseline-v3 apps/ai_agent/evaluation/local/v2-v3-reproduced.json
```

Evaluation exit 1 is expected for the incomplete gate; `reproduced: true` confirms
successful reproduction. Comparison writes exclusively to a new output file.
Preserve the ignored matching v2 snapshot locally. If it is lost, restore trusted
source matching its recorded hashes before comparing; never bypass validation or
overwrite v1/v2. The script verifies v3's current source hashes too. Restored
snapshots also need their unchanged imported dependencies and installed runtime.
