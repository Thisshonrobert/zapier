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

## Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand
- **UI Components**: Radix UI, shadcn/ui
- **Authentication**: Clerk (OAuth + JWT fallback)
- **HTTP Client**: Axios
- **Workflow Builder**: React Flow (@xyflow/react)

### Backend Services
- **Runtime**: Bun 1.2+
- **Framework**: Express.js 5
- **Database ORM**: Prisma 6
- **Database**: PostgreSQL 16
- **Message Queue**: Kafka (kafkajs)
- **Authentication**: JWT + Clerk integration
- **Validation**: Zod

### Infrastructure
- **Monorepo**: Turborepo
- **Package Manager**: Bun
- **Containerization**: Docker Compose
- **Email Service**: Resend
- **External APIs**: Telegram Bot API

## Environment Variables

Create `.env` files in the root and respective app directories with the following variables:

### Root `.env` (for Prisma)
```env
DATABASE_URL="postgresql://thisshonrobert:mysecretpassword@localhost:5432/mydatabase"
```

### `apps/primary_backend/.env`
```env
DATABASE_URL="postgresql://thisshonrobert:mysecretpassword@localhost:5432/mydatabase"
JWT_SECRET="your-jwt-secret-key-here"
CLERK_SECRET_KEY="your-clerk-secret-key"  # Optional, for Clerk auth
PORT=3002
```

### `apps/frontend/.env.local`
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="your-clerk-publishable-key"  # Optional
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/login"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/signup"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard"
```

### `apps/webhook/.env`
```env
DATABASE_URL="postgresql://thisshonrobert:mysecretpassword@localhost:5432/mydatabase"
ZAP_SECRET="your-webhook-secret-key"
```

### `apps/worker/.env`
```env
DATABASE_URL="postgresql://thisshonrobert:mysecretpassword@localhost:5432/mydatabase"
RESEND_API_KEY="your-resend-api-key"  # For email actions
TELEGRAM_BOT_TOKEN="your-telegram-bot-token"  # Optional, can be set per action
```

### `apps/processor/.env`
```env
DATABASE_URL="postgresql://thisshonrobert:mysecretpassword@localhost:5432/mydatabase"
```

**Note**: Kafka broker is hardcoded to `localhost:9092` in the code. Update the broker configuration in `apps/processor/index.ts` and `apps/worker/index.ts` if using a different Kafka setup.

## Architecture & Data Flow

### System Components

```
┌─────────────┐
│   Frontend  │ (Next.js 16 - Port 3000)
│  (Next.js)  │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ Primary Backend  │ (Express - Port 3002)
│  (Auth, CRUD)    │
└──────┬───────────┘
       │
       ▼
┌─────────────┐
│  PostgreSQL │ (Port 5432)
│  Database   │
└─────────────┘

┌─────────────┐
│   Webhook   │ (Express - Port 3003)
│   Service   │
└──────┬──────┘
       │
       ▼
┌─────────────┐      ┌──────────────┐
│  ZapRunOutbox│─────▶│   Processor  │
│   (Table)    │      │  (Outbox)    │
└─────────────┘      └──────┬───────┘
                            │
                            ▼
                       ┌─────────┐
                       │  Kafka  │
                       │ (Topic: │
                       │zap-events)
                       └────┬────┘
                            │
                            ▼
                       ┌─────────┐
                       │  Worker │
                       │(Consumer)
                       └─────────┘
```

### Execution Flow

1. **User Creates Zap**: Frontend → Primary Backend → Database
2. **Trigger Fires**: External service → Webhook Service → Creates `ZapRun` + `ZapRunOutbox` entry
3. **Outbox Processing**: Processor polls `ZapRunOutbox`, publishes to Kafka `zap-events` topic
4. **Action Execution**: Worker consumes Kafka messages, executes actions sequentially:
   - Loads Zap and actions from database
   - Parses metadata templates (e.g., `{{trigger.field}}`)
   - Executes action (Email via Resend, Telegram post)
   - Publishes next stage message if more actions exist
   - Commits Kafka offset after completion

## API Endpoints

### Primary Backend (Port 3002)

#### Authentication & Users
- `POST /api/v1/user/signup` - User registration
- `POST /api/v1/user/signin` - User login
- `GET /api/v1/user/me` - Get current user (requires auth)

#### Zaps
- `GET /api/v1/zap` - List user's Zaps
- `POST /api/v1/zap` - Create new Zap
- `GET /api/v1/zap/:id` - Get Zap details
- `PUT /api/v1/zap/:id` - Update Zap
- `DELETE /api/v1/zap/:id` - Delete Zap

#### Triggers
- `GET /api/v1/trigger` - List available trigger types
- `POST /api/v1/trigger` - Create/update Zap trigger

#### Actions
- `GET /api/v1/action` - List available action types
- `POST /api/v1/action` - Create/update Zap action

### Webhook Service (Port 3003)

- `POST /hooks/catch/:userId/:zapId` - Receive webhook for Zap execution
  - Requires `x-zap-secret` header matching `ZAP_SECRET` env var
  - Creates `ZapRun` with request body as metadata
  - Creates `ZapRunOutbox` entry for processing

- `POST /hooks/catch/test/:userId/:tempZapId` - Test trigger endpoint
  - Stores test payload in `TestTriggerBuffer` for frontend testing

## Database Schema

### Core Models

- **User**: User accounts (id, name, email, password)
- **Zap**: Workflow definitions (id, name, userId, trigger, actions)
- **Trigger**: Zap trigger configuration (id, zapId, typeId)
- **Action**: Zap action steps (id, zapId, actionId, metadata, sortingOrder)
- **AvailableTriggerType**: Catalog of trigger types
- **AvailableAction**: Catalog of action types
- **ZapRun**: Execution instance (id, zapId, metadata)
- **ZapRunOutbox**: Outbox pattern table for reliable processing
- **TestTriggerBuffer**: Temporary storage for test trigger payloads

See `packages/db/prisma/schema.prisma` for complete schema definitions.

## Development Workflow

### Initial Setup

1. **Clone and Install**:
   ```bash
   git clone <repo-url>
   cd zapier
   bun install
   ```

2. **Start PostgreSQL**:
   ```bash
   docker-compose up -d postgres
   ```

3. **Setup Kafka** (if not using Docker):
   - Install Kafka locally or use Docker Compose
   - Ensure Kafka broker is running on `localhost:9092`
   - Create topic: `zap-events` (auto-created on first message)

4. **Database Migration**:
   ```bash
   cd packages/db
   bunx prisma migrate dev
   # or for fresh DB:
   bunx prisma db push
   ```

5. **Configure Environment Variables**:
   - Copy and fill `.env` files as described in Environment Variables section

### Running Services

**Option 1: Manual (Recommended for Development)**
```bash
# Terminal 1: Frontend
cd apps/frontend && bun run dev

# Terminal 2: Primary Backend
cd apps/primary_backend && bun run dev

# Terminal 3: Webhook Service
cd apps/webhook && bun run index.ts

# Terminal 4: Processor
cd apps/processor && bun run index.ts

# Terminal 5: Worker
cd apps/worker && bun run index.ts
```

**Option 2: Using Turbo**
```bash
# Run all services
bun run dev

# Run specific service
turbo run dev --filter=frontend
turbo run dev --filter=primary_backend
```

### Database Management

```bash
# Generate Prisma client after schema changes
cd packages/db
bunx prisma generate

# Create new migration
bunx prisma migrate dev --name migration_name

# View database in Prisma Studio
bunx prisma studio
```

## Testing a Zap

1. **Create Zap in Frontend**:
   - Sign up/login at `http://localhost:3000`
   - Navigate to Zap builder
   - Add trigger and actions
   - Configure action metadata (email addresses, Telegram channels, etc.)

2. **Trigger Zap**:
   ```bash
   curl -X POST http://localhost:3003/hooks/catch/:userId/:zapId \
     -H "Content-Type: application/json" \
     -H "x-zap-secret: your-webhook-secret" \
     -d '{"field1": "value1", "field2": "value2"}'
   ```

3. **Monitor Execution**:
   - Check processor logs for outbox processing
   - Check worker logs for action execution
   - Verify email/Telegram delivery

## Troubleshooting

### Common Issues

**Database Connection Errors**
- Ensure PostgreSQL is running: `docker-compose ps`
- Verify `DATABASE_URL` matches docker-compose credentials
- Check if database exists: `docker-compose exec postgres psql -U thisshonrobert -d mydatabase`

**Kafka Connection Errors**
- Ensure Kafka is running on `localhost:9092`
- Check if `zap-events` topic exists
- Verify KafkaJS patch applied: check `patches/kafkajs-bun-fix.js` ran during `bun install`

**Prisma Client Not Found**
- Run `cd packages/db && bunx prisma generate`
- Ensure `packages/db` is properly linked in workspace

**Port Already in Use**
- Frontend: 3000
- Primary Backend: 3002
- Webhook: 3003
- PostgreSQL: 5432
- Kafka: 9092

**Worker Not Processing Messages**
- Verify Kafka consumer group is working
- Check worker logs for errors
- Ensure `ZapRunOutbox` entries exist (processor should create Kafka messages)
- Verify action metadata parsing (check `parse.ts` logic)

**Email/Telegram Actions Not Working**
- Verify `RESEND_API_KEY` is set for email actions
- Check `TELEGRAM_BOT_TOKEN` for Telegram actions
- Review worker logs for API errors

## Project Structure

```
zapier/
├── apps/
│   ├── frontend/          # Next.js dashboard and Zap builder
│   ├── primary_backend/   # Express API (auth, CRUD)
│   ├── webhook/           # Webhook ingress service
│   ├── processor/         # Outbox processor → Kafka
│   └── worker/            # Kafka consumer → action executor
├── packages/
│   ├── db/                # Prisma schema and client
│   ├── ui/                # Shared UI components
│   ├── eslint-config/     # Shared ESLint config
│   └── typescript-config/ # Shared TypeScript config
├── patches/               # KafkaJS Bun runtime patch
├── docker-compose.yml     # PostgreSQL service
├── turbo.json            # Turborepo configuration
└── package.json          # Root workspace config
```

## Known Limitations & Future Work

- **Email Verification**: Currently missing from signup flow
- **Error Handling**: No comprehensive error/retry logic for failed Zap runs
- **Action Testing**: No UI for testing individual action steps before saving
- **Metadata Parser**: Basic template parsing exists, but needs enhancement for complex expressions
- **Monitoring**: No observability/metrics for Zap executions
- **Rate Limiting**: No rate limiting on webhook endpoints
- **Multi-tenancy**: Current implementation assumes single deployment

## Contributing

This is a work-in-progress project. When contributing:
1. Follow existing code patterns
2. Update this README if adding new features
3. Ensure Prisma migrations are included for schema changes
4. Test locally before submitting changes




