import { z } from "zod";

export const WorkflowQueueSchema = z.enum([
  "support",
  "owner",
  "engineering",
  "resolved",
]);
export type WorkflowQueue = z.infer<typeof WorkflowQueueSchema>;

export const WorkflowStatusSchema = z.enum([
  "needing_support",
  "awaiting_owner",
  "repair_submitted",
  "escalated",
  "findings_returned",
  "resolved",
]);
export type WorkflowStatus = z.infer<typeof WorkflowStatusSchema>;

export const WorkflowActionSchema = z.enum([
  "request_owner_repair",
  "submit_repair",
  "escalate",
  "return_findings",
  "resolve",
  "decision_handoff",
]);
export type WorkflowAction = z.infer<typeof WorkflowActionSchema>;

export const CustomerInstructionsSchema = z.object({
  targetStep: z.number().int().min(0).optional(),
  missingFields: z.array(z.string().max(100)).max(20).default([]),
  instructions: z.string().max(2000),
  editorPath: z.string().max(200).optional(),
}).strict();
export type CustomerInstructions = z.infer<typeof CustomerInstructionsSchema>;

export const WorkflowCaseViewSchema = z.object({
  caseId: z.string().uuid(),
  zapRunId: z.string().uuid(),
  stage: z.number().int().min(0),
  subjectOwnerId: z.number().int().positive(),
  queue: WorkflowQueueSchema,
  status: WorkflowStatusSchema,
  assignedEngineerId: z.number().int().positive().nullable(),
  activeInvestigationId: z.string().uuid().nullable(),
  activeProposalId: z.string().uuid().nullable(),
  version: z.number().int().positive(),
  customerInstructions: CustomerInstructionsSchema.nullable(),
  repairNote: z.string().nullable(),
  escalationReason: z.string().nullable(),
  findings: z.string().nullable(),
  resolutionReason: z.string().nullable(),
  resolvedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).strict();
export type WorkflowCaseView = z.infer<typeof WorkflowCaseViewSchema>;

export const WorkflowEventViewSchema = z.object({
  id: z.string().uuid(),
  workflowId: z.string().uuid(),
  caseId: z.string().uuid(),
  subjectOwnerId: z.number().int().positive(),
  actorId: z.number().int().positive(),
  action: WorkflowActionSchema,
  fromQueue: WorkflowQueueSchema,
  toQueue: WorkflowQueueSchema,
  fromStatus: WorkflowStatusSchema,
  toStatus: WorkflowStatusSchema,
  notes: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string().datetime(),
}).strict();
export type WorkflowEventView = z.infer<typeof WorkflowEventViewSchema>;

export const OwnerRepairAcknowledgementInputSchema = z.object({
  repairNote: z.string().max(2000).optional(),
}).strict();
export type OwnerRepairAcknowledgementInput = z.infer<typeof OwnerRepairAcknowledgementInputSchema>;

export const OperatorRequestRepairInputSchema = z.object({
  customerInstructions: CustomerInstructionsSchema,
  notes: z.string().max(2000).optional(),
}).strict();
export type OperatorRequestRepairInput = z.infer<typeof OperatorRequestRepairInputSchema>;

export const OperatorEscalateInputSchema = z.object({
  escalationReason: z.string().min(1).max(2000),
  assignedEngineerId: z.number().int().positive().optional(),
  notes: z.string().max(2000).optional(),
}).strict();
export type OperatorEscalateInput = z.infer<typeof OperatorEscalateInputSchema>;

export const OperatorResolveInputSchema = z.object({
  resolutionReason: z.string().min(1).max(2000),
  notes: z.string().max(2000).optional(),
}).strict();
export type OperatorResolveInput = z.infer<typeof OperatorResolveInputSchema>;

export const EngineerFindingsInputSchema = z.object({
  findings: z.string().min(1).max(4000),
  notes: z.string().max(2000).optional(),
}).strict();
export type EngineerFindingsInput = z.infer<typeof EngineerFindingsInputSchema>;

export const EngineerResolveInputSchema = z.object({
  resolutionReason: z.string().min(1).max(2000),
  notes: z.string().max(2000).optional(),
}).strict();
export type EngineerResolveInput = z.infer<typeof EngineerResolveInputSchema>;
