# Repository Structure

This repository is a TypeScript monorepo configured with [Turborepo](https://turbo.build/) and managed with the [Bun](https://bun.sh/) package manager.

---

## 📁 Directory Tree Overview

```text
.
├── apps/
│   ├── frontend/            # Next.js 16 App Router UI dashboard
│   ├── ai_agent/            # Read-only LangGraph.js DLQ triage service
│   ├── primary_backend/     # Express REST API for auth, zap management, and catalog
│   ├── processor/           # Outbox poller daemon publishing events to Kafka
│   ├── webhook/             # Ingestion service for webhooks and trigger test buffering
│   └── worker/              # Kafka consumer executing action steps and handling DLQ
├── packages/
│   ├── db/                  # Prisma 6 schema, migrations, and shared DB client
│   ├── ui/                  # Shared React UI component library
│   ├── eslint-config/       # Shared ESLint configuration
│   └── typescript-config/   # Shared TypeScript tsconfig bases
├── docs/                    # Architecture and system documentation
├── graphify-out/            # Generated semantic and structural repository knowledge graph
├── patches/                 # Runtime patches (e.g. kafkajs-bun-fix.js)
├── docker-compose.yml       # Local infrastructure (PostgreSQL 16, Kafka)
├── turbo.json               # Turborepo task pipeline configuration
├── package.json             # Root workspace definitions and tooling scripts
└── AGENTS.md                # Top-level operational guide for AI agents
```

---

## 🚀 Applications (`apps/`)

### 1. `primary_backend` ([`apps/primary_backend`](../apps/primary_backend))

- **Role**: Core management REST API.
- **Entry Point**: [`apps/primary_backend/index.ts`](../apps/primary_backend/index.ts) (Port `3002`).
- **Key Modules**:
  - `route/user.ts`: User registration (bcrypt), sign-in, profile retrieval, and Clerk token exchange.
  - `route/zap.ts`: Zap creation (`POST /create`), Zap list (`GET /`), runs list (`GET /runs`), and detailed Zap run inspect (`GET /:id`).
  - `route/trigger.ts`: Query available triggers (`GET /available`) and test buffer payloads (`GET /test/result/:tempZapId`).
  - `route/action.ts`: Query available actions (`GET /available`).
  - `middleware.ts`: JWT verification middleware populating `req.id`.
  - `types/zodtypes.ts`: Request validation schemas using Zod.

### 2. `webhook` ([`apps/webhook`](../apps/webhook))

- **Role**: Lightweight webhook ingestion service.
- **Entry Point**: [`apps/webhook/index.ts`](../apps/webhook/index.ts) (Port `3003`).
- **Key Endpoints**:
  - `POST /hooks/catch/:userId/:zapId`: Authenticates webhook using `x-zap-secret`, verifies user and zap existence, and executes an atomic Prisma transaction creating `ZapRun` and `ZapRunOutbox`.
  - `POST /hooks/catch/test/:userId/:tempZapId`: Upserts incoming payload into `TestTriggerBuffer` for real-time frontend test listening.

### 3. `processor` ([`apps/processor`](../apps/processor))

- **Role**: Transactional Outbox polling daemon.
- **Entry Point**: [`apps/processor/index.ts`](../apps/processor/index.ts).
- **Execution Loop**:
  - Polls `ZapRunOutbox` table in batches of up to 10 records ordered by `id asc`.
  - Publishes `{ zapRunId, stage: 0 }` to Kafka topic `zap-events` (`clientId: 'outbox-processor'`).
  - Deletes outbox records **only after** the Kafka broker acknowledges the write.

### 4. `worker` ([`apps/worker`](../apps/worker))

- **Role**: Asynchronous Kafka consumer and step execution engine.
- **Entry Point**: [`apps/worker/index.ts`](../apps/worker/index.ts).
- **Key Modules**:
  - `index.ts`: Kafka consumer loop (`groupId: 'zap-group'`), distributed lease claiming (`claimExecution`), action invocation, next-stage production, and manual offset commits.
  - `actions/index.ts`: Action registry (`actionRegistry`, `getActionHandler`).
  - `actions/email.ts`: Resend email integration with `Idempotency-Key` headers.
  - `actions/telegram.ts`: Telegram Bot API integration with `@username` resolver.
  - `retry.ts`: In-process exponential backoff retry runner (`withRetry`).
  - `deadletter.ts`: Dead-letter handler producing to Kafka `zap-events-dlq` and writing `ZapRunRetry` table.
  - `parse.ts`: Mustache-style template string variable interpolator (`{{variable.path}}`).
  - `types.ts`: Core type contracts (`ActionContext`, `ActionHandler`).

### 5. `frontend` ([`apps/frontend`](../apps/frontend))

- **Role**: Next.js 16 Web Dashboard and Visual Workflow Builder.
- **Entry Point**: [`apps/frontend/src/app/page.tsx`](../apps/frontend/src/app/page.tsx) (Port `3000`).
- **Key Directories**:
  - `src/app/dashboard/`: Overview of user Zaps and execution triggers.
  - `src/app/zap/create/`: Interactive drag-and-drop / node-based Zap builder.
  - `src/app/zap/[id]/`: Detailed inspect view for a single Zap including execution runs and failure counts.
  - `src/app/history/`: Full run execution logs across all Zaps.
  - `src/app/store/zapStore.ts`: Zustand store managing trigger selection, action sequence array, and temporary test payloads.

### 6. `ai_agent` ([`apps/ai_agent`](../apps/ai_agent))

- **Role**: Read-only Autonomous DLQ Triage Agent. Phase 1 accepts two allowlisted synthetic fixtures and has no database, Kafka, provider-send, approval or replay capability.
- **Entry Point**: [`apps/ai_agent/src/index.ts`](../apps/ai_agent/src/index.ts) (Port `3004`).
- **Key Modules**:
  - `src/graph.ts`: Bounded two-node LangGraph.js investigation workflow and deterministic grounding rules.
  - `src/contracts.ts`: Strict Zod contracts for requests, evidence and proposals.
  - `src/tools/failure-context.ts`: Allowlisted local fixture evidence tool.
  - `src/http.ts`: Express preview route and model-client shutdown ownership.
  - `src/demo.ts`: Fixture CLI using the same graph.

---

## 📦 Packages (`packages/`)

### 1. `db` ([`packages/db`](../packages/db))

- **Role**: Central database layer.
- **Prisma Schema**: [`packages/db/prisma/schema.prisma`](../packages/db/prisma/schema.prisma).
- **Client Export**: [`packages/db/prisma/db.ts`](../packages/db/prisma/db.ts) (exports singleton `prisma` client instance).
- **Generated Client**: `packages/db/generated/prisma`.

### 2. `ui` ([`packages/ui`](../packages/ui))

- **Role**: Shared UI component library.
- **Exports**: Reusable React components (`button.tsx`, `card.tsx`, `code.tsx`).

### 3. `typescript-config` & `eslint-config`

- **Role**: Monorepo-wide linting and TypeScript compilation presets.

---

## 🧪 Where Tests Live

The worker uses lightweight `node:assert` self-checking scripts, while the AI workspace uses Bun's test runner:

- [`apps/worker/idempotency.test.ts`](../apps/worker/idempotency.test.ts): Tests atomic lease acquisition, concurrent worker race prevention, expired lease recovery, and duplicate redelivery skipping.
- [`apps/worker/deadletter.test.ts`](../apps/worker/deadletter.test.ts): Tests dual-sink DLQ publishing (Kafka + PostgreSQL) and non-throwing error handling.
- [`apps/worker/retry.test.ts`](../apps/worker/retry.test.ts): Tests exponential backoff retries and error rethrowing on attempt exhaustion.
- [`apps/ai_agent/tests`](../apps/ai_agent/tests): Bun tests for strict contracts, grounded F01/F07 behavior, execution budgets, HTTP mapping and lifecycle cleanup.

---

## ⚙️ Configuration & Environment

| Config File                  | Purpose                                                                                  |
| :--------------------------- | :--------------------------------------------------------------------------------------- |
| `turbo.json`                 | Turborepo task pipeline (`build`, `lint`, `check-types`, `dev`).                         |
| `package.json`               | Root workspace script runner, package manager specification (`bun@1.2.20`).              |
| `docker-compose.yml`         | Container definitions for local PostgreSQL 16 (`5432`) and Kafka (`9092`).               |
| `patches/kafkajs-bun-fix.js` | Postinstall patch resolving KafkaJS socket compatibility when running under Bun runtime. |
