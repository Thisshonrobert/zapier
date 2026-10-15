import { createHash } from "node:crypto";

import { Prisma } from "../../../packages/db/generated/prisma/client.ts";
import type {
  ActionRepairField,
  OwnerActionRepairResult,
  OwnerActionRepairView,
  OwnerFailureSummary,
  OwnerRepairCaseView,
} from "../../../packages/triage-contracts/owner.ts";
import type { WorkflowQueue, WorkflowStatus } from "../../../packages/triage-contracts/workflow.ts";

/**
 * Owner failure and repair journey (Phase 16D).
 *
 * Every read is bound to the authenticated owner, so a guessed case, Zap or action
 * id from another tenant resolves to "not found" rather than a denial that would
 * confirm the id exists. Metadata writes are limited to the target action row and to
 * the fields the worker actually reads for that action type; credentials are never
 * projected and are preserved untouched.
 */

export class TriageOwnerCaseNotFound extends Error {}
export class TriageOwnerActionStale extends Error {}
export class TriageOwnerRepairNotAllowed extends Error {}

/**
 * Worker validation order, duplicated deliberately: `apps/primary_backend` must not
 * import worker action modules at runtime. `fieldRepairView` keeps credentials out.
 */
const actionFields: Record<string, { required: string[]; optional: string[]; credentials: string[] }> = {
  email: { required: ["to", "subject", "body"], optional: ["from"], credentials: [] },
  telegram: { required: ["channelUserName", "message"], optional: ["botToken"], credentials: ["botToken"] },
};

export type OwnerRepairRow = {
  caseId: string;
  zapRunId: string;
  stage: number;
  observedAt: Date;
  providerOutcome: string | null;
  safeCode: string | null;
  actionTypeId: string | null;
  actionMetadata: unknown;
  actionId: string | null;
  actionName: string | null;
  actionSortingOrder: number | null;
  zapId: string;
  zapName: string | null;
  triggerTypeName: string | null;
  workflowQueue: string | null;
  workflowStatus: string | null;
  workflowVersion: number | null;
  customerInstructions: unknown;
  repairNote: string | null;
  resolvedAt: Date | null;
};

export type ActionDelegate = {
  $executeRaw(query: unknown): Promise<number>;
};

export type OwnerSqlClient = {
  $queryRaw<T = unknown>(query: unknown): Promise<T>;
};

export type TriageOwnerDb = OwnerSqlClient & {
  $transaction<T>(fn: (tx: ActionDelegate) => Promise<T>): Promise<T>;
};

/** Columns of the owner-scoped case projection, with their aliases. */
const CASE_REPAIR_COLUMNS = Prisma.sql`
    retry.id AS "caseId",
    retry."zapRunId" AS "zapRunId",
    retry.stage,
    retry."createdAt" AS "observedAt",
    retry."providerOutcome" AS "providerOutcome",
    retry."safeCode" AS "safeCode",
    action_type.id AS "actionTypeId",
    action.metadata AS "actionMetadata",
    action.id AS "actionId",
    action_type.name AS "actionName",
    action."sortingOrder" AS "actionSortingOrder",
    zap.id AS "zapId",
    zap.name AS "zapName",
    trigger_type.name AS "triggerTypeName",
    wf.queue AS "workflowQueue",
    wf.status AS "workflowStatus",
    wf.version AS "workflowVersion",
    wf."customerInstructions" AS "customerInstructions",
    wf."repairNote" AS "repairNote",
    wf."resolvedAt" AS "resolvedAt"
`;

/** Owner-scoped joins. The action matches the failure's stage, the workflow is 1:1. */
const CASE_REPAIR_JOINS = Prisma.sql`
  FROM "ZapRunRetry" retry
  INNER JOIN "ZapRun" run ON run.id = retry."zapRunId"
  INNER JOIN "Zap" zap ON zap.id = run."zapId"
  LEFT JOIN "Trigger" trigger ON trigger."zapId" = zap.id
  LEFT JOIN "AvailableTriggerType" trigger_type ON trigger_type.id = trigger."typeId"
  LEFT JOIN "Action" action
    ON action."zapId" = zap.id AND action."sortingOrder" = retry.stage
  LEFT JOIN "AvailableAction" action_type ON action_type.id = action."actionId"
  LEFT JOIN "TriageCaseWorkflow" wf ON wf."caseId" = retry.id
`;

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;
}

/** Optimistic token over the action's current metadata; any concurrent edit changes it. */
export function actionRepairToken(actionId: string, metadata: unknown, sortingOrder: number) {
  return createHash("sha256")
    .update(canonical({ actionId, sortingOrder, metadata: metadata ?? {} }))
    .digest("hex");
}

function describeStep(row: Pick<OwnerRepairRow, "stage" | "actionName" | "actionTypeId" | "triggerTypeName">) {
  if (row.stage === 0) {
    const trigger = row.triggerTypeName ?? "Trigger";
    return `${trigger} (trigger)`;
  }
  const action = row.actionName ?? row.actionTypeId;
  return action ? `${action} (action ${row.stage})` : `Action ${row.stage}`;
}

function queueOf(value: string | null): WorkflowQueue {
  return value === "owner" || value === "engineering" || value === "resolved" ? value : "support";
}

function statusOf(value: string | null): WorkflowStatus {
  switch (value) {
    case "awaiting_owner":
    case "repair_submitted":
    case "escalated":
    case "findings_returned":
    case "resolved":
      return value;
    default:
      return "needing_support";
  }
}

function awaitingOwnerRepair(row: Pick<OwnerRepairRow, "workflowQueue" | "workflowStatus">) {
  return queueOf(row.workflowQueue) === "owner" && statusOf(row.workflowStatus) === "awaiting_owner";
}

function instructionsOf(value: unknown): OwnerRepairCaseView["workflow"]["customerInstructions"] {
  if (value === null || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.instructions !== "string") return null;
  const missingFields = Array.isArray(record.missingFields)
    ? record.missingFields.filter((field): field is string => typeof field === "string").slice(0, 20)
    : [];
  return {
    missingFields,
    instructions: record.instructions,
    ...(typeof record.targetStep === "number" ? { targetStep: record.targetStep } : {}),
    ...(typeof record.editorPath === "string" ? { editorPath: record.editorPath } : {}),
  };
}

/** Only the fields the worker reads, plus explicitly-missing ones; credentials stay blank. */
export function fieldRepairView(actionTypeId: string, metadata: unknown): ActionRepairField[] {
  const definition = actionFields[actionTypeId];
  if (!definition) return [];
  const record = metadata === null || typeof metadata !== "object" ? {} : metadata as Record<string, unknown>;
  const fields: ActionRepairField[] = [];
  for (const field of [...definition.required, ...definition.optional]) {
    const sensitive = definition.credentials.includes(field);
    const raw = record[field];
    fields.push({
      field,
      value: sensitive || raw === undefined || raw === null ? "" : String(raw),
      required: definition.required.includes(field),
      sensitive,
    });
  }
  return fields;
}

/** Replaces only allow-listed fields, so unspecified metadata and credentials survive. */
export function mergeRepairFields(
  actionTypeId: string,
  metadata: unknown,
  fields: { field: string; value: string }[],
) {
  const definition = actionFields[actionTypeId];
  if (!definition) return { merged: null, changed: [] as string[] };
  const allowed = new Set([...definition.required, ...definition.optional]);
  const current = metadata === null || typeof metadata !== "object" ? {} : { ...(metadata as Record<string, unknown>) };
  const changed: string[] = [];
  for (const entry of fields) {
    if (!allowed.has(entry.field) || definition.credentials.includes(entry.field)) continue;
    if (current[entry.field] === entry.value) continue;
    current[entry.field] = entry.value;
    changed.push(entry.field);
  }
  return { merged: current, changed: changed.sort() };
}

export class TriageOwnerService {
  constructor(private readonly db: TriageOwnerDb) {}

  /**
   * One row per case. A case is listed at most once even though the retry/action join
   * can match more than one row, and the workflow join is unique on `caseId`.
   */
  async listFailures(ownerId: number, limit = 50): Promise<OwnerFailureSummary[]> {
    const boundedLimit = Math.min(Math.max(Number.isInteger(limit) ? limit : 50, 1), 50);
    // DISTINCT ON keeps one row per case; the outer query restores newest-first order.
    const rows = await this.db.$queryRaw<OwnerRepairRow[]>(Prisma.sql`
      SELECT * FROM (
        SELECT DISTINCT ON (retry.id)
          ${CASE_REPAIR_COLUMNS}
        ${CASE_REPAIR_JOINS}
        WHERE zap."userId" = ${ownerId}
        ORDER BY retry.id, retry."createdAt" DESC, retry.id DESC
      ) cases
      ORDER BY "observedAt" DESC, "caseId" DESC
      LIMIT ${boundedLimit}
    `);

    const seen = new Set<string>();
    const summaries: OwnerFailureSummary[] = [];
    for (const row of rows) {
      if (seen.has(row.caseId)) continue;
      seen.add(row.caseId);
      summaries.push({
        caseId: row.caseId,
        zapRunId: row.zapRunId,
        zapId: row.zapId,
        zapName: row.zapName ?? "Untitled Zap",
        stage: row.stage,
        stepLabel: describeStep(row),
        observedAt: row.observedAt.toISOString(),
        providerOutcome: row.providerOutcome,
        safeCode: row.safeCode,
        queue: queueOf(row.workflowQueue),
        status: statusOf(row.workflowStatus),
      });
    }
    return summaries;
  }

  async getRepairCase(ownerId: number, caseId: string): Promise<OwnerRepairCaseView> {
    const rows = await this.db.$queryRaw<OwnerRepairRow[]>(Prisma.sql`
      SELECT
        ${CASE_REPAIR_COLUMNS}
      ${CASE_REPAIR_JOINS}
      WHERE zap."userId" = ${ownerId} AND retry.id = ${caseId}
      ORDER BY retry."createdAt" DESC, retry.id DESC
      LIMIT 2
    `);

    const row = rows[0];
    if (!row || rows.length !== 1) throw new TriageOwnerCaseNotFound(caseId);

    const unavailable: string[] = [];
    const awaiting = awaitingOwnerRepair(row);
    const actionTypeId = row.actionTypeId;
    if (actionTypeId === null) unavailable.push("repair_target_action");
    else if (!actionFields[actionTypeId]) unavailable.push("supported_action_handler");
    if (row.actionId === null) unavailable.push("repair_target_id");

    let action: OwnerActionRepairView | null = null;
    if (awaiting && actionTypeId !== null && row.actionId !== null && actionFields[actionTypeId]) {
      action = {
        actionId: row.actionId,
        actionTypeId,
        actionName: row.actionName ?? actionTypeId,
        sortingOrder: row.actionSortingOrder ?? row.stage,
        actionToken: actionRepairToken(row.actionId, row.actionMetadata, row.actionSortingOrder ?? row.stage),
        fields: fieldRepairView(actionTypeId, row.actionMetadata),
      };
    }

    const case_: OwnerRepairCaseView = {
      caseId: row.caseId,
      zapRunId: row.zapRunId,
      stage: row.stage,
      stepLabel: describeStep(row),
      observedAt: row.observedAt.toISOString(),
      providerOutcome: row.providerOutcome,
      safeCode: row.safeCode,
      zap: {
        id: row.zapId,
        name: row.zapName ?? "Untitled Zap",
        editorPath: `/zap/${row.zapId}`,
      },
      workflow: {
        queue: queueOf(row.workflowQueue),
        status: statusOf(row.workflowStatus),
        version: row.workflowVersion ?? 1,
        awaitingOwnerRepair: awaiting,
        // Deliberately absent: escalation reason, engineering findings, internal notes.
        customerInstructions: instructionsOf(row.customerInstructions),
        repairNote: row.repairNote,
        resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
      },
      action,
      unavailable,
    };
    return case_;
  }

  /**
   * Persists owner edits to the named action inside one transaction. The helper is
   * only reachable while the case is awaiting owner repair, and the write is a
   * conditional update on the action's exact current metadata, so a concurrent edit
   * loses cleanly and a stale token never writes.
   */
  async saveActionRepair(
    ownerId: number,
    caseId: string,
    actionId: string,
    input: { actionToken: string; fields: { field: string; value: string }[] },
  ): Promise<OwnerActionRepairResult> {
    const rows = await this.db.$queryRaw<OwnerRepairRow[]>(Prisma.sql`
      SELECT
        ${CASE_REPAIR_COLUMNS}
      ${CASE_REPAIR_JOINS}
      WHERE zap."userId" = ${ownerId} AND retry.id = ${caseId} AND action.id = ${actionId}
      LIMIT 1
    `);
    const target = rows[0];
    if (!target || target.actionId === null || target.actionTypeId === null) {
      throw new TriageOwnerCaseNotFound(actionId);
    }
    if (!awaitingOwnerRepair(target)) {
      throw new TriageOwnerRepairNotAllowed("Case is not awaiting owner repair");
    }

    const sortingOrder = target.actionSortingOrder ?? target.stage;
    const token = actionRepairToken(target.actionId, target.actionMetadata, sortingOrder);
    if (token !== input.actionToken) throw new TriageOwnerActionStale("Action changed since it was loaded");

    const { merged, changed } = mergeRepairFields(target.actionTypeId, target.actionMetadata, input.fields);
    if (merged === null) throw new TriageOwnerCaseNotFound(actionId);

    // `metadata = <current>::jsonb` makes the write conditional on the exact state the
    // owner loaded, so a concurrent edit drops the update instead of overwriting it.
    // Prisma's JSON filter would compare structurally and can never match a token string.
    const currentMetadataJson = JSON.stringify(target.actionMetadata ?? {});
    const nextMetadataJson = JSON.stringify(merged);
    const written = await this.db.$transaction(async (tx) => tx.$executeRaw(Prisma.sql`
      UPDATE "Action"
      SET metadata = ${nextMetadataJson}::jsonb
      WHERE id = ${target.actionId}
        AND "zapId" = ${target.zapId}
        AND "sortingOrder" = ${sortingOrder}
        AND metadata = ${currentMetadataJson}::jsonb
    `));

    if (written === 0) throw new TriageOwnerActionStale("Action changed since it was loaded");

    return {
      caseId,
      actionId: target.actionId,
      actionToken: actionRepairToken(target.actionId, merged, sortingOrder),
      changedFields: changed,
      workflow: {
        queue: queueOf(target.workflowQueue),
        status: statusOf(target.workflowStatus),
        awaitingOwnerRepair: awaitingOwnerRepair(target),
      },
    };
  }
}
