# AGENTS.md

## Project Overview

TypeScript monorepo for an event-driven Zapier-style workflow automation platform using Turborepo, Bun, Kafka, and PostgreSQL/Prisma.

---

## Engineering Guide

- Keep code maintainable, Human readable, simple, and testable.
- Follow existing patterns and conventions in the repository.
- Prefer simple solutions over unnecessary abstraction.
- Keep changes focused on the requested task.
- Avoid unrelated refactoring.
- Reuse existing abstractions where appropriate.
- Keep behavior consistent with surrounding code.
- Do not introduce new dependencies or architectural patterns without a clear reason.

---

## Repository Structure

- `apps/`
  - `primary_backend/` — REST API service, auth, zap creation & management
  - `webhook/` — Ingestion endpoints for external webhooks/triggers
  - `processor/` — Pulls pending events and dispatches to Kafka
  - `worker/` — Consumes Kafka messages and executes zap action steps
  - `frontend/` — Web dashboard UI
  - `ai_agent/` — Read-only LangGraph.js investigation service; no replay authority
- `packages/`
  - `db/` — Prisma schema, migrations, and database client
  - `ui/` — Shared UI component library
  - `eslint-config/`, `typescript-config/` — Shared configs
- `docs/` — Architecture specs and design documents
- `graphify-out/` — Structural/semantic knowledge graph

---

## Core Architectural Invariants

- **At-Least-Once Delivery**: Treat Kafka delivery as at-least-once. All workers and action handlers must be strictly idempotent.
- **Dependency Ordering**: Preserve workflow DAG execution order across asynchronous steps.
- **State Consistency**: Execution state and retry logic must remain consistent across failures and retries.
- **Subsystem Boundaries**: Changes to event schemas or database models must not break contracts in downstream consumers.

---

## Tooling & Verification

For lint, build, and type-check commands, read:

`docs/tooling_Verification.md`
---

## Documentation

Project documentation is maintained in `docs/documentation.md`.

Read the relevant documentation when making architectural or cross-cutting changes.

---

## Graphify

Graphify guidance is maintained in `docs/graphify.md`.

Update Graphify only after a major architectural change or major implementation milestone has been completed and pushed to GitHub. Do not update Graphify for every small code change.

---

## Skills

The following project workflow skills are preferred:

- `/superpowers` — planning, execution, testing, and review.
- `/ponytail` — clean and maintainable implementation practices.
- `/frontend-design` and `/Impeccable` -for no ai slop frontend
Use these skills when relevant.

Do not duplicate their instructions in this file.

---
## Tool Roles & Model Routing

This project uses a multi-tool pipeline to balance reasoning, context limits, and execution speed.

### 1. Architecture & Master Plan:
- Responsible for drafting and expanding `docs/ai-dlq-master-plan.md`.
- Outputs are mutable; implementation realities update the plan.

### 2. Implementation
- **Scope:** Implement the approved master-plan scope. Read relevant files, test changes, inspect the diff, and report results and limitations. Teaching is handled in ChatGPT unless requested.
- **Default:** DeepSeek Flash, low/high effort for routine implementation, tests, and fixes.
- **Complex tasks:** Flash at max effort; use DeepSeek Pro only for difficult architecture, transactions, security, or debugging.
- **Rule:** Stop and report any master-plan conflict. Never redesign silently.
- **Handoff:** Report changed files, verification results, limitations, and next steps concisely.

### 3. Documentation 
- Responsible for `docs/` updates, `Graphify` milestone updates.
- Handles routine documentation after completed phases and Graphify under the milestone policy above. Codex provides a concise handoff; explicitly scoped feature artifacts such as runbooks and evaluation fixtures remain implementation work.
- Prevents wasting expensive implementation tokens on repository maintenance.

### Manual Git and Handoff

Manual Git and handoff instructions are maintained in [`docs/manualgit_handoff.md`](docs/manualgit_handoff.md).


## Token Efficiency & Memory (claude-mem)
- **Scope Boundaries:** Always specify files to read, modify, and ignore in every prompt.
- **File-first memory:** Treat Git, the approved spec/plan, and a concise ignored progress ledger as the source of truth. Do not reconstruct completed work from chat history.
- **claude-mem:** Use it only when the MCP server is configured and available. Retrieve a small task-specific summary, never the full project history. Its absence must not block implementation.
- Use `.agents/skills/token-optimizer` selectively. During implementation, do not run its full audit/state dump unless the user explicitly requests an audit; prefer a compact usage check.

### Token Budget Guardrails

Follow the detailed [token budget guardrails](docs/token-budget-guardrails.md).

---

## Learning & Implementation Workflow

When introducing a new subsystem, pattern, or dependency:

1. Work incrementally in discrete phases.
2. Test and verify the current phase before proceeding to the next.
3. Follow the [manual Git and handoff guidance](docs/manualgit_handoff.md) and give analaysed prompt for next phase where it mentions only the needed file to read before starting the phase to optimise token spent.
