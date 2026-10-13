// Offline experiment only. No production imports or provider adapter.
import { IntegratedModelOutputSchema, type DiagnosisEvidence, type IntegratedModelOutput } from "../contracts.ts";
import { buildDiagnosisService, InvalidModelOutput } from "../graph.ts";
import type { RunbookMatch } from "../tools/search-runbooks.ts";
import { diagnosisConsistencyIssues, repairEvidenceIssue } from "./causal-diagnosis.ts";

// Reviewer-supplied scope, derived from the repair being proposed, never taxonomy,
// confidence, case ID or benchmark labels. The response contract has no repair category.
export type RepairCategory = "destination_format" | "input_requirements" | "credentials" | "permissions" | "other";
type Assessment = {
  category: RepairCategory;
  status: "supported" | "unsupported" | "not_assessed";
  provenance: "controlled_fixture_only" | "production_contract_validation" | null;
  reason: string;
};
type RepairSupport = {
  status: Assessment["status"] | "not_applicable";
  assessments: Assessment[];
};

export function assessRepairSupport(evidence: DiagnosisEvidence, output: IntegratedModelOutput, categories: readonly RepairCategory[]): RepairSupport {
  if (output.proposal.kind !== "request_manual_fix" && output.proposal.disposition !== "owner_action_required") {
    return { status: "not_applicable", assessments: [] };
  }
  const assessments = [...new Set(categories.length ? categories : ["other" as const])].map((category): Assessment => {
    if (category === "credentials" || category === "permissions" || category === "other") {
      return { category, status: "not_assessed", provenance: null, reason: "repair_category_outside_evidence_coverage" };
    }
    if (category === "destination_format" && !evidence.failureContext.simulated) {
      return { category, status: "not_assessed", provenance: null, reason: "no_production_destination_format_finding_contract" };
    }
    // Reuse the narrow evidence rules with unrelated findings removed. A missing
    // template must not justify a destination-format correction, or vice versa.
    const scoped = structuredClone(evidence);
    if (scoped.failureContext.simulated) {
      const finding = category === "destination_format" ? "destination_format_invalid" : "template_path_missing";
      scoped.failureContext.fixture_observation.observed_facts = scoped.failureContext.fixture_observation.observed_facts.filter(f => f === finding);
    }
    if (category === "destination_format") {
      scoped.inputValidation.facts.missing_required_fields = [];
      scoped.inputValidation.facts.invalid_field_types = [];
      scoped.inputValidation.facts.missing_template_paths = [];
    }
    const supported = repairEvidenceIssue(scoped, output) === null;
    const validation = scoped.inputValidation;
    const validated = !validation.simulated && validation.facts.supported === true &&
      validation.facts.validation_status === "invalid" && output.proposal.evidence_refs.includes(validation.evidence_id) &&
      (validation.facts.missing_required_fields.length + validation.facts.invalid_field_types.length + validation.facts.missing_template_paths.length > 0);
    return { category, status: supported ? "supported" : "unsupported",
      provenance: supported ? validated ? "production_contract_validation" : "controlled_fixture_only" : null,
      reason: supported ? "cited_independent_finding_for_assessed_category" : "no_cited_independent_finding_for_assessed_category" };
  });
  const status = assessments.some(a => a.status === "unsupported") ? "unsupported" :
    assessments.some(a => a.status === "not_assessed") ? "not_assessed" : "supported";
  return { status, assessments };
}

export async function evaluateRepairAcceptance(evidence: DiagnosisEvidence, runbooks: readonly RunbookMatch[], rawOutput: unknown, categories: readonly RepairCategory[] = []) {
  // Copy before parsing or any gate; the caller persists this initial response.
  const preserved = structuredClone(rawOutput);
  const parsed = IntegratedModelOutputSchema.safeParse(preserved);
  const serviceAcceptance = { accepted: false, failure: null as string | null };
  const deliveryConsistency = parsed.success ? diagnosisConsistencyIssues(evidence, parsed.data) : null;
  const repairSupport: RepairSupport = parsed.success ? assessRepairSupport(evidence, parsed.data, categories) : { status: "not_assessed", assessments: [] };
  if (parsed.success) {
    try {
      await buildDiagnosisService({
        getFailureContext: async () => structuredClone(evidence.failureContext),
        getExecutionEvidence: async () => structuredClone(evidence.executionEvidence),
        validateActionInputs: async () => structuredClone(evidence.inputValidation),
        searchRunbooks: async () => structuredClone([...runbooks]),
      }, {
        close: async () => {},
        // Replay the already saved object locally, with no provider and no repair.
        generate: async () => ({ output: structuredClone(preserved), usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 } }),
      }, { allowSimulatedEvidence: evidence.failureContext.simulated, maxRepairAttempts: 0 }).diagnose();
      serviceAcceptance.accepted = true;
    } catch (error) {
      serviceAcceptance.failure = error instanceof InvalidModelOutput ? "invalid_model_output" : "offline_service_validation_failed";
    }
  } else serviceAcceptance.failure = "schema_validation_failed";
  const rejected = !serviceAcceptance.accepted || !!deliveryConsistency?.length || repairSupport.status === "unsupported";
  const experimentalAcceptance = rejected ? "rejected" : repairSupport.status === "not_assessed" ? "not_assessed" : "accepted";
  return { rawOutput: preserved, schemaValid: parsed.success, serviceAcceptance, deliveryConsistency,
    repairSupport, experimentalAcceptance, externalModelCalls: 0 as const };
}
