# R4.5 protocol amendment 1 — quota continuation

**Status:** `frozen_before_further_generation`
**Registered:** 2026-10-21T21:10:30+05:30
**Run:** `r4.5-20261021-v1`
**Applies to:** `apps/ai_agent/evaluation/r4/diagnosis/`
**Supersedes nothing.** `protocol.json` remains the frozen protocol and is not edited by this amendment.

## Why this amendment exists

The first execution stopped after 3 of 40 cases:

| Item | Value |
| --- | --- |
| Completed | 3 (all F01) |
| Failed | 37, every one with **zero generations** |
| Generation calls consumed | 3 |
| Safety violations | 0 |
| Recorded decision | `blocked` — `provider_or_quota_failure` |

Provider response at the time of the failure:

```
Quota exceeded for metric:
generativelanguage.googleapis.com/generate_content_free_tier_requests
limit: 20, model: gemini-2.5-flash
quotaId: GenerateRequestsPerDayPerProjectPerModel-FreeTier
retryDelay: ~56169s
```

`countTokens` continued to return 200, so only the generation quota was exhausted. The key had roughly three generation requests left when the run started.

**Consequence:** R4.5 requires 40 generation calls and the tier allows 20 per day. The phase cannot complete in a single day on the attested free tier, even with an untouched key.

## Binding rules

1. Only a case that produced **zero generations** may be attempted again.
2. The three completed F01 cases (`f01-digest-broadcast-chat-flood`, `f01-group-slow-mode-reminder`, `f01-channel-resolution-throttled`) are reused exactly as recorded and are never regenerated.
3. A case that generated at least once and then failed is `blocked`, never retried. It is not silently regenerated.
4. `generationCallsPerCase = 1` and `schemaRepairsPerCase = 1` continue to apply per case, across all days. The caps are per case, not per attempt.
5. At most 20 generation calls are scheduled per provider quota day. A `429` that survives the three allowed availability retries halts the run instead of consuming the rest of the allowance.
6. Unchanged and still frozen: the subset (`02a26f32…`), prompt `phase-11a-v3`, model `gemini-2.5-flash`, graph `phase-6-v1`, contracts, acceptance gates, rubric, packet seed `r4.5-review-v1`, and the 8-position double-label rule.
7. The budget remains free tier, `$0` ceiling, no paid fallback, no billing change.
8. Reviewers see only the **complete 40-item** packet. The current 3-item packet is a partial artifact and must not be reviewed, scored, or cited as evidence.
9. No prompt, retrieval, or rubric tuning may occur between continuation days.

## Harness changes (scaffolding, not measurement parameters)

These do not alter the frozen serving path (`prompts.ts`, `graph.ts`, `gemini-model.ts`, `contracts.ts`) and are confined to `src/evaluation/diagnosis-r4.ts`:

- **429 retries moved outside the 45s model timeout.** Previously the 30s backoff ran inside the timed generation, so the timeout fired mid-backoff and abandoned the request, which then kept retrying in the background (71 retries observed). Retries are now case-level availability retries, which the protocol already permits because a rejected request produces no generation.
- **Resume semantics corrected.** Resume previously treated any recorded case, including failed ones, as finished. It now reuses only `completed` cases, retries only zero-generation failures, and rejects a case that generated and then failed.
- **Artifact rewriting on resume.** `report.json`, `review-packet.json`, `review-v1.json`, `raw.json`, `decision.md`, and `manifest.json` are rebuilt over the full schedule instead of failing on `EEXIST`. A resume refuses to overwrite a review once any field is filled.
- **Quota circuit breaker.** A `429` surviving the allowed retries halts the run and records `haltedOnQuota`.
- **Rendering fix.** `reviewCoverage` threshold now renders as `40`, not `4000.00%`.

The resume path was exercised against a copy of this run with an injected fake model that made no provider calls. The sealed directory was not modified by that test.

## Resume procedure

1. Probe once that quota has returned (a single `generateContent` call returning 200).
2. Run:

   ```
   cd apps/ai_agent
   bun run src/evaluation/diagnosis-r4.ts --resume
   ```

3. Expected split: up to 20 generation calls on the first day. If the run halts on quota, repeat step 1–2 after the next reset. Remaining cases are never regenerated.
4. When `report.json` shows `completed: 40` and `review-packet.json` has 40 items, the run is ready for the two human reviewers.

## Recorded hashes

| Artifact | Hash |
| --- | --- |
| `protocol.json` | `27dffcb33d19b1745be366130a5d8ab8730bf7cdca3b1cbba620019779d34fc2` |
| `diagnosis-subset-v1.json` | `02a26f320afe95d02ab13eecceb6536bf220756680ae5aaba220529360659e40` |
| `src/evaluation/diagnosis-r4.ts` (post-fix) | `7a3a47383f79b8fb0ff7f7376e03732e5f6466289b22f3b21b59e9b716878c26` |

## Stop rule (unchanged)

If diagnosis acceptance fails, do not change retrieval to chase the diagnosis score. Open a separate diagnosis scope. Promotion requires both `retrieval_accepted` and `diagnosis_accepted`.
