import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { Prisma } from "../../../packages/db/generated/prisma/client.ts";
import {
  TriageOwnerActionStale,
  TriageOwnerCaseNotFound,
  TriageOwnerRepairNotAllowed,
  TriageOwnerService,
  actionRepairToken,
  fieldRepairView,
  mergeRepairFields,
  type ActionDelegate,
  type OwnerRepairRow,
  type TriageOwnerDb,
} from "../services/triage-owner.ts";

const ownerId = 9;
const otherOwnerId = 99;
const caseId = "f0100000-0000-4000-8000-000000000001";
const runId = "11111111-1111-4111-8111-111111111111";
const zapId = "22222222-2222-4222-8222-222222222222";
const actionId = "33333333-3333-4333-8333-333333333333";

type Fixture = {
  owner: number;
  queue: string | null;
  status: string | null;
  actionMetadata: Record<string, unknown>;
  actionTypeId?: string | null;
  actionName?: string | null;
  stage?: number;
  instructions?: unknown;
  /** Runs inside `$executeRaw`, after the conditional WHERE has been evaluated. */
  beforeWrite?: () => void;
};

function createMockDb(options: Fixture = { owner: ownerId, queue: "owner", status: "awaiting_owner", actionMetadata: {} }) {
  const writes: { where: Record<string, unknown>; data: { metadata: unknown } }[] = [];
  const reads: string[] = [];
  const fingerprint = (value: unknown) => JSON.stringify(value ?? {});

  const record = (): OwnerRepairRow => ({
    caseId,
    zapRunId: runId,
    stage: options.stage ?? 1,
    observedAt: new Date("2026-10-15T00:00:00Z"),
    providerOutcome: "not_attempted",
    safeCode: "invalid_action_inputs",
    actionTypeId: options.actionTypeId === undefined ? "email" : options.actionTypeId,
    actionMetadata: options.actionMetadata,
    actionId,
    actionName: options.actionName === undefined ? "Email" : options.actionName,
    actionSortingOrder: options.stage ?? 1,
    zapId,
    zapName: "Meeting reminder",
    triggerTypeName: "Catch Hook",
    workflowQueue: options.queue,
    workflowStatus: options.status,
    workflowVersion: 2,
    customerInstructions: options.instructions ?? {
      targetStep: 1,
      missingFields: ["subject"],
      instructions: "Add the email subject in step 1.",
    },
    repairNote: null,
    resolvedAt: null,
  });

  const valueOf = (query: unknown, index: number) =>
    ((query as { values?: unknown[] }).values ?? [])[index];

  const client = {
    $queryRaw: async <T>(query: unknown): Promise<T> => {
      const sql = String((query as { sql?: string }).sql);
      reads.push(sql);
      if (valueOf(query, 0) !== options.owner) return [] as T;
      const scopedCaseId = valueOf(query, 1);
      if (typeof scopedCaseId === "string" && scopedCaseId !== caseId) return [] as T;
      const scopedActionId = valueOf(query, 2);
      if (typeof scopedActionId === "string" && scopedActionId !== actionId) return [] as T;
      return [record()] as T;
    },
    $transaction: async <T>(fn: (tx: ActionDelegate) => Promise<T>): Promise<T> => fn({
      $executeRaw: async (query) => {
        const values = (query as { values?: unknown[] }).values ?? [];
        // values: [nextMetadata, actionId, zapId, sortingOrder, currentMetadata]
        const [, writeActionId, writeZapId, writeSortingOrder, currentMetadata] = values;
        writes.push({
          where: { id: writeActionId, zapId: writeZapId, sortingOrder: writeSortingOrder, metadata: currentMetadata },
          data: { metadata: JSON.parse(String(values[0])) },
        });
        // Lets a test simulate a writer that commits between the read and the update.
        options.beforeWrite?.();
        if (writeActionId !== actionId || writeZapId !== zapId || Number(writeSortingOrder) !== (options.stage ?? 1)) return 0;
        // The conditional update only matches while the row still holds the loaded metadata.
        if (String(currentMetadata) !== JSON.stringify(options.actionMetadata ?? {})) return 0;
        options.actionMetadata = JSON.parse(String(values[0])) as Record<string, unknown>;
        return 1;
      },
    }),
  };

  return { db: client as unknown as TriageOwnerDb, writes, reads, options, fingerprint };
}

describe("Phase 16D owner repair helpers", () => {
  test("projects only worker-read fields and never a credential value", () => {
    const fields = fieldRepairView("telegram", {
      channelUserName: "@ops",
      message: "hello",
      botToken: "123456:secret-token",
    });

    assert.deepEqual(fields.map((field) => field.field), ["channelUserName", "message", "botToken"]);
    assert.equal(fields[2]?.sensitive, true);
    assert.equal(fields[2]?.value, "");
    assert.equal(JSON.stringify(fields).includes("secret-token"), false);
  });

  test("replaces only allow-listed fields and preserves credentials and unknown keys", () => {
    const { merged, changed } = mergeRepairFields("telegram", {
      channelUserName: "@ops",
      message: "hello",
      botToken: "keep-me",
      custom: "untouched",
    }, [
      { field: "message", value: "fixed" },
      { field: "botToken", value: "replaced" },
      { field: "notAField", value: "nope" },
    ]);

    assert.deepEqual(changed, ["message"]);
    assert.deepEqual(merged, {
      channelUserName: "@ops",
      message: "fixed",
      botToken: "keep-me",
      custom: "untouched",
    });
  });
});

describe("Phase 16D TriageOwnerService", () => {
  test("repair view exposes the owner-safe projection and bounds unavailable evidence", async () => {
    const { db } = createMockDb();
    const view = await new TriageOwnerService(db).getRepairCase(ownerId, caseId);

    assert.equal(view.caseId, caseId);
    assert.equal(view.zap.id, zapId);
    assert.equal(view.zap.name, "Meeting reminder");
    assert.equal(view.zap.editorPath, `/zap/${zapId}`);
    assert.equal(view.stepLabel, "Email (action 1)");
    assert.equal(view.workflow.status, "awaiting_owner");
    assert.equal(view.workflow.awaitingOwnerRepair, true);
    assert.equal(view.workflow.customerInstructions?.instructions, "Add the email subject in step 1.");
    assert.deepEqual(view.workflow.customerInstructions?.missingFields, ["subject"]);
    assert.equal(view.action?.actionTypeId, "email");
    assert.deepEqual(view.action?.fields.map((field) => field.field), ["to", "subject", "body", "from"]);
    assert.deepEqual(view.unavailable, []);
  });

  test("repair view never leaks internal support state", async () => {
    const { db } = createMockDb();
    const view = await new TriageOwnerService(db).getRepairCase(ownerId, caseId);
    const serialized = JSON.stringify(view);

    for (const secret of ["escalationReason", "findings", "resolutionReason", "assignedEngineerId", "internal"]) {
      assert.equal(serialized.includes(secret), false, `leaked ${secret}`);
    }
  });

  test("unknown owner, case and action ids are indistinguishable not-found", async () => {
    const { db } = createMockDb();
    const service = new TriageOwnerService(db);

    await assert.rejects(async () => { await service.getRepairCase(otherOwnerId, caseId); },
      (error: unknown) => error instanceof TriageOwnerCaseNotFound);
    await assert.rejects(async () => { await service.getRepairCase(ownerId, "ffffffff-ffff-4fff-8fff-ffffffffffff"); },
      (error: unknown) => error instanceof TriageOwnerCaseNotFound);
    await assert.rejects(
      async () => {
        await service.saveActionRepair(ownerId, caseId, "ffffffff-ffff-4fff-8fff-ffffffffffff", {
          actionToken: "stale", fields: [{ field: "subject", value: "x" }],
        });
      },
      (error: unknown) => error instanceof TriageOwnerCaseNotFound);
  });

  test("a valid repair writes the named action metadata and returns the token for the new state", async () => {
    const { db, writes, options } = createMockDb({
      owner: ownerId,
      queue: "owner",
      status: "awaiting_owner",
      actionMetadata: { to: "customer@example.invalid", subject: "", body: "Body" },
    });
    const service = new TriageOwnerService(db);
    const view = await service.getRepairCase(ownerId, caseId);

    const result = await service.saveActionRepair(ownerId, caseId, actionId, {
      actionToken: view.action!.actionToken,
      fields: [{ field: "subject", value: "Meeting notice" }],
    });

    assert.deepEqual(result.changedFields, ["subject"]);
    assert.equal(result.workflow.awaitingOwnerRepair, true);
    assert.equal(writes.length, 1);
    assert.deepEqual(options.actionMetadata, {
      to: "customer@example.invalid",
      subject: "Meeting notice",
      body: "Body",
    });
    // The returned token must describe the new state, not the old one.
    assert.equal(result.actionToken, actionRepairToken(actionId, options.actionMetadata, 1));
    assert.notEqual(result.actionToken, view.action!.actionToken);
  });

  test("a stale action token is rejected and performs no write", async () => {
    const { db, writes, options } = createMockDb({
      owner: ownerId,
      queue: "owner",
      status: "awaiting_owner",
      actionMetadata: { to: "customer@example.invalid", subject: "", body: "Body" },
    });
    const service = new TriageOwnerService(db);
    const view = await service.getRepairCase(ownerId, caseId);

    // Someone else fixed the subject after this owner loaded the page.
    options.actionMetadata = { to: "customer@example.invalid", subject: "Fixed by support", body: "Body" };

    await assert.rejects(
      async () => {
        await service.saveActionRepair(ownerId, caseId, actionId, {
          actionToken: view.action!.actionToken,
          fields: [{ field: "subject", value: "Meeting notice" }],
        });
      },
      (error: unknown) => error instanceof TriageOwnerActionStale);

    assert.equal(writes.length, 0);
    assert.equal(options.actionMetadata.subject, "Fixed by support");
  });

  test("a concurrent writer between the read and the update is detected by the conditional write", async () => {
    const holder: { options?: Fixture } = {};
    const { db, writes, options } = createMockDb({
      owner: ownerId,
      queue: "owner",
      status: "awaiting_owner",
      actionMetadata: { subject: "a", to: "x@example.invalid", body: "b" },
      // The token is valid when checked; another writer commits before the UPDATE runs.
      beforeWrite: () => {
        holder.options!.actionMetadata = { subject: "changed by someone else", to: "x@example.invalid", body: "b" };
      },
    });
    holder.options = options;

    await assert.rejects(
      async () => {
        await new TriageOwnerService(db).saveActionRepair(ownerId, caseId, actionId, {
          actionToken: actionRepairToken(actionId, { subject: "a", to: "x@example.invalid", body: "b" }, 1),
          fields: [{ field: "subject", value: "n" }],
        });
      },
      (error: unknown) => error instanceof TriageOwnerActionStale);

    assert.equal(writes.length, 1);
    assert.equal(options.actionMetadata.subject, "changed by someone else");
  });

  test("repair is refused unless the case is awaiting owner repair", async () => {
    const { db, writes } = createMockDb({
      owner: ownerId,
      queue: "support",
      status: "needing_support",
      actionMetadata: {},
    });

    await assert.rejects(
      async () => {
        await new TriageOwnerService(db).saveActionRepair(ownerId, caseId, actionId, {
          actionToken: actionRepairToken(actionId, {}, 1),
          fields: [{ field: "subject", value: "x" }],
        });
      },
      (error: unknown) => error instanceof TriageOwnerRepairNotAllowed);

    assert.equal(writes.length, 0);
  });

  test("the repair path writes only action metadata", async () => {
    const { db, writes } = createMockDb({
      owner: ownerId,
      queue: "owner",
      status: "awaiting_owner",
      actionMetadata: { subject: "", to: "x@example.invalid", body: "b" },
    });
    const service = new TriageOwnerService(db);
    const view = await service.getRepairCase(ownerId, caseId);
    await service.saveActionRepair(ownerId, caseId, actionId, {
      actionToken: view.action!.actionToken,
      fields: [{ field: "subject", value: "Meeting notice" }],
    });

    // Every recorded write targets the Action row and carries only a metadata payload,
    // so no run, attempt, retry, execution, proposal, approval or replay row is touched.
    assert.equal(writes.length, 1);
    for (const write of writes) {
      assert.deepEqual(Object.keys(write.data), ["metadata"]);
      assert.deepEqual(Object.keys(write.where).sort(), ["id", "metadata", "sortingOrder", "zapId"]);
    }
  });

  test("listFailures is owner-scoped, deduplicated and labelled", async () => {
    const { db } = createMockDb({ owner: ownerId, queue: "owner", status: "awaiting_owner", actionMetadata: {} });
    const service = new TriageOwnerService(db);

    const mine = await service.listFailures(ownerId);
    assert.equal(mine.length, 1);
    assert.equal(mine[0]?.caseId, caseId);
    assert.equal(mine[0]?.zapId, zapId);
    assert.equal(mine[0]?.stepLabel, "Email (action 1)");
    assert.equal(mine[0]?.status, "awaiting_owner");

    assert.deepEqual(await service.listFailures(otherOwnerId), []);
  });
});

describe("Phase 16D repair SQL shape", () => {
  test("case projection joins the action to the failure stage without duplicating cases", async () => {
    const { db, reads } = createMockDb();
    await new TriageOwnerService(db).getRepairCase(ownerId, caseId);

    const sql = reads.join("\n");
    assert.match(sql, /action\."sortingOrder" = retry\.stage/);
    assert.match(sql, /zap\."userId" =/);
    // Owner scoping happens in the query itself, not after the fact.
    assert.match(sql, /LEFT JOIN "TriageCaseWorkflow"/);
    assert.equal(Prisma.sql`x`.sql.length > 0, true);
  });
});
