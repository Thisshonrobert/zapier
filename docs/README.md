# Zapier Platform Documentation

Welcome to the documentation layer for the Zapier platform repository. This documentation reflects the **current, actual implementation** of the codebase and serves as an architectural baseline for developers and Codex AI agents.

---

## 🗺️ Documentation Map

| Document                                                   | Purpose                                                                                                                          | Primary Components Covered                          |
| :--------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------- |
| [**`architecture.md`**](./architecture.md)                 | High-level system architecture, service topology, external dependencies, and core communication boundaries.                      | Monorepo services, PostgreSQL, Kafka, external APIs |
| [**`repository-structure.md`**](./repository-structure.md) | Monorepo layout, app/package responsibilities, configuration files, entry points, and testing locations.                         | `apps/`, `packages/`, Turborepo, Bun                |
| [**`execution-flow.md`**](./execution-flow.md)             | End-to-end lifecycle trace of a workflow from webhook trigger ingestion to multi-stage action execution.                         | Webhook, Outbox, Processor, Kafka, Worker           |
| [**`kafka.md`**](./kafka.md)                               | Kafka messaging architecture, topics, producers, consumers, consumer groups, offset commit model, and message schemas.           | `zap-events`, `zap-events-dlq`, KafkaJS             |
| [**`worker.md`**](./worker.md)                             | Background worker lifecycle, atomic lease claims, in-process retries, dead-letter routing, and stage progression.                | `apps/worker`, `ZapRunExecution`, `ZapRunRetry`     |
| [**`idempotency.md`**](./idempotency.md)                   | Multi-layered idempotency architecture, key generation, database leases, crash recovery, and external side-effect deduplication. | Outbox, `ZapRunExecution`, Resend headers           |
| [**`actions.md`**](./actions.md)                           | Action registry pattern, metadata template parsing (`{{...}}`), handler contracts, and supported integrations (Email, Telegram). | `apps/worker/actions`, `ActionHandler`, `parse.ts`  |
| [**`current-state.md`**](./current-state.md)               | Honest audit of completed features, known limitations, technical debt, and areas slated for upcoming AI capabilities.            | Full repository feature audit                       |
| [**`decisions.md`**](./decisions.md)                       | Architectural Decision Records (ADRs) derived strictly from the current codebase and database schema.                            | Outbox, lease locking, DLQ dual-sink, hybrid auth   |

---

## 🤖 Guide for Codex & AI Agents

When working on tasks in this repository:

1. **Source of Truth**: The codebase (`apps/`, `packages/`) is the ultimate source of truth. These documents describe what is actually implemented, not hypothetical abstractions.
2. **Architectural Invariants**:
   - Kafka delivery is **at-least-once**.
   - All worker handlers and side effects must remain **idempotent**.
   - Workflow stage execution order (**DAG dependency**) must be strictly preserved.
   - Outbox rows are deleted only **after** the broker acknowledges message receipt.
   - Worker offsets are committed **only after** processing, skipping, or dead-lettering an event.
3. **Phased Development & Teaching**:
   - Before implementing complex changes or new subsystems, explain the planned architecture using `/teach`.
   - Work incrementally in discrete, testable phases.
4. **Verification**:
   - Run verification commands: `bun run check-types`, `bun run lint`, `bun run build`.
   - Worker unit tests: `bun run apps/worker/idempotency.test.ts`, `bun run apps/worker/deadletter.test.ts`, `bun run apps/worker/retry.test.ts`.
