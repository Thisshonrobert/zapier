# Current State & Technical Debt

This document provides a factual assessment of what is currently implemented in the repository, identified technical debt, operational limitations, and components expected to evolve during the upcoming AI automation phase.

---

## ✅ Implemented Capabilities

### 1. Ingestion & Outbox Reliability

- **Transactional Outbox**: Atomic database write of `ZapRun` and `ZapRunOutbox` in [`apps/webhook/index.ts`](../apps/webhook/index.ts) ensuring zero message loss on webhook arrival.
- **Outbox Polling Daemon**: [`apps/processor/index.ts`](../apps/processor/index.ts) batches outbox rows, produces to Kafka, and deletes database records only upon broker ACK.
- **Webhook Authorization**: `x-zap-secret` validation on trigger reception.
- **Live Trigger Buffer**: `TestTriggerBuffer` stores test payloads for real-time frontend schema inspection during workflow authoring.

### 2. Execution Engine & Worker Subsystem

- **Distributed Lease Locking**: 2-phase atomic locking via `ZapRunExecution` with `PENDING`, `SUCCESS`, `FAILED` statuses and 2-minute lease duration for crash recovery.
- **In-Process Exponential Retries**: 3 retry attempts with exponential backoff (`1s`, `2s`).
- **Dead-Letter Pipeline (DLQ)**: Dual-sink dead lettering producing to Kafka topic `zap-events-dlq` and logging to table `ZapRunRetry`.
- **Action Extensibility Registry**: Pluggable `ActionHandler` interface with active handlers for Resend Email and Telegram Bot API.
- **Template Expression Parsing**: Dot-notated mustache syntax (`{{data.user.email}}`) resolved against execution metadata.

### 3. API & Management

- **Authentication**: Native username/password signup with bcrypt hashing and JWT generation, alongside Clerk OAuth token exchange endpoint (`POST /api/v1/user/clerk`).
- **Zap CRUD & Inspect**: Creation of ordered multi-action Zaps, listing user workflows, querying execution history, and calculating failure counts.

### 4. Frontend Dashboard & Builder

- **Workflow Builder**: Next.js UI for configuring triggers, adding sequential action nodes, mapping dynamic fields, and testing triggers against live webhook buffers.
- **Inspect & History**: Dedicated pages for viewing Zap details, historical runs, and execution status.

---

## ⚠️ Known Limitations

1. **Linear Workflow DAG Only**:
   - Workflows currently execute strictly as a single linear sequence sorted by `sortingOrder: 0, 1, 2...`.
   - Branching conditions, conditional filtering (`if/else`), parallel execution branches, and loops are not yet modeled in the database schema or worker.
2. **DLQ Replay Mechanism**:
   - Failed events are recorded in `ZapRunRetry` and published to `zap-events-dlq`, but no background replay consumer or manual re-drive UI exists yet to re-ingest dead-lettered events.
3. **Third-Party Idempotency Disparity**:
   - While Resend Email API requests include idempotency tokens, the Telegram Bot API lacks provider-level idempotency headers; safety relies exclusively on the worker's internal database lease.
4. **Single-Threaded Outbox Poller**:
   - `apps/processor` runs an unpartitioned single-instance loop polling the outbox table. At extreme scale, this requires database partitioning or CDC (Change Data Capture) tools like Debezium.

---

## 🛠️ Technical Debt & Codebase Discrepancies

1. **Monorepo `@repo/ui` TypeScript Config**:
   - `packages/ui/tsconfig.json` references `@repo/typescript-config/react-library.json` which is currently not present, causing `bun run check-types` in `@repo/ui` to fail while apps compile independently.
2. **Webhook Error Response Typo**:
   - In [`apps/webhook/index.ts`](../apps/webhook/index.ts#L19), the unauthorized branch uses global `Response.json(...)` rather than Express `res.status(401).json(...)`.
3. **Action Type Seed Sync**:
   - Action and Trigger type IDs (e.g. `"email"`, `"telegram"`) must match both Prisma database seeds in `AvailableAction` / `AvailableTriggerType` and worker `actionRegistry` keys.

---

## 🔮 Expected AI Implementation Touchpoints

The upcoming AI workflow automation phase is anticipated to interact with the following core architectural seams:

- **Dynamic Workflow DAG Graph**: Moving beyond linear `sortingOrder` to support AI-generated branch graphs and conditional step execution.
- **AI Action Handlers**: Registering new `ActionHandler` implementations (e.g., LLM text transformation, summarization, decision evaluation, intelligent routing).
- **Prompt & Tool Context Flow**: Enriching `ActionContext` to support passing prompt templates, dynamic function calling schemas, and previous step outputs into AI nodes.
