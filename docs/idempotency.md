# Idempotency & Deduplication

In an event-driven workflow system with **at-least-once** Kafka delivery, duplicate message deliveries, worker crashes, network timeouts, and consumer group rebalances are inevitable. This document outlines how idempotency is designed, enforced, and propagated across every layer of the platform.

---

## 🛡️ Multi-Layered Idempotency Architecture

The platform provides a defense-in-depth idempotency strategy spanning four distinct architectural tiers:

```mermaid
flowchart TD
    subgraph Tier1["Tier 1: Ingestion Layer (Transactional Outbox)"]
        WebhookReq["Incoming Webhook POST"] --> OutboxTx["DB Transaction: ZapRun + ZapRunOutbox<br/>(Deduplication against lost events)"]
    end

    subgraph Tier2["Tier 2: Outbox Publishing (Broker ACK Boundary)"]
        OutboxTx --> PollOutbox["Processor: Polls ZapRunOutbox"]
        PollOutbox --> SendKafka["Send to Kafka: zap-events"]
        SendKafka --> DeleteOutbox["DELETE ZapRunOutbox ONLY on Broker ACK"]
    end

    subgraph Tier3["Tier 3: Distributed Execution Leases (PostgreSQL)"]
        SendKafka --> Consume["Worker consumes {zapRunId, stage}"]
        Consume --> ClaimLease["claimExecution(): INSERT / SELECT on ZapRunExecution<br/>Unique Key: (zapRunId, stage)"]
        ClaimLease --> CheckStatus{Status & Lease}
        CheckStatus -- "SUCCESS" --> SkipExec["Skip Handler (Already Done)"]
        CheckStatus -- "Active PENDING" --> SkipRace["Skip (Other worker active)"]
        CheckStatus -- "Expired PENDING / New" --> ExecAction["Execute Action Handler"]
    end

    subgraph Tier4["Tier 4: External API Idempotency"]
        ExecAction --> GenKey["Generate Key: zaprun_${zapRunId}_stage_${stage}"]
        GenKey --> ResendCall["Resend Email API<br/>Headers: 'Idempotency-Key' & 'X-Entity-Ref-ID'"]
    end
```

---

## 🔑 Idempotency Key Specification

### Key Formulation

In [`apps/worker/index.ts`](../apps/worker/index.ts#L209), the worker generates a deterministic, unique idempotency token for every action stage:

$$\text{idempotencyKey} = \texttt{"zaprun\_" + zapRunId + "\_stage\_" + stage}$$

- `zapRunId`: The unique UUID representing the trigger event execution instance.
- `stage`: The 0-indexed integer corresponding to the position of the action in the workflow DAG sequence (`sortingOrder`).

---

## 🧱 Tier-by-Tier Enforcement

### 1. Ingestion: Transactional Outbox ([`apps/webhook/index.ts`](../apps/webhook/index.ts))

- Webhook payloads are inserted into `ZapRun` and `ZapRunOutbox` inside a single ACID database transaction.
- Prevents split-brain state where a webhook is acknowledged to the sender but lost before reaching the message bus.

### 2. Event Dispatch: ACK-Before-Delete ([`apps/processor/index.ts`](../apps/processor/index.ts))

- The outbox processor awaits Kafka confirmation (`await producer.send(...)`) before issuing `prisma.zapRunOutbox.deleteMany(...)`.
- If the processor crashes or Kafka is unreachable, outbox rows remain intact and will be re-polled and re-sent.

### 3. Worker Execution: Two-Phase Lease Claim ([`apps/worker/index.ts`](../apps/worker/index.ts))

- Enforced by PostgreSQL table `ZapRunExecution` with unique constraint `@@unique([zapRunId, stage])`.
- **Duplicate Kafka Deliveries**: If Kafka redelivers `{ zapRunId, stage: 0 }` after a stage has already finished, `claimExecution()` detects `status === "SUCCESS"` and skips action dispatch completely.
- **Worker Crash Recovery**: If a worker dies while `status === "PENDING"`, other workers wait until `leaseUntil` expires before atomically reclaiming the lease via `updateMany`.

### 4. External Provider Side Effects

- **Resend Email API** ([`apps/worker/actions/email.ts`](../apps/worker/actions/email.ts)):
  The handler attaches the idempotency token to both HTTP headers:
  ```typescript
  headers: {
    "Idempotency-Key": ctx.idempotencyKey,
    "X-Entity-Ref-ID": ctx.idempotencyKey,
  }
  ```
  If Resend experiences network timeouts during retry attempts, Resend's API deduplicates against the token and prevents duplicate emails.
- **Telegram Bot API** ([`apps/worker/actions/telegram.ts`](../apps/worker/actions/telegram.ts)):
  _Current Limitation_: The Telegram Bot API does not natively support client-supplied idempotency tokens on `sendMessage`. Deduplication relies entirely on Tier 3 (the worker's `ZapRunExecution` lease gate).

---

## 🧪 Verification & Test Coverage

The idempotency model is covered by automated unit tests in [`apps/worker/idempotency.test.ts`](../apps/worker/idempotency.test.ts):

- **Scenario A**: Normal single-run lease acquisition, execution, and transition to `SUCCESS`.
- **Scenario B**: Immediate Kafka redelivery after `SUCCESS` (skips side-effect execution).
- **Scenario C**: Worker crash during `PENDING` (expired lease is safely reclaimed after timeout).
- **Scenario D**: Concurrent worker race condition (second worker is blocked by active lease).
- **Scenario E**: Terminal failure (transition to `FAILED` with DLQ emission).
