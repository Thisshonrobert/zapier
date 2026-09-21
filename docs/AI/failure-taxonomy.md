# DLQ failure taxonomy and investigation requirements

Status: proposed AI-layer requirements, based on code inspected at `22da39e` on 2026-09-18. No remediation or replay implementation is implied by this document.

Read the [master plan](../ai-dlq-master-plan.md) for phases and tool contracts, and the existing [worker](../worker.md), [actions](../actions.md), [Kafka](../kafka.md), and [idempotency](../idempotency.md) documentation for the foundation. Code takes precedence where those documents overstate guarantees.

## Evidence that actually exists

- `ZapRunRetry`: `id`, `zapRunId`, `stage`, `attempt`, `lastError`, `nextRunAt`, `createdAt`. A row represents an exhausted failure record, not one record per attempt. `nextRunAt` defaults to now; there is no scheduler consuming it.
- Kafka dead letter: `zapRunId`, `stage`, `attempt`, `error`, `failedAt`. There is no shared failure ID with the database row, original source offset, action snapshot, or provider response ID.
- `ZapRunExecution`: one mutable row per `(zapRunId, stage)`, with status, lease, creation and completion timestamps. It is not an attempt history and has no ownership relation or fencing token.
- `ZapRun.metadata`: original stored trigger payload. The worker reads the current Zap action definition; it does not retain an immutable execution-time action snapshot. `ZapRun` itself has no creation timestamp.
- Current action metadata and type, workflow `sortingOrder`, and ownership through `ZapRun -> Zap -> userId` are queryable. Sensitive metadata can include Telegram bot tokens and message content.
- Console logs exist but there is no indexed log store or log-search API. Provider status, request receipts, credential validity, precise retry timing, and historical configuration are generally unavailable.

Never manufacture missing evidence. Distinguish `observed`, `inferred`, `unavailable`, and `simulated`. An error substring supports a hypothesis, not proof of root cause or non-delivery. An absent retry row does not prove success.

## Safety vocabulary

- **Blocked**: evidence or invariants are insufficient. Human approval cannot override a hard block.
- **Conditional candidate**: deterministic checks could permit replay once the stated preconditions are proven. There is no safe replay path implemented today.
- **No replay**: duplicate/already successful, wrong object, invalid event, or case needing a separate engineering repair.
- **Approval**: investigations are read-only and need no per-tool approval after authorization. All replay candidates require an authorized owner's approval in the first release. Configuration/credential repairs are manual and outside agent tools. Future automatic replay needs a separate policy decision and evaluation evidence.

The four proposed model tools are `getFailureContext`, `getExecutionEvidence`, `validateActionInputs`, and `searchRunbooks`. Their precise bounded contracts are in the master plan. Case listing, auth, policy validation, approval, and replay are deterministic application functions, not model tools.

Implementation language revision: tools and agent orchestration live in the TypeScript `apps/ai_agent` service with Zod contracts and LangGraph.js. The first three tools read scoped evidence/validation responses from the existing backend; runbook retrieval stays local to the agent service. The primary backend retains authoritative worker-parser semantics, approval and replay policy. These scenario definitions remain grounded in the existing worker and do not require rewriting it.

## F01 — Telegram rate limit

- **Example failure / reachability:** `sendMessage` returns HTTP 429 for all three attempts. The handler throws; the worker calls `deadLetter`. An error during username resolution may instead be reduced to `Invalid channel username`.
- **Evidence available:** final error text, attempt count, stage, current Telegram metadata, execution state. `retry_after` might appear in the raw response string; it is not normalized.
- **Evidence required:** provider retry deadline and timestamp; whether any attempt might have been accepted; validated destination; preceding stages; current execution/configuration fingerprint.
- **Investigation steps:** inspect case and execution rows; validate resolved fields without calling Telegram; distinguish send failure from `getChat`; retrieve transient-failure guidance; identify unknown attempts; recommend waiting until a proven deadline.
- **Tool required:** all four bounded tools; no generic provider-fetch tool.
- **Possible remediation:** wait and reduce sending pressure outside the agent; propose replay only after cooldown and safety checks. Do not claim `nextRunAt` schedules it today.
- **Replay safe?** Conditional only with evidence of non-delivery for every relevant attempt. A final 429 alone is insufficient, and Telegram has no implemented provider deduplication here.
- **Human approval required?** Yes for replay; uncertainty blocks replay even with approval.
- **Evaluation:** fixture with explicit rejection of every attempt vs a fixture containing an earlier timeout. Assert cooldown enforcement and that the ambiguous case is blocked; no send tool calls.

## F02 — Provider outage or transport failure

- **Example failure / reachability:** Telegram returns 503 or `fetch` throws a connection error repeatedly. Thrown failures reach DLQ. Equivalent Resend returned errors currently fall under F10.
- **Evidence available:** final string error and mutable execution row; current action configuration.
- **Evidence required:** per-attempt delivery outcome, error phase (before request vs after send), recovery evidence, timeout history, provider deduplication validity for email.
- **Investigation steps:** separate service unavailability from invalid configuration; inspect earlier stages and gaps; retrieve transient and uncertain-delivery runbooks; abstain if recovery or delivery evidence is absent.
- **Tool required:** `getFailureContext`, `getExecutionEvidence`, `searchRunbooks`; input validation if configuration is implicated.
- **Possible remediation:** operator restores connectivity/provider availability; bounded delayed replay request after revalidation. No agent shell access or infrastructure restart.
- **Replay safe?** Conditional for proven non-delivery or verified same-request provider deduplication; otherwise blocked. A 5xx response is not universal proof of non-delivery.
- **Human approval required?** Yes for replay.
- **Evaluation:** distinguish refused-before-send, ambiguous timeout, and unknown recovery; require evidence references and `insufficient_evidence` when appropriate.

## F03 — Telegram credential or permission failure

- **Example failure / reachability:** numeric chat ID reaches `sendMessage` with a missing/invalid token (401) or inaccessible chat (403). Username resolution can mask the cause with its generic error. Repeated throws reach DLQ.
- **Evidence available:** error, current field presence, template references, whether the configured token field is empty. Worker environment fallback existence is not safely inferable from the API process environment.
- **Evidence required:** operator confirmation of corrected worker configuration and bot permissions; non-secret configuration version; delivery status of all attempts.
- **Investigation steps:** validate field structure; distinguish absent configured token from unknown environment fallback; avoid displaying tokens; retrieve credentials/destination runbook; ask for remediation evidence.
- **Tool required:** context, validation, runbook retrieval, execution evidence.
- **Possible remediation:** operator rotates/configures token or fixes bot membership/permissions. Agent never receives or writes secrets.
- **Replay safe?** Blocked until repair is verified and prior delivery uncertainty resolved; then conditional.
- **Human approval required?** Yes for repair and any later replay; credentials remain outside the approval payload.
- **Evaluation:** assert secrets are absent from prompts, traces, checkpoints, UI and fixtures; classify generic resolver errors as ambiguous rather than definitely invalid credentials.

## F04 — Invalid destination or missing template input

- **Example failure / reachability:** `{{customer.channel}}` is absent, parser substitutes an empty string, `getChat` fails; or a numeric chat destination is invalid. An empty Telegram message can produce a 400. Email validation errors can instead be hidden by F10.
- **Evidence available:** trigger payload, current templates, parser behavior, final error text.
- **Evidence required:** required-field rules, missing path list, execution-time template snapshot, intended destination and operator-approved correction.
- **Investigation steps:** deterministic template dry run; report missing paths and field types with redacted output; verify ambiguity between permissions and nonexistent destination; compare any retained configuration fingerprint.
- **Tool required:** context, input validation, execution evidence, runbook retrieval.
- **Possible remediation:** correct the producing system or author a corrected workflow/new run manually. There is no existing Zap edit API to invoke; the agent must not invent one or rewrite historical payloads.
- **Replay safe?** Repeating invalid input is not useful. A changed destination/body is a changed side effect and is excluded from initial same-input replay. Escalate to a separate reviewed repair/new-run workflow.
- **Human approval required?** Yes for configuration/data repair; hard-block changed-input replay in the initial release.
- **Evaluation:** fixtures for absent paths, null values, non-string templates, invalid destinations and valid inputs; validator matches the worker parser without calling `execute`.

## F05 — Unsupported action type

- **Example failure / reachability:** an `AvailableAction.id` does not match `email` or `telegram`. `executeClaimedAction` marks the stage `FAILED` and returns **without** calling `deadLetter`.
- **Evidence available:** FAILED execution row, current action type and registry keys, console message if retained. No guaranteed retry row or DLQ event.
- **Evidence required:** deployed handler/version mapping and whether the definition changed after failure.
- **Investigation steps:** identify this as a DLQ coverage gap; use a reconciled execution case when that support exists; compare type with supported registry; verify stage sequence.
- **Tool required:** execution evidence and input validation; context must explicitly identify a reconciled non-DLQ case.
- **Possible remediation:** engineering deployment/seed alignment, followed by a new investigation. No model-generated handler code or registry mutation.
- **Replay safe?** Blocked until the deployed handler is known and inputs are validated. Generic republish still cannot execute terminal FAILED rows.
- **Human approval required?** Yes for engineering repair and any later replay.
- **Evaluation:** assert the current unsupported-handler path produces FAILED without a retry record; later coverage tests prove the deliberately changed behavior. Agent must not claim it read a nonexistent DLQ error.

## F06 — Invalid Kafka event, missing run, or invalid stage sequence

- **Example failure / reachability:** invalid JSON throws before execution; unknown `zapRunId`, missing stage, or non-contiguous `sortingOrder` fails lookup. Empty values and missing actions return before the explicit commit. These are **not normal DLQ entries** today; later offsets can still advance the partition's committed position.
- **Evidence available:** possibly console logs and current DB state; no durable raw broker envelope through the present APIs. Action ordering has no uniqueness constraint on `(zapId, sortingOrder)`.
- **Evidence required:** validated source topic/partition/offset and envelope, producer version, original action ordering and valid owner mapping.
- **Investigation steps:** deterministic envelope validation/quarantine before the LLM; resolve ownership; reject invalid stage or ambiguous order; do not infer missing IDs or invent a user mapping.
- **Tool required:** execution evidence only for authorized resolvable cases; unknown-owner envelopes belong to restricted operational quarantine, outside tenant tools.
- **Possible remediation:** producer/schema repair or explicit quarantine disposition by an operator.
- **Replay safe?** No replay of malformed/orphaned input. A corrected event is a separate audited operation.
- **Human approval required?** Operator action required; approval is not permission to bypass validation or ownership.
- **Evaluation:** malformed JSON, negative/fractional stage, absent run, gaps/duplicate order, cross-owner IDs; no model invocation on invalid or unauthorized envelopes.

## F07 — Uncertain external delivery / expired lease

- **Example failure / reachability:** Telegram accepts a message but the response is lost; all retries throw and a DLQ entry is created. Alternatively a process dies after the send, leaving PENDING; or recording SUCCESS throws and the catch creates a failure. A crash alone may produce no DLQ.
- **Evidence available:** state/lease, final exception, deterministic idempotency-key formula. Neither handler persists provider receipt IDs or individual attempts.
- **Evidence required:** provider delivery confirmation/non-delivery, request fingerprint and first-send time, prior attempts, worker ownership/fencing evidence. Lease expiry does not establish non-delivery.
- **Investigation steps:** reconstruct known state; distinguish action error from persistence error; classify external outcome as unknown; retrieve uncertain-delivery guidance; stop replay if receipts cannot establish safety.
- **Tool required:** context, execution evidence, runbook retrieval; no send-to-test tool.
- **Possible remediation:** manual provider reconciliation and targeted worker safeguards. Preserve evidence; never delete the execution row to force retries.
- **Replay safe?** Telegram unknown outcome is blocked. Email may be conditional for the identical request/key within a verified provider deduplication window; this evidence is not captured today. Resend currently documents a 24-hour window, not indefinite protection ([provider reference](https://resend.com/docs/dashboard/emails/idempotency-keys)).
- **Human approval required?** Manual investigation required; approval cannot convert unknown delivery into proven safety.
- **Evaluation:** inject crashes before send, after send, after status write, and after lease expiry; simulate a stale worker finishing after reclamation; assert no extra provider call in ambiguous cases.

## F08 — Duplicate/stale failure or attempted replay of FAILED/SUCCESS

- **Example failure / reachability:** a retry row is investigated twice, duplicated dead letters arrive, or an operator simply republishes a terminal FAILED stage. FAILED is skipped; SUCCESS is skipped and may publish the next stage.
- **Evidence available:** retry row ID, current execution status, other retry rows for the run. No shared sink ID, replay generation, approval, or replay ledger yet.
- **Evidence required:** canonical case identity, evidence/proposal version, replay request identity and prior replay result; status at dispatch time.
- **Investigation steps:** deduplicate identical source references; read current state; distinguish delivery duplication from a new failure; reject stale approvals/proposals and already resolved cases.
- **Tool required:** context and execution evidence; replay ledger lookup becomes part of execution evidence once implemented.
- **Possible remediation:** mark investigation superseded/resolved; create at most one replay intent through deterministic code when permitted. Do not reset SUCCESS or create a fresh `ZapRun` to evade deduplication.
- **Replay safe?** No replay for SUCCESS/duplicate requests. FAILED is only a candidate through the future guarded replay path, never raw republish.
- **Human approval required?** Yes for a new eligible replay; duplicate approval is a no-op/conflict, not a second send.
- **Evaluation:** concurrent start, approve and dispatch requests; duplicated Kafka delivery; stale version; same source retry ID twice; one durable intent and no repeated side effect.

## F09 — Lost/split DLQ evidence or stalled stage publication

- **Example failure / reachability:** Kafka DLQ publication fails but `ZapRunRetry` succeeds, or the reverse; both failures are swallowed. Separately, next-stage publish can fail after SUCCESS and before offset commit. These are evidence/transport incidents, not necessarily action failures.
- **Evidence available:** whichever sink survived, execution rows, console errors if available. A successful stage may republish its successor on redelivery.
- **Evidence required:** original failure ID/envelope, publication/receipt records, reconciliation watermark, broker health, stage completion evidence. Historical evidence lost from both sinks cannot be recreated.
- **Investigation steps:** report source completeness; inspect stage status before recommending action replay; distinguish progression recovery from repeating the action; quarantine unowned records.
- **Tool required:** execution evidence and context for available authorized cases; runbook retrieval. Sink reconciliation is a deterministic service responsibility.
- **Possible remediation:** repair publishing and reconcile stored cases; preserve a durable failure record before claiming reliable triage coverage. Recover stage progression separately from action execution.
- **Replay safe?** Block action replay when evidence is missing or SUCCESS is recorded. Progression recovery requires its own deterministic ordering checks.
- **Human approval required?** Operator repair/reconciliation required; no blanket bulk replay approval.
- **Evaluation:** each sink unavailable independently and together, database failure after provider success, next-stage publish failure; assert partial/unknown evidence, no fabricated errors, and eventual visibility in the hardened path.

## F10 — Email failure reported as success

- **Example failure / reachability:** `resend.emails.send` returns `{ data: null, error: ... }`, but `sendEmail` ignores the return value. The worker may mark SUCCESS. This is a **current detection gap**, not an existing DLQ scenario for ordinary returned SDK errors.
- **Evidence available:** source behavior and SUCCESS row; the response error/receipt is discarded. The installed SDK returns structured errors for HTTP and transport failures.
- **Evidence required:** actual captured SDK result and request receipt; patched handler/error normalization for future events. Historical success must not be silently reclassified from guesswork.
- **Investigation steps:** recognize the gap; do not claim all email failures are in DLQ; reproduce with a stubbed SDK result during the evidence phase; document uncertain historical delivery.
- **Tool required:** execution evidence and runbook retrieval can explain the limitation; no existing tool can recover the discarded response.
- **Possible remediation:** targeted handler fix to inspect errors and retain safe receipt metadata, followed by tests and deployment. Preserve historical SUCCESS absent independent proof and a separate repair procedure.
- **Replay safe?** No replay on present evidence; hard-block resetting SUCCESS. Later genuine email DLQs use F01–F04/F07 policies as applicable.
- **Human approval required?** Engineering repair is reviewed; human approval alone cannot justify resending uncertain historical emails.
- **Evaluation:** structured-error SDK result must become failure after the fix; successful receipt captured safely; no email body/API key leakage; no replay recommendation from the old SUCCESS flag.

## Cross-cutting evaluation cases

These exercise every category rather than expanding the tool list: prompt injection inside error/payload/runbook text; cross-tenant case IDs; missing evidence; stale configuration; active lease; provider deduplication expiry; changed request with same key; model timeout; exhausted tool budget; and conflicting runbooks. Expected behavior is authorization enforcement, bounded execution, grounded uncertainty, and deterministic refusal where required.

Initial corpus: two synthetic variants per F01–F10 (20 cases), plus six security/safety cases: cross-tenant access, error-text prompt injection, secret leakage, stale approval, expired email deduplication and changed-input replay. Label normal DLQ cases separately from coverage-gap/quarantine cases. Simulated receipts must never appear as live observations. See the master plan for train/holdout separation and release gates.
