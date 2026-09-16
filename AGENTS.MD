# AGENTS.md

## Project Overview
TypeScript monorepo for an event-driven Zapier-style workflow automation platform using Turborepo, Bun, Kafka, and PostgreSQL/Prisma.
---

## Engineering Guide

- Keep code maintainable, readable, simple, and testable.
- Follow existing patterns and conventions in the repository.
- Prefer simple solutions over unnecessary abstraction.
- Keep changes focused on the requested task.
- Avoid unrelated refactoring.
- Reuse existing abstractions where appropriate.
- Keep behavior consistent with surrounding code.
- Do not introduce new dependencies or architectural patterns
  without a clear reason.
- Preserve existing functionality unless the task explicitly
  requires changing it.

---


## Repository Structure
- `apps/`
  - `primary_backend/` — REST API service, auth, zap creation & management
  - `webhook/` — Ingestion endpoints for external webhooks/triggers
  - `processor/` — Pulls pending events and dispatches to Kafka
  - `worker/` — Consumes Kafka messages and executes zap action steps
  - `frontend/` — Web dashboard UI
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

## Tooling & Verification Commands
Package manager: `bun` (Turborepo)
Always verify changes using:
- Type check: `bun run check-types`
- Lint: `bun run lint`
- Build: `bun run build`
Do not claim tests or type checks passed without executing verification.

---

## Graphify

Graphify provides a generated structural/semantic representation
of the repository.

Use Graphify when repository relationships, dependencies, call
paths, or architectural structure need to be investigated.

After significant code or architectural changes, update the
Graphify output so that it does not become stale.

The source code remains the source of truth.

---

## Documentation

Keep detailed architecture and design information in `docs/`
rather than expanding this file unnecessarily.

Document significant architectural decisions and important
tradeoffs.

AI-specific architecture should be documented under `docs/ai/`
once the design is established.

---

## Skills

The following project workflow skills are preferred:

- `/superpowers` — planning, execution, testing, and review.
- `/teach` — learning-oriented explanations during implementation.
- `/ponytail` — clean and maintainable implementation practices.

Use these skills when relevant.

Do not duplicate their instructions in this file.
---
## Learning & Implementation Workflow
When introducing a new subsystem, pattern, or dependency:
1. Work incrementally in discrete phases.
2. Before implementing each phase, explain the relevant architecture, tradeoffs, and code changes using `/teach`.
3. Test and verify the current phase before proceeding to the next.
4. Update `graphify-out/` after major architectural refactors.