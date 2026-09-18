# Architectural Decision Records (ADRs)

This document records the foundational architectural decisions established in the current codebase.

---

## ADR 001: Transactional Outbox Pattern for Webhook Ingestion

- **Status**: Implemented
- **Files**: [`apps/webhook/index.ts`](../apps/webhook/index.ts), [`apps/processor/index.ts`](../apps/processor/index.ts), [`packages/db/prisma/schema.prisma`](../packages/db/prisma/schema.prisma)
- **Decision**: Ingested webhooks write to `ZapRun` and `ZapRunOutbox` tables in a single database transaction. A separate daemon (`apps/processor`) polls `ZapRunOutbox`, publishes messages to Kafka, and deletes outbox records only after the broker acknowledges receipt.
- **Rationale**: Direct publishing to Kafka inside the webhook HTTP request lifecycle risks message loss if Kafka is down or slow (dual-write problem). Writing to the database first ensures that accepted webhooks are durably preserved.

---

## ADR 002: Linear Sorting Order for Workflow Step Sequencing

- **Status**: Implemented
- **Files**: [`packages/db/prisma/schema.prisma`](../packages/db/prisma/schema.prisma), [`apps/worker/index.ts`](../apps/worker/index.ts)
- **Decision**: Action steps are sequenced linearly using an integer field `sortingOrder` on the `Action` model. The worker advances workflow execution from stage $0$ through stage $N-1$ sequentially via Kafka messages `{ zapRunId, stage: stage + 1 }`.
- **Rationale**: Provides a straightforward execution model for linear pipelines without the complexity of a generalized DAG engine.
- **Trade-off**: Does not currently accommodate non-linear execution patterns such as parallel forks, conditional branches, or join nodes.

---

## ADR 003: Two-Phase Distributed Execution Lease via PostgreSQL

- **Status**: Implemented
- **Files**: [`packages/db/prisma/schema.prisma`](../packages/db/prisma/schema.prisma), [`apps/worker/index.ts`](../apps/worker/index.ts), [`apps/worker/idempotency.test.ts`](../apps/worker/idempotency.test.ts)
- **Decision**: Worker step execution is guarded by the `ZapRunExecution` table using a compound unique key `(zapRunId, stage)`. Before executing side effects, a worker creates a `PENDING` record with an expiration timestamp (`leaseUntil = now + 2m`). If a worker crashes, other workers reclaim the expired lease via `updateMany`.
- **Rationale**: In an at-least-once message system, multiple workers may receive the same message or a rebalance might redeliver unacknowledged messages. The atomic database lease guarantees that external action side-effects (e.g. emails) are executed exactly once.

---

## ADR 004: Dual-Sink Dead-Letter Architecture

- **Status**: Implemented
- **Files**: [`apps/worker/deadletter.ts`](../apps/worker/deadletter.ts), [`packages/db/prisma/schema.prisma`](../packages/db/prisma/schema.prisma)
- **Decision**: When an action stage exhausts its in-process retry limit (3 attempts), the worker dispatches failure diagnostics to two sinks:
  1. **Kafka Topic**: `zap-events-dlq` (for offline event replay and stream consumers).
  2. **PostgreSQL Table**: `ZapRunRetry` (for fast SQL queries and user-facing UI inspection).
- **Rationale**: Storing failures in Kafka enables event replay pipelines, while storing them in PostgreSQL allows the API and frontend to quickly query failure counts per run without scanning Kafka topics.
- **Implementation Note**: Both sinks are wrapped in independent `try/catch` blocks so a failure in one sink does not crash the worker or block offset commits.

---

## ADR 005: Hybrid Authentication with Clerk Token Exchange

- **Status**: Implemented
- **Files**: [`apps/primary_backend/route/user.ts`](../apps/primary_backend/route/user.ts), [`apps/primary_backend/middleware.ts`](../apps/primary_backend/middleware.ts)
- **Decision**: Supports both native email/password signup (bcrypt + JWT) and third-party social login via Clerk (Google OAuth). For Clerk logins, the frontend sends the Clerk session token to `POST /api/v1/user/clerk`, which verifies the token, upserts the `User` record in PostgreSQL, and returns the application's own native JWT signed with `JWT_SECRET`.
- **Rationale**: Keeps `localStorage.token` in a single consistent format across all downstream frontend hooks and backend middleware, eliminating the need for conditional token decoding logic across the codebase.

---

## ADR 006: Self-Contained Action Registry Pattern

- **Status**: Implemented
- **Files**: [`apps/worker/actions/index.ts`](../apps/worker/actions/index.ts), [`apps/worker/types.ts`](../apps/worker/types.ts)
- **Decision**: Integrations implement a common `ActionHandler` interface and are registered in a central map `actionRegistry`. Handlers receive a unified `ActionContext` containing the idempotency key, stage index, and trigger metadata.
- **Rationale**: Isolates third-party API client details (Resend, Telegram) from the core Kafka consumer and lease management lifecycle, enabling modular addition of new action types.

---

## ADR 007: Manual Kafka Offset Commit Protocol

- **Status**: Implemented
- **Files**: [`apps/worker/index.ts`](../apps/worker/index.ts)
- **Decision**: Kafka consumer `autoCommit` is disabled (`autoCommit: false`). Offsets are explicitly committed via `consumer.commitOffsets(...)` only after a stage is either successfully resolved, skipped, or permanently dead-lettered.
- **Rationale**: Automatic commits risk acknowledging messages before side-effect execution is finalized. Manual commits ensure that crashes during execution result in message redelivery and lease reclamation.

---

## ADR 008: In-Process Exponential Backoff with Full Jitter

- **Status**: Implemented
- **Files**: [`apps/worker/retry.ts`](../apps/worker/retry.ts), [`apps/worker/retry.test.ts`](../apps/worker/retry.test.ts)
- **Decision**: Transient action failures are retried up to 3 times in-process using an exponential delay calculation combined with Full Jitter ($\text{wait} = \text{random}(0, \text{baseMs} \times 2^{\text{attempt}-1})$).
- **Rationale**: Pure exponential backoff leads to synchronized retry waves when multiple concurrent workers fail simultaneously. Full Jitter spreads retry wakeups uniformly over the backoff interval, preventing the Thundering Herd effect on downstream external APIs.
