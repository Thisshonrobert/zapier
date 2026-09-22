# Phase 3A Provider Outcomes Design

## Purpose

Phase 3A establishes a truthful, redacted contract between provider action handlers and the worker. It fixes the current Resend false-success path and distinguishes provider acceptance from application persistence. It does not persist attempt evidence yet; Phase 3B consumes this contract when it adds transactional failure records.

## Scope

This increment changes only the worker's internal action boundary:

- Normalize successful provider responses into a structured `ActionResult`.
- Normalize provider failures into `ActionExecutionError` with bounded, non-secret evidence.
- Detect Resend `{ error }` values instead of treating them as success.
- Distinguish Telegram destination resolution from message sending.
- Classify explicit rejection, pre-send failure, ambiguous outcome, and provider acceptance.
- Return safe provider receipt identifiers when the provider supplies one.
- Make `withRetry` generic so the final successful `ActionResult` reaches its caller.
- Remove logs that expose recipient, sender, subject, or body values.

The Kafka event schema, database schema, execution lease, DLQ payload, retry count, and stage progression remain unchanged.

## Outcome Vocabulary

Provider and database state are separate facts. A provider result never claims more than it proves.

| Outcome | Meaning | Examples |
|---|---|---|
| `accepted` | The provider returned a successful request receipt. This does not prove final delivery. | Resend returns an email ID; Telegram returns a message ID. |
| `rejected` | The provider explicitly rejected the send request. | Telegram 400/401/403/429; Resend 4xx error result. |
| `not_attempted` | Failure occurred before a side-effect request was sent. | Telegram `getChat` resolution fails. |
| `unknown` | The request may have reached or been accepted by the provider, but the result is not trustworthy. | Transport timeout, thrown fetch after transmission, malformed success response, provider 5xx. |

If a provider returns `accepted` and the later PostgreSQL `SUCCESS` write fails, later increments must retain `accepted` plus the persistence failure. The action must not be retried automatically merely because application state could not be updated.

## Contracts

`apps/worker/types.ts` owns the worker-wide contract:

```ts
export type ActionProvider = "email" | "telegram";
export type ActionPhase = "resolve_destination" | "send";
export type ProviderOutcome =
  | "accepted"
  | "rejected"
  | "not_attempted"
  | "unknown";

export type ActionResult = {
  provider: ActionProvider;
  phase: "send";
  outcome: "accepted";
  safeReceiptId?: string;
};

export type ActionFailureEvidence = {
  provider: ActionProvider;
  phase: ActionPhase;
  outcome: Exclude<ProviderOutcome, "accepted">;
  safeCode: string;
  status?: number;
  retryAfterSeconds?: number;
};

export class ActionExecutionError extends Error {
  readonly evidence: ActionFailureEvidence;
}
```

`ActionHandler.execute` changes from `Promise<void>` to `Promise<ActionResult>`. `withRetry<T>` returns `Promise<T>` without changing its attempt limit or jitter behavior.

All bounded evidence fields are allowlisted. The structured error never contains credentials, recipient values, message bodies, provider response bodies, or raw SDK error messages. An internal `cause` may aid local debugging but is never part of `evidence` and must not be serialized by later persistence code.

## Email Flow

`sendEmail` receives an injectable transport function for deterministic tests and defaults to the existing Resend client.

1. Construct the existing request with the stable idempotency key.
2. Await `resend.emails.send` and inspect both `data` and `error`.
3. If `error` exists, throw `ActionExecutionError`:
   - 4xx becomes `rejected`.
   - 5xx or absent/unrecognized status becomes `unknown`.
   - `safeCode` comes from an allowlisted normalized SDK error name, falling back to `email_provider_error`.
4. If a non-empty `data.id` exists, return `accepted` with that ID.
5. A success-shaped response without an ID is `unknown` with `email_receipt_missing`.
6. A thrown transport/SDK exception is `unknown` with `email_transport_error`.

The handler no longer logs parsed `to`, `from`, `subject`, or `body` values.

## Telegram Flow

`resolveChatId` and `sendTelegram` receive an injectable `fetch` implementation and default to global `fetch`.

Destination resolution:

- Numeric chat IDs require no provider call.
- A failed `getChat` response or thrown request produces `not_attempted` at `resolve_destination`.
- No raw response text, username, or bot token is stored in the error evidence.

Message sending:

- A valid success response returns `accepted` with `result.message_id` converted to a bounded string.
- Explicit 4xx responses become `rejected`; a 429 may include a positive bounded `retryAfterSeconds` parsed from Telegram's structured `parameters.retry_after`.
- 5xx responses, thrown fetches, invalid JSON, and success responses without a message ID become `unknown`.
- The action error contains only status, safe code, phase, outcome, and optional retry delay.

## Retry Interaction

Phase 3A preserves the current three-attempt behavior: `withRetry` retries thrown `ActionExecutionError` values and returns the first successful `ActionResult`. This increment does not yet make retry eligibility depend on outcome; changing automatic retry policy requires the persisted attempt history and orchestration work in Phase 3B.

The important safety boundary is that a successful handler returns `accepted`. A later database write failure is not a handler failure and must not cause `withRetry` to send again.

## Error Handling and Redaction

- Provider text is untrusted and excluded from structured evidence.
- Status values must be valid integers in the HTTP range before inclusion.
- Receipt IDs are accepted only as non-empty bounded strings or safe integer-to-string conversions.
- Retry delays must be positive bounded integers.
- Email SDK error names are normalized to lowercase safe-code characters and bounded in length.
- Existing environment-token fallback remains unchanged; token repair belongs outside agent tools.

## Testing

Focused tests use injected transport functions and never call external providers.

- Resend returns `{ error }`: the action throws structured evidence instead of reporting success.
- Resend returns a receipt: result is `accepted` with the safe receipt ID.
- Resend throws or returns a malformed success: outcome is `unknown`.
- Telegram destination resolution fails: phase is `resolve_destination`, outcome is `not_attempted`.
- Telegram 429: phase is `send`, outcome is `rejected`, and a valid retry delay is retained.
- Telegram 5xx, timeout, malformed JSON, or missing receipt: outcome is `unknown`.
- Error evidence and logs exclude tokens, recipients, message bodies, and raw response text.
- Existing retry tests continue passing, plus one test proves `withRetry<T>` returns the successful result.
- Existing worker regression tests remain green.

## Compatibility and Rollout

This is an internal TypeScript contract change compiled with the worker. Existing Kafka messages remain `{ zapRunId, stage }`. No historical row is reclassified and no legacy evidence is invented. Phase 3B will add additive nullable persistence fields and consume `ActionResult`/`ActionExecutionError`; Phase 3C will add durable DLQ publication reconciliation.

## Non-Goals

- No database or Prisma migration.
- No per-attempt persistence.
- No transactional FAILED-state/DLQ write.
- No replay, approval, or agent tool.
- No provider timeout policy change.
- No new dependency or generic observability framework.
