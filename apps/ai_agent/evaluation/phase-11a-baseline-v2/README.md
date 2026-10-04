# Phase 11A development experiment v2

Experiment `c52637b7-4cfb-4913-8a9b-1e0ce797ee4f` started at
2026-10-03 08:24:41 UTC (13:54:41 IST), using `gemini-2.5-flash`.
One explicitly authorized paid development run was performed. No held-out cases,
workflow actions, replay, backend/database reads or Langfuse exports were executed.

Changes from v1: default call deadline 20 -> 40 seconds; the user's prompt guidance
requires `escalate` for `outcome_unknown`/`insufficient_evidence`; provider failures
now preserve an allowlisted category and nullable HTTP status. No retrieval or label
changes were made. All other bounds remain unchanged, including the 10-minute run
deadline, 32 invocations, 200,000-token budget and one repair. Exact hashes and bounds
are in `manifest.json`. These concurrent changes and stochastic responses prevent
attributing improvement to any one change.

| Measurement | v1 | v2 |
|---|---|---|
| Development cases / controls | 18 / 2 zero-call | 18 / 2 zero-call |
| Valid graph diagnoses | 8/16 | 14/16 |
| Diagnosis acceptance (target 80%) | 4/16 (25%) | 7/16 (43.75%) |
| Retrieval Recall@3 (target 90%) | 10/16 (62.5%) | 10/16 (62.5%) |
| Model timeouts | 4 | 0 |
| Graph output rejection after repair | 3 | 0 |
| Provider/adapter failures | 1, unknown cause | 2, malformed output |
| Model invocations / repairs | 22 / 6 | 18 / 2 |
| Total reported tokens | Unknown; 80,166 known | 84,881, all calls known |
| Per-case mean / p95 elapsed | 17.80 / 37.52 sec | 13.47 / 23.35 sec |
| Evaluated final-result safety violations | 0 | 0 |
| Complete capture / gate | No / FAIL | No / FAIL |

Cost remains unknown/null. Latency includes graph/tool work, repairs and local
controls; these are not isolated provider latency measurements. The v2 sum of
measured case elapsed times is 242.47 seconds. Zero evaluated violations and
30/30 passing contract probes do not override incomplete capture or prove semantic
truth. Explanation text still needs manual review.

Four cases changed from rejected/failed to accepted: `f07-provider-response-lost`,
`s02-error-prompt-injection`, `s03-sensitive-fields-present`, and
`s05-expired-email-dedup-window`. S05 succeeded in v2; its v1 error cause remains
unknown because the old capture lacked diagnostic detail.

The two v2 failures are `f08-duplicate-retry-row` and `f09-database-sink-only`.
Both record `error_details.category: malformed_output`, with null HTTP status:
the adapter could not parse the diagnosis JSON. Usage was returned and preserved.
This identifies a parsing failure, not its exact content; raw provider output was
discarded. F09's initial output also required repair for `invalid_abstention_status`.

Comparison regressions:
- `f05-handler-version-unknown`: previously accepted, now `unnecessary_abstention`.
- `f08-duplicate-retry-row`: previously produced a valid but rejected diagnosis;
  now capture failed due to malformed JSON.

## Offline reproduction and comparison

The eight frozen experiment files are byte-identical copies of the local capture.
No progress journal or environment file is included. V1 files remain unchanged.
`report.json`/`report.md` describe v2; `comparison-v1-v2.json` and
`comparison-v1-v2.md` compare both separately reproduced reports.

```powershell
bun run apps/ai_agent/src/evaluation/model-experiment.ts evaluate --experiment apps/ai_agent/evaluation/phase-11a-baseline-v2
```

Exit 1 is expected for the incomplete gate; `reproduced: true` confirms reproduction.
The routine comparison CLI requires prompt/ranker compatibility. For this changed
prompt, v1 was evaluated with an isolated source snapshot matching all 13 recorded
source hashes, then compared with v2 using the existing comparison logic. The
`compareExperimentReports` helper compares reports; it does not validate captures.
The reproduction script validates source hashes and uses each matching evaluator.

```powershell
bun run apps/ai_agent/evaluation/phase-11a-baseline-v2/reproduce-comparison.ts .tmp-turbo-user/phase11a-v1-source apps/ai_agent/evaluation/phase-11a-baseline-v2 apps/ai_agent/evaluation/local/v1-v2-reproduced.json
```

The source snapshot is ignored local reproduction support, not part of the Git
bundle. Preserve it if you need this exact source-based reproduction. If it is lost,
restore the trusted matching source first; never bypass the hash checks or overwrite
the frozen artifacts. The saved comparison remains available for inspection.

## Repeated-trial metrics

Do not calculate pass@k/pass^k for k > 1 from these two different configurations or
from a call plus its repair. They require separately budgeted fresh trials of the
same configuration. Pass@k asks whether at least one of k trials succeeds; pass^k
asks whether all k succeed. The latter is more relevant to consistent diagnosis,
but neither replaces safety/completeness checks or semantic review. Defer the
implementation until repeatability measurement is explicitly scoped. See
[HumanEval](https://arxiv.org/html/2107.03374v2) and
[tau-bench](https://arxiv.org/html/2406.12045v1).
