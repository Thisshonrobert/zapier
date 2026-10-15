import pg from "pg";
import { createActionRegistry } from "../../apps/worker/actions/index.ts";
import type { EmailTransport } from "../../apps/worker/actions/email.ts";
import type { FetchTransport } from "../../apps/worker/actions/telegram.ts";
import type { ActionContext } from "../../apps/worker/types.ts";
import { createFingerprints } from "../../apps/worker/execution-store.ts";
import { parse } from "../../apps/worker/parse.ts";
import { assertLabDatabase, assertLabBrokers, labResources, type LabMarker } from "./triage-lab-config.ts";
import { checkOwnership } from "./triage-lab-store.ts";
import { fakeTelegramToken, fakeEmailKey, selectScenarios, type LabScenario } from "./triage-lab-scenarios.ts";

export function assertLabWorkerEnvironment(env: Record<string, string | undefined>) {
  assertLabDatabase(env.DATABASE_URL ?? "", env.NODE_ENV);
  assertLabBrokers(env.KAFKA_BROKERS ?? "");
  const resources = labResources(env.TRIAGE_LAB_ID ?? "");
  if (env.TRIAGE_LAB !== "true" || !/^[a-f0-9]{64}$/.test(env.TRIAGE_LAB_RESOURCE_FINGERPRINT ?? "") ||
    env.KAFKA_EVENTS_TOPIC !== resources.eventsTopic || env.KAFKA_DLQ_TOPIC !== resources.dlqTopic ||
    env.KAFKA_WORKER_GROUP !== resources.workerGroup || env.TELEGRAM_BOT_TOKEN !== "" || env.RESEND_API_KEY !== fakeEmailKey ||
    env.REPLAY_ENABLED !== "false" || env.REPLAY_RELEASE_READY !== "false") throw new Error("Lab worker environment refused");
  return { version: 1, database: "triage_lab", labId: env.TRIAGE_LAB_ID!, resourceFingerprint: env.TRIAGE_LAB_RESOURCE_FINGERPRINT!, ...resources } satisfies LabMarker;
}

export function simulatedTransports(scenario: LabScenario, stage: number, replay: boolean,
  record: (operation: string) => Promise<void>): { telegram: FetchTransport; email: EmailTransport } {
  const action = scenario.actions[stage];
  const refused = () => { throw new Error("Lab provider input refused"); };
  if (!action || (replay && scenario.key !== "telegram-rate-limit")) return { telegram: async () => refused(), email: async () => refused() };
  return {
    telegram: async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      if (action.type !== "telegram" || url.origin !== "https://api.telegram.org" || url.username || url.password || url.hash) return refused();
      if (url.pathname === `/bot${fakeTelegramToken}/getChat` && scenario.key === "telegram-resolution" &&
        url.search === "?chat_id=@lab_missing" && !init?.method) {
        await record("getChat");
        return Response.json({ ok: false, error_code: 400 }, { status: 400 });
      }
      if (url.pathname !== `/bot${fakeTelegramToken}/sendMessage` || url.search || init?.method !== "POST" ||
        init.body !== JSON.stringify({ chat_id: "-100123456", text: "[LAB] No external message" })) return refused();
      await record("send");
      if (scenario.key === "telegram-transport") throw new Error("simulated transport uncertainty");
      if (scenario.key === "telegram-rate-limit" && !replay) return Response.json({ ok: false, parameters: { retry_after: 2 } }, { status: 429 });
      if (scenario.key === "telegram-forbidden" || scenario.key === "multi-stage-failure") return Response.json({ ok: false }, { status: 403 });
      if (scenario.key !== "successful-control" && !(scenario.key === "telegram-rate-limit" && replay)) return refused();
      return Response.json({ ok: true, result: { message_id: 1 } });
    },
    email: async (payload, options) => {
      const subject = parse(action.metadata.subject ?? "", {}).trim();
      const key = new Headers(options?.headers).get("Idempotency-Key");
      if (action.type !== "email" || replay || payload.to !== "owner@example.invalid" || payload.from !== "lab@example.invalid" ||
        payload.subject !== subject || payload.html !== '<div style="white-space: pre-wrap;">Lab only</div>' ||
        !key || payload.headers?.["X-Entity-Ref-ID"] !== key) return refused();
      await record("send");
      if (scenario.key === "email-transport") throw new Error("simulated transport uncertainty");
      if (scenario.key === "email-rejection" || scenario.key.startsWith("email-missing-")) return {
        data: null, error: { name: scenario.key === "email-rejection" ? "validation_error" : "missing_required_field", statusCode: 422,
          message: "[LAB] simulated rejection" }, headers: null,
      };
      if (!["successful-control", "multi-stage-failure"].includes(scenario.key)) return refused();
      return { data: { id: "lab-email-receipt" }, error: null, headers: null };
    },
  };
}

export async function createLabRegistry(env = process.env) {
  const marker = assertLabWorkerEnvironment(env);
  const pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 2, connectionTimeoutMillis: 5000,
    query_timeout: 5000, statement_timeout: 5000 });
  const client = await pool.connect();
  try { await checkOwnership(client, marker); } finally { client.release(); }
  // A missed injection must fail locally, including an accidental Resend SDK call.
  // Actual simulations below intercept each provider boundary independently of this backstop.
  globalThis.fetch = (async () => { throw new Error("Lab worker forbids network fetch"); }) as unknown as typeof fetch;

  async function transportFor(ctx: ActionContext) {
    const client = await pool.connect();
    try {
      await checkOwnership(client, marker);
      const matches = await client.query(`SELECT journal.*, run.id AS "runId", run.metadata, zap."userId", action.id AS "actionId",
        action."actionId" AS "typeId", action.metadata AS "actionMetadata", execution.id AS "executionId", execution."requestFingerprint"
        FROM "ZapRun" run JOIN "Zap" zap ON zap.id=run."zapId"
        JOIN triage_lab.run journal ON journal.nonce=run.metadata->'_lab'->>'nonce' AND journal.zap_id=run."zapId"
        JOIN triage_lab.batch batch ON batch.id=journal.batch_id
        JOIN "Action" action ON action."zapId"=zap.id AND action."sortingOrder"=$2
        JOIN "ZapRunExecution" execution ON execution."zapRunId"=run.id AND execution.stage=$2
        WHERE run.id=$1`, [ctx.zapRunId, ctx.stage]);
      if (matches.rows.length !== 1) throw new Error("Unrecognized lab run identity");
      const row = matches.rows[0];
      const identity = ctx.zapRunMetadata._lab as Record<string, unknown> | undefined;
      if (!identity || identity.labId !== marker.labId || identity.nonce !== row.nonce || identity.batchId !== row.batch_id ||
        identity.scenario !== row.scenario || identity.ownerKey !== row.owner_key || row.owner_id !== row.userId ||
        JSON.stringify(row.metadata) !== JSON.stringify(ctx.zapRunMetadata)) throw new Error("Lab run binding refused");
      const scenario = selectScenarios(row.scenario)[0]!;
      const action = scenario.actions[ctx.stage];
      const fingerprint = createFingerprints({ zapRunId: ctx.zapRunId, stage: ctx.stage, actionId: row.actionId,
        actionTypeId: row.typeId, actionMetadata: row.actionMetadata, zapRunMetadata: ctx.zapRunMetadata });
      const expected = createFingerprints({ zapRunId: ctx.zapRunId, stage: ctx.stage, actionId: row.actionId,
        actionTypeId: action?.type ?? "", actionMetadata: action?.metadata ?? {}, zapRunMetadata: ctx.zapRunMetadata });
      if (!action || fingerprint.requestFingerprint !== expected.requestFingerprint || fingerprint.requestFingerprint !== row.requestFingerprint)
        throw new Error("Lab action inputs changed");
      const replayRows = await client.query(`SELECT request.id FROM "ReplayRequest" request JOIN "ReplayExecution" execution
        ON execution."requestId"=request.id WHERE request."zapRunId"=$1 AND request.stage=$2 AND execution.status='RUNNING'`, [ctx.zapRunId, ctx.stage]);
      if (replayRows.rows.length > 1) throw new Error("Ambiguous lab attempt identity");
      const replayId = replayRows.rows[0]?.id as string | undefined;
      const attempts = await client.query(`SELECT id FROM "ZapRunExecutionAttempt" WHERE "executionId"=$1 AND status='STARTED'`, [row.executionId]);
      if (!replayId && attempts.rows.length !== 1) throw new Error("Lab attempt not started");
      const attemptId = replayId ?? attempts.rows[0].id;
      return simulatedTransports(scenario, ctx.stage, Boolean(replayId), async operation => {
        await pool.query(`INSERT INTO triage_lab.provider_operation (run_id,stage,attempt_id,operation,provider,replay,invocations)
          VALUES ($1,$2,$3,$4,$5,$6,1) ON CONFLICT (run_id,stage,attempt_id,operation)
          DO UPDATE SET invocations=triage_lab.provider_operation.invocations+1`,
        [ctx.zapRunId, ctx.stage, attemptId, operation, action.type, Boolean(replayId)]);
      });
    } finally { client.release(); }
  }
  const registry = createActionRegistry({
    email: ctx => async (payload, options) => (await transportFor(ctx)).email(payload, options),
    telegram: ctx => async (url, init) => (await transportFor(ctx)).telegram(url, init),
  });
  return { registry, close: () => pool.end() };
}
