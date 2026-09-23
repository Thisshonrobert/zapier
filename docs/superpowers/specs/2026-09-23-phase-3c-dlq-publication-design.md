# Phase 3C Durable DLQ Publication Design

## Goal

Publish every durable `ZapRunRetry` failure to `zap-events-dlq` from a separate process, then reconcile execution rows that lack durable failure coverage. This process delivers evidence only; it never invokes an action provider or authorizes replay.

## Publication boundary

`ZapRunRetry.id` is the stable `failureId` and Kafka message key. A publisher claims unpublished rows with a database token and expiring lease, publishes a bounded sanitized envelope, and stamps `dlqPublishedAt` only after Kafka acknowledges the send. A crash or database failure after broker acknowledgement can duplicate the same `failureId`; consumers must deduplicate it.

Kafka publication failures use bounded automatic backoff because they retry evidence delivery, not provider execution. Raw `lastError`, payloads, credentials, addresses, message bodies, stack traces, and SDK responses never enter the envelope.

## Data model

`ZapRunRetry` gains nullable `evidenceSource`, publication claim token/lease, a nonnegative publication-attempt counter, nullable next-attempt time, and an index supporting unpublished due-row scans. Existing `dlqPublishedAt` remains the publication completion marker. Null provenance on historical rows maps to `legacy_unknown`; new Phase 3B writes use `captured`; reconciled rows use `reconciled_execution`.

## Reconciliation

The same separately launched runtime periodically performs deterministic database reconciliation:

- Expired `PENDING` executions become `FAILED/UNKNOWN`, any `STARTED` attempt becomes `UNKNOWN`, and exactly one linked retry row is created.
- Existing `FAILED` executions without a retry row receive one `UNKNOWN`, human-review row with nullable historical evidence.
- `SUCCESS`, active `PENDING`, and already linked `FAILED` rows are unchanged.

Every transition is fenced and transactional. Reconciliation never calls an action handler and never invents provider facts.

## Runtime

Use a separate entrypoint inside `apps/worker` so it runs as its own process while reusing the existing Prisma, Kafka, and execution-state dependencies. Phase 3C adds no new package or dependency.

## Verification

Tests cover exclusive claims, broker failure/backoff, acknowledgement stamping, duplicate publication after the crash window, sanitized legacy envelopes, expired-execution quarantine, missing-failure repair, concurrent reconciliation, and proof that no provider dependency is present.
