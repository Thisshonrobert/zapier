import { describe, expect, test } from "bun:test";

import {
  OwnerActionRepairInputSchema,
  OwnerFailureSummarySchema,
  OwnerRepairCaseViewSchema,
  type OwnerFailureSummary as ContractFailureSummary,
  type OwnerRepairCaseView as ContractRepairCase,
} from "../../../../packages/triage-contracts/owner.ts";
import type { OwnerFailureSummary, OwnerRepairCase } from "../types/owner.ts";
import {
  canSaveRepair,
  changedRepairFields,
  draftFromRepairCase,
  editDraftField,
  fieldLabels,
  missingRequiredFields,
  repairStatusCopy,
} from "../types/owner.ts";

/**
 * If the frontend mirror of the owner contracts ever drifts from the shared
 * contracts, these assignments stop compiling.
 */
const failureSummaryParity = (contract: ContractFailureSummary): OwnerFailureSummary => contract;
const repairCaseParity = (contract: ContractRepairCase): OwnerRepairCase => contract;
void failureSummaryParity;
void repairCaseParity;

const view: OwnerRepairCase = {
  caseId: "f0100000-0000-4000-8000-000000000001",
  zapRunId: "11111111-1111-4111-8111-111111111111",
  stage: 1,
  stepLabel: "Email (action 1)",
  observedAt: "2026-10-15T00:00:00.000Z",
  providerOutcome: "not_attempted",
  safeCode: "invalid_action_inputs",
  zap: { id: "22222222-2222-4222-8222-222222222222", name: "Meeting reminder", editorPath: "/zap/22222222-2222-4222-8222-222222222222" },
  workflow: {
    queue: "owner",
    status: "awaiting_owner",
    version: 2,
    awaitingOwnerRepair: true,
    customerInstructions: {
      targetStep: 1,
      missingFields: ["subject"],
      instructions: "Add the email subject in step 1.",
    },
    repairNote: null,
    resolvedAt: null,
  },
  action: {
    actionId: "33333333-3333-4333-8333-333333333333",
    actionTypeId: "email",
    actionName: "Email",
    sortingOrder: 1,
    actionToken: "a".repeat(64),
    fields: [
      { field: "to", value: "customer@example.invalid", required: true, sensitive: false },
      { field: "subject", value: "", required: true, sensitive: false },
      { field: "body", value: "Body", required: true, sensitive: false },
      { field: "from", value: "", required: false, sensitive: false },
    ],
  },
  unavailable: [],
};

describe("Phase 16D owner repair helpers", () => {
  test("the sample view satisfies the shared owner contract", () => {
    const parsed = OwnerRepairCaseViewSchema.safeParse(view);
    expect(parsed.success).toBe(true);
    const summary: OwnerFailureSummary = {
      caseId: view.caseId,
      zapRunId: view.zapRunId,
      zapId: view.zap.id,
      zapName: view.zap.name,
      stage: view.stage,
      stepLabel: view.stepLabel,
      observedAt: view.observedAt,
      providerOutcome: view.providerOutcome,
      safeCode: view.safeCode,
      queue: view.workflow.queue,
      status: view.workflow.status,
    };
    expect(OwnerFailureSummarySchema.safeParse(summary).success).toBe(true);
  });

  test("only changed fields are submitted", () => {
    const draft = draftFromRepairCase(view);
    expect(changedRepairFields(draft)).toEqual([]);

    const edited = editDraftField(draft, "subject", "Meeting notice");
    expect(changedRepairFields(edited)).toEqual([{ field: "subject", value: "Meeting notice" }]);
  });

  test("editing back to the loaded value submits nothing", () => {
    const draft = editDraftField(draftFromRepairCase(view), "body", "Changed");
    expect(changedRepairFields(draft)).toHaveLength(1);
    expect(changedRepairFields(editDraftField(draft, "body", "Body"))).toEqual([]);
  });

  test("required fields must be filled before saving", () => {
    const draft = draftFromRepairCase(view);
    expect(missingRequiredFields(draft)).toEqual(["subject"]);
    expect(canSaveRepair(view, draft, false)).toBe(false);

    const edited = editDraftField(draft, "subject", "Meeting notice");
    expect(missingRequiredFields(edited)).toEqual([]);
    expect(canSaveRepair(view, edited, true)).toBe(true);
  });

  test("an untouched form cannot be saved", () => {
    const draft = editDraftField(draftFromRepairCase(view), "subject", "Meeting notice");
    expect(canSaveRepair(view, draft, false)).toBe(false);
  });

  test("saving is blocked when the case is not awaiting the owner", () => {
    const draft = editDraftField(draftFromRepairCase(view), "subject", "Meeting notice");
    const submitted: OwnerRepairCase = {
      ...view,
      workflow: { ...view.workflow, status: "repair_submitted", awaitingOwnerRepair: false },
    };
    expect(canSaveRepair(submitted, draft, true)).toBe(false);
    expect(repairStatusCopy(submitted).tone).toBe("submitted");
  });

  test("status copy is honest about blocked and waiting states", () => {
    expect(repairStatusCopy(view).tone).toBe("action");

    const blocked: OwnerRepairCase = {
      ...view,
      action: null,
      unavailable: ["supported_action_handler"],
    };
    expect(repairStatusCopy(blocked).tone).toBe("blocked");

    const waiting: OwnerRepairCase = {
      ...view,
      action: null,
      workflow: { ...view.workflow, queue: "support", status: "needing_support", awaitingOwnerRepair: false },
    };
    expect(repairStatusCopy(waiting).tone).toBe("waiting");
  });

  test("the repair payload accepts only bounded fields", () => {
    expect(OwnerActionRepairInputSchema.safeParse({
      actionToken: "a".repeat(64),
      fields: [{ field: "subject", value: "Meeting notice" }],
    }).success).toBe(true);

    expect(OwnerActionRepairInputSchema.safeParse({ actionToken: "", fields: [] }).success).toBe(false);
    expect(OwnerActionRepairInputSchema.safeParse({
      actionToken: "a".repeat(64),
      fields: [{ field: "subject", value: "x", extra: true }],
    }).success).toBe(false);
  });

  test("every bounded field has a human label", () => {
    for (const field of view.action!.fields) {
      expect(fieldLabels[field.field]).toBeString();
    }
  });
});
