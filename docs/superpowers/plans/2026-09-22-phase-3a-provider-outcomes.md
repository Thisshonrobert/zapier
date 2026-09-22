# Phase 3A Provider Outcomes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Email and Telegram action handlers return truthful provider-acceptance receipts or throw bounded, redacted failure evidence without changing persistence, Kafka, or replay behavior.

**Architecture:** Define the outcome contract once in the worker action boundary, let provider adapters normalize their own SDK/API responses, and keep orchestration unaware of provider-specific response shapes. `withRetry<T>` transports the accepted result back to the worker; Phase 3B will add durable acceptance persistence and protect against later Kafka redelivery after a database write failure.

**Tech Stack:** TypeScript, Bun, Resend SDK 6.4.2, Telegram Bot HTTP API, Node `assert` test scripts

**Spec:** `docs/superpowers/specs/2026-09-22-phase-3a-provider-outcomes-design.md`

## Global Constraints

- Preserve the Kafka event shape `{ zapRunId, stage }`, the database schema, execution leasing, DLQ payload, three-attempt limit, and stage progression.
- Do not add dependencies, migrations, replay paths, approval tools, timeout policy, or a generic observability framework.
- Only `accepted` is a successful `ActionResult`; every other outcome is carried by `ActionExecutionError`.
- Never include credentials, recipient values, message bodies, provider response bodies, or raw SDK error messages in structured evidence or logs.
- Accept status only when it is an integer from 100 through 599, receipt IDs only as non-empty values of at most 128 characters, safe codes only as lowercase `[a-z0-9_]` values of at most 64 characters, and retry delays only as integers from 1 through 86,400 seconds.
- A provider `accepted` result followed by a failed PostgreSQL `SUCCESS` write does not re-enter the current in-process `withRetry` call. Phase 3B owns durable acceptance persistence and protection from later Kafka redelivery reclaiming an expired `PENDING` lease and resending.
- Keep the existing unrelated changes in `apps/ai_agent/src/tools/failure-context.ts`, `.claude/settings.local.json`, and `graphify-out/` out of Phase 3A commits.

---

## File Map

- Modify `apps/worker/types.ts`: own the provider outcome types, structured error, and `ActionHandler` return contract.
- Modify `apps/worker/retry.ts`: preserve a successful generic return value.
- Modify `apps/worker/retry.test.ts`: prove the successful result survives retries.
- Modify `apps/worker/actions/email.ts`: inspect Resend results, normalize evidence, return safe receipts, and remove sensitive logs.
- Create `apps/worker/actions/email.test.ts`: cover accepted, rejected, ambiguous, and redacted Email outcomes.
- Modify `apps/worker/actions/telegram.ts`: distinguish destination resolution from sending and normalize Telegram results.
- Create `apps/worker/actions/telegram.test.ts`: cover resolution, acceptance, rejection, ambiguity, retry delay, and redaction.
- Modify `apps/worker/index.ts`: receive the `ActionResult` explicitly without changing persistence behavior.

### Task 1: Worker Outcome Contract and Generic Retry

**Files:**
- Modify: `apps/worker/types.ts`
- Modify: `apps/worker/retry.ts`
- Modify: `apps/worker/retry.test.ts`

**Interfaces:**
- Consumes: existing `ActionContext` and retry timing behavior.
- Produces: `ActionProvider`, `ActionPhase`, `ProviderOutcome`, `ActionResult`, `ActionFailureEvidence`, `ActionExecutionError`, `ActionHandler.execute(...): Promise<ActionResult>`, and `withRetry<T>(fn: () => Promise<T>, ...): Promise<T>`.

- [ ] **Step 1: Add a failing generic-result assertion to the retry test**

Add this case after the first-success assertion in `apps/worker/retry.test.ts`:

```ts
  const accepted = await withRetry(async () => ({
    provider: "email" as const,
    phase: "send" as const,
    outcome: "accepted" as const,
    safeReceiptId: "email_123",
  }));
  assert.deepEqual(accepted, {
    provider: "email",
    phase: "send",
    outcome: "accepted",
    safeReceiptId: "email_123",
  });
```

- [ ] **Step 2: Run the test and confirm the current signature rejects the result contract**

Run: `bun run apps/worker/retry.test.ts`

Then run: `bunx tsc --noEmit --target es2022 --module esnext --moduleResolution bundler --types bun apps/worker/retry.test.ts`

Expected: the runtime assertions may pass because JavaScript already returns `fn()`, but TypeScript fails because `withRetry` accepts only `Promise<void>`.

- [ ] **Step 3: Add the outcome contract to `types.ts`**

Replace the current handler-only contract with these exported definitions while retaining `ActionContext`:

```ts
export type ActionProvider = "email" | "telegram";
export type ActionPhase = "resolve_destination" | "send";
export type ProviderOutcome =
  | "accepted"
  | "rejected"
  | "not_attempted"
  | "unknown";

export type ActionResult = {
  provider: ActionProvider;
  phase: "send";
  outcome: "accepted";
  safeReceiptId?: string;
};

export type ActionFailureEvidence = {
  provider: ActionProvider;
  phase: ActionPhase;
  outcome: Exclude<ProviderOutcome, "accepted">;
  safeCode: string;
  status?: number;
  retryAfterSeconds?: number;
};

export class ActionExecutionError extends Error {
  constructor(
    message: string,
    readonly evidence: ActionFailureEvidence,
  ) {
    super(message);
    this.name = "ActionExecutionError";
  }
}

export interface ActionHandler {
  type: string;
  execute: (
    metadata: Record<string, unknown>,
    ctx: ActionContext,
  ) => Promise<ActionResult>;
}
```

Use safe, fixed messages such as `Email provider request failed` in provider modules; callers must inspect `evidence`, not parse messages.

- [ ] **Step 4: Make retry generic without changing timing or attempts**

Change the signature in `apps/worker/retry.ts` to:

```ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
  random = () => Math.random(),
): Promise<T> {
```

Keep the loop, full-jitter calculation, final rethrow, and log text unchanged. Add an unreachable guard after the loop so all TypeScript paths return or throw:

```ts
  throw new Error("Retry loop exhausted without a result");
```

- [ ] **Step 5: Run the focused tests and type check**

Run: `bun run apps/worker/retry.test.ts`

Run: `bun run check-types`

Expected: retry test prints `retry.test.ts OK`; the repository type check may temporarily report Email and Telegram handlers returning `void`, which Task 2 and Task 3 resolve. No retry timing assertion changes.

- [ ] **Step 6: Commit the contract**

```bash
git add apps/worker/types.ts apps/worker/retry.ts apps/worker/retry.test.ts
git commit -m "feat(worker): define provider outcome contract"
```

### Task 2: Normalize Resend Outcomes

**Files:**
- Create: `apps/worker/actions/email.test.ts`
- Modify: `apps/worker/actions/email.ts`

**Interfaces:**
- Consumes: `ActionResult` and `ActionExecutionError` from Task 1; Resend `CreateEmailOptions`, `CreateEmailRequestOptions`, and `CreateEmailResponse`.
- Produces: `EmailTransport`, `sendEmail(..., transport?): Promise<ActionResult>`, and `emailAction.execute(...): Promise<ActionResult>`.

- [ ] **Step 1: Write failing Resend normalization tests**

Create `apps/worker/actions/email.test.ts` with a local transport factory typed as `EmailTransport`. Cover these exact assertions:

```ts
import assert from "node:assert/strict";
import { ActionExecutionError } from "../types";
import { sendEmail, type EmailTransport } from "./email";

const request = [
  "recipient@example.com",
  "secret body",
  "sender@example.com",
  "Private subject",
  "zaprun_run-1_stage_0",
] as const;

async function captureFailure(transport: EmailTransport) {
  try {
    await sendEmail(...request, transport);
    assert.fail("expected sendEmail to fail");
  } catch (error) {
    assert.ok(error instanceof ActionExecutionError);
    return error;
  }
}

async function main() {
  const accepted = await sendEmail(...request, async () => ({
    data: { id: "email_123" },
    error: null,
    headers: null,
  }));
  assert.deepEqual(accepted, {
    provider: "email",
    phase: "send",
    outcome: "accepted",
    safeReceiptId: "email_123",
  });

  const rejected = await captureFailure(async () => ({
    data: null,
    error: { name: "validation_error", message: "raw recipient detail", statusCode: 422 },
    headers: null,
  }));
  assert.deepEqual(rejected.evidence, {
    provider: "email",
    phase: "send",
    outcome: "rejected",
    safeCode: "validation_error",
    status: 422,
  });

  const unavailable = await captureFailure(async () => ({
    data: null,
    error: { name: "internal_server_error", message: "raw outage detail", statusCode: 503 },
    headers: null,
  }));
  assert.equal(unavailable.evidence.outcome, "unknown");

  const transportFailure = await captureFailure(async () => {
    throw new Error("secret transport response");
  });
  assert.equal(transportFailure.evidence.safeCode, "email_transport_error");

  const missingReceipt = await captureFailure(async () => ({
    data: {} as { id: string },
    error: null,
    headers: null,
  }));
  assert.equal(missingReceipt.evidence.safeCode, "email_receipt_missing");

  const serialized = JSON.stringify([
    rejected.evidence,
    unavailable.evidence,
    transportFailure.evidence,
    missingReceipt.evidence,
  ]);
  for (const secret of [request[0], request[1], request[2], request[3], "raw recipient detail", "secret transport response"]) {
    assert.equal(serialized.includes(secret), false);
  }

  console.log("email.test.ts OK");
}

main();
```

- [ ] **Step 2: Run the Email test and verify it fails**

Run: `bun run apps/worker/actions/email.test.ts`

Expected: FAIL because `EmailTransport` does not exist and `sendEmail` returns `void`.

- [ ] **Step 3: Add the injected transport and strict normalizers**

In `apps/worker/actions/email.ts`, import the Resend request/response types and the Task 1 contract. Define:

```ts
export type EmailTransport = (
  payload: CreateEmailOptions,
  options?: CreateEmailRequestOptions,
) => Promise<CreateEmailResponse>;

const resendTransport: EmailTransport = (payload, options) =>
  resend.emails.send(payload, options);

const resendErrorNames = new Set([
  "missing_required_field",
  "invalid_idempotency_key",
  "invalid_idempotent_request",
  "concurrent_idempotent_requests",
  "invalid_access",
  "invalid_parameter",
  "invalid_region",
  "rate_limit_exceeded",
  "missing_api_key",
  "invalid_api_key",
  "suspended_api_key",
  "invalid_from_address",
  "validation_error",
  "not_found",
  "method_not_allowed",
  "application_error",
  "internal_server_error",
]);

function validStatus(value: unknown): number | undefined {
  return Number.isInteger(value) && Number(value) >= 100 && Number(value) <= 599
    ? Number(value)
    : undefined;
}

function safeEmailCode(value: unknown): string {
  if (typeof value !== "string") return "email_provider_error";
  const normalized = value.toLowerCase().replace(/[^a-z0-9_]+/g, "_").slice(0, 64);
  return resendErrorNames.has(normalized) ? normalized : "email_provider_error";
}

function safeReceipt(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= 128
    ? value.trim()
    : undefined;
}
```

Change `sendEmail` to accept `transport: EmailTransport = resendTransport` as its sixth parameter and return `Promise<ActionResult>`. Catch only the transport invocation and convert thrown values to:

```ts
throw new ActionExecutionError("Email provider request failed", {
  provider: "email",
  phase: "send",
  outcome: "unknown",
  safeCode: "email_transport_error",
});
```

After the transport call, inspect the discriminated Resend response. An error uses `validStatus(response.error.statusCode)`, outcome `rejected` only for status 400-499, and `unknown` otherwise. A valid `data.id` returns:

```ts
return {
  provider: "email",
  phase: "send",
  outcome: "accepted",
  safeReceiptId: receipt,
};
```

A missing/oversized receipt throws `email_receipt_missing` with outcome `unknown`. Do not copy `error.message` into the structured error or log it.

- [ ] **Step 4: Return the result from the Email handler and remove sensitive logs**

Remove both Email `console.log` calls and change the final handler line to:

```ts
return sendEmail(to, body, from, subject, ctx.idempotencyKey);
```

Do not log `to`, `from`, `subject`, `body`, the idempotency key, or Resend's raw response.

- [ ] **Step 5: Run the Email and retry tests**

Run: `bun run apps/worker/actions/email.test.ts`

Run: `bun run apps/worker/retry.test.ts`

Expected: both scripts print their `OK` messages. No external provider is called.

- [ ] **Step 6: Commit the Email adapter**

```bash
git add apps/worker/actions/email.ts apps/worker/actions/email.test.ts
git commit -m "feat(worker): normalize resend outcomes"
```

### Task 3: Normalize Telegram Resolution and Send Outcomes

**Files:**
- Create: `apps/worker/actions/telegram.test.ts`
- Modify: `apps/worker/actions/telegram.ts`

**Interfaces:**
- Consumes: `ActionResult` and `ActionExecutionError` from Task 1.
- Produces: `FetchTransport`, `resolveChatId(input, token, fetchImpl?): Promise<string>`, `sendTelegram(chatId, message, token, fetchImpl?): Promise<ActionResult>`, and `telegramAction.execute(...): Promise<ActionResult>`.

- [ ] **Step 1: Write failing destination-resolution tests**

Start `apps/worker/actions/telegram.test.ts` with:

```ts
import assert from "node:assert/strict";
import { ActionExecutionError } from "../types";
import { resolveChatId, sendTelegram, type FetchTransport } from "./telegram";

const response = (status: number, value: unknown) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });

async function captureFailure(run: () => Promise<unknown>) {
  try {
    await run();
    assert.fail("expected Telegram operation to fail");
  } catch (error) {
    assert.ok(error instanceof ActionExecutionError);
    return error;
  }
}

async function main() {
  let calls = 0;
  const neverFetch: FetchTransport = async () => {
    calls++;
    throw new Error("numeric IDs must not call Telegram");
  };
  assert.equal(await resolveChatId("-100123", "bot-secret", neverFetch), "-100123");
  assert.equal(calls, 0);

  const resolutionFailure = await captureFailure(() =>
    resolveChatId("@private-channel", "bot-secret", async () =>
      response(404, { ok: false, description: "raw private-channel detail" }),
    ),
  );
  assert.deepEqual(resolutionFailure.evidence, {
    provider: "telegram",
    phase: "resolve_destination",
    outcome: "not_attempted",
    safeCode: "telegram_resolution_rejected",
    status: 404,
  });

  const resolutionTransport = await captureFailure(() =>
    resolveChatId("@private-channel", "bot-secret", async () => {
      throw new Error("raw network detail");
    }),
  );
  assert.equal(resolutionTransport.evidence.safeCode, "telegram_resolution_transport_error");

  const resolved = await resolveChatId("@channel", "bot-secret", async () =>
    response(200, { ok: true, result: { id: -100456 } }),
  );
  assert.equal(resolved, "-100456");
```

- [ ] **Step 2: Add failing send classification and redaction tests**

Continue the same `main()` with:

```ts
  const accepted = await sendTelegram("-100456", "secret message", "bot-secret", async () =>
    response(200, { ok: true, result: { message_id: 42 } }),
  );
  assert.deepEqual(accepted, {
    provider: "telegram",
    phase: "send",
    outcome: "accepted",
    safeReceiptId: "42",
  });

  const rateLimited = await captureFailure(() =>
    sendTelegram("-100456", "secret message", "bot-secret", async () =>
      response(429, {
        ok: false,
        error_code: 429,
        description: "raw rate-limit detail",
        parameters: { retry_after: 30 },
      }),
    ),
  );
  assert.deepEqual(rateLimited.evidence, {
    provider: "telegram",
    phase: "send",
    outcome: "rejected",
    safeCode: "telegram_http_429",
    status: 429,
    retryAfterSeconds: 30,
  });

  const unavailable = await captureFailure(() =>
    sendTelegram("-100456", "secret message", "bot-secret", async () =>
      response(503, { ok: false, description: "raw provider body" }),
    ),
  );
  assert.equal(unavailable.evidence.outcome, "unknown");

  const timeout = await captureFailure(() =>
    sendTelegram("-100456", "secret message", "bot-secret", async () => {
      throw new Error("raw timeout detail");
    }),
  );
  assert.equal(timeout.evidence.safeCode, "telegram_transport_error");

  const malformed = await captureFailure(() =>
    sendTelegram("-100456", "secret message", "bot-secret", async () =>
      new Response("not json", { status: 200 }),
    ),
  );
  assert.equal(malformed.evidence.safeCode, "telegram_response_invalid");

  const missingReceipt = await captureFailure(() =>
    sendTelegram("-100456", "secret message", "bot-secret", async () =>
      response(200, { ok: true, result: {} }),
    ),
  );
  assert.equal(missingReceipt.evidence.safeCode, "telegram_receipt_missing");

  const serialized = JSON.stringify([
    resolutionFailure.evidence,
    resolutionTransport.evidence,
    rateLimited.evidence,
    unavailable.evidence,
    timeout.evidence,
    malformed.evidence,
    missingReceipt.evidence,
  ]);
  for (const secret of ["bot-secret", "private-channel", "secret message", "raw provider body", "raw timeout detail"]) {
    assert.equal(serialized.includes(secret), false);
  }

  console.log("telegram.test.ts OK");
}

main();
```

- [ ] **Step 3: Run the Telegram test and verify it fails**

Run: `bun run apps/worker/actions/telegram.test.ts`

Expected: FAIL because `FetchTransport` and structured Telegram outcomes do not exist.

- [ ] **Step 4: Add bounded Telegram parsing helpers**

In `apps/worker/actions/telegram.ts`, define:

```ts
export type FetchTransport = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

const defaultFetch: FetchTransport = (input, init) => fetch(input, init);

function validStatus(value: unknown): number | undefined {
  return Number.isInteger(value) && Number(value) >= 100 && Number(value) <= 599
    ? Number(value)
    : undefined;
}

function boundedPositiveInteger(value: unknown, maximum: number): number | undefined {
  return Number.isInteger(value) && Number(value) > 0 && Number(value) <= maximum
    ? Number(value)
    : undefined;
}

function safeIdentifier(value: unknown): string | undefined {
  const text = typeof value === "string"
    ? value.trim()
    : Number.isSafeInteger(value)
      ? String(value)
      : "";
  return text.length > 0 && text.length <= 128 ? text : undefined;
}

async function readJson(response: Response): Promise<Record<string, unknown> | undefined> {
  try {
    const value: unknown = await response.json();
    return value !== null && typeof value === "object"
      ? value as Record<string, unknown>
      : undefined;
  } catch {
    return undefined;
  }
}
```

Never call `response.text()` and never include a Telegram `description` in an error.

- [ ] **Step 5: Implement resolution evidence**

Trim the input before the numeric-ID check. For non-numeric values, call `getChat` through `fetchImpl`. A thrown fetch maps to fixed code `telegram_resolution_transport_error`; invalid JSON maps to `telegram_resolution_response_invalid`; non-2xx or `{ ok: false }` maps to `telegram_resolution_rejected`; and a missing/oversized `result.id` maps to `telegram_chat_id_missing`. Every resolution error uses:

```ts
{
  provider: "telegram",
  phase: "resolve_destination",
  outcome: "not_attempted",
  safeCode,
  ...(status === undefined ? {} : { status }),
}
```

Return only the bounded string form of `result.id`. The bot token and username may appear in the request URL but must never appear in messages, evidence, or logs.

- [ ] **Step 6: Implement send evidence and accepted receipts**

Call `sendMessage` through `fetchImpl`. A thrown fetch maps to `unknown`/`telegram_transport_error`. Parse structured JSON once. Classify HTTP 400-499 as `rejected`, HTTP 500-599 as `unknown`, invalid 2xx JSON as `unknown`/`telegram_response_invalid`, and a success without a bounded `result.message_id` as `unknown`/`telegram_receipt_missing`.

For a 429, read only `parameters.retry_after` and retain it only through `boundedPositiveInteger(value, 86_400)`. Use the fixed safe code `telegram_http_${status}` for valid non-2xx statuses. A valid success returns:

```ts
return {
  provider: "telegram",
  phase: "send",
  outcome: "accepted",
  safeReceiptId: receipt,
};
```

If Telegram returns HTTP 2xx with `{ ok: false, error_code: 400..499 }`, use that bounded error code as a rejected status; otherwise classify it as unknown with `telegram_provider_error`.

- [ ] **Step 7: Return the Telegram result from the handler**

Keep the existing non-sensitive run/stage log. Change the final line to:

```ts
return sendTelegram(chatId, message, botToken);
```

Do not add logging for token, username, chat ID, message, raw response, or error description.

- [ ] **Step 8: Run the Telegram, Email, and retry tests**

Run: `bun run apps/worker/actions/telegram.test.ts`

Run: `bun run apps/worker/actions/email.test.ts`

Run: `bun run apps/worker/retry.test.ts`

Expected: all three scripts print their `OK` messages and make no network calls.

- [ ] **Step 9: Commit the Telegram adapter**

```bash
git add apps/worker/actions/telegram.ts apps/worker/actions/telegram.test.ts
git commit -m "feat(worker): normalize telegram outcomes"
```

### Task 4: Wire and Verify the Phase 3A Boundary

**Files:**
- Modify: `apps/worker/index.ts`
- Verify: `apps/worker/actions/index.ts`
- Verify: `docs/superpowers/specs/2026-09-22-phase-3a-provider-outcomes-design.md`

**Interfaces:**
- Consumes: `withRetry<ActionResult>` and both provider handlers.
- Produces: an explicit `actionResult` boundary ready for Phase 3B persistence, with no current database or Kafka semantic change.

- [ ] **Step 1: Capture the accepted action result in worker orchestration**

In `executeClaimedAction`, change the retry call from an ignored `await` to:

```ts
    const actionResult = await withRetry(
      () =>
        handler.execute(
          execution.currentAction.metadata as Record<string, unknown>,
          ctx,
        ),
      RETRY_ATTEMPTS,
    );
```

Before the `SUCCESS` write, add only a redacted diagnostic:

```ts
    console.log("action provider accepted request", {
      zapRunId,
      stage,
      provider: actionResult.provider,
      hasReceipt: actionResult.safeReceiptId !== undefined,
    });
```

Do not log the receipt itself. Do not place the `SUCCESS` write inside `withRetry`; a failed database write must not re-enter the current in-process retry call. Phase 3B owns durable acceptance persistence and redelivery protection.

- [ ] **Step 2: Run focused worker regression scripts**

Run each existing worker test discovered by `Get-ChildItem apps/worker -Recurse -Filter '*.test.ts'` using `bun run <path>`, including at minimum:

```text
apps/worker/retry.test.ts
apps/worker/deadletter.test.ts
apps/worker/actions/email.test.ts
apps/worker/actions/telegram.test.ts
```

Expected: every script prints its `OK` message and exits 0.

- [ ] **Step 3: Run repository verification**

Run: `bun run check-types`

Run: `bun run lint`

Run: `bun run build`

Expected: type check and build exit 0. If lint reports an already-existing unrelated violation, record its exact file and message; do not modify unrelated code to hide it.

- [ ] **Step 4: Audit the diff for scope and secret safety**

Run:

```powershell
git diff --check
git diff -- apps/worker/types.ts apps/worker/retry.ts apps/worker/retry.test.ts apps/worker/actions/email.ts apps/worker/actions/email.test.ts apps/worker/actions/telegram.ts apps/worker/actions/telegram.test.ts apps/worker/index.ts
git status --short
```

Confirm no Prisma schema, migration, Kafka schema, DLQ, replay, approval, timeout, or dependency file changed. Confirm the diff contains no logging of recipient, sender, subject, body, Telegram token, username, chat ID, provider response body, or receipt ID.

- [ ] **Step 5: Commit the orchestration wiring**

```bash
git add apps/worker/index.ts
git commit -m "feat(worker): surface accepted action results"
```

- [ ] **Step 6: Record the Phase 3A checkpoint**

Report the focused-test, type-check, lint, and build results with command evidence. Stop before Phase 3B so the provider-outcome boundary can be reviewed independently.
