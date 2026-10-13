// Synthetic offline counterfactuals, not new benchmark labels or live observations.
import { ActionInputValidationEvidenceSchema, ExecutionEvidenceSchema, FailureContextEvidenceSchema, type DiagnosisEvidence, type IntegratedModelOutput } from "../contracts.ts";
import type { CapturedEvaluationContext } from "./checks.ts";
import type { RepairCategory } from "./repair-acceptance.ts";

export function repairAcceptanceControls(contexts: readonly CapturedEvaluationContext[]) {
  const ambiguous = structuredClone(contexts.find(c => c.case_id === "f03-permission-ambiguous")!.evidence!);
  const confirmed = structuredClone(contexts.find(c => c.case_id === "f04-invalid-destination")!.evidence!);
  const output = (e: DiagnosisEvidence, summary = "Correct the independently invalid destination format."): IntegratedModelOutput => ({
    status: "completed", diagnosis: { taxonomy_id: "F04", summary: "Bounded synthetic finding, not execution-time configuration.", confidence: "low",
      evidence_refs: [e.failureContext.evidence_id], alternate_explanations: [], missing_evidence: [...new Set(Object.values(e).flatMap(v => v.unavailable))] },
    proposal: { disposition: "owner_action_required", kind: "request_manual_fix", summary,
      reasons: ["Correct only the cited independent finding; no replacement or replay authorized."],
      evidence_refs: [e.failureContext.evidence_id], runbook_citations: [], preconditions: [] },
  });
  // Construct schema-valid synthetic evidence in the production contract shape.
  // The hashes/fingerprint are synthetic markers, never asserted live observations.
  const { fixture_contract_version: _a, fixture_observation: _b, fixture_source_kind: _c, ...failure } = ambiguous.failureContext as typeof confirmed.failureContext & { fixture_contract_version: number; fixture_observation: unknown; fixture_source_kind: string };
  const { fixture_contract_version: _d, ...execution } = ambiguous.executionEvidence as typeof confirmed.executionEvidence & { fixture_contract_version: number };
  const { fixture_contract_version: _f, ...validation } = ambiguous.inputValidation as typeof confirmed.inputValidation & { fixture_contract_version: number };
  const real: DiagnosisEvidence = {
    failureContext: FailureContextEvidenceSchema.parse({ ...failure, simulated: false, facts: { ...failure.facts, source_kind: "retry_row", retry: { ...failure.facts.retry, requires_human: true } } }),
    executionEvidence: ExecutionEvidenceSchema.parse({ ...execution, simulated: false, facts: { ...execution.facts, provenance: "captured" } }),
    inputValidation: ActionInputValidationEvidenceSchema.parse({ ...validation, simulated: false,
      facts: { ...validation.facts, supported: true, validation_status: "invalid", input_fingerprint: "0".repeat(64), missing_template_paths: ["customer.channel"] } }),
  };
  type Control = { name: string; evidence: DiagnosisEvidence; output: IntegratedModelOutput; categories: RepairCategory[];
    expectedRepairSupport: "supported" | "unsupported" | "not_assessed" | "not_applicable";
    expectedAcceptance: "accepted" | "rejected" | "not_assessed"; expectedConsistencyIssue?: string;
    reviewRepair: "supported" | "unsupported" | "not_assessed" | "not_applicable";
    reviewNote: string };
  const controls: Control[] = [];
  const add = (name: string, e: DiagnosisEvidence, value: IntegratedModelOutput, categories: RepairCategory[], support: Control["expectedRepairSupport"], acceptance: Control["expectedAcceptance"], reviewRepair: Control["reviewRepair"] = support === "not_applicable" ? "not_applicable" : support,
    reviewNote = "Direct review of synthetic proposed correction and independent evidence.") => controls.push({ name, evidence: structuredClone(e), output: structuredClone(value), categories, expectedRepairSupport: support, expectedAcceptance: acceptance, reviewRepair, reviewNote });
  add("ambiguous wording without defect", ambiguous, output(ambiguous), ["destination_format"], "unsupported", "rejected");
  add("fixture format with carrying citation", confirmed, output(confirmed), ["destination_format"], "supported", "accepted");
  const wrong = output(confirmed); wrong.proposal.evidence_refs = [confirmed.executionEvidence.evidence_id];
  add("format with wrong citation", confirmed, wrong, ["destination_format"], "unsupported", "rejected", "unsupported", "The underlying defect is established but the proposal does not cite its evidence; recommendation fails the cited-evidence requirement.");
  const template = structuredClone(ambiguous);
  if (template.failureContext.simulated) template.failureContext.fixture_observation.observed_facts = ["template_path_missing"];
  add("fixture missing template", template, output(template, "Correct the missing template input."), ["input_requirements"], "supported", "accepted");
  for (const kind of ["missing template", "missing required input", "invalid input type"]) {
    const e = structuredClone(real);
    e.inputValidation.facts.missing_template_paths = kind === "missing template" ? ["customer.channel"] : [];
    e.inputValidation.facts.missing_required_fields = kind === "missing required input" ? ["body"] : [];
    e.inputValidation.facts.invalid_field_types = kind === "invalid input type" ? [{ field: "body", expected: "string", actual: "number" }] : [];
    const value = output(e, `Correct the validated ${kind}.`); value.proposal.evidence_refs = [e.inputValidation.evidence_id];
    add(`synthetic real-contract ${kind}`, e, value, ["input_requirements"], "supported", "accepted");
  }
  const blocked = structuredClone(real); blocked.inputValidation.facts.validation_status = "blocked";
  const blockedOutput = output(blocked, "Correct template inputs."); blockedOutput.proposal.evidence_refs = [blocked.inputValidation.evidence_id];
  add("blocked validation is not a finding", blocked, blockedOutput, ["input_requirements"], "unsupported", "rejected");
  add("input defect with wrong citation", real, output(real, "Correct template inputs."), ["input_requirements"], "unsupported", "rejected");
  add("template finding does not justify format correction", template, output(template), ["destination_format"], "unsupported", "rejected");
  const investigation = output(ambiguous, "Investigate destination validity, permission state and provider phase without assuming a defect.");
  investigation.proposal.disposition = "engineering_escalation_required"; investigation.proposal.kind = "escalate";
  add("known rejection with targeted investigation", ambiguous, investigation, [], "not_applicable", "accepted");
  const unknown = structuredClone(confirmed); unknown.failureContext.facts.retry.provider_outcome = "unknown";
  add("unknown delivery overrides supported repair", unknown, output(unknown), ["destination_format"], "supported", "rejected");
  controls.at(-1)!.expectedConsistencyIssue = "unknown_delivery_requires_outcome_unknown";
  const conflict = structuredClone(ambiguous);
  conflict.executionEvidence.facts.attempts.push({ attempt_number: 1, status: "SUCCESS", provider: "telegram", phase: "send", provider_outcome: "accepted", safe_code: null, provider_status: 200,
    retry_after_seconds: null, started_at: null, completed_at: null, provenance: "legacy" });
  add("conflicting delivery overrides investigation route", conflict, investigation, [], "not_applicable", "rejected");
  controls.at(-1)!.expectedConsistencyIssue = "unknown_delivery_requires_outcome_unknown";
  const unknownRoute = structuredClone(investigation); unknownRoute.status = "abstained"; unknownRoute.proposal.disposition = "outcome_unknown";
  add("conflicting delivery with proper escalation", conflict, unknownRoute, [], "not_applicable", "accepted");
  const credential = structuredClone(real); credential.inputValidation.facts.credential_presence = [{ field: "botToken", present: false, source: "unknown_worker_environment" }];
  add("credential validity is not assessed from field absence", credential, output(credential, "Rotate the credential."), ["credentials"], "not_assessed", "not_assessed");
  add("permission correction not assessed from 403", ambiguous, output(ambiguous, "Correct bot membership and permissions."), ["permissions"], "not_assessed", "not_assessed");
  controls.at(-1)!.evidence.failureContext.facts.retry.provider_status = 403;
  add("production format category has no finding contract", real, output(real), ["destination_format"], "not_assessed", "not_assessed");
  add("unreviewed repair is explicitly not assessed", confirmed, output(confirmed), [], "not_assessed", "not_assessed");
  add("replacement-value claim is outside bounded defect coverage", confirmed, output(confirmed, "Replace the destination with @invented_destination."), ["destination_format", "other"], "not_assessed", "not_assessed", "unsupported",
    "Review identifies an additional replacement-value claim. Cited format evidence supports bounded correction, but cannot establish this replacement; the extra claim is explicitly not assessed, not accepted.");
  return controls;
}
