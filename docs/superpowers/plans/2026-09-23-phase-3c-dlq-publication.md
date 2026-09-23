# Phase 3C Durable DLQ Publication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver durable failure evidence to Kafka and close execution coverage gaps without replaying providers.

**Architecture:** A separately launched worker entrypoint claims `ZapRunRetry` rows with fenced leases, publishes a sanitized event keyed by `failureId`, and stamps acknowledgement afterward. A deterministic reconciler repairs expired or unlinked execution records using database transactions only.

**Tech Stack:** TypeScript 5.9, Bun 1.2, Prisma 6.19, PostgreSQL, KafkaJS, Node `assert`/`crypto`

**Spec:** `docs/superpowers/specs/2026-09-23-phase-3c-dlq-publication-design.md`

## Global Constraints

- Evidence publication may retry automatically; provider/action execution never does.
- `failureId` is both `ZapRunRetry.id` and the Kafka message key.
- Stamp `dlqPublishedAt` only after broker acknowledgement.
- Duplicate Kafka publication is allowed only with the same `failureId`.
- Persist and publish only bounded allowlisted evidence; never raw `lastError` or workflow/provider payloads.
- Reconciliation is deterministic database work and always requires human review for unknown evidence.
- Add no dependency or new workspace package.

---

### Task 1: Phase 3C-A — Fenced Durable Failure Publisher

**Files:**

- Modify: `packages/db/prisma/schema.prisma`
- Create: `packages/db/prisma/migrations/20260923000000_phase_3c_dlq_publication/migration.sql`
- Modify: `packages/db/prisma/durable-failures-schema.test.ts`
- Regenerate: `packages/db/generated/prisma/**`
- Modify: `apps/worker/execution-store.ts`
- Create: `apps/worker/dlq-publisher.ts`
- Create: `apps/worker/dlq-publisher.test.ts`

**Interfaces:**

```typescript
export type DurableFailureEvent = {
  failureId: string;
  zapRunId: string;
  stage: number;
  attempt: number;
  providerOutcome: "rejected" | "not_attempted" | "unknown";
  safeCode: string;
  requiresHuman: true;
  evidenceSource: "captured" | "reconciled_execution" | "legacy_unknown";
  failedAt: string;
};

export function createDlqPublisher(
  db: DlqPublisherDb,
  sink: {
    send(message: { key: string; value: string }): Promise<void>;
  },
  options?: { now?: () => Date; randomUUID?: () => string },
): {
  publishNext(): Promise<"EMPTY" | "PUBLISHED" | "RETRY_SCHEDULED" | "STALE">;
};
```

- [x] Write schema and publisher tests first. They must fail because publication fields and `dlq-publisher.ts` do not exist.
- [x] Add nullable `evidenceSource`, `dlqPublishClaimToken`, `dlqPublishLeaseUntil`, `dlqNextAttemptAt`; add `dlqPublishAttempts Int @default(0)` and index `[dlqPublishedAt, dlqNextAttemptAt]`.
- [x] Make new Phase 3B failure writes set `evidenceSource = "captured"`.
- [x] Implement due-row discovery followed by compare-and-set claim; never hold a database transaction open across Kafka I/O.
- [x] Publish an allowlisted envelope keyed by `failureId`; map malformed/legacy evidence to fixed `unknown`/`legacy_unknown` values.
- [x] On broker acknowledgement, fenced-update `dlqPublishedAt`. On send failure, clear the claim and schedule bounded exponential backoff without storing the thrown error.
- [x] Verify Prisma schema/generation, schema contract, publisher tests, Phase 3B execution-store tests, and worker type-check.
- [x] Write the halfway checkpoint ledger and stop. Do not begin Task 2.

### Task 2: Phase 3C-B — Reconciliation and Separate Runtime

**Files:**

- Create: `apps/worker/dlq-reconciler.ts`
- Create: `apps/worker/dlq-reconciler.test.ts`
- Create: `apps/worker/dlq-publisher-index.ts`
- Modify: `apps/worker/package.json`
- Modify only documentation assigned by `AGENTS.MD` through the Antigravity handoff.

**Interfaces:**

```typescript
export function createDlqReconciler(
  db: ReconcilerDb,
  options?: {
    now?: () => Date;
  },
): {
  reconcileNext(): Promise<"EMPTY" | "QUARANTINED" | "REPAIRED" | "STALE">;
};
```

- [x] Write failing reconciliation tests for expired `PENDING`, unlinked `FAILED`, active leases, terminal rows, transaction rollback, and concurrent claims.
- [x] Implement the minimum fenced transactions that create one `reconciled_execution` failure row and never call providers.
- [x] Add the separate process loop: connect producer, reconcile bounded work, publish bounded work, back off when empty, and shut down cleanly.
- [x] Run focused tests plus required repository verification once.
- [x] Prepare the Antigravity documentation, Graphify, commit, and push handoff.
