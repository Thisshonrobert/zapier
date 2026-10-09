# R2.5 bounded recovery

This is an explicit successor to the stopped continuation, not a change to its guard. Production retrieval, the MiniLM freeze, section representations, Gemini prompt and generation settings remain unchanged. Existing fresh scenarios and labels are not read by recovery or used for tuning.

## Policy verified before inference

`r25-recover.ts` reuses `generateR25` and validates the original source hashes, continuation guard hash, input hash, both immutable failure captures, progress journals and partial report. All 36 successful selections are reused. The two historical failed questions each receive at most one additional attempt; 58 previously unattempted questions can each receive at most two attempts. Only HTTP 500/502/503/504 and network/deadline failures permit the second attempt. Invalid responses stop immediately. Failures never become empty selections.

- New attempts: at most 72; cumulative historical plus recovery upper bound: 110.
- New HTTP requests: at most 144; cumulative upper bound: 220. Each attempt uses token counting and at most one generation request. The HTTP journal records requests started and statuses, without API keys or raw response bodies.
- Conservative reservation: 20,000 tokens per attempt, including the 4,096-token output limit. New reservation cap: 1,440,000; cumulative upper bound: 2,200,000. Failed usage remains unknown.
- Serial attempt starts: at least 30 seconds apart; retry starts: at least 60 seconds apart. Combined token-count/generation deadline: 60 seconds per attempt. Run deadline: one hour, reserving the final request deadline before starting.
- At most six failed attempts. An exhausted question retry limit stops the run. Any HTTP 429 stops immediately, including token-count failures. There is no automatic subsequent run, quota reset wait, provider fallback or billing change.
- The exact configured model must match the original manifest (`gemini-3.5-flash-lite`). Cost is unknown; user-declared free tier does not verify billing. Quotas depend on the project and tier: [Google rate limits](https://ai.google.dev/gemini-api/docs/rate-limits). Transient error classification follows [Google troubleshooting](https://ai.google.dev/gemini-api/docs/troubleshooting).

The preview manifest and runner source hash must match before live inference. Historical top-level budget fields retained in the manifest describe the earlier pilot; `recoveryPolicy` and the explicit cumulative bounds govern this successor. New output directories must not exist, and artifacts use exclusive creation. Existing captures are never rewritten.

## Comparison and decision rules

Both methods use exactly the exhaustive control's eligible candidate list per question, at most three selections and an explicit empty result. Only question text and section citations/text reach Gemini; labels, splits, scores and previous selections are not in the inference payload. Scoring loads labels and MiniLM scores after inference stops. Audited labels are the primary diagnostic comparison; original labels are also reported.

Complete metrics are reported only for fully available splits. Incomplete splits report successful-only metrics, the identical-query MiniLM comparison, unavailable question IDs, and availability-adjusted recall separately. Provider failure is never treated as no-match abstention or answerable abstention. Token usage, failed attempts, attempt latency, successful request latency and total wall time are reported separately. Historical request counts remain upper bounds.

Before inspecting recovery scores, the decision gate is: further independent validation requires a complete comparison, at least five percentage points improvement in audited overall recall, no regression in overall no-match abstention, and at least 95% query availability. A reused held-out improvement alone is diagnostic. This gate does not tune inference; it decides whether another experiment is warranted. No production adoption follows from this gate or from 100% candidate coverage.

If that gate passes, freeze the exact candidate method and its provenance before authoring any new independent scenarios, then test fresh retrieval and semantic downstream diagnosis. The previously evaluated fresh set cannot support new tuning or confirmatory validation. Existing downstream checks verify recorded-output contracts and safety only. Failure of the gate, incomplete comparison, or absent fresh semantic validation means retain production retrieval and report the remaining limits.

## Commands

Prepare a new preview (zero API calls):

```powershell
rtk proxy bun apps/ai_agent/src/evaluation/r25-recover.ts --output <new-preview>
```

Run only the verified preview with the configured environment:

```powershell
rtk proxy bun --env-file=apps/ai_agent/.env apps/ai_agent/src/evaluation/r25-recover.ts --prepared <new-preview> --output <new-run> --live
```

Verify a completed or cleanly stopped capture offline (`--output` is a required name but replay creates no directory):

```powershell
rtk proxy bun apps/ai_agent/src/evaluation/r25-recover.ts --output unused --replay reasoning-recovery-v1
```

Do not blindly restart a stopped run. Inspect its journals and stop reason first. Any further recovery would require a separately defined and verified policy, preserving these results.
