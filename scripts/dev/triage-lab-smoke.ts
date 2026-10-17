import { createHmac, randomUUID } from "node:crypto";
import type { LabMarker } from "./triage-lab-config.ts";
import { assertLabDatabase, labPorts, seedAccounts } from "./triage-lab-config.ts";
import { readSupervisor } from "./triage-lab-lifecycle.ts";
import { checkOwnership } from "./triage-lab-store.ts";

/**
 * Phase 16H lab smoke: one reproducible command that walks the Section 9 acceptance
 * journey over the live pipeline instead of describing it in prose.
 *
 * Every assertion reads state the real services produced. Nothing is fabricated, no
 * provider is contacted, and step 5's replay journey is deliberately invoked through
 * `lab:replay` rather than duplicated here, so a smoke run cannot itself become a second
 * replay authority. The command exits nonzero on the first unexplained mismatch.
 *
 * Required precondition: a healthy supervisor and an already-correlated batch
 * (`lab:start` plus `lab:run --scenario all --batch <id>`). The smoke check reads that
 * batch; it never triggers scenarios itself, so a retry cannot silently create new runs.
 */

export type SmokeOptions = { batch: string; timeout: number; requireReplay: boolean };

const smokeFlags = ["--batch", "--timeout-ms", "--require-replay"] as const;

export function parseSmokeFlags(flags: string[]): SmokeOptions {
  const values = new Map<string, string>();
  const seen = new Set<string>();
  for (let n = 0; n < flags.length; n++) {
    const flag = flags[n]!;
    if (!(smokeFlags as readonly string[]).includes(flag)) throw new Error("Unknown lab smoke flag");
    const value = flags[n + 1];
    if (flag === "--require-replay") {
      if (seen.has(flag)) throw new Error("Duplicate lab smoke flag");
      seen.add(flag);
      continue;
    }
    if (!value || value.startsWith("--") || values.has(flag)) throw new Error("Invalid lab smoke flags");
    values.set(flag, value);
    n++;
  }
  const batch = values.get("--batch") ?? `smoke-${new Date().toISOString().slice(0, 10)}`;
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(batch)) throw new Error("Invalid lab batch ID");
  const timeout = Number(values.get("--timeout-ms") ?? 20000);
  if (!Number.isInteger(timeout) || timeout < 1000 || timeout > 300000)
    throw new Error("Lab timeout must be 1000..300000 milliseconds");
  return { batch, timeout, requireReplay: seen.has("--require-replay") };
}

/**
 * The lab mints its own JWT secret, so the smoke command acts as a seeded identity over
 * the real authenticated HTTP surface without inventing a role header. The claim shape is
 * the one `authMiddleware` verifies, `{ id }`; every role decision still comes from the
 * database row that identity points at.
 */
export function labToken(userId: number, secret: string, now = Date.now()) {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const header = encode({ alg: "HS256", typ: "JWT" });
  const payload = encode({ id: userId, iat: Math.floor(now / 1000), exp: Math.floor(now / 1000) + 3600 });
  const signature = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

type Sql = { query(text: string, values?: unknown[]): Promise<{ rows: Record<string, any>[] }> };
export type SmokeContext = {
  client: Sql; marker: LabMarker; jwtSecret: string; replayEnabled: boolean;
  backend: string; timeout: number; output: (message: string) => void;
};
export type SmokeStep = { step: number; title: string; detail: string };
export type SmokeReport = { batchId: string; replayEnabled: boolean; steps: SmokeStep[]; skipped: string[]; replayCaseId: string | null };

const owners = () => seedAccounts.filter(account => account.role === "owner");
const supportKey = seedAccounts.find(account => account.role === "support")!.key;
const engineerKey = seedAccounts.find(account => account.role === "engineer")!.key;

function fail(message: string): never { throw new Error(`Lab smoke mismatch: ${message}`); }
function expect(condition: unknown, message: string): asserts condition { if (!condition) fail(message); }

async function accountId(client: Sql, key: string) {
  const rows = (await client.query("SELECT resource_id FROM triage_lab.seed WHERE key=$1", [`account:${key}`])).rows;
  expect(rows.length === 1, `seeded account ${key} is missing`);
  return Number(rows[0]!.resource_id);
}

async function api(context: SmokeContext, path: string, actorId: number, init: RequestInit = {}) {
  const response = await fetch(`${context.backend}/api/v1/triage${path}`, {
    ...init,
    headers: { authorization: `Bearer ${labToken(actorId, context.jwtSecret)}`,
      ...(init.body ? { "content-type": "application/json" } : {}), ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(context.timeout),
  });
  const body = await response.json().catch(() => null) as any;
  return { status: response.status, body };
}

/** The batch's cases, newest first. Read from the journal so the operator queue's own cap cannot skew the check. */
function batchCases(context: SmokeContext, batch: string, offset = 0, limit = 50) {
  return context.client.query(`SELECT retry.id FROM "ZapRunRetry" retry
    JOIN "ZapRun" run ON run.id = retry."zapRunId"
    WHERE run.metadata->'_lab'->>'batchId' = $1
    ORDER BY retry."createdAt" DESC LIMIT $2 OFFSET $3`, [batch, limit, offset])
    .then(result => result.rows.map(row => row.id as string));
}

/** Records an acceptance step only after its assertions passed, so a partial run is honest. */
async function step(report: SmokeReport, context: SmokeContext, number: number, title: string,
  work: () => Promise<string>) {
  const detail = await work();
  report.steps.push({ step: number, title, detail });
  context.output(`smoke ${number}/7 ok: ${title} — ${detail}`);
}

/** Step 1: the batch is a real matrix, and its failures are durable with unique correlations. */
async function verifyMatrix(context: SmokeContext, batch: string) {
  const { client } = context;
  const ownersList = owners();
  const journals = (await client.query("SELECT * FROM triage_lab.run WHERE batch_id=$1", [batch])).rows;
  expect(journals.length > 0, `batch ${batch} has no scenario journals; run lab:run first`);
  expect(new Set(journals.map(row => row.owner_key)).size === ownersList.length,
    `batch ${batch} does not cover all ${ownersList.length} seeded owners`);
  expect(new Set(journals.map(row => row.nonce)).size === journals.length, "the batch has duplicate correlations");
  expect(journals.every(row => row.run_id && row.status === "posted"), "batch ingestion is incomplete");

  const runIds = journals.map(row => row.run_id as string);
  const runs = (await client.query('SELECT * FROM "ZapRun" WHERE id=ANY($1::text[])', [runIds])).rows;
  expect(runs.length === journals.length, "a correlated run is missing or duplicated");
  expect(new Set(runs.map(row => row.zapId)).size === runs.length, "the batch reused another run's Zap");
  expect(runs.every(row => String(row.metadata?._lab?.batchId) === batch), "a correlated run belongs to a different batch");

  const executions = (await client.query('SELECT * FROM "ZapRunExecution" WHERE "zapRunId"=ANY($1::text[])', [runIds])).rows;
  const attempts = (await client.query(`SELECT attempt.id FROM "ZapRunExecutionAttempt" attempt
    JOIN "ZapRunExecution" execution ON execution.id=attempt."executionId"
    WHERE execution."zapRunId"=ANY($1::text[])`, [runIds])).rows;
  const failures = (await client.query('SELECT * FROM "ZapRunRetry" WHERE "zapRunId"=ANY($1::text[])', [runIds])).rows;
  const operations = (await client.query("SELECT * FROM triage_lab.provider_operation WHERE run_id=ANY($1::text[])", [runIds])).rows;

  // Only the original matrix operations are counted here; a completed replay journey adds
  // its own journal entry, and both kinds must stay single-use.
  const original = operations.filter(row => row.replay === false);
  expect(new Set(original.map(row => row.provider)).size === 2, "the batch did not exercise both providers");
  expect(original.every(row => row.invocations === 1), "an original provider operation was not single-use");
  expect(operations.filter(row => row.replay === true).every(row => row.invocations === 1),
    "a replay provider operation was not single-use");
  expect(executions.every(row => row.status !== "PENDING"), "a batch execution is still pending");
  expect(failures.length > 0, "the batch produced no durable failures");
  expect(failures.every(row => row.requiresHuman === true && row.evidenceSource === "captured"),
    "a failure is not a captured human-required failure");
  expect(failures.every(row => row.dlqPublishedAt), "a durable failure was never published to the DLQ");
  expect(attempts.length === executions.length, "an execution without exactly one attempt reached the batch");
  expect((await client.query('SELECT id FROM "ZapRunOutbox" WHERE "zapRunId"=ANY($1::text[])', [runIds])).rows.length === 0,
    "the batch outbox was not drained");
  return `${journals.length} correlated runs, ${ownersList.length} owners, ${executions.length} executions, ` +
    `${failures.length} durable DLQ failures, ${original.length} original and ` +
    `${operations.length - original.length} replay provider operations, all single-use across both providers`;
}

/** Step 2: each owner sees exactly their own cases, and no privileged surface opens to them. */
async function verifyOwnerIsolation(context: SmokeContext, ownersList: ReturnType<typeof owners>) {
  const ids: number[] = [];
  for (const account of ownersList) ids.push(await accountId(context.client, account.key));
  let total = 0;
  for (let index = 0; index < ownersList.length; index++) {
    const actorId = ids[index]!;
    const key = ownersList[index]!.key;
    const visible = (await api(context, "/cases/failures?limit=50", actorId)).body?.failures as { caseId: string }[] | undefined;
    expect(Array.isArray(visible) && visible.length > 0, `owner ${key} sees no failures`);
    const owned = (await context.client.query(`SELECT retry.id FROM "ZapRunRetry" retry
      JOIN "ZapRun" run ON run.id=retry."zapRunId" JOIN "Zap" zap ON zap.id=run."zapId" WHERE zap."userId"=$1`, [actorId])).rows;
    const ownedIds = new Set(owned.map(row => row.id as string));
    expect(visible!.every(item => ownedIds.has(item.caseId)), `owner ${key} sees another owner's case`);
    expect(visible!.length === ownedIds.size, `owner ${key} does not see all of their own cases`);
    total += visible!.length;

    expect((await api(context, "/operator/cases?limit=10", actorId)).status === 403, "an owner reached the operator queue");
    expect((await api(context, "/engineering/cases?limit=10", actorId)).status === 403, "an owner reached the engineering queue");

    // A foreign case id is "not found", never a denial oracle that confirms the id exists.
    const otherId = ids.find(id => id !== actorId)!;
    const foreignCase = (await context.client.query(`SELECT retry.id FROM "ZapRunRetry" retry
      JOIN "ZapRun" run ON run.id=retry."zapRunId" JOIN "Zap" zap ON zap.id=run."zapId"
      WHERE zap."userId"=$1 LIMIT 1`, [otherId])).rows[0]?.id as string | undefined;
    expect(foreignCase, "could not identify a foreign case for the isolation check");
    expect((await api(context, `/cases/${foreignCase}/repair`, actorId)).status === 404, "a foreign repair view was not hidden");
    expect((await api(context, `/cases/${foreignCase}/workflow`, actorId)).status === 404, "a foreign workflow view was not hidden");
  }
  return `${ownersList.length} owners each saw exactly their own ${Math.round(total / ownersList.length)} cases; privileged queues and foreign ids denied`;
}

/** Step 3: support sees every owner's case, routes one, and the routing survives a fresh read. */
async function verifySupportRouting(context: SmokeContext, batch: string) {
  const supportId = await accountId(context.client, supportKey);
  const mine = await batchCases(context, batch);
  expect(mine.length > 0, `batch ${batch} has no cases to route`);
  const queue = await api(context, "/operator/cases?limit=50", supportId);
  expect(queue.status === 200, `support could not read the case queue (HTTP ${queue.status})`);
  const visible = new Set(((queue.body?.cases ?? []) as { case_id: string }[]).map(item => item.case_id));
  expect(visible.size > 0, "the operator queue returned no cases");
  // The queue is deliberately capped at 50 and ordered by case id, so a long-lived lab
  // holds far more history than one page. Page membership alone would therefore prove
  // little; every case of this batch must stay readable by its own authorized lookup,
  // which is the property a queue filter or an owner scope would break.
  const missing: string[] = [];
  for (const caseId of mine) {
    const found = await api(context, `/operator/cases/${caseId}`, supportId);
    if (found.status !== 200 || found.body?.case_id !== caseId) missing.push(caseId);
  }
  expect(missing.length === 0, `support cannot read ${missing.length} of this batch's ${mine.length} cases`);
  expect(mine.some(caseId => visible.has(caseId)), "no case from this batch appeared on the queue page");

  const caseId = mine[0]!;
  const routed = await api(context, `/operator/cases/${caseId}/workflow/request-repair`, supportId, {
    method: "POST", headers: { "idempotency-key": randomUUID() },
    body: JSON.stringify({ customerInstructions: { missingFields: [], instructions: "Lab smoke: review the captured failure." } }),
  });
  expect(routed.status === 200, `support routing failed with HTTP ${routed.status}`);
  const reread = await api(context, `/operator/cases/${caseId}/workflow`, supportId);
  expect(reread.status === 200, "the routed case could not be re-read");
  expect(reread.body?.workflow?.queue === routed.body?.workflow?.queue, "routing changed between two reads");
  expect((reread.body?.events ?? []).some((event: { action: string }) => event.action === "request_owner_repair"),
    "the routing event is missing from the durable trail");
  // Support keeps visibility of a case that now belongs to the owner queue.
  expect((await api(context, `/operator/cases/${caseId}`, supportId)).status === 200,
    "a routed case disappeared from the support view");
  return `all ${mine.length} batch cases readable by support across owners, ${visible.size} on the queue page; ` +
    `case ${caseId} routed to ${routed.body?.workflow?.queue} and re-read identically`;
}

/** Step 4: the engineer sees the escalation, returns findings, and the owner stays customer-safe. */
async function verifyEngineerFindings(context: SmokeContext, batch: string) {
  const supportId = await accountId(context.client, supportKey);
  const engineerId = await accountId(context.client, engineerKey);
  // Step 3 already routed the newest case; escalate a different one so both handoffs
  // are visible at once and the case under test has not left the support queue.
  const caseId = (await batchCases(context, batch, 1, 1))[0];
  expect(caseId, `batch ${batch} has no second case for the engineering handoff`);
  const escalated = await api(context, `/operator/cases/${caseId}/workflow/escalate`, supportId, {
    method: "POST", headers: { "idempotency-key": randomUUID() },
    body: JSON.stringify({ escalationReason: "Lab smoke: engineer review", assignedEngineerId: engineerId }),
  });
  expect(escalated.status === 200, `escalation failed with HTTP ${escalated.status}`);

  const engineering = await api(context, "/engineering/cases?limit=50", engineerId);
  expect(engineering.status === 200, `the engineer could not read the engineering queue (HTTP ${engineering.status})`);
  expect(((engineering.body?.cases ?? []) as { case_id: string }[]).some(item => item.case_id === caseId),
    "the routed case is absent from the engineering queue after a fresh read");
  expect((await api(context, `/operator/cases/${caseId}/workflow`, engineerId)).status === 403,
    "an engineer reached a support-only route");

  const findings = "Lab smoke: the captured rejection is a send-boundary policy refusal";
  const returned = await api(context, `/engineering/cases/${caseId}/findings`, engineerId, {
    method: "POST", headers: { "idempotency-key": randomUUID() }, body: JSON.stringify({ findings }),
  });
  expect(returned.status === 200, `returning findings failed with HTTP ${returned.status}`);

  const ownerRows = (await context.client.query(`SELECT zap."userId" FROM "ZapRunRetry" retry
    JOIN "ZapRun" run ON run.id=retry."zapRunId" JOIN "Zap" zap ON zap.id=run."zapId" WHERE retry.id=$1`, [caseId])).rows;
  const ownerView = await api(context, `/cases/${caseId}/workflow`, Number(ownerRows[0]!.userId));
  expect(ownerView.status === 200, "the owner could not read the case workflow");
  expect(ownerView.body?.workflow?.queue === "support", "the case did not return to support after findings");
  expect(JSON.stringify(ownerView.body).includes(findings) === false, "internal findings leaked into the owner projection");
  expect(((await api(context, "/engineering/cases?limit=50", engineerId)).body?.cases ?? []).length === 0,
    "the engineering queue still holds the returned case");
  return `case ${caseId} escalated, findings returned to support, and the owner projection stayed customer-safe`;
}

/**
 * Step 6: the lab's own captured facts are refused by the real application policy.
 *
 * Nothing is fabricated: the case-level facts are loaded from the live database with the
 * same loader the approval and request paths use, and only the proposal's own candidate
 * fields are supplied, because this release has no replay allowance for these scenarios.
 * The reason codes are the bounded vocabulary the UI shows.
 */
async function verifyDenials(context: SmokeContext, batch: string, databaseUrl: string) {
  const { client } = context;
  const { loadCurrentPolicyState } = await import("../../apps/primary_backend/services/replay-policy-facts.ts");
  const { evaluateReplayPolicy } = await import("../../apps/primary_backend/services/replay-policy.ts");
  // The policy loader is written against the Prisma client, so it gets the same
  // datasource-bound client the replay journey uses rather than the raw pool client.
  const { openLabDatabase } = await import("./triage-lab-replay.ts");
  const db = await openLabDatabase(databaseUrl);
  try {
  // The handler identity is read from the batch's own executions, so the policy is
  // evaluated against the code that actually produced the case rather than a shell default.
  const cases = (await client.query(`SELECT retry.id, retry."safeCode", retry.stage, zap."userId" AS "ownerId",
      execution."handlerVersion"
    FROM "ZapRunRetry" retry
    JOIN "ZapRun" run ON run.id = retry."zapRunId"
    JOIN "Zap" zap ON zap.id = run."zapId"
    JOIN "ZapRunExecution" execution ON execution.id = retry."executionId"
    WHERE run.metadata->'_lab'->>'batchId' = $1`, [batch])).rows;

  async function policyFor(safeCode: string) {
    const row = cases.find(item => item.safeCode === safeCode);
    expect(row, `batch ${batch} has no ${safeCode} case`);
    // The recorded handler identity is the one this lab actually deploys; comparing
    // against a shell default would manufacture a `changed_handler` denial instead of
    // testing the scenario's real refusal reason.
    const versions = new Set(cases.map(item => String(item.handlerVersion)));
    expect(versions.size === 1 && !versions.has("null"),
      `batch ${batch} was produced by more than one handler version`);
    const { current, config } = await loadCurrentPolicyState(db as never, Number(row!.ownerId), row!.id as string,
      String(row!.handlerVersion));
    const execution = current.executionEvidence.facts;
    const failure = current.failureContext.facts;
    const facts = {
      disposition: "replay_candidate", kind: "wait_then_replay", taxonomyId: "F01",
      source: failure.source_kind, provenance: execution.provenance,
      evidenceComplete: config.providerEvidenceConsistent,
      provider: failure.retry.provider ?? null, phase: failure.retry.phase ?? null,
      safeCode: failure.retry.safe_code ?? null, providerStatus: failure.retry.provider_status ?? null,
      providerOutcome: failure.retry.provider_outcome ?? null,
      attempts: execution.attempts.map(attempt => ({ outcome: attempt.provider_outcome, provider: attempt.provider,
        phase: attempt.phase, status: attempt.provider_status, retryAfterSeconds: attempt.retry_after_seconds,
        completedAt: attempt.completed_at })),
      historyTruncated: execution.history_truncated,
      executionStatus: execution.current_execution?.status ?? null,
      leaseUntil: execution.current_execution?.lease_until ?? null,
      orderValid: execution.ordering.status === "valid",
      predecessorsSuccessful: execution.predecessors.every(item => item.status === "SUCCESS"),
      incompatibleSuccessor: config.incompatibleSuccessor,
      activeReplay: config.activeReplay, previousReplayCount: config.previousReplayCount,
      inputValid: current.inputValidation.facts.validation_status === "valid" && current.inputValidation.facts.supported,
      actionFingerprint: null, requestFingerprint: null,
      currentActionFingerprint: config.actionFingerprint, currentRequestFingerprint: config.requestFingerprint,
      handlerVersion: null, currentHandlerVersion: config.currentHandlerVersion,
    };
    return { caseId: row!.id as string, result: evaluateReplayPolicy(facts) };
  }

  const missingCredentials = await policyFor("telegram_credentials_missing");
  expect(missingCredentials.result.status === "blocked", "missing Telegram credentials were not blocked");
  expect(missingCredentials.result.reasons.length > 0, "missing credentials produced no concrete denial reason");
  const unknownDelivery = await policyFor("telegram_transport_error");
  expect(unknownDelivery.result.status === "blocked", "an unknown provider outcome was not blocked");
  expect(unknownDelivery.result.reasons.includes("unknown_outcome"),
    `unknown delivery was not denied for unknown_outcome (${unknownDelivery.result.reasons.join(",")})`);
  const missingSubject = await policyFor("missing_required_field");
  expect(missingSubject.result.status === "blocked", "a missing required email field was not blocked");
  expect(missingSubject.result.reasons.length > 0, "the missing-subject case produced no denial reason");

  // Reserved hostnames and remote brokers must never be mistaken for the lab.
  for (const [url, label] of [["postgresql://lab@127.0.0.1:5432/app", "an ordinary database name"],
    ["postgresql://lab@db.example.com:5432/triage_lab", "a remote database host"]] as const) {
    let refused = false;
    try { assertLabDatabase(url); } catch { refused = true; }
    expect(refused, `${label} was accepted as the lab database`);
  }
  let malformedRefused = false;
  try { parseSmokeFlags(["--batch"]); } catch { malformedRefused = true; }
  expect(malformedRefused, "a malformed smoke flag was accepted");
  expect(parseSmokeFlags(["--batch", "smoke-x", "--require-replay"]).batch === "smoke-x",
    "smoke flag parsing lost the batch id");

  const row = (await client.query("SELECT marker FROM triage_lab.ownership WHERE singleton = true")).rows[0];
  expect(row?.marker?.database === "triage_lab" && row?.marker?.labId === context.marker.labId,
    "the ownership marker does not match the running lab");
  return `live policy blocked missing credentials (${missingCredentials.result.reasons.join("/")}), ` +
    `unknown delivery (${unknownDelivery.result.reasons.join("/")}) and missing subject ` +
    `(${missingSubject.result.reasons.join("/")}); ordinary database, remote host and malformed flags refused`;
  } finally {
    await db.$disconnect();
  }
}

export async function runLabSmoke(client: Sql, marker: LabMarker, input: {
  state: { jwtSecret: string; controlToken: string }; databaseUrl: string; options: SmokeOptions;
  output?: (message: string) => void;
}): Promise<SmokeReport> {
  const output = input.output ?? ((message: string) => console.log(message));
  await checkOwnership(client as never, marker);
  const identity = await readSupervisor(marker, input.state.controlToken) as
    { ready?: boolean; databaseAvailable?: boolean; replayEnabled?: boolean } | null;
  expect(identity?.ready && identity.databaseAvailable, "start a healthy lab before running the smoke check");

  const context: SmokeContext = { client, marker, jwtSecret: input.state.jwtSecret,
    replayEnabled: identity!.replayEnabled === true, backend: `http://127.0.0.1:${labPorts.backend}`,
    timeout: input.options.timeout, output };
  const report: SmokeReport = { batchId: input.options.batch, replayEnabled: context.replayEnabled,
    steps: [], skipped: [], replayCaseId: null };

  await step(report, context, 1, "lab matrix across owners and providers",
    () => verifyMatrix(context, input.options.batch));
  await step(report, context, 2, "owner isolation and repair surface",
    () => verifyOwnerIsolation(context, owners()));
  await step(report, context, 3, "support routing survives a re-read",
    () => verifySupportRouting(context, input.options.batch));
  await step(report, context, 4, "engineer findings and the customer-safe owner view",
    () => verifyEngineerFindings(context, input.options.batch));
  if (context.replayEnabled) {
    const replay = (await client.query(`SELECT retry.id FROM "ZapRunRetry" retry
      JOIN "ZapRun" run ON run.id = retry."zapRunId"
      WHERE run.metadata->'_lab'->>'batchId' = $1 AND retry."safeCode" = 'telegram_http_429'
      ORDER BY retry."createdAt" LIMIT 1`, [input.options.batch])).rows[0]?.id as string | undefined;
    expect(replay, "the batch has no eligible Telegram 429 case for the replay journey");
    report.replayCaseId = replay!;
    output(`smoke 5/7 pending: the replay journey owns its own ledger assertions — run ` +
      `\`rtk proxy bun run lab:replay --case-id ${replay}\``);
    report.skipped.push(`step 5 replay journey: run lab:replay --case-id ${replay}`);
  } else {
    expect(!input.options.requireReplay, "the running lab has no verified replay profile; restart it with lab:start:replay");
    output("smoke 5/7 skipped: no verified replay profile (restart the lab with lab:start:replay to exercise it)");
    report.skipped.push("step 5 replay journey: no verified replay profile active");
  }
  await step(report, context, 6, "replay denial reasons and resource guards",
    () => verifyDenials(context, input.options.batch, input.databaseUrl));
  await step(report, context, 7, "ownership marker and batch correlation guards",
    async () => {
      const before = (await client.query("SELECT count(*)::int AS count FROM triage_lab.run WHERE batch_id=$1", [input.options.batch])).rows[0]!.count as number;
      expect(before > 0, "the batch journal disappeared between steps");
      const row = (await client.query("SELECT marker FROM triage_lab.ownership WHERE singleton = true")).rows[0];
      expect(row!.marker.resourceFingerprint === marker.resourceFingerprint, "the lab fingerprint changed mid-run");
      return `batch ${input.options.batch} still has ${before} journals and the ownership marker is unchanged`;
    });

  output(JSON.stringify({ smoke: "passed", batchId: report.batchId, replayEnabled: report.replayEnabled,
    verifiedSteps: report.steps.map(entry => entry.step), skipped: report.skipped,
    replayCaseId: report.replayCaseId }, null, 2));
  return report;
}
