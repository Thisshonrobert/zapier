# Architectural Decision Records (ADRs)

This document records the foundational architectural decisions established in the current codebase and explicitly marked proposals for the AI triage layer. Proposed decisions are not implemented guarantees.

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

## ADR 003: Fenced Single-Shot Execution via PostgreSQL

- **Status**: Implemented
- **Files**: [`packages/db/prisma/schema.prisma`](../packages/db/prisma/schema.prisma), [`apps/worker/index.ts`](../apps/worker/index.ts), [`apps/worker/idempotency.test.ts`](../apps/worker/idempotency.test.ts)
- **Decision**: Worker step execution is guarded by the `ZapRunExecution` table using `(zapRunId, stage)` and a per-claim `claimToken`. A worker persists `STARTED` attempt evidence, invokes the provider once, and fences every terminal write by execution ID, `PENDING` status, and token. Expired leases become `FAILED`/`UNKNOWN` with human review and are never reclaimed for another provider call.
- **Rationale**: At-least-once Kafka delivery requires duplicate suppression and stale-worker fencing, but PostgreSQL cannot atomically commit with an external provider. Durable attempt evidence and bounded fingerprints make uncertainty explicit without claiming exactly-once external delivery. See proposed ADR 013 before adding replay.

---

## ADR 004: Durable Failure Record and Separate DLQ Publication

- **Status**: Implemented
- **Files**: [`apps/worker/execution-store.ts`](../apps/worker/execution-store.ts), [`packages/db/prisma/schema.prisma`](../packages/db/prisma/schema.prisma)
- **Decision**: The action worker atomically persists terminal `FAILED` execution state, one linked `ZapRunExecutionAttempt` outcome, and one `ZapRunRetry` row. A separate Phase 3C runtime claims due retry rows, publishes sanitized failure envelopes to `zap-events-dlq` keyed by the retry UUID `failureId`, and stamps `dlqPublishedAt` only after broker acknowledgement. Reconciliation repairs expired or unlinked execution failures transactionally and never invokes providers.
- **Rationale**: PostgreSQL is the execution source of truth. Separating durable failure recording from Kafka publication prevents broker failure from erasing evidence, while fenced claims and bounded backoff make publication retryable without retrying provider side effects.

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

## ADR 007: Manual Kafka Offset Commit After Durable Resolution

- **Status**: Implemented
- **Files**: [`apps/worker/index.ts`](../apps/worker/index.ts)
- **Decision**: Kafka consumer `autoCommit` is disabled (`autoCommit: false`). Offsets are explicitly committed only after durable `SUCCESS` or linked durable `FAILED`; active `PENDING`, stale ownership, unlinked failures, invalid input, and persistence errors remain uncommitted.
- **Rationale**: Automatic or premature commits can lose unresolved work. Redelivery must retry persistence or observe the terminal row, never invoke the provider again automatically.

---

## ADR 008: No Automatic Provider Retry in Execution

- **Status**: Implemented
- **Files**: [`apps/worker/orchestration.ts`](../apps/worker/orchestration.ts), [`apps/worker/execution-store.ts`](../apps/worker/execution-store.ts)
- **Decision**: The worker invokes a provider once per valid claim. Rejected and uncertain outcomes become durable sanitized failure evidence; no automatic provider retry or replay is performed.
- **Rationale**: A provider may accept a request before PostgreSQL records the result. Retrying to resolve that ambiguity can duplicate an external side effect. Human-controlled future replay is outside Phase 3B.

---

## ADR 009: Read-only single-agent triage boundary

- **Status**: Accepted; fixture-only Phase 1 migrated to TypeScript/LangGraph.js 2026-09-21. Production integration remains proposed.
- **Context**: The backend, Kafka worker and DLQ foundation exist. The AI runtime currently handles synthetic fixtures only. Triage is a separate control workflow, not an AI action in a user's Zap.
- **Decision**: Start with one bounded LangGraph.js workflow in a separate Express workspace at `apps/ai_agent/`, first against synthetic fixtures. Zod validates service/tool/output contracts. The primary backend later authenticates and binds ownership; deterministic application code retains approval/policy/replay authority and the worker remains executor. Use durable PostgreSQL checkpoints before real HITL.
- **Alternatives / consequences**: This supersedes the short-lived Python/FastAPI Phase 1 implementation. Reusing TypeScript/Bun lowers learning and operational overhead while preserving a separate process and trust boundary. No existing application is rewritten. The model receives no Prisma client, shell or producer. See ADR 018 for ownership and integration.
- **Plan**: [Boundary and state](ai-dlq-master-plan.md#3-boundaries-state-and-initial-contracts).

## ADR 010: Scenario-derived read-only tools and evidence provenance

- **Status**: Proposed.
- **Context**: Current failures concern email/Telegram, execution state and evidence gaps; an arbitrary log-search platform does not exist.
- **Decision**: Start with four scoped tools: failure context, execution evidence, pure input validation and runbook search. Bind owner/run/stage in server code. Return redacted, bounded, versioned evidence with explicit unavailable/simulated fields. Discover SQL retry cases deterministically before adding a Kafka triage consumer.
- **Alternatives / consequences**: No speculative tool catalog, generic SQL/HTTP/shell or provider send-to-test. Missing facts lead to abstention. Tool additions require a taxonomy case that cannot be investigated with current capabilities. SQL-only discovery does not claim Kafka-only or lost-sink coverage.
- **Plan**: [Failure taxonomy](AI/failure-taxonomy.md), [tool contracts](ai-dlq-master-plan.md#four-tool-contracts).

## ADR 011: Small simulated runbook corpus with simple retrieval

- **Status**: Proposed.
- **Context**: There are no real production runbooks, and existing architecture docs are not an incident history.
- **Decision**: Six labelled simulated Markdown runbooks cover the taxonomy; reuse links to existing docs. Heading-based sections, metadata filters and deterministic lexical retrieval return a few cited excerpts. Distinguish procedural knowledge from observed incident evidence.
- **Alternatives / consequences**: No whole-repo ingestion, embeddings, vector database or GraphRAG initially. Evaluate against a no-retrieval baseline. Add semantic retrieval only when held-out retrieval failures justify it. Retrieved text cannot override application policy.
- **Plan**: [Runbook design](ai-dlq-master-plan.md#4-failure-taxonomy-and-the-minimum-rag-corpus).

## ADR 012: Durable approval with independent deterministic safety

- **Status**: Proposed.
- **Context**: LangGraph interruption is control flow; JWT authentication alone does not authorize a particular replay.
- **Decision**: Deterministic application code validates policy and persists immutable proposals and owner approvals. LangGraph.js uses durable interrupt/resume to reflect the decision; it does not grant replay authority. Persist approval first, deliver resume idempotently by decision ID and reconcile lost notifications. All initial replay requires approval. Reject stale/expired/wrong-owner/concurrent decisions; consume approval once. Recheck policy after waiting and at execution. Interrupted nodes perform no pre-interrupt side effects.
- **Alternatives / consequences**: No confidence-threshold authorization or in-memory production approval. A hard block, including unknown external delivery, cannot be overridden by clicking approve. Durable audit/checkpoint failures fail closed; trace export failures do not. Credentials and payload repairs stay manual and outside the agent.
- **Plan**: [Persistence/API](ai-dlq-master-plan.md#persistence-api-and-run-ownership-introduced-in-phase-8), Phase 8.

## ADR 013: Application-owned same-input replay with durable intent

- **Status**: Proposed; prerequisite for live replay.
- **Context**: Existing FAILED rows are terminal. The ingestion outbox only publishes stage zero. DLQ writes can both fail, and leases do not prove external non-delivery. There is no replay service today.
- **Decision**: Record an approved ReplayRequest transactionally, use it as a durable dispatch outbox, and integrate a guarded request/generation-aware claim into the existing worker. Validate ownership, versions, prerequisites, request fingerprint, provider safety and bounded replay count. Preserve run/stage identity, provider key and prior SUCCESS rows. Repeated messages consume no second authorization.
- **Alternatives / consequences**: Do not raw-republish FAILED, delete execution rows, reset SUCCESS, create a new run to evade idempotency, or expose replay to the LLM. Initial scope excludes changed side-effect inputs, bulk replay and ambiguous Telegram delivery. Add evidence, fencing/timeouts and real concurrency/crash tests before enabling. Provider deduplication has a finite validity window; it is not a permanent guarantee.
- **Plan**: [Replay protocol and gate](ai-dlq-master-plan.md#5-deterministic-replay-design-and-release-gate), Phases 3, 8–9.

## ADR 014: Langfuse traces linked to versioned evaluations

- **Status**: Proposed.
- **Context**: Agent quality needs evidence beyond successful execution, but telemetry is not business authorization.
- **Decision**: Use one TypeScript Langfuse integration in its planned phase for redacted graph/model/tool/retrieval traces, correlated across HTTP with investigation, model/prompt/evidence/runbook versions and approval/replay outcomes. Keep authoritative audit in PostgreSQL. Turn reviewed, redacted traces into labelled datasets. Start deterministic code evaluators with fixtures; add calibrated semantic judging only after those checks work.
- **Alternatives / consequences**: No required duplicate tracing platform or self-hosted telemetry stack in the first agent phase. Langfuse outages must not prevent diagnosis. Judges assess grounding/usefulness; they cannot override schema, ownership, ordering, approval or replay safety. Do not automatically label traces using the agent's own answer.
- **Plan**: Phases 7, 11–12 in the [master plan](ai-dlq-master-plan.md).

## ADR 015: Defer supervisors and specialist agents

- **Status**: Proposed deferral.
- **Context**: Two providers and a bounded evidence set do not currently require independent agents.
- **Decision**: One investigator with deterministic nodes/tools. Use normal function/subgraph decomposition first. Revisit only after labelled failure analysis and comparative experiments demonstrate benefit from independent specialist reasoning at an acceptable latency/cost, without weakening safety.
- **Alternatives / consequences**: Node count or a desire to demonstrate multi-agent tooling is insufficient. Any future specialists retain read-only scopes and share no replay authority.
- **Plan**: Phase 15 in the [master plan](ai-dlq-master-plan.md).

## ADR 016: MCP is an optional interoperability adapter

- **Status**: Proposed deferral.
- **Context**: Agent tools and the existing application can integrate through scoped internal contracts; same-language services do not require MCP.
- **Decision**: Use typed TypeScript tool functions with a bounded backend HTTP client. Add MCP only for an actual additional client, exposing the same authenticated read-only contracts with unchanged policy boundaries.
- **Alternatives / consequences**: No MCP server is required for RAG, tool use, observability or approval. A later adapter must prove owner isolation and contract parity; it does not gain a replay/write capability.
- **Plan**: Optional MCP phase in the [master plan](ai-dlq-master-plan.md).

## ADR 017: Authenticated progress streaming over existing backend

- **Status**: Proposed.
- **Context**: The frontend uses app JWT Bearer headers. Graph streaming does not provide browser authorization, durable event history or job ownership.
- **Decision**: The agent service persists sanitized graph milestones and exposes a private Express stream; the primary backend proxies it through an owner-authorized SSE endpoint. Use fetch streaming with the existing browser token format; reconnect by sequence and fall back to a persisted snapshot. Durable investigation execution is independent of either HTTP connection. Test proxy buffering, disconnects and backpressure.
- **Alternatives / consequences**: No tokens in URLs, raw model reasoning, full graph-state dump, new WebSocket service or separate frontend. Extend existing Next.js inspect/history views; distinguish queued, executed and unknown outcomes.
- **Plan**: Phases 10 and 13 in the [master plan](ai-dlq-master-plan.md).

## ADR 018: TypeScript agent-service ownership and internal contracts

- **Status**: TypeScript/Bun/Express/Zod/LangGraph.js selected by user; independent Phase 1 service implemented, production integration proposed.
- **Context**: A separate Python stack distracted from the intended AI-system learning. Existing backend, worker, Kafka infrastructure and frontend are already TypeScript/Bun and remain in place.
- **Decision**: Add `apps/ai_agent/` as a separate monorepo workspace. It owns LangGraph.js, read-only tool adapters, later RAG/evaluations/Langfuse and PostgreSQL agent jobs/checkpoints/progress in its own schema. The primary backend owns workflow reads/validation, owner bindings, proposal/approval records, safety policy and deterministic replay. Prisma migrations own application tables; agent checkpoint setup owns only its tables. No shared writable ORM model or dual migration ownership.
- **Integration**: Keep browser authentication in the primary backend. Use private authenticated HTTP calls with short-lived owner/case/investigation scopes; recheck ownership in evidence APIs. Zod validates versioned JSON contracts on both sides with shared fixtures. Authoritative input validation reuses worker semantics rather than duplicating the parser. Backend-computed fingerprints cross the boundary unchanged.
- **Failure semantics**: Store immutable proposals and decisions in application tables before notifying the agent. Reconcile missed idempotent resume notifications; checkpoints and approvals are not one distributed transaction. Graph resumption never authorizes or dispatches replay. Restrict the agent DB role to its own schema and give it no workflow-topic producer capability.
- **Consequences**: A separate process still requires lifecycle management, contract testing, deadlines, tracing correlation and deployment, but there is one language/toolchain. Use existing Kafka only when justified in later intake phases, with a distinct consumer group. Defer DB/Kafka/RAG/Langfuse in the fixture-only first phase.
- **Plan**: [Service contract](ai-dlq-master-plan.md#agent-service-contract), Phases 1, 4, 8–10.
