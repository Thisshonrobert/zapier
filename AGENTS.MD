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
- `/teach` — use only when explicitly requested for learning-oriented explanations.
- `/ponytail` — clean and maintainable implementation practices.

Use these skills when relevant.

Do not duplicate their instructions in this file.

---
## Tool Roles & Model Routing

This project uses a multi-tool pipeline to balance reasoning, context limits, and execution speed.

### 1. Architecture & Master Plan: Astra (ChatGPT)
- Responsible for drafting and expanding `docs/ai-dlq-master-plan.md`.
- Outputs are mutable; implementation realities update the plan.

### 2. Implementation: Codex (GPT-5.6 Sol / Terra)
- Implements the requested master-plan scope, verifies it, and reports changed files, results, and limitations. Learning is handled separately in ChatGPT using GitHub/Notion; do not require teaching sessions, learner checkpoints, lessons, or interview explanations unless explicitly requested.
- **Sol (Flagship):** Production implementation, complex architecture, DB transactions, security, and difficult debugging.
- **Terra (Balanced):** Straightforward implementation, tests, and medium-complexity tasks.
- **Rule:** Implementation agents MUST STOP and report if they find a conflict with the master plan. Do not silently redesign.

### 3. Documentation & Ops: Antigravity (Gemini)
- Responsible for `docs/` updates, `Graphify` milestone updates.
- Handles routine documentation after completed phases and Graphify under the milestone policy above. Codex provides a concise handoff; explicitly scoped feature artifacts such as runbooks and evaluation fixtures remain implementation work.
- Prevents wasting expensive implementation tokens on repository maintenance.


## Token Efficiency & Memory (claude-mem)
- **Scope Boundaries:** Always specify files to read, modify, and ignore in every prompt.
- **File-first memory:** Treat Git, the approved spec/plan, and a concise ignored progress ledger as the source of truth. Do not reconstruct completed work from chat history.
- **claude-mem:** Use it only when the MCP server is configured and available. Retrieve a small task-specific summary, never the full project history. Its absence must not block implementation.
- Use `.agents/skills/token-optimizer` selectively. During implementation, do not run its full audit/state dump unless the user explicitly requests an audit; prefer a compact usage check.

### Token Budget Guardrails

- Default to one agent for ordered work that edits shared files. Use parallel agents only for genuinely independent tasks.
- An approved design or implementation plan is executable authority. Do not create another plan or architecture review unless implementation exposes a concrete conflict or ambiguity.
- Per phase, default to at most two subagent dispatches : one implementer and one final reviewer. Skip per-task reviewers unless the user explicitly requests them or the risk justifies the added cost.
- Use Sol at medium reasoning for architecture, transactions, security, and difficult implementation. Use Terra for bounded mechanical work. Use high reasoning only when explicitly requested or medium reasoning reports a blocker.
- Spawn agents with no inherited conversation history and point them to narrow file-based briefs. Agents must return a short status and write detailed reports to an ignored workspace file.
- Never redispatch interrupted work blindly. First inspect the previous agent status, report, Git diff, and uncommitted files; continue partial work instead of restarting it.
- Keep only one implementation agent active at a time. Do not start duplicate reviewers, planners, or documentation agents for the same phase.
- Do not paste large diagnostics, diffs, generated files, or audit JSON into chat. Save them to files and summarize only decisions, failures, and verification results.
- Prefer one focused verification pass after implementation. Re-run only checks affected by a fix, then run the required repository verification once before completion.
- If planning or coordination consumes substantial usage before production work starts, stop delegation, report the burn, and switch to direct single-agent execution.
- After completing the requested task, run focused verification, summarize changed files and results, then stop; do not begin unrequested follow-up work.

---

## Learning & Implementation Workflow

When introducing a new subsystem, pattern, or dependency:

1. Work incrementally in discrete phases.
2. Test and verify the current phase before proceeding to the next.
3. Finally give handoff prompt for antigravity , which should include doc, graphify and git command file names which should be staged and commited(I will do it manually).
