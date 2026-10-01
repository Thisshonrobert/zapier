# Background Worker

This document specifies the internal lifecycle, fenced action execution, durable failure evidence, and Kafka acknowledgement policy of the background worker service (`apps/worker`). Phase 9 recovery has been verified against real PostgreSQL/Kafka with stubbed providers; live replay remains disabled pending separate provider-semantics confirmation.

---

## 🔄 Worker Lifecycle & Architecture

The worker service ([`apps/worker/index.ts`](../apps/worker/index.ts)) consumes workflow stage execution events from Kafka, uses PostgreSQL claim fencing for at-least-once delivery, invokes each provider at most once per claimed stage, advances only successful stages, and durably parks failures for human review. Replay uses separate additive request/execution history; it does not reset or overwrite the original failed execution.

```mermaid
flowchart TD
    Start([Worker Starts]) --> ConnectClients[Connect Kafka Consumer & Producer]
    ConnectClients --> Subscribe[Subscribe to topic 'zap-events']
    Subscribe --> MessageLoop[Wait for next Kafka message]

    MessageLoop --> ReadMsg[Parse event: zapRunId, stage]
    ReadMsg --> LoadStage[Query ZapRun & Action with sortingOrder == stage]

    LoadStage --> CheckExist{Action found?}
    CheckExist -- No --> ThrowNotFound[Throw before offset commit]
    CheckExist -- Yes --> ClaimLease[Claim with execution-store]

    ClaimLease --> LeaseDecision{Lease State}

    LeaseDecision -- Already SUCCESS --> SkipAndAdvance[ACK and advance]
    LeaseDecision -- Already FAILED --> SkipTerminal[ACK without advancing]
    LeaseDecision -- Active Lock (PENDING) --> Unresolved[No ACK; redelivery]
    LeaseDecision -- Expired PENDING --> Quarantine[FAILED/UNKNOWN + human review]
    LeaseDecision -- Claimed --> StartAttempt[Persist STARTED]

    StartAttempt --> ExecuteAction[Invoke provider once]
    ExecuteAction --> ExecResult{Execution Result}

    ExecResult -- Success --> UpdateSuccess[Update ZapRunExecution status = SUCCESS]
    UpdateSuccess --> CheckLast{Is last stage?}
    CheckLast -- No --> ProduceNext[Produce stage + 1 to zap-events]
    CheckLast -- Yes --> Complete[Workflow complete]

    ExecResult -- Provider failure --> UpdateFail[Atomically persist FAILED + ZapRunRetry]

    SkipAndAdvance --> CommitOffset[Commit Kafka Offset]
    SkipTerminal --> CommitOffset
    Quarantine --> CommitOffset
    Complete --> CommitOffset
    ProduceNext --> CommitOffset
    Unresolved --> MessageLoop

    CommitOffset --> MessageLoop
```

This flowchart shows ordinary execution. Events with `replayRequestId` use the separately gated replay-generation path described below.

---

## 🔒 Distributed Lease Management (`ZapRunExecution`)

To prevent stale workers from overwriting newer decisions under Kafka at-least-once redelivery, the worker uses a per-claim `claimToken` in [`apps/worker/execution-store.ts`](../apps/worker/execution-store.ts). This fences database writes; it cannot prove exactly-once delivery to an external provider.

### Database Model

```prisma
model ZapRunExecution {
  id          String    @id @default(uuid())
  zapRunId    String
  stage       Int
  status      String    @default("PENDING") // PENDING | SUCCESS | FAILED
  leaseUntil  DateTime?
  claimToken  String?
  providerOutcome String?
  actionFingerprint String?
  requestFingerprint String?
  requiresHuman Boolean @default(false)
  createdAt   DateTime  @default(now())
  completedAt DateTime?

  @@unique([zapRunId, stage])
  @@index([zapRunId])
}
```

Replay state is stored separately in immutable `ReplayRequest` rows and mutable `ReplayExecution`, `ReplayExecutionAttempt`, and `ReplayFailure` rows. Each request reserves its own generation and one replay attempt, preserving the original `ZapRunExecution`, attempts, and `ZapRunRetry` failure history. The replay execution records its terminal status and validated `nextStage` independently.

### Lease Rules & State Transitions

1. **Initial Acquisition**:
   - Worker attempts `prisma.zapRunExecution.create({ data: { zapRunId, stage, status: "PENDING", leaseUntil: now + 2min } })`.
   - If insertion succeeds, the worker holds the execution lock (`executionClaimed = true`).
2. **Duplicate Detection & Re-entry**:
   - If insertion throws a unique constraint collision (`code: "P2002"`), the existing record is inspected:
     - `status === "SUCCESS"`: Action was previously completed. Skip side-effects (`alreadySucceeded = true`).
     - `status === "FAILED"`: Action previously exhausted all retries. Skip permanently.
     - `status === "PENDING"` and `leaseUntil > now`: Another active worker is processing this stage. Skip execution to prevent duplicate concurrent work.
3. **Expired lease quarantine**:
   - An expired or null lease is atomically fenced, marked `FAILED` with `providerOutcome = "unknown"`, and linked to exactly one `ZapRunRetry` row with `requiresHuman = true`.
   - The provider is never invoked to resolve lease uncertainty. A stale worker cannot update the terminal row because every attempt and terminal write checks the current token.
   - The lease is not reclaimed for another provider attempt.

---

## 🛠️ Action Dispatch & Execution

Once a claim is secured, [`apps/worker/orchestration.ts`](../apps/worker/orchestration.ts) runs:

1. **Handler Resolution**: Looks up `getActionHandler(actionTypeId)` from [`apps/worker/actions/index.ts`](../apps/worker/actions/index.ts).
2. **Context Creation**:
   ```typescript
   const ctx: ActionContext = {
     zapRunId,
     stage,
     idempotencyKey: `zaprun_${zapRunId}_stage_${stage}`,
     zapRunMetadata: execution.zapDetails.metadata,
   };
   ```
3. **Single provider attempt**:
  - The worker persists one `STARTED` attempt, invokes the selected handler exactly once, and finalizes that attempt as `ACCEPTED`, `REJECTED`, or `UNKNOWN`.
  - A provider response followed by database failure is not retried automatically. The outcome remains unresolved until persistence succeeds or reconciliation records `UNKNOWN`.
4. **State Finalization**:
   - On success: `status = "SUCCESS"`, `leaseUntil = null`, `completedAt = now()`.
   - On terminal failure: `status = "FAILED"`, `leaseUntil = null`, `completedAt = now()`.

### Replay generation (Phase 9A/9B; release disabled)

- A replay event is bound to a stored `ReplayRequest` and its reserved `ReplayExecution`; the Kafka request ID alone grants no authority. Claim-time checks revalidate approval, ownership, evidence, policy, fingerprints, handler version, and the eligible Telegram input identity.
- Within the guarded claim, the worker resolves the destination, message, and explicit bot token once. It passes those selected inputs to the handler without reloading mutable action configuration or re-interpolating the payload after claim.
- The validated successor is stored as `ReplayExecution.nextStage`. A successful replay, including duplicate delivery after a lost progression publication, advances using that stored value rather than recomputing from current configuration.
- Replay `UNKNOWN` is terminal. An expired `RUNNING` replay is recorded as `UNKNOWN`; it is not reclaimed and the provider is never called again. A terminal replay failure or unknown outcome cannot be replayed again under the original approval and does not advance the workflow.
- Phase 9C fault-injection recovery verification uses real PostgreSQL/Kafka fixtures and stubbed providers. It covers authority/history preservation, ordering, kill-switch behavior, terminal UNKNOWN/no resend, and offset handling; it is not evidence of live provider semantics, broker restart, production migration, or rollout behavior.
- Kafka publication and provider execution are separate outcomes: a dispatcher broker ACK records publication, not action completion. `REPLAY_RELEASE_READY` remains false pending separate provider-semantics confirmation, so setting `REPLAY_ENABLED=true` alone cannot enable dispatch or replay execution.

---

## 🪦 Durable Failure Recording

When a provider rejects an action, persistence fails after a provider call, or a lease expires:

1. `execution-store.ts` sanitizes allowlisted evidence and computes SHA-256 action/request fingerprints.
2. One PostgreSQL transaction fences the execution, finalizes the attempt, and creates exactly one linked `ZapRunRetry`. Its UUID is the shared `failureId`.
3. The action worker does not publish Kafka DLQ messages. The separate Phase 3C publisher publishes durable failure rows by `failureId` and stamps `dlqPublishedAt` only after broker acknowledgement. Its reconciler repairs expired or unlinked execution failures using database transactions only.

---

## 📐 Invariants Summary

- **Offset Commit Isolation**: Ordinary offsets are committed only after durable `SUCCESS` or linked durable `FAILED`; replay offsets require a durable terminal result, including terminal `UNKNOWN`. Active leases, unlinked failures, stale ownership, invalid input, and persistence errors remain uncommitted.
- **Lease Boundary**: The default lease duration is `2 minutes`; expiration quarantines the action as unknown rather than reclaiming it for another provider call.
- **Linear Progression**: Stage $N+1$ is only queued if stage $N$ completes with status `SUCCESS`.
- **Replay History**: Replay generations and failures are additive; original failed execution and failure records are immutable history.
- **Replay Outcome**: `UNKNOWN` is terminal and never triggers an automatic resend.
- **Replay Release Gate**: Recovery is verified, but provider semantics are not; live replay remains disabled.
