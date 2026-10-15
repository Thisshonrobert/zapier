/**
 * Frontend mirror of the owner repair contracts in
 * `packages/triage-contracts/owner.ts`. The shapes are asserted against the backend
 * contracts in `owner-repair.test.ts`, so the two cannot drift apart silently.
 */

export type WorkflowQueue = "support" | "owner" | "engineering" | "resolved";

export type WorkflowStatus =
  | "needing_support"
  | "awaiting_owner"
  | "repair_submitted"
  | "escalated"
  | "findings_returned"
  | "resolved";

export type OwnerFailureSummary = {
  caseId: string;
  zapRunId: string;
  zapId: string;
  zapName: string;
  stage: number;
  stepLabel: string;
  observedAt: string;
  providerOutcome: string | null;
  safeCode: string | null;
  queue: WorkflowQueue;
  status: WorkflowStatus;
};

export type ActionRepairField = {
  field: string;
  value: string;
  required: boolean;
  sensitive: boolean;
};

export type OwnerActionRepairView = {
  actionId: string;
  actionTypeId: string;
  actionName: string;
  sortingOrder: number;
  actionToken: string;
  fields: ActionRepairField[];
};

export type OwnerCustomerInstructions = {
  targetStep?: number;
  missingFields: string[];
  instructions: string;
  editorPath?: string;
};

export type OwnerRepairCase = {
  caseId: string;
  zapRunId: string;
  stage: number;
  stepLabel: string;
  observedAt: string;
  providerOutcome: string | null;
  safeCode: string | null;
  zap: { id: string; name: string; editorPath: string };
  workflow: {
    queue: WorkflowQueue;
    status: WorkflowStatus;
    version: number;
    awaitingOwnerRepair: boolean;
    customerInstructions: OwnerCustomerInstructions | null;
    repairNote: string | null;
    resolvedAt: string | null;
  };
  action: OwnerActionRepairView | null;
  unavailable: string[];
};

export type OwnerActionRepairResult = {
  caseId: string;
  actionId: string;
  actionToken: string;
  changedFields: string[];
  workflow: {
    queue: WorkflowQueue;
    status: WorkflowStatus;
    awaitingOwnerRepair: boolean;
  };
};

export type OwnerRepairDraft = {
  caseId: string | null;
  actionId: string | null;
  actionToken: string | null;
  actionName: string;
  stepLabel: string;
  values: Record<string, string>;
  /** Values as loaded, so a save sends only what the owner actually changed. */
  original: Record<string, string>;
  fields: ActionRepairField[];
};

/** Turn a loaded repair view into editable draft state. */
export function draftFromRepairCase(view: OwnerRepairCase): OwnerRepairDraft {
  const values = Object.fromEntries((view.action?.fields ?? []).map((field) => [field.field, field.value]));
  return {
    caseId: view.caseId,
    actionId: view.action?.actionId ?? null,
    actionToken: view.action?.actionToken ?? null,
    actionName: view.action?.actionName ?? view.stepLabel,
    stepLabel: view.stepLabel,
    values: { ...values },
    original: { ...values },
    fields: view.action?.fields ?? [],
  };
}

export function editDraftField(draft: OwnerRepairDraft, field: string, value: string): OwnerRepairDraft {
  return { ...draft, values: { ...draft.values, [field]: value } };
}

/**
 * Only fields the owner actually changed are submitted, so a form that was never
 * touched cannot overwrite concurrent work, and credentials are never sent back.
 */
export function changedRepairFields(draft: OwnerRepairDraft): { field: string; value: string }[] {
  return draft.fields
    .filter((field) => !field.sensitive)
    .filter((field) => (draft.values[field.field] ?? "") !== (draft.original[field.field] ?? ""))
    .map((field) => ({ field: field.field, value: draft.values[field.field] ?? "" }));
}

/** Mirrors the worker's required-field rule so the owner is warned before saving. */
export function missingRequiredFields(draft: OwnerRepairDraft): string[] {
  return draft.fields
    .filter((field) => field.required && !field.sensitive)
    .filter((field) => (draft.values[field.field] ?? "").trim() === "")
    .map((field) => field.field);
}

export function canSaveRepair(view: OwnerRepairCase, draft: OwnerRepairDraft, hasChanges: boolean) {
  return Boolean(
    view.workflow.awaitingOwnerRepair &&
    view.action &&
    draft.actionToken &&
    hasChanges &&
    missingRequiredFields(draft).length === 0,
  );
}

export function repairStatusCopy(view: OwnerRepairCase) {
  if (view.workflow.status === "repair_submitted") {
    return {
      tone: "submitted" as const,
      message: "Your repair was submitted. Support will review it.",
    };
  }
  if (view.unavailable.includes("supported_action_handler")) {
    return {
      tone: "blocked" as const,
      message: "This step is not supported by the repair editor yet. Support can see the same finding.",
    };
  }
  if (!view.action) {
    return {
      tone: "waiting" as const,
      message: "There is nothing for you to change right now. Support has this case.",
    };
  }
  return { tone: "action" as const, message: "This step needs a fix before it can run again." };
}

/** Human labels for the bounded repair fields. */
export const fieldLabels: Record<string, string> = {
  to: "To",
  from: "From",
  subject: "Subject",
  body: "Body",
  channelUserName: "Channel",
  message: "Message",
  botToken: "Bot token",
};
