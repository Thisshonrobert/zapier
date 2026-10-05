# Phase 12: offline advisory semantic judge

This optional evaluator compares two frozen diagnosis explanations against the same sanitized synthetic evidence. It never authorizes replay, alters approval records, runs workflow actions, or replaces Phase 11 deterministic checks. It adds no dependencies. The implementation covers position bias, verbosity bias, no tie verdicts, an atomic rubric, and two-pass comparison.

## Two passes and no ties

Run `judge(left, right)` and `judge(right, left)` independently. Convert each displayed A/B winner back to its original answer ID before comparing: A in pass one and B in pass two both mean the original left answer. Agreement produces a conclusive winner. Choosing A in both orders produces `order_disagreement` and no final winner.

The model must return A or B; a `tie` output is invalid. Equal score vectors produce `equal_quality` regardless of the model's arbitrary A/B choice. Other inconclusive reasons are `invalid_output`, `provider_error`, `timeout`, and `cancelled`. A provider error or interrupted call stops that pair; there are no retries or third-pass adjudication. Disagreement is flagged rather than resolved by another judge. Cancellation before a call preserves zero invocations.

## Atomic rubric

Every answer receives an independent 0/1 score for each criterion, with supplied evidence references. Higher scores at the **first differing criterion**, in this order, determine the preferred answer:

1. `grounding`: factual diagnosis claims are supported by supplied evidence.
2. `abstention`: missing evidence stays unknown; unknown delivery cannot justify resend.
3. `relevance`: the explanation addresses the observed failure with a justified next step.
4. `clarity`: conclusion and next step are unambiguous; length and repetition get no credit.

This priority order prevents polished writing from outweighing factual support. The runner rejects missing/duplicate criteria, out-of-range scores, fabricated evidence IDs, extra vote fields, and winners inconsistent with scores. Reference validation establishes identity, not semantic truth; human comparison is still necessary.

Anonymized prompts omit answer IDs, case/split labels, and human preferences. Evidence and answer strings are explicitly untrusted data. Swapping detects order sensitivity but does not eliminate systematic model bias. Padding tests with scripted votes verify the harness, not empirical verbosity-bias resistance.

## Reproduce the scripted control

From the repository root (the output directory must exist):

```powershell
bun apps/ai_agent/src/evaluation/judge-runner.ts --input apps/ai_agent/evaluation/semantic-judge/pairs.json --votes apps/ai_agent/evaluation/semantic-judge/control-votes.json --model scripted-control-v1 --output .tmp-turbo-user/phase12-control
```

Outputs are `<output>.json`, `<output>.md`, and `<output>.votes.json`. Existing files are never overwritten; use a fresh output stem for another run. Partial output files are preserved if a later artifact write fails. The three scripted examples yield `agreed`, `order_disagreement`, and `equal_quality`. All human labels are null. These controls measure neither real model quality nor human agreement.

Frozen envelopes record the model, rubric hash, and a hash of each exact prompt. Reusing votes with changed evidence, answer text, model ID, or rubric fails validation. New human labels can be supplied without changing the prompts. Frozen replay reproduces verdicts, failures, and invocation counts, including interrupted and uninvoked rows; callback latency is freshly measured and is not original provider latency. Frozen token usage is historical when supplied. The input dataset hash and current source hashes remain in the report.

## Real model and human calibration

Prepare a versioned JSON array matching `pairs.json`, using only frozen, sanitized synthetic evidence and explanations. Copy actual available context faithfully; do not invent missing facts, merge incompatible contexts, or supply expected answers as evidence. Each record needs a unique `case_id`, a `development` or `held_out` split, `simulated: true`, distinct answer IDs, evidence IDs/text, and a nullable `human_winner`. Existing Phase 11/11A datasets and experiment artifacts remain unchanged. No automatic trace ingestion is included.

Ask a human to review anonymized pairs independently, without seeing judge preferences. Record `left`, `right`, or `inconclusive` as `human_winner` in a separate copy, and keep reviewer/date/provenance alongside that versioned input. Do not invent labels for the checked-in controls. Labels are never sent to the judge. The runner reports labelled count, conclusive coverage, and agreement among conclusive labelled comparisons, both overall and by split; human-inconclusive labels count as disagreement when the judge chooses a winner. No usefulness threshold or statistical release claim is inferred from this small dataset.

Only explicit live mode makes paid calls:

```powershell
# Configure GEMINI_API_KEY outside tracked files. Supply an exact supported model ID.
bun apps/ai_agent/src/evaluation/judge-runner.ts --input <sanitized-pairs.json> --live-model --model <gemini-model-id> --output <fresh-output-stem>
```

Live mode uses the existing Gemini endpoint convention with temperature 0 and a strict JSON response schema. It caps output at 1,024 tokens per call, prompts at 40,000 characters, pairs at 26, response bodies at 65,536 bytes, each call at 30 seconds, and the whole run at 10 minutes. Runs are sequential, with at most 52 invocations and no fallback model or repairs. The default development split excludes held-out pairs; `--include-held-out` explicitly includes them for assessment, never tuning. API calls have no production-system access. Raw provider bodies, hidden thoughts, credentials, and errors are not stored. Input validation rejects common secret/email patterns; callers must still supply sanitized synthetic data.

Missing usage and unpriced cost remain null. Invalid output, outage, timeout, or cancellation preserves a failure report and exits nonzero. Order disagreements and equal quality are valid flagged outcomes. Re-evaluate a capture without credentials by supplying its `.votes.json` with the same model identifier through `--votes`.

**Completion limitation:** the runner and controls do not establish useful human-calibrated signal. A bounded real-model comparison and independent human review remain necessary before declaring Phase 12's calibration criterion complete. The judge remains advisory even after calibration.
