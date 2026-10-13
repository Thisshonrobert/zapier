// Experimental only: never imported by the production diagnosis service.
import { buildDiagnosisPrompt, hasUnknownDelivery } from "../prompts.ts";
import type { DiagnosisEvidence, IntegratedModelOutput } from "../contracts.ts";
import type { RunbookMatch } from "../tools/search-runbooks.ts";

export const CAUSAL_PROMPT_VERSION = "experimental-causal-v1";
export const CAUSAL_V2_PROMPT_VERSION = "experimental-causal-v2";

export function buildCausalDiagnosisPrompt(evidence: DiagnosisEvidence, runbooks: readonly RunbookMatch[]) {
  const current = buildDiagnosisPrompt(evidence, runbooks);
  return {
    ...current,
    instructions: current.instructions.replace(
      "Only observed customer-controlled credentials, destination configuration, or template/input mappings justify owner_action_required + request_manual_fix.",
      "Only an evidenced defect in customer-controlled credentials, destination configuration, or template/input mappings justifies owner_action_required + request_manual_fix. Field presence or a reported error alone does not establish a defect.",
    ).replace(
      "Missing template paths and invalid destination format support a bounded owner configuration repair;",
      "Explicitly observed missing template paths or independently validated invalid destination format support a bounded owner configuration repair;",
    ).replace(
      "When a specific cause is unsupported, use unknown with low confidence, disclose the missing distinctions and use insufficient_evidence unless delivery requires outcome_unknown.",
      "Preserve an evidenced fault family even when its specific cause is uncertain. Use unknown with low confidence only when no family is supported. Missing cause distinctions call for targeted investigation, not blanket abstention: with known delivery, a supported failure may use completed + engineering_escalation_required + escalate; use insufficient_evidence when even a bounded diagnosis is unsupported. Unknown delivery still requires outcome_unknown.",
    ) + `
Causal evidence rules: separate observations, hypotheses and confirmed causes in the existing summary and alternate_explanations fields. Quote an error only as a reported observation. A provider or resolver reporting an invalid username does not establish defective configuration, invalid credentials, a nonexistent destination or missing permissions. With destination validity, permissions or provider status unavailable, name these competing hypotheses and request non-secret destination-format validation, provider phase/status evidence and operator confirmation of bot membership/access. Do not prescribe correction before the defect is established.
An explicit observed destination_format_invalid finding in controlled fixture evidence establishes only that format defect in the simulated case; do not confuse this finding with an ambiguous error string. Cite the evidence carrying the defect for a bounded owner repair. Missing historical snapshots, intended replacement or replay prerequisites do not erase the observed format defect; do not invent the replacement or claim execution-time configuration. Runbook allowed-remediation wording describes conditional procedures, not proof that this case needs correction. Correction requires cited defect evidence; investigation requires only the supported observation. Preserve all delivery, disclosure, safety and replay restrictions.`,
  };
}

export function buildCausalDiagnosisPromptV2(evidence: DiagnosisEvidence, runbooks: readonly RunbookMatch[]) {
  const v1 = buildCausalDiagnosisPrompt(evidence, runbooks);
  // Replace the experimental explanation as a whole; do not stack prompt patches.
  return { ...v1, instructions: v1.instructions.split("\nCausal evidence rules:")[0] + `
Causal evidence rules: assess observed delivery, supported fault family, specific-cause certainty, appropriate action and replay eligibility separately. Use structured retry, current-execution and attempt outcomes with the existing delivery precedence: an explicit unknown or an accepted/rejected conflict requires outcome_unknown. Absent outcome fields, error wording, SUCCESS and missing cause evidence do not establish delivery. Known rejection without conflicting or unknown outcomes must not become outcome_unknown merely because its cause is uncertain. A supported family with uncertain cause permits completed + engineering_escalation_required + escalate for targeted investigation; insufficient_evidence remains available when a bounded diagnosis itself is unsupported.
Separate observations, hypotheses and established defects in summary and alternate_explanations. Treat an error as a reported observation, not proof of invalid configuration, credentials, destination existence or permissions. Request only the missing distinctions: non-secret validation, provider phase/status and operator access confirmation as applicable. Retrieved remediation is conditional procedure, not incident evidence.
An independent explicit defect finding permits bounded correction citing the evidence carrying that finding. Supported invalid-input validation or a controlled fixture's explicit destination_format_invalid/template_path_missing observation establishes that defect within its provenance; ambiguous error text, field presence and blocked validation do not. Missing historical snapshots or intended replacement do not erase that finding, but do not invent replacement values or execution-time configuration. Unknown or conflicting delivery still overrides correction routing. Knowing a defect never authorizes replay; retain all existing replay prerequisites, simulated-evidence restrictions, redaction and missing-evidence disclosures.` };
}

// Experimental contract consistency only: no cause entailment, repair support or
// replay authorization. Missing outcomes are unmeasured, never inferred from text.
export function diagnosisConsistencyIssues(evidence: DiagnosisEvidence, output: IntegratedModelOutput): string[] {
  const issues: string[] = [];
  const kinds = {
    replay_candidate: "wait_then_replay", owner_action_required: "request_manual_fix",
    engineering_escalation_required: "escalate", insufficient_evidence: "escalate",
    outcome_unknown: "escalate", duplicate_or_stale: "no_action", resolved_without_replay: "no_action",
  } as const;
  const disposition = output.proposal.disposition;
  if (output.proposal.kind !== kinds[disposition]) issues.push("invalid_disposition_mapping");
  const abstained = disposition === "outcome_unknown" || disposition === "insufficient_evidence";
  if ((output.status === "abstained") !== abstained) issues.push("invalid_abstention_status");
  // Same precedence and structured sources as production prompt/graph routing.
  if (hasUnknownDelivery(evidence)) {
    if (disposition !== "outcome_unknown") issues.push("unknown_delivery_requires_outcome_unknown");
  } else {
    const outcomes = [evidence.failureContext.facts.retry.provider_outcome,
      evidence.executionEvidence.facts.current_execution?.provider_outcome,
      ...evidence.executionEvidence.facts.attempts.map(a => a.provider_outcome)];
    // Only contract-recognized known outcomes count; null/absent/custom strings do not.
    const known = outcomes.some(o => ["rejected", "accepted", "not_attempted", "not_delivered", "not_applicable"].includes(o ?? ""));
    if (known && disposition === "outcome_unknown") issues.push("known_delivery_marked_unknown");
  }
  return issues;
}

// Narrow offline advisory gate, not a general free-text entailment evaluator.
// It rejects unsupported repairs; it never rewrites a diagnosis or forces abstention.
export function repairEvidenceIssue(evidence: DiagnosisEvidence, output: IntegratedModelOutput): string | null {
  if (output.proposal.kind !== "request_manual_fix") return null;
  const validation = evidence.inputValidation;
  const cited = new Set(output.proposal.evidence_refs);
  const validatedFault = cited.has(validation.evidence_id) &&
    validation.facts.supported === true && validation.facts.validation_status === "invalid" &&
    (validation.facts.missing_required_fields.length > 0 || validation.facts.invalid_field_types.length > 0 || validation.facts.missing_template_paths.length > 0);
  const failure = evidence.failureContext;
  const fixtureFault = failure.simulated && cited.has(failure.evidence_id) &&
    failure.fixture_observation.observed_facts.some(fact =>
      ["destination_format_invalid", "template_path_missing"].includes(fact));
  return validatedFault || fixtureFault ? null : "unsupported_owner_repair";
}
