import { z } from "zod";

import { WorkflowEventViewSchema } from "./workflow.ts";

/**
 * Phase 16E engineering workspace contracts.
 *
 * The engineering queue is a projection of the durable workflow state that Phase 16C
 * persists: an engineer may read only cases whose `queue` is `engineering`, and the
 * history projection is the append-only handoff trail for that single case. Nothing
 * here grants replay authority — replay approvals, requests and dispatch stay on the
 * support-operator surfaces and are not re-exported for engineers.
 */

/** One read of an authorized case, with the case context the engineer is allowed to see. */
export const EngineeringCaseSchema = z.object({
  case_id: z.string().uuid(),
  zap_run_id: z.string().uuid(),
  stage: z.number().int().min(0),
  subject_owner_id: z.number().int().positive(),
  observed_at: z.string().datetime(),
  provider_outcome: z.string().nullable(),
  safe_code: z.string().nullable(),
  source: z.enum(["retry_row", "reconciled_execution"]),
  workflow: z.object({
    id: z.string().uuid(),
    queue: z.enum(["support", "owner", "engineering", "resolved"]),
    status: z.enum([
      "needing_support",
      "awaiting_owner",
      "repair_submitted",
      "escalated",
      "findings_returned",
      "resolved",
    ]),
    assignedEngineerId: z.number().int().positive().nullable(),
    escalationReason: z.string().nullable(),
    customerInstructions: z.object({
      targetStep: z.number().int().min(0).optional(),
      missingFields: z.array(z.string().max(100)).max(20),
      instructions: z.string().max(2_000),
      editorPath: z.string().max(200).optional(),
    }).strict().nullable(),
    findings: z.string().nullable(),
    resolutionReason: z.string().nullable(),
    version: z.number().int().positive(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }).strict(),
}).strict();
export type EngineeringCase = z.infer<typeof EngineeringCaseSchema>;

export const EngineeringCaseListSchema = z.object({
  cases: z.array(EngineeringCaseSchema).max(50),
}).strict();
export type EngineeringCaseList = z.infer<typeof EngineeringCaseListSchema>;

/**
 * The case and its append-only workflow events. Event `metadata` is deliberately not
 * projected: it is unbounded JSON written by other surfaces, and the engineering
 * workspace needs the human handoff trail, not raw transport state.
 */
export const EngineeringCaseHistorySchema = z.object({
  case: EngineeringCaseSchema,
  events: z.array(WorkflowEventViewSchema).max(200),
}).strict();
export type EngineeringCaseHistory = z.infer<typeof EngineeringCaseHistorySchema>;

export const EngineeringTransitionResultSchema = z.object({
  workflow: z.object({
    caseId: z.string().uuid(),
    queue: z.enum(["support", "owner", "engineering", "resolved"]),
    status: z.enum([
      "needing_support",
      "awaiting_owner",
      "repair_submitted",
      "escalated",
      "findings_returned",
      "resolved",
    ]),
    findings: z.string().nullable(),
    resolutionReason: z.string().nullable(),
    version: z.number().int().positive(),
    updatedAt: z.string().datetime(),
  }).strict(),
  event: WorkflowEventViewSchema,
}).strict();
export type EngineeringTransitionResult = z.infer<typeof EngineeringTransitionResultSchema>;
