# Repository Documentation

This document serves as the primary index and navigation reference for all technical documentation in the repository.

---

## 📚 Core Documentation Index

| Document                                                   | Description                                                                                                                                                  |
| :--------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [**`architecture.md`**](./architecture.md)                 | High-level system topology, application roles (`primary_backend`, `webhook`, `processor`, `worker`, `frontend`), and communication boundaries.               |
| [**`repository-structure.md`**](./repository-structure.md) | Monorepo layout, package responsibilities, key entry points, test suites, and configuration files.                                                           |
| [**`execution-flow.md`**](./execution-flow.md)             | End-to-end workflow lifecycle sequence: webhook ingestion $\rightarrow$ outbox persistence $\rightarrow$ Kafka queuing $\rightarrow$ worker stage execution. |
| [**`kafka.md`**](./kafka.md)                               | Kafka messaging architecture, topics (`zap-events`, `zap-events-dlq`), schemas, consumer groups, and manual offset commit model.                             |
| [**`worker.md`**](./worker.md)                             | Background worker lifecycle, distributed 2-phase database leases (`ZapRunExecution`), in-process retries, and dead-letter routing.                           |
| [**`idempotency.md`**](./idempotency.md)                   | Multi-layered deduplication strategy (Transactional Outbox $\rightarrow$ Broker ACK $\rightarrow$ DB Execution Lease $\rightarrow$ External API headers).    |
| [**`actions.md`**](./actions.md)                           | Action registry pattern, `ActionHandler` contracts, `{{expression}}` template parsing, and Email / Telegram integrations.                                    |
| [**`current-state.md`**](./current-state.md)               | Detailed audit of implemented features, known limitations, technical debt, and future AI touchpoints.                                                        |
| [**`decisions.md`**](./decisions.md)                       | Architectural Decision Records (ADRs 001–007) documenting core design choices and trade-offs.                                                                |
| [**`graphify.md`**](./graphify.md)                         | Guidance on consulting and updating the repository knowledge graph.                                                                                          |

---

## 🧭 Navigation Guidelines for Agents & Developers

- **Making Architectural / Cross-Cutting Changes**: Always read [`architecture.md`](./architecture.md), [`execution-flow.md`](./execution-flow.md), and [`decisions.md`](./decisions.md) before proposing changes to data flow or message schemas.
- **Adding / Modifying Action Steps**: Consult [`actions.md`](./actions.md), [`idempotency.md`](./idempotency.md), and [`worker.md`](./worker.md).
- **Extending Messaging / Queuing**: Review [`kafka.md`](./kafka.md) and [`worker.md`](./worker.md).
- **AI Implementation**: Document new AI-specific systems under `docs/ai/` once designs are established.
