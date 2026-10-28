# R4.5 protocol amendment 3 — additional free-tier credentials

**Status:** `frozen_before_further_generation`
**Registered:** 2026-10-26T13:59:44+05:30
**Run:** `r4.5-20261021-v1`
**Supersedes nothing.** `protocol.json`, amendment 1, and amendment 2 still apply.

## Change

The operator supplied two further Google AI Studio API keys from separate accounts. The operator attests both are free tier. The run continues on the same day: key 1 resumes until a quota/availability halt, then key 2 resumes the remaining cases.

## Binding rules

1. Same model (`gemini-2.5-flash`), prompt, graph, contracts, subset, gates, and harness (`diagnosis-r4.ts` sha256 `1043bdad…4e24`). Only the credential changes.
2. Each key gets at most 20 generation calls per quota day, the free-tier limit of its own project.
3. Free tier only: `$0` ceiling, no billing change, no paid fallback.
4. Credentials are passed via the process environment only. They are never written to the repository or to run artifacts.
5. Which key produced a generation is not recorded. The key is an availability parameter, not a measurement parameter.

## Recorded state at registration

| Artifact | Hash |
| --- | --- |
| `raw.jsonl` | `1c46c2483f2a27295ee23dcac777616d33c014b129afc6f150fa7c2536cdcde7` |
| Completed cases | 9/40 |

## Outcome (2026-10-26)

Key 1 resumed the run and every one of the 31 remaining cases failed with HTTP 404, with zero generations. A direct `countTokens` probe with each key returned:

> This model models/gemini-2.5-flash is no longer available to new users.

Both new accounts are refused the frozen model. No generation was produced, so all 31 cases stay eligible for retry under amendment 1 rule 1. Key 2 was not run. These credentials cannot serve this run. Continuation uses the original key after its quota resets.
