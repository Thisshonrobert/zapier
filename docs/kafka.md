# Kafka Messaging Architecture

This document specifies the Kafka message topics, schemas, producer/consumer topologies, and offset commit behaviors implemented in the codebase.

---

## 📡 Kafka Topics Overview

| Topic Name           | Purpose                                                                  | Producers                       | Consumers                                                          | Retention / Configuration                                  |
| :------------------- | :----------------------------------------------------------------------- | :------------------------------ | :----------------------------------------------------------------- | :--------------------------------------------------------- |
| **`zap-events`**     | Primary workflow execution queue carrying stage transition events.       | `apps/processor`, `apps/worker` | `apps/worker` (`zap-group`)                                        | Auto-created in local KRaft container; standard retention. |
| **`zap-events-dlq`** | Sanitized publication of durable failures. | Separate Phase 3C publisher | Future triage/reconciliation consumers | Publication is keyed by durable `failureId`; it is evidence delivery, not provider replay. |

---

## 📨 Message Schemas

### 1. `zap-events` Message Schema

Messages on `zap-events` represent a single action stage execution request for a specific workflow run. Ordinary workflow events carry `zapRunId` and `stage` only. Replay dispatch events add `replayRequestId`; the worker routes these to the guarded replay path rather than the ordinary execution path.

```typescript
type ZapEvent = {
  zapRunId: string;         // UUID of the ZapRun record in PostgreSQL
  stage: number;            // 0-indexed sortingOrder stage in the Zap action sequence
  replayRequestId?: string; // UUID of a ReplayRequest row — present only for dispatched replay events
};
```

**Ordinary workflow payload**:

```json
{
  "zapRunId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "stage": 0
}
```

**Replay dispatch payload**:

```json
{
  "zapRunId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "stage": 1,
  "replayRequestId": "a3f1e2d0-5b6c-4f7a-8e9d-0c1b2a3f4e5d"
}
```

> [!IMPORTANT]
> `replayRequestId` is not authorization by itself. When replay is enabled, the worker validates it against a stored `ReplayRequest` and its linked `ReplayExecution` row in a serializable transaction before executing anything. An arbitrary UUID without matching DB state is terminal and cannot invoke a provider. The Phase 9C release gate is currently disabled: replay dispatch is off, and a replay event presented to the worker remains unacknowledged while that gate is closed.

---

### 2. `zap-events-dlq` Message Schema

Messages published to `zap-events-dlq` contain failure context for offline inspection and replay.

```typescript
type DurableFailureEvent = {
  failureId: string; // ZapRunRetry.id
  zapRunId: string; // UUID of the failed ZapRun
  stage: number; // The action stage that failed
  attempt: number; // Provider attempt number, or 0 for not-attempted cases
  providerOutcome: "rejected" | "not_attempted" | "unknown";
  safeCode: string;
  requiresHuman: true;
  failedAt: string; // ISO 8601 timestamp of failure
};
```

**Example Payload**:

```json
{
  "zapRunId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "stage": 1,
  "failureId": "2d8a3a0c-9f4a-4ee6-8b5a-3a4f0f4f4c2a",
  "attempt": 1,
  "providerOutcome": "rejected",
  "safeCode": "provider_rejected",
  "requiresHuman": true,
  "failedAt": "2026-09-16T08:00:00.000Z"
}
```

---

## ⚙️ Producer & Consumer Topology

```mermaid
flowchart LR
    subgraph Producers
        Processor["Processor<br/>(clientId: outbox-processor)"]
        WorkerProducer["Worker Producer<br/>(clientId: worker)"]
        ReplayDispatcher["Replay Dispatcher<br/>(disabled until Phase 9C)"]
    end

    subgraph KafkaBroker["Kafka Broker (localhost:9092)"]
        ZapEventsTopic[("Topic: zap-events")]
        DLQTopic[("Topic: zap-events-dlq")]
    end

    subgraph Consumers
        WorkerConsumer["Worker Consumer Group<br/>(groupId: zap-group)"]
    end

    Processor -->|"Produces {zapRunId, stage: 0}"| ZapEventsTopic
    WorkerProducer -->|"Produces {zapRunId, stage: stage + 1}"| ZapEventsTopic
    ReplayDispatcher -.->|"gated {zapRunId, stage, replayRequestId}"| ZapEventsTopic
  DlqPublisher["Phase 3C publisher"] -->|"Produces sanitized {failureId, ...}"| DLQTopic
    ZapEventsTopic -->|"Consumes (autoCommit: false)"| WorkerConsumer
```

### Producers

1. **Outbox Processor** ([`apps/processor/index.ts`](../apps/processor/index.ts)):
   - `clientId`: `"outbox-processor"`
   - Produces initial stage events (`stage: 0`) to `zap-events`.
2. **Worker Producer** ([`apps/worker/index.ts`](../apps/worker/index.ts)):
   - `clientId`: `"worker"`
  - Produces subsequent ordinary stage events (`stage: stage + 1`) to `zap-events`.
  - After a successful replay, publishes the validated successor stored on that replay's `ReplayExecution`; duplicate successful replay delivery can recover a lost publication from the same stored successor.
  - Does not produce to `zap-events-dlq`. The separate Phase 3C publisher claims due `ZapRunRetry` rows and stamps `dlqPublishedAt` only after broker acknowledgement.

3. **Replay dispatcher** ([`apps/primary_backend/replay-dispatcher-index.ts`](../apps/primary_backend/replay-dispatcher-index.ts)):
  - Publishes immutable replay request identities to the existing `zap-events` topic only when the release gate is enabled.
  - `REPLAY_RELEASE_READY` is currently false, so the dispatcher remains disabled even if `REPLAY_ENABLED=true`. Phase 9C recovery and provider-semantics verification is required before enabling it.

4. **DLQ publisher/reconciler** ([`apps/worker/dlq-publisher-index.ts`](../apps/worker/dlq-publisher-index.ts)):
   - Runs separately from action execution.
   - Publishes bounded, sanitized envelopes keyed by `failureId`.
   - Retries Kafka evidence delivery with bounded backoff, never provider execution.
   - Reconciles expired `PENDING` and unlinked `FAILED` executions without invoking providers.

### Consumers

1. **Worker Consumer** ([`apps/worker/index.ts`](../apps/worker/index.ts)):
   - `clientId`: `"worker"`
   - `groupId`: `"zap-group"`
   - `fromBeginning`: `true`
   - `autoCommit`: `false`

---

## 🔒 Offset Commit & Delivery Semantics

1. **At-Least-Once Delivery**:
   - The system is architected for **at-least-once delivery**. A message may be delivered more than once if a worker crashes before committing offsets or if Kafka rebalances.
2. **Manual Offset Commits**:
   - `autoCommit` is set to `false`.
   - The worker explicitly commits offsets only after an event has been:
       - Successfully executed and status recorded as `SUCCESS`.
       - Skipped due to existing `SUCCESS` or linked `FAILED` status.
       - Expired/failed and recorded as `FAILED` with one linked `ZapRunRetry`.
       - A replay request reaches a durable terminal result; `UNKNOWN` is terminal and does not advance to a successor.
     - Active `PENDING`, unlinked `FAILED`, stale ownership, invalid input, persistence failure, or replay while the 9C gate is closed are not committed.
3. **Commit Syntax**:
   ```typescript
   await consumer.commitOffsets([
     {
       topic,
       partition,
       offset: (parseInt(message.offset) + 1).toString(),
     },
   ]);
   ```
4. **Crash Safety Invariant**:
   - If a worker crashes mid-execution (before offset commit), the Kafka consumer will re-read the message upon restart. The PostgreSQL lease in `ZapRunExecution` prevents duplicate execution.
