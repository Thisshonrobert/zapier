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

