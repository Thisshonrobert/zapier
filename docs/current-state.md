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

#### Phase 9A/9B Replay Foundation (Not Release-Enabled)

- Replay history is additive: immutable `ReplayRequest` records and separate `ReplayExecution`, attempt, and failure rows preserve the original failed execution, attempts, and failure evidence.
- The guarded claim revalidates authorization, ownership, policy, fingerprints, handler version, and ordering. It resolves the eligible Telegram destination, message, and explicit bot token once at claim time and passes those selected inputs directly to the handler.
- The validated successor is stored in `ReplayExecution.nextStage`; successful replay and duplicate-delivery recovery use that stored successor rather than reloading mutable workflow configuration.
- Replay `UNKNOWN` is terminal. Expired replay leases and ambiguous provider/persistence outcomes do not trigger another provider call, workflow advancement, or reuse of approval.
- Live replay remains disabled pending Phase 9C recovery and provider-semantics verification. `REPLAY_RELEASE_READY` is false, so `REPLAY_ENABLED=true` cannot enable the dispatcher or worker replay path.

### 3. API & Management

- **Authentication**: Native username/password signup with bcrypt hashing and JWT generation, alongside Clerk OAuth token exchange endpoint (`POST /api/v1/user/clerk`).
- **Zap CRUD & Inspect**: Creation of ordered multi-action Zaps, listing user workflows, querying execution history, and calculating failure counts.
- **Phase 4A-4C read-only triage boundary**: Authenticated `GET /api/v1/triage/cases` lists only the owner's joined retry cases. Owner checks are repeated before each evidence read, including failure context, bounded execution evidence, and deterministic action-input validation. The primary backend signs a case-, operation-, investigation-, and correlation-bound service scope for the private agent boundary; the agent and backend both verify its HMAC, audience, expiry, operation, route binding, and correlation ID.

### 4. AI Triage Evidence

- **Failure context**: Returns bounded provider/error facts, redacted final errors, and payload/action structure summaries. Raw payload values and credential-like data are not exposed to the agent.
- **Execution evidence**: Returns bounded attempt history, current execution state, predecessor states, fingerprints, ordering status, and provenance. Captured, reconciled, and legacy evidence are distinct; missing relations, truncated history, and ambiguous ordering are reported as unavailable or incomplete.
- **Deterministic input validation**: Uses the worker's authoritative action registry and parser semantics to classify valid, invalid, or blocked inputs, including missing required fields, invalid types, missing template paths, and credential presence indicators. It does not execute handlers or call providers.
- **Bounds and contracts**: Strict shared Zod contracts reject unknown or oversized values. Backend reads time out after 2 seconds, agent-to-backend reads after 2 seconds, primary-to-agent reads after 3 seconds, and agent responses over 32 KiB are rejected. Evidence is versioned, hashed, redacted, and marked with explicit unknowns and completeness flags.

Required service configuration is `TRIAGE_SERVICE_SECRET` (the same 32-or-more-character secret in both services). `AI_AGENT_URL` configures the primary backend's agent address and `PRIMARY_BACKEND_URL` configures the agent's backend address; both default to loopback URLs for local development and should be set explicitly outside it.

Phase 4 verification completed with 65 focused tests, 3 PostgreSQL integration tests, and passing type check, lint, and build. The repository checks reported the existing Next/Yarn-Corepack warnings; no new implementation or schema change is implied by those warnings.

### 4.1 Phase 5 simulated runbooks and retrieval

- Six labelled simulated runbooks cover taxonomy cases F01 through F10: transient provider failures, credentials and destinations, template/registry/stage validation, uncertain delivery, replay/stale cases, and evidence gaps.
- `searchRunbooks` indexes only an allowlist of bounded Markdown files and sections. Retrieval is deterministic keyword overlap with taxonomy/provider metadata filters, at most three results, and citation-order tie breaking.
- Matches include versioned citations and SHA-256 content hashes. Documents marked `status: stale` are explicitly excluded, duplicate citations are rejected, and retrieved text is marked as untrusted procedural guidance that cannot change policy.
- Phase 5 retrieval coverage includes labelled retrieval, no-match behavior, bounds, stable ties, citation integrity, malicious/conflicting text, duplicate citations, and stale documents.
- Verification recorded: 8 focused retrieval tests passed; root type-check passed; root build passed with existing Yarn/Corepack warnings; independent review found no remaining Critical or Important findings. Root lint remains blocked by unrelated existing frontend issues (9 errors and 22 warnings). The full AI-agent suite has unrelated failures because the pre-existing modified `apps/ai_agent/evaluation/cases.jsonl` contains a non-JSON comment on line 28.
- Phase 4 contracts remain unchanged. Phase 5 is read-only retrieval only; embeddings, vector databases, reranking, repository ingestion, Phase 6 graph integration, approval, replay, and frontend triage integration are not implemented.

### 4.2 Phase 6 bounded transient diagnosis graph

- **Transient StateGraph**: LangGraph.js workflow in [`apps/ai_agent/src/graph.ts`](../apps/ai_agent/src/graph.ts) executing `gatherEvidence` (fetching failure context, execution evidence, and input validation concurrently), `retrieveGuidance` (deterministic runbook retrieval), and `diagnose` (LLM generation and structured validation).
- **Support-operator disposition taxonomy**: Maps diagnosis outcomes into explicit support-operator dispositions:
  - Dispositions: `replay_candidate`, `owner_action_required`, `engineering_escalation_required`, `insufficient_evidence`, `outcome_unknown`, `duplicate_or_stale`, `resolved_without_replay`.
  - Proposal kinds: `wait_then_replay`, `request_manual_fix`, `escalate`, `no_action`.
- **Grounding and safety guardrails**:
  - `assertSameCanonicalSource` enforces that evidence across failure context, execution evidence, and input validation originates from the exact same `case_id`, `zap_run_id`, and `stage`.
  - `issueForOutput` and `validateGrounding` verify that all cited `evidence_refs` were actually observed, cited `runbook_citations` match retrieved runbooks, dispositions strictly map to valid proposal kinds, rate-limit 429 failures map to F01 taxonomy and compute `not_before` cooldown timestamps, and unsupported replay candidates are rejected.
- **Abstention behavior**: Automatically abstains (`status: "abstained"`, disposition `insufficient_evidence` or `outcome_unknown`) when evidence is incomplete, delivery outcome is unknown (e.g. F07 transport timeouts), or contradictory provider outcomes exist across attempts.
- **Model-adapter boundary**: [`apps/ai_agent/src/gemini-model.ts`](../apps/ai_agent/src/gemini-model.ts) implements `IntegratedDiagnosisModel` wrapping Gemini structured JSON output via `GEMINI_DIAGNOSIS_SCHEMA`. Includes fallback mock adapters for deterministic offline testing and prompt construction in [`apps/ai_agent/src/prompts.ts`](../apps/ai_agent/src/prompts.ts) (supporting a single schema repair attempt).
- **Budgets & deadlines**: Enforces 15s model timeout (`modelTimeoutMs`), 60s investigation deadline (`investigationTimeoutMs`), max 8 tool calls, max 12 graph steps, max 8,000 output tokens, max 48,000 prompt characters, and max 1 schema repair attempt.
- **Private scoped endpoint**: Exposes `POST /api/v1/triage/diagnose` on `apps/ai_agent` (`diagnosis-http.ts`), secured by service scope JWT verifying `TRIAGE_SERVICE_SECRET`, requiring `failure_context`, `execution_evidence`, and `validate_action_inputs` operation claims, and validating `x-correlation-id` header matching. Called by primary backend's `TriageAgentClient`.
- **Phase boundary**: Phase 6 diagnosis remains bounded and read-only. Later Phase 8 persistence, operator authorization, policy, and approval, plus Phase 9A/9B additive replay request/worker support, are separate layers; live replay is still blocked by the Phase 9C gate. Frontend triage UI remains unimplemented.

### 5. Frontend Dashboard & Builder

- **Workflow Builder**: Next.js UI for configuring triggers, adding sequential action nodes, mapping dynamic fields, and testing triggers against live webhook buffers.
- **Inspect & History**: Dedicated pages for viewing Zap details, historical runs, and execution status.

---

## ⚠️ Known Limitations

1. **Linear Workflow DAG Only**:
   - Workflows currently execute strictly as a single linear sequence sorted by `sortingOrder: 0, 1, 2...`.
   - Branching conditions, conditional filtering (`if/else`), parallel execution branches, and loops are not yet modeled in the database schema or worker.
2. **Failure publication and replay**:
   - Phase 3C publication and reconciliation are implemented as a separate worker runtime; DLQ publication never authorizes replay. Phase 8 approval and Phase 9A/9B replay groundwork are implemented, but live replay remains disabled until Phase 9C recovery and provider-semantics checks pass.
3. **Third-Party delivery uncertainty**:
   - Resend requests include an idempotency key and Telegram lacks provider-level idempotency. Provider acceptance followed by persistence failure remains `UNKNOWN` and requires human review; the worker never resends automatically.
4. **Single-Threaded Outbox Poller**:
   - `apps/processor` runs an unpartitioned single-instance loop polling the outbox table. At extreme scale, this requires database partitioning or CDC (Change Data Capture) tools like Debezium.
5. **Triage UI and replay release gate**:
   - Phases 4, 5, and 6 provide bounded evidence gathering, simulated runbook retrieval, and read-only LLM diagnosis; Phase 8 adds durable investigation, operator authorization, policy, and approval. Phase 9A/9B adds the gated additive replay path. Frontend triage screens remain unimplemented, and live replay provider calls remain unavailable until 9C passes.

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

The Phase 4 live evidence boundary is the implemented exception to the former fixture-only description: it is a read-only investigation surface and does not change worker execution authority or external side effects.
