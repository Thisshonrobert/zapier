import { describe, expect, test } from "bun:test";

import {
  EngineeringCaseSchema,
  EngineeringCaseHistorySchema,
  EngineeringTransitionResultSchema,
  type EngineeringCase as ContractEngineeringCase,
  type EngineeringCaseHistory as ContractEngineeringHistory,
  type EngineeringTransitionResult as ContractTransitionResult,
} from "../../../../packages/triage-contracts/engineering.ts";
import {
  ViewerCapabilitiesSchema,
  type ViewerCapabilities as ContractViewerCapabilities,
} from "../../../../packages/triage-contracts/capabilities.ts";
import type {
  EngineeringCase,
  EngineeringCaseHistory,
  EngineeringTransitionResult,
  ViewerCapabilities,
} from "../types/engineering.ts";
import {
  engineerActions,
  engineerCanAct,
  handoffCopy,
  queueLabels,
  visibleNavigation,
  workflowActionLabels,
  type NavigationItem,
} from "../types/engineering.ts";

/**
 * If the frontend mirror of the engineering contracts ever drifts from the shared
 * contracts, these assignments stop compiling.
 */
const caseParity = (contract: ContractEngineeringCase): EngineeringCase => contract;
const historyParity = (contract: ContractEngineeringHistory): EngineeringCaseHistory => contract;
const transitionParity = (contract: ContractTransitionResult): EngineeringTransitionResult => contract;
const capabilityParity = (contract: ContractViewerCapabilities): ViewerCapabilities => contract;
void caseParity;
void historyParity;
void transitionParity;
void capabilityParity;

const ENGINEER: ViewerCapabilities = { isSupportOperator: false, isEngineer: true };
const OPERATOR: ViewerCapabilities = { isSupportOperator: true, isEngineer: false };
const OWNER: ViewerCapabilities = { isSupportOperator: false, isEngineer: false };

const caseView: EngineeringCase = {
  case_id: "f0100000-0000-4000-8000-000000000001",
  zap_run_id: "11111111-1111-4111-8111-111111111111",
  stage: 1,
  subject_owner_id: 9,
  observed_at: "2026-10-15T00:00:00.000Z",
  provider_outcome: "unknown",
  safe_code: "telegram_transport_throw",
  source: "retry_row",
  workflow: {
    id: "22222222-2222-4222-8222-222222222222",
    queue: "engineering",
    status: "escalated",
    assignedEngineerId: 42,
    escalationReason: "Send uncertainty after two retries",
    customerInstructions: null,
    findings: null,
    resolutionReason: null,
    version: 2,
    createdAt: "2026-10-15T00:00:00.000Z",
    updatedAt: "2026-10-15T00:00:00.000Z",
  },
};

const escalationEvent = {
  id: "33333333-3333-4333-8333-333333333333",
  workflowId: "22222222-2222-4222-8222-222222222222",
  caseId: caseView.case_id,
  subjectOwnerId: 9,
  actorId: 4,
  action: "escalate" as const,
  fromQueue: "support" as const,
  toQueue: "engineering" as const,
  fromStatus: "needing_support" as const,
  toStatus: "escalated" as const,
  notes: "Handing to engineering after two failed reruns",
  metadata: null,
  createdAt: "2026-10-15T00:00:00.000Z",
};

describe("Phase 16E engineering workspace contracts", () => {
  test("the sample case and history satisfy the shared contracts", () => {
    expect(EngineeringCaseSchema.safeParse(caseView).success).toBe(true);
    expect(EngineeringCaseHistorySchema.safeParse({ case: caseView, events: [escalationEvent] }).success).toBe(true);
    expect(ViewerCapabilitiesSchema.safeParse(ENGINEER).success).toBe(true);
  });

  test("the shared case schema rejects an unknown field instead of widening the view", () => {
    expect(EngineeringCaseSchema.safeParse({ ...caseView, internalSupportNote: "secret" }).success).toBe(false);
    expect(EngineeringCaseSchema.safeParse({
      ...caseView,
      workflow: { ...caseView.workflow, queue: "tenant" },
    }).success).toBe(false);
  });

  test("the transition result satisfies the shared contract", () => {
    const result: EngineeringTransitionResult = {
      workflow: {
        caseId: caseView.case_id,
        queue: "support",
        status: "findings_returned",
        findings: "Transport threw after send",
        resolutionReason: null,
        version: 3,
        updatedAt: "2026-10-15T01:00:00.000Z",
      },
      event: {
        ...escalationEvent,
        id: "44444444-4444-4444-8444-444444444444",
        action: "return_findings",
        fromQueue: "engineering",
        toQueue: "support",
        fromStatus: "escalated",
        toStatus: "findings_returned",
      },
    };
    expect(EngineeringTransitionResultSchema.safeParse(result).success).toBe(true);
  });
});

describe("Phase 16E role-aware navigation", () => {
  const nav: NavigationItem[] = [
    { label: "Home", href: "/dashboard" },
    { label: "Support triage", href: "/triage", role: "isSupportOperator" },
    { label: "Engineering", href: "/engineering", role: "isEngineer" },
  ];

  test("nothing role-gated is shown before capabilities resolve", () => {
    expect(visibleNavigation(nav, null).map((item) => item.label)).toEqual(["Home"]);
  });

  test("each role sees only its own workspaces", () => {
    expect(visibleNavigation(nav, OWNER).map((item) => item.label)).toEqual(["Home"]);
    expect(visibleNavigation(nav, ENGINEER).map((item) => item.label)).toEqual(["Home", "Engineering"]);
    expect(visibleNavigation(nav, OPERATOR).map((item) => item.label)).toEqual(["Home", "Support triage"]);
    expect(visibleNavigation(nav, { isSupportOperator: true, isEngineer: true }).map((item) => item.label))
      .toEqual(["Home", "Support triage", "Engineering"]);
  });

  test("engineer actions stay bounded and exclude any replay control", () => {
    expect(engineerCanAct(caseView, ENGINEER)).toBe(true);
    expect(engineerCanAct(caseView, OPERATOR)).toBe(false);
    expect(engineerCanAct(caseView, null)).toBe(false);
    expect(engineerCanAct({ ...caseView, workflow: { ...caseView.workflow, queue: "support" } }, ENGINEER)).toBe(false);
    expect([...engineerActions].sort()).toEqual(["resolve", "return_findings"]);
  });

  test("handoff copy is honest about the case state", () => {
    expect(handoffCopy({ case: caseView, events: [escalationEvent] }).kind).toBe("escalated");
    const returned = {
      ...escalationEvent,
      id: "55555555-5555-4555-8555-555555555555",
      action: "return_findings" as const,
      toQueue: "support" as const,
      toStatus: "findings_returned" as const,
    };
    expect(handoffCopy({ case: caseView, events: [escalationEvent, returned] }).kind).toBe("returned");
    expect(handoffCopy({ case: caseView, events: [] }).kind).toBe("unknown");
  });

  test("every workflow action and queue has human copy", () => {
    for (const action of ["request_owner_repair", "submit_repair", "escalate", "return_findings", "resolve", "decision_handoff"] as const) {
      expect(workflowActionLabels[action]).toBeString();
    }
    expect(queueLabels.engineering).toBe("Engineering");
  });
});
