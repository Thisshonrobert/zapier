test username:thisshon
email:thisshonorobert0205@gmail.com
pass: abc@123


TODO: 

1. Now when user signup , routes to singin then to dashboard -> ADD EMAIL verification in signup route 


---

## Project overview
This monorepo is a ground-up clone of Zapier with a Bun + Turbo build. It currently contains:

- `apps/frontend`: Next.js 16 dashboard for signup/login, Zap builder, and marketing pages.
- `apps/primary_backend`: Express API (Bun runtime) that owns auth, trigger/action catalogs, and Zap CRUD.
- `apps/webhook`: Express service receiving external webhooks and enqueueing Zap executions.
- `apps/processor`: Outbox processor that drains `ZapRunOutbox` rows into Kafka `zap-events`.
- `apps/worker`: Kafka consumer that replays each Zap action step-by-step.
- `packages/db`: Prisma schema, generated client, and migrations targeting PostgreSQL.

## High-level flow
1. Users sign up in the Next.js app (credentials-only right now). After signup they log in and land on the dashboard.
2. When a Zap trigger fires (currently via `/hooks/catch/:userId/:zapId`), the webhook service creates a `ZapRun` plus an outbox entry.
3. The processor polls outbox rows, publishes `{ zapRunId, stage }` messages to Kafka, and removes those rows.
4. The worker consumes `zap-events`, loads the Zap/actions from Prisma, and should execute each action (email/telegram, etc.) before dispatching the next stage.

## Current status & known gaps
- **Auth**: Signup/login works end-to-end also gmail auth with clerk, but email verification is still outstanding.
- **Worker outputs**: The scaffolding logs “email action” / “telegram post action”, but no actual integrations send messages yet. A metadata parser/formatter is still TODO and will be added as coding continues.
- **Frontend builder**: Trigger/action creation screens are present. After a user adds both, we still need the config parsing UI plus a “Test step” experience to validate payloads before saving.
- **Validation**: No holistic error/state management around Kafka failures or partially completed runs yet.
- **Docs**: This README is intentionally WIP so AI helpers understand what remains; it will be rewritten once the project stabilizes.

## Running the stack locally
Prerequisites:
- Node 18+, Bun 1.2+, Docker for db as of now, PostgreSQL, Kafka + Zookeeper.

Setup:
1. Copy `.env.example` (coming soon) or provide `DATABASE_URL` and any JWT secrets expected by `apps/primary_backend`.
2. Install deps from the repo root: `bun install`.
3. Generate the Prisma client + apply migrations: `bunx prisma migrate dev` (or `bunx prisma db push` for a scratch DB).
4. Start infra services (Postgres, Kafka) via Docker Compose or local installs.

Services (run each in its own terminal):
- Frontend: `cd apps/frontend && bun install && bun run dev`
- Primary backend API: `cd apps/primary_backend && bun install && bun run dev`
- Webhook ingress: `cd apps/webhook && bun install && bun run index.ts`
- Outbox processor: `cd apps/processor && bun install && bun run index.ts`
- Worker: `cd apps/worker && bun install && bun run index.ts`

All services share the Prisma client via `packages/db`. Use `turbo run dev --filter=<app>` if you prefer orchestrating via Turbo.

## Additional notes for AI contributors
- Stick to Bun tooling inside backend services; only the Next.js app depends on Node/Next binaries.
- Kafka topic name is hard-coded as `zap-events`. Update producer and consumer together if you change it.
- Email/Telegram actions should read from `currentAction.type.id` and use `zapDetails.metadata` once the parser lands.
- Frontend config/test components should consume the workflow constants in `apps/frontend/src/app/zap/create/Workflow.constants.tsx`.
- When extending the schema, add a Prisma migration under `packages/db/prisma/migrations` and regenerate the client.

This document intentionally mirrors the present, unfinished state so future automation can reason about what still needs to be shipped. Update freely once the outstanding pieces land.
