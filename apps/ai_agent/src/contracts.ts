import { z } from "zod";

// ============================================================================
// Bounded Primitive Validators
// Enforces minimum/maximum string lengths and regex patterns to prevent
// oversized inputs, prompt injection payloads, or malformed identifiers.
// ============================================================================
const fixtureId = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9-]+$/);

const evidenceRef = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9._:-]+$/);

const boundedName = z.string().min(1).max(128);
const boundedSummary = z.string().min(1).max(1_000);
const boundedError = z.string().min(1).max(2_000);

const uuid = z.uuid();
const structureSummary = z.object({
  paths: z.array(z.object({ path: z.string().min(1).max(256), type: z.string().min(1).max(32) }).strict()).max(64),
  truncated: z.boolean(),
}).strict();

export const FailureContextEvidenceSchema = z.object({
  contract_version: z.literal(1),
  evidence_id: evidenceRef,
  type: z.literal("failure_context"),
  source_ref: z.object({ case_id: uuid, zap_run_id: uuid, stage: z.number().int().nonnegative().max(1_000) }).strict(),
  observed_at: z.iso.datetime({ offset: true }),
  content_hash: z.string().regex(/^[a-f0-9]{64}$/),
  facts: z.object({
    source_kind: z.enum(["retry_row", "reconciled_execution"]),
    current_action_type: z.string().min(1).max(128).nullable(),
    retry: z.object({
      provider: z.string().max(32).nullable().optional(),
      phase: z.string().max(32).nullable().optional(),
      provider_outcome: z.string().max(32).nullable().optional(),
      safe_code: z.string().max(64).nullable().optional(),
      provider_status: z.number().int().min(100).max(599).nullable().optional(),
      retry_after_seconds: z.number().int().positive().max(86_400).nullable().optional(),
      requires_human: z.boolean(),
      final_error: z.string().max(2_000).nullable().optional(),
    }).strict(),
    action_metadata: structureSummary,
    payload: structureSummary,
  }).strict(),
  unavailable: z.array(z.string().min(1).max(128)).max(32),
  complete: z.boolean(),
  simulated: z.literal(false),
}).strict();

export type FailureContextEvidence = z.infer<typeof FailureContextEvidenceSchema>;

export const ExecutionEvidenceSchema = z.object({
  contract_version: z.literal(1),
  evidence_id: evidenceRef,
  type: z.literal("execution_evidence"),
  source_ref: z.object({ case_id: uuid, zap_run_id: uuid, stage: z.number().int().nonnegative().max(1_000) }).strict(),
  observed_at: z.iso.datetime({ offset: true }),
  content_hash: z.string().regex(/^[a-f0-9]{64}$/),
  facts: z.object({
    provenance: z.enum(["captured", "reconciled_execution", "legacy"]),
    current_execution: z.object({
      execution_id: uuid,
      status: z.string().min(1).max(32),
      lease_until: z.iso.datetime({ offset: true }).nullable(),
      completed_at: z.iso.datetime({ offset: true }).nullable(),
      provider_outcome: z.string().max(32).nullable(),
      requires_human: z.boolean(),
      action_fingerprint: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
      request_fingerprint: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
    }).strict().nullable(),
    attempts: z.array(z.object({
      attempt_number: z.number().int().nonnegative(),
      status: z.string().min(1).max(32),
      provider: z.string().max(32).nullable(),
      phase: z.string().max(32).nullable(),
      provider_outcome: z.enum(["accepted", "rejected", "not_attempted", "unknown"]),
      safe_code: z.string().max(64).nullable(),
      provider_status: z.number().int().min(100).max(599).nullable(),
      retry_after_seconds: z.number().int().positive().max(86_400).nullable(),
      started_at: z.iso.datetime({ offset: true }).nullable(),
      completed_at: z.iso.datetime({ offset: true }).nullable(),
      provenance: z.enum(["captured", "reconciled_execution", "legacy"]),
    }).strict()).max(50),
    history_limit: z.number().int().min(1).max(50),
    history_truncated: z.boolean(),
    predecessors: z.array(z.object({
      stage: z.number().int().nonnegative(), status: z.string().min(1).max(32),
      provider_outcome: z.string().max(32).nullable(), completed_at: z.iso.datetime({ offset: true }).nullable(),
    }).strict()).max(100),
    ordering: z.object({
      status: z.enum(["valid", "invalid", "unknown"]),
      missing_predecessor_stages: z.array(z.number().int().nonnegative()).max(100),
    }).strict(),
  }).strict(),
  unavailable: z.array(z.string().min(1).max(128)).max(32),
  complete: z.boolean(),
  simulated: z.literal(false),
}).strict();

export type ExecutionEvidence = z.infer<typeof ExecutionEvidenceSchema>;

export const ActionInputValidationEvidenceSchema = z.object({
  contract_version: z.literal(1),
  evidence_id: evidenceRef,
  type: z.literal("action_input_validation"),
  source_ref: z.object({ case_id: uuid, zap_run_id: uuid, stage: z.number().int().nonnegative().max(1_000) }).strict(),
  observed_at: z.iso.datetime({ offset: true }),
  content_hash: z.string().regex(/^[a-f0-9]{64}$/),
  facts: z.object({
    action_type: z.string().min(1).max(128).nullable(),
    validation_status: z.enum(["valid", "invalid", "blocked"]),
    supported: z.boolean(),
    missing_required_fields: z.array(z.string().min(1).max(128)).max(32),
    invalid_field_types: z.array(z.object({
      field: z.string().min(1).max(128), expected: z.literal("string"), actual: z.string().min(1).max(32),
    }).strict()).max(32),
    missing_template_paths: z.array(z.string().min(1).max(256)).max(64),
    credential_presence: z.array(z.object({
      field: z.string().min(1).max(128), present: z.boolean(),
      source: z.enum(["action_metadata", "unknown_worker_environment"]),
    }).strict()).max(16),
    blocked_reasons: z.array(z.string().min(1).max(128)).max(16),
    input_fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  }).strict(),
  unavailable: z.array(z.string().min(1).max(128)).max(32),
  complete: z.boolean(),
  simulated: z.literal(false),
}).strict();

export type ActionInputValidationEvidence = z.infer<typeof ActionInputValidationEvidenceSchema>;

// ============================================================================
// HTTP API Request Schema
// Schema for POST /investigations/preview payload validation.
// ============================================================================
export const PreviewRequestSchema = z
  .object({
    fixture_id: fixtureId,
  })
  .strict(); // Extra unknown properties are strictly forbidden

// ============================================================================
// Evidence Schema
// Represents observed failure facts loaded from fixtures or evidence tools.
// Uses Zod discriminated unions on `delivery_outcome` for strict type narrowing.
// ============================================================================
export const EvidenceSchema = z
  .object({
    fixture_id: fixtureId,
    evidence_id: evidenceRef,
    observed_at: z.iso.datetime({ offset: true }),
    facts: z.discriminatedUnion("delivery_outcome", [
      // Case 1: Explicit Telegram rejection (e.g. HTTP 429 Rate Limit)
      z
        .object({
          provider: z.literal("telegram"),
          stage: z.number().int().nonnegative().max(1_000),
          attempts: z.number().int().positive().max(10),
          final_error: boundedError,
          delivery_outcome: z.literal("rejected"),
          all_attempts_rejected: z.literal(true),
          retry_after_seconds: z.number().int().positive().max(86_400),
        })
        .strict(),
      // Case 2: Ambiguous / Unknown Telegram delivery (e.g. Network Timeout)
      z
        .object({
          provider: z.literal("telegram"),
          stage: z.number().int().nonnegative().max(1_000),
          attempts: z.number().int().positive().max(10),
          final_error: boundedError,
          delivery_outcome: z.literal("unknown"),
          all_attempts_rejected: z.literal(false),
        })
        .strict(),
    ]),
    unavailable: z.array(boundedName).max(32),
    simulated: z.literal(true),
  })
  .strict();

// ============================================================================
// Diagnosis Schema
// Output structure representing the model's classification of the root cause.
// ============================================================================
const DiagnosisSchema = z
  .object({
    taxonomy_id: z.enum(["F01", "F07", "unknown"]),
    summary: boundedSummary,
    confidence: z.enum(["low", "medium", "high"]),
    evidence_refs: z.array(evidenceRef).min(1).max(16),
    missing_evidence: z.array(boundedName).max(16),
  })
  .strict();

// ============================================================================
// Remediation Proposal Schema
// Proposed action plan (wait_then_replay, escalate, no_action) + safety flags.
// ============================================================================
const RemediationProposalSchema = z
  .object({
    kind: z.enum(["wait_then_replay", "escalate", "no_action"]),
    summary: boundedSummary,
    evidence_refs: z.array(evidenceRef).min(1).max(16),
    preconditions: z.array(boundedSummary).max(16),
    requires_human_approval: z.boolean(),
    wait_seconds: z.number().int().positive().max(86_400).optional(),
  })
  .strict();

// ============================================================================
// Preview Result Schema
// Combined output schema produced by the AI Agent triage graph.
// ============================================================================
export const PreviewResultSchema = z
  .object({
    status: z.enum(["completed", "insufficient_evidence"]),
    diagnosis: DiagnosisSchema,
    proposal: RemediationProposalSchema,
  })
  .strict();

// Derived TypeScript Types
export type Evidence = z.infer<typeof EvidenceSchema>;
export type PreviewResult = z.infer<typeof PreviewResultSchema>;

// ============================================================================
// DiagnosisModel Interface
// Abstraction for LLM adapters (Mock, OpenAI, Anthropic) allowing easy swapping.
// ============================================================================
export interface DiagnosisModel {
  diagnose(evidence: Evidence, signal: AbortSignal): Promise<unknown>;
  close(): Promise<void>;
}

