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

// Opt-in evaluation evidence. Production schemas above remain unchanged. Aggregate
// fixture facts are retained without manufacturing executions, attempts or inputs.
export const ControlledFixtureObservationSchema = z.object({
  provider: z.string().min(1).max(32),
  execution_status: z.enum(["PENDING", "FAILED", "SUCCESS", "UNKNOWN"]),
  delivery_outcome: z.enum(["rejected", "not_delivered", "unknown", "accepted", "not_applicable"]),
  attempts: z.number().int().nonnegative().max(10).nullable(),
  final_error: z.string().max(2_000).nullable(),
  observed_facts: z.array(z.string().min(1).max(128)).max(32),
  sensitive_fields_present: z.array(z.string().min(1).max(128)).max(8),
}).strict();

export const FixtureFailureContextSchema = FailureContextEvidenceSchema.extend({
  simulated: z.literal(true),
  fixture_contract_version: z.literal(1),
  fixture_observation: ControlledFixtureObservationSchema,
  fixture_source_kind: z.enum(["normal_dlq", "coverage_gap"]),
  facts: FailureContextEvidenceSchema.shape.facts.extend({
    source_kind: z.literal("controlled_fixture"),
    retry: FailureContextEvidenceSchema.shape.facts.shape.retry.extend({ requires_human: z.null() }),
  }),
});
export const FixtureExecutionEvidenceSchema = ExecutionEvidenceSchema.extend({
  simulated: z.literal(true),
  fixture_contract_version: z.literal(1),
  facts: ExecutionEvidenceSchema.shape.facts.extend({
    provenance: z.literal("controlled_fixture"),
  }),
});
export const FixtureInputValidationSchema = ActionInputValidationEvidenceSchema.extend({
  simulated: z.literal(true),
  fixture_contract_version: z.literal(1),
  facts: ActionInputValidationEvidenceSchema.shape.facts.extend({
    input_fingerprint: z.null(),
    supported: z.null(),
  }),
});
export const ControlledFixtureEvidenceSchema = z.object({
  failureContext: FixtureFailureContextSchema,
  executionEvidence: FixtureExecutionEvidenceSchema,
  inputValidation: FixtureInputValidationSchema,
}).strict();
export type ControlledFixtureEvidence = z.infer<typeof ControlledFixtureEvidenceSchema>;
export type DiagnosisEvidence = {
  failureContext: FailureContextEvidence | ControlledFixtureEvidence["failureContext"];
  executionEvidence: ExecutionEvidence | ControlledFixtureEvidence["executionEvidence"];
  inputValidation: ActionInputValidationEvidence | ControlledFixtureEvidence["inputValidation"];
};

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

const taxonomyId = z.enum([
  "F01",
  "F02",
  "F03",
  "F04",
  "F05",
  "F06",
  "F07",
  "F08",
  "F09",
  "F10",
  "unknown",
]);

const integratedDiagnosis = z
  .object({
    taxonomy_id: taxonomyId,
    summary: boundedSummary,
    confidence: z.enum(["low", "medium", "high"]),
    evidence_refs: z.array(evidenceRef).min(1).max(16),
    alternate_explanations: z.array(boundedSummary).max(8),
    missing_evidence: z.array(boundedName).max(16),
  })
  .strict();

const proposalDisposition = z.enum([
  "replay_candidate",
  "owner_action_required",
  "engineering_escalation_required",
  "insufficient_evidence",
  "outcome_unknown",
  "duplicate_or_stale",
  "resolved_without_replay",
]);

const modelProposal = z
  .object({
    disposition: proposalDisposition,
    kind: z.enum([
      "wait_then_replay",
      "request_manual_fix",
      "escalate",
      "no_action",
    ]),
    summary: boundedSummary,
    reasons: z.array(boundedSummary).min(1).max(16),
    evidence_refs: z.array(evidenceRef).min(1).max(16),
    runbook_citations: z
      .array(
        z
          .string()
          .min(1)
          .max(256)
          .regex(/^RB-[A-Z0-9-]+@\d+\.\d+\.\d+#[a-z0-9-]+$/),
      )
      .max(3),
    preconditions: z.array(boundedSummary).max(16),
  })
  .strict();

export const IntegratedModelOutputSchema = z
  .object({
    status: z.enum(["completed", "abstained"]),
    diagnosis: integratedDiagnosis,
    proposal: modelProposal,
  })
  .strict();

export const IntegratedDiagnosisResultSchema = z
  .object({
    contract_version: z.literal(1),
    graph_version: z.literal("phase-6-v1"),
    prompt_version: z.enum(["phase-6-v1", "phase-11a-v2", "phase-11a-v3"]),
    status: z.enum(["completed", "abstained"]),
    diagnosis: integratedDiagnosis,
    proposal: modelProposal.extend({
      not_before: z.iso.datetime({ offset: true }).nullable(),
    }),
  })
  .strict();

export const ModelUsageSchema = z
  .object({
    input_tokens: z.number().int().nonnegative(),
    output_tokens: z.number().int().nonnegative(),
    total_tokens: z.number().int().nonnegative(),
  })
  .strict()
  .refine(
    (usage) => usage.total_tokens >= usage.input_tokens + usage.output_tokens,
    "total_tokens must cover input and output tokens",
  );

export type IntegratedModelOutput = z.infer<typeof IntegratedModelOutputSchema>;
export type IntegratedDiagnosisResult = z.infer<
  typeof IntegratedDiagnosisResultSchema
>;
export type ModelUsage = z.infer<typeof ModelUsageSchema>;

export type DiagnosisPrompt = {
  instructions: string;
  input: string;
  repair?: { issue: string };
};

export type ModelGeneration = {
  output: unknown;
  usage: ModelUsage;
};

export interface IntegratedDiagnosisModel {
  generate(
    prompt: DiagnosisPrompt,
    signal: AbortSignal,
  ): Promise<ModelGeneration>;
  close(): Promise<void>;
}
