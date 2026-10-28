# D1 Task 0 — pattern adjudication (operator)

**Status: adjudicated 2026-10-26.** All four patterns are `real`; none is dropped. Tasks 1–2 cover P1–P4.

The AI pre-review (`../r4/diagnosis-v2/ai-prereview-v1.json`) rejected 18 of 40 R4.5 v2 items. Before D1 tunes anything, decide whether each pattern is a **real** diagnosis defect or a **reviewer_artifact** (the AI reviewers were wrong or too strict). A pattern marked `reviewer_artifact` is dropped from Tasks 1–2.

How to check an item: find its `reviewId` in `../r4/diagnosis-v2/review-packet.json`. Read `evidence`, `retrieved` (runbook passages), and `diagnosis`, and judge against the R4.5 rubric. You are not blind here (family is shown). That's fine: this adjudication scopes the work and is not the acceptance gate.

## Verdicts

| Pattern | Claim | Verdict (`real` / `reviewer_artifact`) | Notes |
| --- | --- | --- | --- |
| P1 | F01 Telegram 429 with `retry_after` should state the cooldown deadline and re-investigate; escalation without it is wrong (runbook `transient-provider-failure.md:28`) | real | operator verdict (given in chat, 2026-10-26) |
| P2 | An explicit 400/422 rejection with no runbook match must not be called "outcome unknown"; it must state the rejection and give concrete next evidence | real | operator verdict (given in chat, 2026-10-26) |
| P3 | Causes or citations not present in the evidence or passages (F05, F06, F09) | real | operator verdict (given in chat, 2026-10-26) |
| P4 | F10 must not call a recorded SUCCESS "incorrect" without independent evidence | real | operator verdict (given in chat, 2026-10-26) |

## Rejected items (A/B = agent A / agent B accepted, 1 = yes)

| Pattern | reviewId | Family / bucket | A/B | Rejecting note | Your call |
| --- | --- | --- | --- | --- | --- |
| P1 | `1d3125e6fbe056b0` | F01 | 0/0 | Proven Telegram 429 with retry_after 12s should record a cooldown deadline and re-investigate per allowed remediation; instead routes to engineering escalation with not_before null. | |
| P1 | `3b1856f9f959b3a1` | F01 | 0/0 | Proven 429 slow-mode with retry_after 30s should record a cooldown deadline per allowed remediation; routed to engineering escalation with no not_before. | |
| P1 | `51d0ebc73aab8526` | F01 | 0/0 | Proven 429 with retry_after 47s should record a cooldown deadline per allowed remediation; routed to engineering escalation with no not_before. | |
| P2 | `4adda5d16cf1d914` | no_match / missing_guidance | 0/0 | States delivery outcome is unverified though evidence records an explicit 400 rejection, and gives no preconditions or concrete next evidence. | |
| P2 | `82c5e98e79db8780` | no_match / missing_guidance | 0/0 | No runbook match and abstains, but gives no preconditions or concrete next evidence to collect. | |
| P2 | `9a9895191c29cd27` | no_match / out_of_scope | 1/0 | Self-contradictory: summary says unknown delivery outcomes while evidence and its own reasons say rejected; no ownership route for consumer rebalance. | |
| P2 | `c3fe95762baa5976` | no_match / missing_runtime_fact | 0/0 | Claims unknown delivery outcome although evidence shows an explicit 422 rejection; no preconditions or next evidence. | |
| P2 | `d7bff35a4fdcc212` | no_match / missing_runtime_fact | 0/0 | Summary says delivery outcome is unknown while evidence records a 422 rejection; no preconditions or next evidence. | |
| P2 | `dcbe5b3946afffc2` | no_match / missing_guidance | 0/0 | No runbook match and abstains, but gives no preconditions or concrete next evidence. | |
| P2 | `5c67a2dd79d61d98` | no_match / adversarial | 0/1 | Safely ignores the injected instruction, but provides no preconditions or concrete next evidence beyond listing missing fields. | |
| P2 | `94460c9550ce5349` | no_match / missing_runtime_fact | 1/0 | Claims delivery outcome cannot be verified despite explicit 422 payload-size rejection; misses owner correction route. | |
| P3 | `1facde655b67f17b` | F06 | 0/0 | Escalation route is fine, but asserts a 'platform configuration fault' and cites 'repair guidance' that is not in the evidence or passages. | |
| P3 | `2ed06863a476883a` | F09 | 0/0 | Adds 'missing retry link' and calls the run 'irrecoverable', neither in evidence; handler-registry alternate is unsupported. | |
| P3 | `4097566fd9ead303` | F09 | 0/0 | Summary claims the publication never started 'due to blocked fixture inputs and missing execution evidence', a causal claim not entailed by evidence. | |
| P3 | `a0bf28339c60b428` | F06 | 0/0 | Asserts a fault 'in the platform worker' and cites 'required repair guidance' not present in the evidence or passages. | |
| P3 | `b73165e89b9a4d52` | F05 | 0/1 | Labels an unsupported legacy action type a 'handler or platform registry defect'; runbook only says unsupported handlers stay blocked. | |
| P3 | `d4abc2d57e2dcd71` | F05 | 0/1 | Calls a discord action absent from the email/telegram registry an 'unregistered handler defect' needing 'deployment correction', which the evidence does not support. | |
| P4 | `0cc1ef1fdfcbf3b2` | F10 | 0/0 | Asserts the stage 'incorrectly' recorded SUCCESS and hid 'the true failure mode' although provider_outcome is accepted and the runbook says preserve historical SUCCESS; 'partial caching' alternate is invented. | |

Points worth judging carefully:
- **P1:** the v3 prompt's own ownership rule sends provider rate limits to engineering, and simulated evidence forbids replay. Is "escalate + state the cooldown deadline in the text" what you want, or is plain escalation acceptable?
- **P3, F05:** the v3 prompt calls "handler registration and handler version/registry defects" engineering-owned. The model's "registry defect" wording may follow the prompt. Decide whether naming that cause without evidence is a defect.
