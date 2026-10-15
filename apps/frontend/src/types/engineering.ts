/**
 * Frontend mirror of the engineering workspace contracts in
 * `packages/triage-contracts/engineering.ts` and
 * `packages/triage-contracts/capabilities.ts`. `engineering-workspace.test.ts`
 * asserts these against the shared contracts so the two cannot drift apart silently.
 */

export type WorkflowQueue = "support" | "owner" | "engineering" | "resolved";

export type WorkflowStatus =
  | "needing_support"
  | "awaiting_owner"
  | "repair_submitted"
  | "escalated"
  | "findings_returned"
  | "resolved";

export type WorkflowAction =
  | "request_owner_repair"
  | "submit_repair"
  | "escalate"
  | "return_findings"
  | "resolve"
  | "decision_handoff";

export type ViewerCapabilities = {
  isSupportOperator: boolean;
  isEngineer: boolean;
};

export type EngineeringCase = {
  case_id: string;
  zap_run_id: string;
  stage: number;
  subject_owner_id: number;
  observed_at: string;
  provider_outcome: string | null;
  safe_code: string | null;
  source: "retry_row" | "reconciled_execution";
  workflow: {
    id: string;
    queue: WorkflowQueue;
    status: WorkflowStatus;
    assignedEngineerId: number | null;
    escalationReason: string | null;
    customerInstructions: {
      targetStep?: number;
      missingFields: string[];
      instructions: string;
      editorPath?: string;
    } | null;
    findings: string | null;
    resolutionReason: string | null;
    version: number;
    createdAt: string;
    updatedAt: string;
  };
};

export type EngineeringWorkflowEvent = {
  id: string;
  workflowId: string;
  caseId: string;
  subjectOwnerId: number;
  actorId: number;
  action: WorkflowAction;
  fromQueue: WorkflowQueue;
  toQueue: WorkflowQueue;
  fromStatus: WorkflowStatus;
  toStatus: WorkflowStatus;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type EngineeringCaseHistory = {
  case: EngineeringCase;
  events: EngineeringWorkflowEvent[];
};

export type EngineeringTransitionResult = {
  workflow: {
    caseId: string;
    queue: WorkflowQueue;
    status: WorkflowStatus;
    findings: string | null;
    resolutionReason: string | null;
    version: number;
    updatedAt: string;
  };
  event: EngineeringWorkflowEvent;
};

/**
 * Navigation is capability-gated on the server-reported viewer roles. Nothing is
 * shown until the capabilities request has answered, so a revoked role cannot keep
 * a link alive from a stale client cache.
 */
export type NavigationItem = {
  label: string;
  href: string;
  /** Absent for the roles-free workspace links every signed-in account may see. */
  role?: keyof ViewerCapabilities;
};

export function visibleNavigation<T extends NavigationItem>(
  items: readonly T[],
  capabilities: ViewerCapabilities | null,
): T[] {
  if (!capabilities) return items.filter((item) => !item.role);
  return items.filter((item) => !item.role || capabilities[item.role]);
}

/** Human labels for the handoff actions an engineer reads in the case history. */
export const workflowActionLabels: Record<WorkflowAction, string> = {
  request_owner_repair: "Support asked the owner to repair",
  submit_repair: "Owner submitted a repair",
  escalate: "Support escalated to engineering",
  return_findings: "Engineering returned findings",
  resolve: "Case resolved",
  decision_handoff: "AI decision recorded",
};

export const queueLabels: Record<WorkflowQueue, string> = {
  support: "Support",
  owner: "Owner",
  engineering: "Engineering",
  resolved: "Resolved",
};

/**
 * The engineering workspace never offers a replay control: replay approval, request
 * and dispatch remain support-operator surfaces. This guard is asserted in tests so a
 * later edit cannot quietly widen the engineer's authority from the client side.
 */
export const engineerActions = ["return_findings", "resolve"] as const;

export function engineerCanAct(caseView: EngineeringCase, capability: ViewerCapabilities | null) {
  return Boolean(
    capability?.isEngineer &&
    caseView.workflow.queue === "engineering",
  );
}

/** Human copy for the case a returning engineer hands back to support. */
export function handoffCopy(history: EngineeringCaseHistory) {
  const escalation = history.events.find((event) => event.action === "escalate");
  const returned = history.events.find((event) => event.action === "return_findings");
  if (returned) {
    return {
      kind: "returned" as const,
      message: "Findings were returned to support. This case is no longer in the engineering queue.",
    };
  }
  if (escalation) {
    return {
      kind: "escalated" as const,
      message: "Support escalated this case and is waiting on engineering findings.",
    };
  }
  return {
    kind: "unknown" as const,
    message: "No escalation event is recorded for this case yet.",
  };
}
