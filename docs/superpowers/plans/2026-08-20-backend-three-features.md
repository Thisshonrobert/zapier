# Zap Backend: Retry/DLQ, Zap Inspect, Google Login — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add durable failed-event tracking (Postgres retry table + Kafka DLQ), a read-only Zap detail page, and Google sign-in via Clerk that works on localhost.

**Architecture:** The worker keeps its in-process retry, but on exhaustion it now writes a `ZapRunRetry` row AND produces to a `zap-events-dlq` topic before committing the offset, so failed events stop vanishing. Zap inspect reuses the existing `GET /api/v1/zap/:id` route, extended with run history. Google login uses Clerk in the browser, then exchanges the Clerk session token for the app's own JWT at `POST /api/v1/user/clerk`, so every existing `localStorage.token` consumer keeps working unchanged.

**Tech Stack:** Bun, Express 5, Prisma 6 + Postgres, KafkaJS, Next.js 16, Clerk.

## Global Constraints

- Package manager is `bun`; run commands from repo root.
- Prisma client generates to `packages/db/generated/prisma`, imported via `packages/db/prisma/db.ts`.
- The frontend's auth token is the app's own JWT in `localStorage.token`, signed with `JWT_SECRET`, payload `{ id: number }`. **Do not change this shape** — `ZapTable` and `useZaps` decode it.
- Kafka topics: `zap-events` (live), `zap-events-dlq` (dead letters).
- **No new npm dependencies.** Clerk (`@clerk/nextjs`, `@clerk/backend`) is already installed in both apps and keys already exist in `.env`.
- Tests are `assert`-based self-checks run with `bun run <file>`. No test framework.

---

### Task 1: Extract and test `withRetry`

**Files:**
- Create: `apps/worker/retry.ts`, `apps/worker/retry.test.ts`
- Modify: `apps/worker/index.ts` — delete the inline `withRetry`, import it instead

**Interfaces:**
- Produces: `withRetry(fn: () => Promise<void>, attempts = 3, sleep = (ms: number) => Promise<void>): Promise<void>` — resolves on first success, rethrows the last error after `attempts` failures. `sleep` is injectable so tests don't wait on real timers.

- [ ] **Step 1:** Write `retry.test.ts` asserting three cases: success calls the fn once; a fn failing twice then succeeding is called three times; an always-failing fn is called exactly `attempts` times and rejects with the final error.
- [ ] **Step 2:** Run `bun run apps/worker/retry.test.ts` → FAIL, `Cannot find module './retry'`.
- [ ] **Step 3:** Write `retry.ts` — move the existing loop verbatim, add the `sleep` parameter. Keep the `// ponytail:` comment, updated to say exhausted attempts go to the DLQ rather than being swallowed.
- [ ] **Step 4:** Run the test → PASS.
- [ ] **Step 5:** Commit `refactor(worker): extract withRetry with injectable sleep + self-check`.

---

### Task 2: Retry table migration

**Files:**
- Modify: `packages/db/prisma/schema.prisma` — an uncommitted `ZapRunRetry` model is already there; finish it.

**Interfaces:**
- Produces: `prisma.zapRunRetry` with fields `{ id, zapRunId, stage, attempt, lastError, nextRunAt, createdAt }` and `@@index([zapRunId])`.

- [ ] **Step 1:** Give `nextRunAt` a `@default(now())` so writers needn't supply it, add the `zapRunId` index, and add a comment explaining the row is the SQL-queryable twin of the DLQ message.
- [ ] **Step 2:** `bunx prisma migrate dev --name zaprunretry --schema packages/db/prisma/schema.prisma`
- [ ] **Step 3:** Verify: `bun -e "import {prisma} from './packages/db/prisma/db'; console.log(typeof prisma.zapRunRetry.create)"` → `function`.
- [ ] **Step 4:** Commit `feat(db): add ZapRunRetry table for exhausted action retries`.

---

### Task 3: Dead-letter failed events

**Files:**
- Create: `apps/worker/deadletter.ts`, `apps/worker/deadletter.test.ts`
- Modify: `apps/worker/index.ts` — the `catch` block that currently only `console.error`s

**Interfaces:**
- Consumes: `withRetry` (Task 1), `prisma.zapRunRetry` (Task 2).
- Produces: `DLQ_TOPIC = "zap-events-dlq"` and
  `deadLetter(sinks: { send(payload: object): Promise<void>; record(row: { zapRunId: string; stage: number; attempt: number; lastError: string }): Promise<void> }, zapRunId: string, stage: number, attempt: number, error: unknown): Promise<void>`
  — **never throws**; a broken DLQ must not kill the consumer loop.

- [ ] **Step 1:** Write `deadletter.test.ts` with fake sinks asserting: both sinks receive the failure with the right `zapRunId`/`stage`/`attempt` and a stringified error; and that sinks which throw are swallowed rather than propagated.
- [ ] **Step 2:** Run it → FAIL, module not found.
- [ ] **Step 3:** Write `deadletter.ts`. Normalise `error` to a string (`instanceof Error ? .message : String(error)`), then `send` and `record` in separate try/catch blocks so one failing sink doesn't skip the other.
- [ ] **Step 4:** Run the test → PASS.
- [ ] **Step 5:** Wire into `apps/worker/index.ts`: add `const RETRY_ATTEMPTS = 3` above `main()`, pass it to both `withRetry` call sites so the recorded attempt count can't drift, and replace the bare `console.error` catch with a `deadLetter` call whose `send` produces to `DLQ_TOPIC` and whose `record` does `prisma.zapRunRetry.create`.
- [ ] **Step 6:** Verify the worker still boots against a running broker (needs Task 8).
- [ ] **Step 7:** Commit `feat(worker): dead-letter exhausted events to Kafka DLQ + ZapRunRetry`.

---

### Task 4: Zap detail endpoint returns run history

**Files:**
- Modify: `apps/primary_backend/route/zap.ts` — the `GET /:id` handler

**Interfaces:**
- Produces: `GET /api/v1/zap/:id` → `{ zap: { id, name, time, trigger, actions, runs: { id, metadata, status: "running" | "success", failures: number }[] } }`, or `404 { message }`. `status` derives from the outbox row (present ⇒ still queued); `failures` is that run's `ZapRunRetry` count.

- [ ] **Step 1:** Extend the existing `findFirst` with `zapRun: { include: { zapRunOutbox: true } }`. Keep the `userId: id` filter — it's what stops users reading each other's Zaps. Return `404` when null instead of today's `{ zap: null }`.
- [ ] **Step 2:** Fetch failure counts in one `prisma.zapRunRetry.groupBy({ by: ["zapRunId"], where: { zapRunId: { in: runIds } }, _count: { _all: true } })` and fold them into the response via a `Map`. One query, not one per run.
- [ ] **Step 3:** Verify with `curl -H "Authorization: Bearer $TOKEN" http://localhost:3002/api/v1/zap/$ZAP_ID` → JSON with `runs`; another user's zap id → `404`.
- [ ] **Step 4:** Commit `feat(api): return run history and failure counts on GET /zap/:id`.

---

### Task 5: Read-only Zap detail page

**Files:**
- Create: `apps/frontend/src/app/zap/[id]/page.tsx`
- Modify: `apps/frontend/src/types/zap.ts`, `apps/frontend/src/hooks/useZaps.ts`, `apps/frontend/src/mycomponents/ZapTable.tsx`

**Interfaces:**
- Consumes: `GET /api/v1/zap/:id` (Task 4).
- Produces: `useZap(id: string): { loading: boolean; zap: ZapDetail | null }`, and `ZapDetail extends Pick<Zap, "id"|"name"|"time"|"trigger"|"actions">` with `runs: { id: string; metadata: Record<string, unknown>; status: "success" | "running"; failures: number }[]`.

- [ ] **Step 1:** Add the `ZapDetail` type to `types/zap.ts`.
- [ ] **Step 2:** Add `useZap` to `hooks/useZaps.ts`, reusing the file's existing `authHeaders()` helper and the same `.catch(() => null)` shape as `useZaps`.
- [ ] **Step 3:** Create the detail page. Reuse `AppShell`, `LoaderOne`, and `stepsOf`/`ZapFlow`/`ZapMonogram` from `mycomponents/app/AppFlow` — no new flow-rendering code. Sections: back link, header, numbered workflow steps (step 1 = trigger), and a run list showing `metadata`, status pill, and a red `N failed` pill when `failures > 0`. **Read-only: no edit affordances.** Next 16 passes `params` as a Promise — unwrap with `use(params)`.
- [ ] **Step 4:** In `ZapTable.tsx`, swap the "Go" `MvpAction` placeholder for a real `router.push('/zap/' + zap.id)` button. `router` is already in scope.
- [ ] **Step 5:** Verify in the browser: `/dashboard` → click **Go** → detail renders, no console errors.
- [ ] **Step 6:** Commit `feat(frontend): read-only Zap detail page with run history`.

---

### Task 6: Clerk token exchange endpoint

**Files:**
- Modify: `packages/db/prisma/schema.prisma` (`User.password` → `String?`), `apps/primary_backend/route/user.ts`

**Interfaces:**
- Produces: `POST /api/v1/user/clerk`, header `Authorization: Bearer <clerk session token>` → `{ token: string }` (app JWT, payload `{ id: number }`). Creates the local `User` on first sign-in.

- [ ] **Step 1:** Make `User.password` optional — Google users never have one.
- [ ] **Step 2:** `bunx prisma migrate dev --name optional_password --schema packages/db/prisma/schema.prisma` (widening NOT NULL to nullable is lossless).
- [ ] **Step 3:** Add the route to `user.ts`: `verifyToken` from `@clerk/backend` against `CLERK_SECRET_KEY`, `clerk.users.getUser(verified.sub)` for the email, `prisma.user.upsert({ where: { email } })`, then sign and return the app JWT. `400` if the Clerk account has no email, `401` on any verification failure. This is the cleaned-up version of the commented-out block in `apps/primary_backend/middleware.ts` — delete that dead comment block while here.
- [ ] **Step 4:** Verify `curl -X POST -H "Authorization: Bearer nonsense" .../api/v1/user/clerk` → `401`.
- [ ] **Step 5:** Commit `feat(api): exchange Clerk session token for app JWT`.

---

### Task 7: Google sign-in button + callback

**Files:**
- Create: `apps/frontend/src/app/sso-callback/page.tsx`, `apps/frontend/src/app/auth/callback/page.tsx`
- Modify: `apps/frontend/src/app/login/page.tsx`, `apps/frontend/.env`

**Interfaces:**
- Consumes: `POST /api/v1/user/clerk` (Task 6).
- Produces: `/auth/callback` — exchanges the Clerk session for the app JWT, writes `localStorage.token`, redirects to `/dashboard`.

- [ ] **Step 1:** In dashboard.clerk.com → dev instance → **User & Authentication → Social Connections**, enable **Google**. The dev instance uses Clerk's shared OAuth credentials, so localhost needs no Google Cloud project.
- [ ] **Step 2:** Add `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/auth/callback` (and the `SIGN_UP` twin) to `apps/frontend/.env`.
- [ ] **Step 3:** `sso-callback/page.tsx` is one line of real content: render Clerk's `<AuthenticateWithRedirectCallback />`, which finishes the OAuth handshake.
- [ ] **Step 4:** `auth/callback/page.tsx`: `useAuth()` → when loaded and signed in, `getToken()` → POST to `/api/v1/user/clerk` → store `res.data.token` in `localStorage` → `router.replace('/dashboard')`. Not signed in ⇒ back to `/login`; exchange failure ⇒ `toast.error` + `/login`.
- [ ] **Step 5:** In `login/page.tsx`, add a "Continue with Google" button above the email input calling `signIn.authenticateWithRedirect({ strategy: "oauth_google", redirectUrl: "/sso-callback", redirectUrlComplete: "/auth/callback" })` from `useSignIn()`, plus an "or" divider. Leave the existing password form intact — both paths coexist.
- [ ] **Step 6:** Verify end to end on localhost: `/login` → **Continue with Google** → pick account → lands on `/dashboard` with `localStorage.token` set and a `User` row carrying the Google email and a null password.
- [ ] **Step 7:** Commit `feat(frontend): Google sign-in via Clerk with JWT exchange`.

---

### Task 8: Kafka in docker-compose (prerequisite for Task 3's verification)

**Files:**
- Modify: `docker-compose.yml`

**Interfaces:**
- Produces: a broker on `localhost:9092`, matching the hardcoded `brokers` arrays in `apps/processor/index.ts:7` and `apps/worker/index.ts:10`.

- [ ] **Step 1:** Add a `bitnami/kafka` service in KRaft mode (no Zookeeper container). Advertise `PLAINTEXT://localhost:9092` so the host-run Bun apps can reach it, and set `KAFKA_CFG_AUTO_CREATE_TOPICS_ENABLE=true` — that's what lets `zap-events-dlq` spring into existence on first produce, so nothing has to pre-create it.
- [ ] **Step 2:** Verify: `docker compose up -d`, then connect a KafkaJS admin client and `listTopics()`.
- [ ] **Step 3:** Commit `chore: add Kafka broker to docker-compose`.

---

## Deferred

- **Automatic DLQ replay consumer** — add when eyeballing `ZapRunRetry` stops being enough.
- **Editing a published Zap** — explicitly out of scope; the detail page is read-only.
- **Dropping password auth for Clerk-only** — both paths coexist; revisit once Google login has real usage.
