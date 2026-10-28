# R4.5 protocol amendment 2 — 503 availability retry

**Status:** `frozen_before_further_generation`
**Registered:** 2026-10-26T13:42:12+05:30
**Run:** `r4.5-20261021-v1`
**Applies to:** `apps/ai_agent/evaluation/r4/diagnosis/`
**Supersedes:** only `protocol.json` `schedule.availabilityRetry.appliesTo` (`"HTTP 429 only"`) and amendment 1's 429-only wording for the retry and the circuit breaker. `protocol.json` is not edited. Everything else in amendment 1 still applies.

## Why this amendment exists

The first continuation day (2026-10-26) generated 6 new cases (9/40 completed). Then the provider rejected requests:

| Item | Value |
| --- | --- |
| Completed after the day | 9 (F01 ×3, F02 ×3, F03 ×1, F04 ×2) |
| New generations | 6, all schema-valid on the first attempt, 0 repairs |
| HTTP 503 rejections | 6 cases (`f03-telegram-revoked-bot-token`, `f03-email-api-key-rejected`, `f04-telegram-null-ticket-summary`, `f05-unregistered-discord-webhook`, `f05-telegram-v2-seed-mismatch`, `f05-teams-card-legacy-run`) |
| HTTP 429 halt | `f06-stage-order-collision`, after 3 availability retries |
| Safety violations | 0 |

Every 503 case recorded **zero generations**. A 503 (provider overloaded) rejects the request in the same way a 429 does: it produces no generation and is unrelated to the prompt, retrieval, or case content. Under the frozen protocol a 503 fails the case at once instead of getting the availability retry. That wastes requests from the 20-per-day free-tier allowance and stretches the run across extra quota days. It does not change what is measured.

## Binding rules

1. HTTP **503** receives the same case-level availability retry as HTTP 429: `maxRetries = 3`, `backoffMs = 30000`, outside the 45 s model timeout, not counted as a generation.
2. An availability retry is allowed **only while the case has zero recorded generations**. A 429 or 503 on a schema-repair call (after the first generation) is never retried. The case fails as generated-then-failed and is `blocked` under amendment 1 rule 3. This closes a pre-existing gap: the 429 path could re-run the whole diagnosis after a successful first generation and violate `generationCallsPerCase = 1`.
3. A 429 or 503 that survives the allowed retries halts the run (`haltedOnQuota = true`; the field name is kept for report-shape stability and now means "provider quota or availability").
4. Other HTTP statuses (400, 500, …), timeouts, and network errors are unchanged: no retry.
5. The six 503 cases and the 429 case above have zero generations, so they are eligible for retry under amendment 1 rule 1.
6. Unchanged and still frozen: subset, prompt `phase-11a-v3`, model `gemini-2.5-flash`, graph `phase-6-v1`, contracts, gates, rubric, packet seed, double-label rule, free tier, `$0` ceiling, at most 20 generation calls per quota day, and no prompt, retrieval, or rubric tuning between days.
7. The 9 completed cases are reused exactly as recorded and are never regenerated.

## Harness change (scaffolding, not a measurement parameter)

The change is confined to `src/evaluation/diagnosis-r4.ts`. The frozen serving path (`prompts.ts`, `graph.ts`, `gemini-model.ts`, `contracts.ts`) is untouched, and the runner's source-hash guard still enforces that.

- New pure helper `availabilityRetryable(error, generatedThisCase)`: true only for `ModelProviderError` with `http_status` 429 or 503 and no generation yet for the case.
- The case retry loop and the circuit breaker use this helper instead of the inline 429 check.

Tests in `tests/diagnosis-r4.test.ts` (`availability retry (amendment 2)`): they failed before the change (missing export) and pass after it. `bun test tests/diagnosis-r4.test.ts` → 29 pass, 0 fail; `bun run check-types` → pass.

## Resume procedure (unchanged)

After the provider quota day resets (midnight Pacific; 12:30 IST):

```
cd apps/ai_agent
bun run src/evaluation/diagnosis-r4.ts --resume
```

Repeat on each later quota day until `report.json` shows `completed: 40`. Do not kill the process mid-case: a case that started without finishing makes the next resume refuse to run (`run_interrupted_mid_case`).

## Recorded hashes

| Artifact | Hash |
| --- | --- |
| `protocol.json` | `27dffcb33d19b1745be366130a5d8ab8730bf7cdca3b1cbba620019779d34fc2` |
| `diagnosis-subset-v1.json` | `02a26f320afe95d02ab13eecceb6536bf220756680ae5aaba220529360659e40` |
| `src/evaluation/diagnosis-r4.ts` (amendment 1) | `7a3a47383f79b8fb0ff7f7376e03732e5f6466289b22f3b21b59e9b716878c26` |
| `src/evaluation/diagnosis-r4.ts` (amendment 2) | `1043bdade4c8ffbbda39ea391c364563652526661756c124219f520c7b424e24` |
| `raw.jsonl` at registration | `1c46c2483f2a27295ee23dcac777616d33c014b129afc6f150fa7c2536cdcde7` |

## Stop rule (unchanged)

If diagnosis acceptance fails, do not change retrieval to chase the diagnosis score. Open a separate diagnosis scope. Promotion requires both `retrieval_accepted` and `diagnosis_accepted`.
