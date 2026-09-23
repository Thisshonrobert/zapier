# Phase 3B Durable Failures Design

## Purpose

Phase 3B makes an exhausted action failure durably explainable and safely parked. It separates provider delivery from PostgreSQL state: a provider call and a database commit cannot be one atomic transaction. Therefore, if a provider accepts a request and PostgreSQL later fails, the delivery is `UNKNOWN` and requires human review. The worker must never send again automatically to resolve that uncertainty.

## Scope

- Remove automatic provider retry and replay from the execution path. Any retry or replay after a terminal record is a human-controlled, future workflow.
- Fence leases with a per-claim `claimToken`; every attempt and terminal update must prove ownership with the current token.
- Persist one durable attempt record per provider attempt, with `STARTED` evidence followed by a final outcome.
- Quarantine an expired `PENDING` execution as `FAILED` with `UNKNOWN` provider delivery and `requiresHuman = true`; do not invoke the provider.
- Atomically persist terminal `FAILED` state and exactly one linked `ZapRunRetry` row.
- Treat the existing `ZapRunRetry.id` UUID as the future shared `failureId` across SQL and Kafka evidence.
- Store only bounded, sanitized evidence and fingerprints. Never persist raw provider responses, credentials, recipient/body data, arbitrary SDK errors, or secrets.
- Remove direct Kafka DLQ publication from execution. Phase 3C will publish from durable failure rows by `failureId` and stamp `dlqPublishedAt`.

## Non-goals

No live replay, approval API, provider deduplication, bulk recovery, destructive migration, raw error-log storage, or claim that PostgreSQL can prove external non-delivery. Phase 3B does not backfill facts for legacy rows; historical unknowns remain labelled unknown.

## Proposed schema and interfaces

The migration is additive. Existing `ZapRunExecution` remains unique on `(zapRunId, stage)` and gains a nullable `claimToken` plus terminal evidence fields as needed (`providerOutcome`, `requiresHuman`, safe fingerprints/timestamps). The token is rotated on each valid claim and is never accepted from a Kafka envelope.

`ZapRunExecutionAttempt` is linked to one execution and has a unique `(executionId, attemptNumber)`. It records:

- `status`: `STARTED` or final (`ACCEPTED`, `REJECTED`, `NOT_ATTEMPTED`, `UNKNOWN`)
- provider, phase, safe code/status, bounded retry delay, and safe receipt ID
- `actionFingerprint` and `requestFingerprint`
- `startedAt`, `completedAt`, and sanitized failure metadata

`ZapRunRetry` becomes the durable failure record. Its UUID is `failureId`; it links uniquely to the failed execution and contains the terminal sanitized evidence, `attempt`, `providerOutcome`, `requiresHuman`, and fingerprints. Phase 3C adds/uses nullable `dlqPublishedAt` and publication metadata. No raw provider payload is a schema field.

The worker consumes the Phase 3A `ActionResult`/`ActionExecutionError` contract. A provider attempt first inserts `STARTED`; it then finalizes that same attempt with the observed outcome. The worker may not classify a persistence failure as a provider rejection.

## State transitions

```text
absent -> PENDING(claimToken)
PENDING + active lease -> no execution, no Kafka ACK
PENDING + expired lease -> FAILED(UNKNOWN, requiresHuman), no provider call
PENDING + valid claim -> attempt STARTED -> provider result
provider accepted -> SUCCESS (fenced terminal update)
provider rejected/not_attempted/unknown -> FAILED + one linked ZapRunRetry
```

Every update is fenced by execution identity, `status = PENDING`, and the current `claimToken`. A stale worker that finishes after lease expiry cannot overwrite a newer terminal decision. If a provider response is lost, the final outcome is `UNKNOWN`, not a reason to invoke the provider again.

## Transaction and Kafka ACK semantics

For an exhausted provider attempt, one PostgreSQL transaction performs the fenced update to `ZapRunExecution = FAILED` and creates the single linked `ZapRunRetry` row. The retry row's UUID is the canonical `failureId`. A duplicate delivery observes the terminal row and must not create another failure row or call the provider.

The worker acknowledges Kafka only after durable resolution:

- `SUCCESS` with its terminal evidence may ACK.
- `FAILED` with its linked durable failure row may ACK.
- An active `PENDING` lease is neither executed nor ACKed.
- A database/transaction failure is not durable resolution: do not ACK. Redelivery or reconciliation must retry persistence, never the provider call.

PostgreSQL cannot atomically commit with an external provider. Thus a provider-accepted request followed by a failed terminal database transaction remains an explicit `UNKNOWN`/human-review case; no automatic provider retry is permitted.

The old best-effort `deadLetter()` send is removed from this execution path. Phase 3C independently reads durable `ZapRunRetry` rows, publishes a sanitized DLQ envelope keyed by `failureId`, and records `dlqPublishedAt` only after broker acknowledgement. Publication failure does not erase or change the durable failure.

## Evidence and security rules

Allowlisted evidence includes provider, phase, normalized outcome, safe code, bounded HTTP status, bounded retry delay, safe receipt ID, action/request fingerprints, attempt number, and timestamps. Fingerprints identify the intended action/request without exposing its contents. Raw response bodies, tokens, addresses, chat IDs, message bodies, stack traces, and unbounded provider text are excluded from persistence and DLQ envelopes.

## Tests

- Claim-token fencing prevents stale workers from changing terminal state.
- Active `PENDING` skips execution and does not ACK; expired `PENDING` becomes `FAILED/UNKNOWN` without a provider call.
- Every provider attempt persists `STARTED` and exactly one final outcome.
- Accepted-provider plus failed database commit remains `UNKNOWN`/human review and never retries the provider.
- Terminal failure and one linked `ZapRunRetry` row commit atomically; transaction failure produces no ACK.
- Duplicate delivery is idempotent and cannot duplicate attempts or retry rows.
- Safe evidence and fingerprints are retained while secrets/raw provider data are rejected.
- `SUCCESS` and durably parked `FAILED` messages ACK; active leases and unresolved persistence do not.
- Direct DLQ publication is absent from execution; Phase 3C publication uses `failureId` and stamps `dlqPublishedAt` only after broker ACK.

## Phase 3C boundary

Phase 3B owns execution truth, fencing, attempt evidence, durable failure identity, and ACK gating. Phase 3C owns the retry-row-to-Kafka DLQ publisher, publication retries/reconciliation, `dlqPublishedAt`, and consumers of the `failureId` envelope. Neither phase authorizes automatic provider replay; human intervention remains required for uncertain delivery.
