import { z } from "zod";

import { WorkflowQueueSchema, WorkflowStatusSchema } from "./workflow.ts";

/**
 * Owner-facing repair contracts (Phase 16D).
 *
 * These are deliberately separate from the operator and engineering views: an owner
 * sees their own failure, the Zap/step it belongs to, the operator-published
 * customer-safe instructions, and the workflow status. Internal support notes,
 * escalation reasons, engineering findings, raw payloads and credentials are not
 * part of this contract and must never be projected into it.
 */

export const OwnerFailureSummarySchema = z.object({
  caseId: z.string().uuid(),
  zapRunId: z.string().uuid(),
  zapId: z.string().uuid(),
  zapName: z.string(),
  stage: z.number().int().min(0),
  stepLabel: z.string(),
  observedAt: z.string().datetime(),
  providerOutcome: z.string().nullable(),
  safeCode: z.string().nullable(),
  queue: WorkflowQueueSchema,
  status: WorkflowStatusSchema,
}).strict();
export type OwnerFailureSummary = z.infer<typeof OwnerFailureSummarySchema>;

/** One editable action-metadata field, in worker validation order. */
export const ActionRepairFieldSchema = z.object({
  field: z.string().min(1).max(60),
  value: z.string().max(4_000),
  required: z.boolean(),
  /** Credential fields are never projected; the value is always an empty string. */
  sensitive: z.boolean(),
}).strict();
export type ActionRepairField = z.infer<typeof ActionRepairFieldSchema>;

export const OwnerActionRepairViewSchema = z.object({
  actionId: z.string().uuid(),
  actionTypeId: z.string().min(1).max(60),
  actionName: z.string(),
  sortingOrder: z.number().int().min(0),
  /** Optimistic token over the action's current metadata; a stale value must be rejected. */
  actionToken: z.string().min(1).max(128),
  fields: z.array(ActionRepairFieldSchema).max(20),
}).strict();
export type OwnerActionRepairView = z.infer<typeof OwnerActionRepairViewSchema>;

export const OwnerRepairCaseViewSchema = z.object({
  caseId: z.string().uuid(),
  zapRunId: z.string().uuid(),
  stage: z.number().int().min(0),
  stepLabel: z.string(),
  observedAt: z.string().datetime(),
  providerOutcome: z.string().nullable(),
  safeCode: z.string().nullable(),
  zap: z.object({
    id: z.string().uuid(),
    name: z.string(),
    editorPath: z.string().min(1).max(200),
  }).strict(),
  workflow: z.object({
    queue: WorkflowQueueSchema,
    status: WorkflowStatusSchema,
    version: z.number().int().positive(),
    awaitingOwnerRepair: z.boolean(),
    customerInstructions: z.object({
      targetStep: z.number().int().min(0).optional(),
      missingFields: z.array(z.string().max(100)).max(20),
      instructions: z.string().max(2_000),
      editorPath: z.string().max(200).optional(),
    }).strict().nullable(),
    repairNote: z.string().nullable(),
    resolvedAt: z.string().datetime().nullable(),
  }).strict(),
  /** Present only when the case is awaiting owner repair for a known action step. */
  action: OwnerActionRepairViewSchema.nullable(),
  unavailable: z.array(z.string().max(60)).max(10),
}).strict();
export type OwnerRepairCaseView = z.infer<typeof OwnerRepairCaseViewSchema>;

export const OwnerActionRepairInputSchema = z.object({
  actionToken: z.string().min(1).max(128),
  fields: z.array(z.object({
    field: z.string().min(1).max(60),
    value: z.string().max(4_000),
  }).strict()).min(1).max(20),
  notes: z.string().max(2_000).optional(),
}).strict();
export type OwnerActionRepairInput = z.infer<typeof OwnerActionRepairInputSchema>;

export const OwnerActionRepairResultSchema = z.object({
  caseId: z.string().uuid(),
  actionId: z.string().uuid(),
  actionToken: z.string().min(1).max(128),
  changedFields: z.array(z.string().max(60)).max(20),
  workflow: z.object({
    queue: WorkflowQueueSchema,
    status: WorkflowStatusSchema,
    awaitingOwnerRepair: z.boolean(),
  }).strict(),
}).strict();
export type OwnerActionRepairResult = z.infer<typeof OwnerActionRepairResultSchema>;
