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

- **Fenced Single-Shot Execution**: `ZapRunExecution` uses a per-claim token, durable attempt rows, bounded fingerprints, and 2-minute lease quarantine. A stale worker cannot finalize a newer claim.
- **Durable Failure Evidence**: Terminal `FAILED` state and one linked `ZapRunRetry` row commit atomically with sanitized provider outcome and `requiresHuman` evidence.
- **Kafka ACK Gating**: Only durable `SUCCESS` or linked durable `FAILED` messages are acknowledged. A separate Phase 3C publisher delivers sanitized failure envelopes by `failureId` and stamps `dlqPublishedAt` after broker ACK; its reconciler repairs missing failure coverage without provider calls.
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
2. **Failure publication and replay**:
   - Phase 3C publication and reconciliation are implemented as a separate worker runtime. Human-controlled replay and approval APIs remain unimplemented; DLQ publication never authorizes replay.
3. **Third-Party delivery uncertainty**:
   - Resend requests include an idempotency key and Telegram lacks provider-level idempotency. Provider acceptance followed by persistence failure remains `UNKNOWN` and requires human review; the worker never resends automatically.
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
