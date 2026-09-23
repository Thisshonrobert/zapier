# Phase 3B Durable Failures Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make worker action execution single-shot, fenced, durably explainable, and Kafka-ACK-safe.

**Architecture:** Add a per-claim token, append-only provider attempt evidence, and a unique execution-to-`ZapRunRetry` link whose UUID is the canonical `failureId`. Put all state transitions behind a small persistence module, invoke a provider once, and acknowledge Kafka only after durable `SUCCESS` or a linked durable `FAILED` record.

**Tech Stack:** TypeScript 5.9, Bun 1.2, Prisma 6.19, PostgreSQL, KafkaJS, Node `assert`/`crypto`

**Spec:** `docs/superpowers/specs/2026-09-22-phase-3b-durable-failures-design.md`

## Global Constraints

- No automatic provider retry/replay. Any future replay is human-controlled and outside Phase 3B.
- Active `PENDING`: no provider call and no ACK. Expired `PENDING`: atomically quarantine as `FAILED`/`UNKNOWN` with `requiresHuman = true`, no provider call.
- Fence every attempt and terminal write by execution ID, `status = PENDING`, and the persisted `claimToken`; never read a claim token from Kafka.
- Persist `STARTED` before the one provider call. Persist its final outcome when PostgreSQL remains available.
- Persist `FAILED` plus exactly one linked `ZapRunRetry` in one transaction. A DB error or `FAILED` row without that link is unresolved and must not ACK.
- Persist only bounded allowlisted evidence and SHA-256 fingerprints—never raw responses, credentials, addresses/chat IDs, message bodies, error messages, stacks, or arbitrary SDK data.
- Only durable `SUCCESS` and linked durable `FAILED` may ACK. Only `SUCCESS` advances the workflow.
- Remove direct worker publication to `zap-events-dlq`; Phase 3C publishes by `failureId` and stamps `dlqPublishedAt` after broker ACK.
- Add no dependencies, replay/approval APIs, provider deduplication, destructive migration, or generic observability framework.
- Do not invent facts for legacy rows; new evidence/relation fields remain nullable where history is unknown.

---

### Task 1: Add the Durable Execution, Attempt, and Failure Schema

**Files:**

- Modify: `packages/db/prisma/schema.prisma`
- Create: `packages/db/prisma/migrations/20260922000000_phase_3b_durable_failures/migration.sql`
- Create: `packages/db/prisma/durable-failures-schema.test.ts`
- Regenerate: `packages/db/generated/prisma/browser.ts`, `client.ts`, `models.ts`
- Regenerate: `packages/db/generated/prisma/models/ZapRunExecution.ts`, `ZapRunRetry.ts`
- Create by generation: `packages/db/generated/prisma/models/ZapRunExecutionAttempt.ts`
- Regenerate: `packages/db/generated/prisma/internal/class.ts`, `prismaNamespace.ts`, `prismaNamespaceBrowser.ts`

**Interfaces:**

- `ZapRunExecution` adds nullable `claimToken`, `providerOutcome`, `actionFingerprint`, `requestFingerprint`; non-null `requiresHuman Boolean @default(false)`; `attempts`; and optional `failure`.
- New `ZapRunExecutionAttempt`: `id`, `executionId`, `attemptNumber`, `status`, nullable `provider`/`phase`/safe evidence, required fingerprints, `startedAt`, nullable `completedAt`, unique `(executionId, attemptNumber)`.
- `ZapRunRetry` retains legacy fields and adds nullable unique `executionId`, optional execution relation, nullable provider/evidence/fingerprints, `requiresHuman Boolean @default(true)`, and nullable `dlqPublishedAt`.
- Attempt statuses are application-owned bounded strings: `STARTED | ACCEPTED | REJECTED | NOT_ATTEMPTED | UNKNOWN`.
- `ZapRunRetry.id` remains the UUID `failureId`. New writes leave legacy `lastError` null and never write `dlqPublishedAt`.

- [ ] **Step 1: Write the failing generated-schema contract test**

Create a dependency-free `node:assert` script using `Prisma.dmmf`. Assert all fields above, the attempt compound unique, and the retry unique execution link. Read the exact migration SQL with `Bun.file` and assert it contains `CREATE TABLE "ZapRunExecutionAttempt"`, the unique retry index, and the execution foreign keys; assert it contains no `DROP TABLE` or `DROP COLUMN`.

- [ ] **Step 2: Run it red**

```bash
bun run packages/db/prisma/durable-failures-schema.test.ts
```

Expected: FAIL because `ZapRunExecutionAttempt` and the new fields do not exist.

- [ ] **Step 3: Add the minimal additive schema and SQL migration**

Use this exact new model; add the fields/relations listed above to the two existing models:

```prisma
model ZapRunExecutionAttempt {
  id                 String          @id @default(uuid())
  executionId        String
  execution          ZapRunExecution @relation(fields: [executionId], references: [id])
  attemptNumber      Int
  status             String
  provider           String?
  phase              String?
  safeCode           String?
  providerStatus     Int?
  retryAfterSeconds  Int?
  safeReceiptId      String?
  actionFingerprint  String
  requestFingerprint String
  startedAt          DateTime        @default(now())
  completedAt        DateTime?

  @@unique([executionId, attemptNumber])
  @@index([executionId])
}
```

The migration only adds columns, this table, indexes, and foreign keys. `ZapRunRetry.executionId` is nullable/unique so legacy rows need no fabricated backfill. Keep provider and phase nullable for safe pre-provider `NOT_ATTEMPTED` failures.

- [ ] **Step 4: Validate, generate, and run green**

```bash
bunx prisma validate --schema packages/db/prisma/schema.prisma
bunx prisma generate --schema packages/db/prisma/schema.prisma
bun run packages/db/prisma/durable-failures-schema.test.ts
```

Expected: Prisma commands exit 0; test prints `durable-failures-schema.test.ts OK`. Do not hand-edit generated files or stage an unchanged engine binary.

- [ ] **Step 5: Commit the schema increment**

```bash
git add docs/superpowers/specs/2026-09-22-phase-3b-durable-failures-design.md docs/superpowers/plans/2026-09-22-phase-3b-durable-failures.md packages/db/prisma/schema.prisma packages/db/prisma/migrations/20260922000000_phase_3b_durable_failures/migration.sql packages/db/prisma/durable-failures-schema.test.ts packages/db/generated/prisma
git commit -m "feat(db): add durable action failure evidence"
```

---

### Task 2: Implement the Fenced Persistence State Machine

**Files:**

- Create: `apps/worker/execution-store.ts`
- Create: `apps/worker/execution-store.test.ts`

**Interfaces:**

`execution-store.ts` declares a narrow structural `ExecutionDb` for the three Prisma delegates plus `$transaction`; do not add a class/repository hierarchy. Export exactly:

```typescript
export type ExecutionKey = { zapRunId: string; stage: number };
export type Fingerprints = { actionFingerprint: string; requestFingerprint: string };
export type ClaimDecision =
  | ({ kind: "CLAIMED"; executionId: string; claimToken: string } & Fingerprints)
  | { kind: "SUCCESS" }
  | { kind: "FAILED"; failureId: string }
  | { kind: "ACTIVE_PENDING" }
  | { kind: "UNRESOLVED" };
export type AttemptOwner = { executionId: string; claimToken: string; attemptNumber: 1 };
export type DurableFailureEvidence = {
  provider: ActionProvider | null;
  phase: ActionPhase | null;
  providerOutcome: "rejected" | "not_attempted" | "unknown";
  safeCode: string;
  providerStatus?: number;
  retryAfterSeconds?: number;
  safeReceiptId?: string;
  requiresHuman: true;
};
export type FinalizeDecision =
  | { kind: "FINALIZED" }
  | { kind: "FAILED"; failureId: string }
  | { kind: "STALE" };

export function createFingerprints(input: {
  zapRunId: string; stage: number; actionId: string; actionTypeId: string;
  actionMetadata: Record<string, unknown>; zapRunMetadata: Record<string, unknown>;
}): Fingerprints;
export function normalizeFailure(error: unknown): DurableFailureEvidence;
export function createExecutionStore(db: ExecutionDb, options?: {
  now?: () => Date; randomUUID?: () => string;
}): {
  claim(key: ExecutionKey, fingerprints: Fingerprints): Promise<ClaimDecision>;
  startAttempt(owner: AttemptOwner, provider: ActionProvider): Promise<"STARTED" | "STALE">;
  finalizeSuccess(owner: AttemptOwner, result: ActionResult): Promise<FinalizeDecision>;
  finalizeFailure(owner: AttemptOwner, evidence: DurableFailureEvidence): Promise<FinalizeDecision>;
  finalizeNotAttempted(
    claim: Extract<ClaimDecision, { kind: "CLAIMED" }>,
    safeCode: "unsupported_action_type",
  ): Promise<FinalizeDecision>;
};
```

- [ ] **Step 1: Write failing tests with a rollback-capable in-memory `ExecutionDb`**

Use the existing single-file `node:assert` style. The fake `$transaction` snapshots maps and restores them on throw. Required red tests:

- first claim creates a fresh local token plus fingerprints;
- active `PENDING` returns `ACTIVE_PENDING` without mutation;
- expired/null-lease `PENDING` becomes linked `FAILED`/`unknown` exactly once, finalizes any existing `STARTED` attempt as `UNKNOWN`, and is never reclaimed;
- attempt `1` starts once and only under the current token;
- accepted attempt and `SUCCESS` finalize together;
- failure and exactly one retry row commit together;
- injected transaction failure rolls both terminal state and retry row back;
- stale token cannot update attempt or terminal state;
- duplicate terminal failure returns the existing `failureId`;
- serialized attempts/retries contain no secret body, bot token, recipient, raw SDK response, or stack text.

- [ ] **Step 2: Run it red**

```bash
bun run apps/worker/execution-store.test.ts
```

Expected: FAIL with missing `./execution-store`.

- [ ] **Step 3: Implement fingerprints and the sanitization boundary**

Use `node:crypto` SHA-256 over recursively key-sorted JSON. `actionFingerprint` hashes `{ actionId, actionTypeId, stage }`; `requestFingerprint` hashes `{ actionId, actionMetadata, zapRunId, stage, zapRunMetadata }`. Preserve array order; reject cyclic/non-JSON input.

`normalizeFailure` only copies Phase 3A `ActionExecutionError.evidence`, rechecking: safe code `^[a-z0-9_]{1,64}$`, status integer `100..599`, retry delay integer `1..86400`, receipt non-empty/max 128. Any other error becomes fixed `unknown` evidence with null provider/phase and `safeCode: "unclassified_action_error"`; never copy message, stack, or arbitrary properties. All failures set `requiresHuman: true`.

- [ ] **Step 4: Implement claims and attempt start**

- New row: generate `claimToken` locally and insert `PENDING` with lease/fingerprints.
- On `P2002`, load execution plus failure: `SUCCESS` returns `SUCCESS`; linked `FAILED` returns `FAILED`; unlinked `FAILED` returns `UNRESOLVED`; active `PENDING` returns `ACTIVE_PENDING`.
- Expired/null-lease `PENDING`: one transaction fences on ID/status/stored token/expiry, updates any `STARTED` attempt for the execution to `UNKNOWN` with `completedAt`, sets the execution to terminal `unknown`/human state, and creates one linked retry with `safeCode: "lease_expired"`. Legacy null tokens are matched as null, not replaced. Return `failureId` only after commit. The transaction rollback test must prove that the attempt update, execution update, and retry insert roll back together.
- `startAttempt`: in one transaction, perform a fenced `updateMany` to lock/prove the owner, then create attempt `1` as `STARTED`. Zero updated rows returns `STALE`.

- [ ] **Step 5: Implement fenced terminal transactions**

- `finalizeSuccess`: one transaction fences execution, sets `SUCCESS`/`accepted`, and updates attempt `STARTED -> ACCEPTED` with safe receipt and timestamps.
- `finalizeFailure`: one transaction fences execution, sets `FAILED`, updates attempt to `REJECTED | NOT_ATTEMPTED | UNKNOWN`, and creates the unique linked retry with normalized evidence/fingerprints.
- `finalizeNotAttempted`: same atomic failure path, but create attempt `0` directly as `NOT_ATTEMPTED`, with null provider/phase and fixed `unsupported_action_type`; never persist the unknown action type.
- Check the fenced update count before other writes. Zero returns `STALE`. Let transaction errors reject so Kafka cannot ACK. Do not populate `lastError` or `dlqPublishedAt`.

- [ ] **Step 6: Run focused verification and commit**

```bash
bun run apps/worker/execution-store.test.ts
bunx tsc --noEmit -p apps/worker/tsconfig.json
git add apps/worker/execution-store.ts apps/worker/execution-store.test.ts
git commit -m "feat(worker): persist fenced action outcomes"
```

Expected: test prints `execution-store.test.ts OK`; worker type-check exits 0.

---

### Task 3: Integrate Single-Shot Execution, ACK Gating, and Architecture Docs

**Files:**

- Create: `apps/worker/orchestration.ts`
- Modify: `apps/worker/index.ts`, `apps/worker/idempotency.test.ts`
- Delete: `apps/worker/retry.ts`, `apps/worker/retry.test.ts`
- Delete: `apps/worker/deadletter.ts`, `apps/worker/deadletter.test.ts`
- Modify: `docs/worker.md`, `docs/idempotency.md`, `docs/kafka.md`, `docs/decisions.md`
- Modify: `docs/AI/failure-taxonomy.md`, `docs/README.md`, `docs/repository-structure.md`, `docs/current-state.md`

**Interfaces:**

```typescript
export type MessageResolution = { ack: boolean; advance: boolean };
export async function executeStage(input: {
  event: { zapRunId: string; stage: number };
  action: { id: string; typeId: string; metadata: Record<string, unknown> };
  zapRunMetadata: Record<string, unknown>;
  store: ReturnType<typeof createExecutionStore>;
  getHandler: typeof getActionHandler;
}): Promise<MessageResolution>;
```

- `{ ack: true, advance: true }`: durable `SUCCESS`, new or observed.
- `{ ack: true, advance: false }`: linked durable `FAILED`, including expired quarantine/unsupported action.
- `{ ack: false, advance: false }`: active `PENDING`, unlinked `FAILED`, stale ownership, or persistence failure.

- [ ] **Step 1: Rewrite the old idempotency harness as failing orchestration tests**

Keep registry smoke tests. Add named cases asserting:

- accepted provider: exactly one call, ACK only after `finalizeSuccess`, advance true;
- provider error: exactly one call, ACK only after linked failure, advance false;
- accepted provider plus DB finalization failure: no ACK and no second provider call;
- active pending: no provider, no ACK;
- expired pending: no provider, linked quarantine ACK, no advance;
- duplicate success: no provider, ACK and advance;
- duplicate linked failure: no provider, ACK and no advance;
- unlinked legacy `FAILED`: no provider and no ACK;
- unsupported action: attempt `0`/`NOT_ATTEMPTED`, fixed safe code, linked failure, no provider;
- failed `STARTED` persistence or stale finalization: no ACK/advance;
- empty value, malformed JSON, or missing action: throw before any offset commit, with no provider call;
- no direct DLQ publisher is called.

- [ ] **Step 2: Run it red**

```bash
bun run apps/worker/idempotency.test.ts
```

Expected: FAIL because `orchestration.ts` is missing and the old harness still uses retries/dead-lettering.

- [ ] **Step 3: Implement single-shot orchestration**

Compute fingerprints, claim, and map terminal/active decisions directly to `MessageResolution`. For `CLAIMED`, resolve the handler; unsupported types call `finalizeNotAttempted`. Otherwise persist `STARTED`, call `handler.execute(...)` exactly once, then call `finalizeSuccess` or normalize and `finalizeFailure`. Never wrap the provider call in `withRetry`. Let all claim/start/finalization DB rejections escape to the Kafka boundary; catch only the provider call for normalization.

- [ ] **Step 4: Rewire Kafka and remove obsolete execution paths**

In `index.ts`, instantiate the real store, call `executeStage`, publish stage `N+1` only when `advance`, and commit `offset + 1` only when `ack`. For `ack: false`, throw a fixed internal error after logging only `{ zapRunId, stage, reason }`; this stops later offsets from being committed past the unresolved message. An empty message value, malformed JSON, or event whose action cannot be loaded must also throw before `commitOffsets` is reachable. Test all three paths so a later offset can never be committed past an unclassified event.

Remove `withRetry`, `deadLetter`, `DLQ_TOPIC`, retry constants, old claim/finalize functions, and DLQ producer calls. Delete the four obsolete retry/dead-letter files. Keep the Kafka producer only for successful next-stage messages.

- [ ] **Step 5: Run focused tests and prove removed paths are absent**

```bash
bun run apps/worker/actions/email.test.ts
bun run apps/worker/actions/telegram.test.ts
bun run apps/worker/execution-store.test.ts
bun run apps/worker/idempotency.test.ts
rg -n "withRetry|deadLetter|DLQ_TOPIC|zap-events-dlq" apps/worker
```

Expected: all tests print `OK`; `rg` returns no matches (exit 1 is expected).

- [ ] **Step 6: Update architectural documentation and ADRs**

- `worker.md`: one attempt, token fencing, durable attempts, expired quarantine, atomic failure row, ACK rules.
- `idempotency.md`: leases do not prove non-delivery; ambiguity blocks resend and needs human review.
- `kafka.md`: worker is no longer a DLQ producer; Phase 3C owns publication by `failureId`; unresolved/active rows are not committed.
- `decisions.md`: supersede ADR 003 reclaim behavior, ADR 004 dual-sink behavior, ADR 007 ACK conditions, and ADR 008 automatic retry with one implemented Phase 3B ADR.
- `AI/failure-taxonomy.md`: update F06/F07/F09/F10 to attempt/failure evidence and shared `failureId`; do not backfill historical facts.
- `README.md`, `repository-structure.md`, `current-state.md`: remove stale retry/dead-letter modules/tests and describe `execution-store.ts`, `orchestration.ts`, and Phase 3C as future work.

Never claim exactly-once external delivery or implemented Phase 3C publication.

- [ ] **Step 7: Run required repository verification**

```bash
bun run packages/db/prisma/durable-failures-schema.test.ts
bun run apps/worker/actions/email.test.ts
bun run apps/worker/actions/telegram.test.ts
bun run apps/worker/execution-store.test.ts
bun run apps/worker/idempotency.test.ts
bun run check-types
bun run lint
bun run build
git diff --check
```

Record actual results. Do not report success if the documented `@repo/ui` type-config issue or any new failure remains.

- [ ] **Step 8: Commit the integration/docs increment**

```bash
git add apps/worker/index.ts apps/worker/orchestration.ts apps/worker/idempotency.test.ts docs/worker.md docs/idempotency.md docs/kafka.md docs/decisions.md docs/AI/failure-taxonomy.md docs/README.md docs/repository-structure.md docs/current-state.md
git add -u apps/worker/retry.ts apps/worker/retry.test.ts apps/worker/deadletter.ts apps/worker/deadletter.test.ts
git commit -m "feat(worker): durably park single-shot action failures"
```

## Self-Review and Known Boundary

- Task 1 supplies additive schema, attempt history, unique failure identity, and generated client.
- Task 2 supplies fencing, `STARTED`/final outcomes, atomic failure parking, quarantine, fingerprints, and redaction.
- Task 3 supplies one provider call, ACK gating, no direct DLQ, focused tests, and current docs/ADR.
- The repository has no PostgreSQL integration-test harness. The plan therefore tests rollback/concurrency control with a transactional fake plus generated-schema/migration assertions. Live row-lock behavior remains deployment validation; adding a new DB test subsystem would exceed the approved scope.

