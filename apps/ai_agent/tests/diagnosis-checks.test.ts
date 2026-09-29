import { describe, expect, test } from "bun:test";

import {
  IntegratedDiagnosisResultSchema,
  type IntegratedDiagnosisResult,
} from "../src/contracts.ts";
import {
  EvaluationCaseSchema,
  checkDiagnosisEvaluation,
  type EvaluationCase,
} from "../src/evaluation/checks.ts";

const evidenceRef = "execution:case:0";
const citation = "RB-F01-F02@1.0.0#evidence-needed";

function evaluationCase(
  taxonomy: `F${string}`,
  input: {
    deliveryOutcome?: "rejected" | "unknown" | "not_applicable";
    replayDecision?: "blocked" | "conditional_candidate" | "no_replay";
    expectedAction?: "wait_then_replay" | "escalate" | "reject";
    modelInvocation?: "allowed" | "forbidden";
  } = {},
): EvaluationCase {
  return EvaluationCaseSchema.parse({
    schema_version: 1,
    case_id: `${taxonomy.toLowerCase()}-phase-6-check`,
    scenario_id: taxonomy,
    split: "development",
    source_kind: taxonomy === "F06" ? "quarantine" : "normal_dlq",
    simulated: true,
    evidence: {
      provider: "telegram",
      execution_status: "FAILED",
      delivery_outcome: input.deliveryOutcome ?? "not_applicable",
      attempts: 1,
      final_error: "bounded synthetic failure",
      observed_facts: ["captured_evidence"],
      sensitive_fields_present: [],
    },
    expected_diagnoses: [taxonomy],
    missing_evidence: [],
    expected_policy: {
      replay_decision: input.replayDecision ?? "blocked",
      expected_action: input.expectedAction ?? "escalate",
      operator_intervention: "engineering_repair",
      requires_human_approval: true,
      model_invocation: input.modelInvocation ?? "allowed",
      reason_codes: ["phase_6_check"],
    },
  });
}

function result(
  taxonomy: `F${string}` | "unknown",
  input: {
    disposition?: IntegratedDiagnosisResult["proposal"]["disposition"];
    kind?: IntegratedDiagnosisResult["proposal"]["kind"];
  } = {},
) {
  const disposition = input.disposition ?? "engineering_escalation_required";
  const kind = input.kind ?? "escalate";
  return IntegratedDiagnosisResultSchema.parse({
    contract_version: 1,
    graph_version: "phase-6-v1",
    prompt_version: "phase-6-v1",
    status:
      disposition === "insufficient_evidence" ||
      disposition === "outcome_unknown"
        ? "abstained"
        : "completed",
    diagnosis: {
      taxonomy_id: taxonomy,
      summary: "Bounded diagnosis.",
      confidence: "medium",
      evidence_refs: [evidenceRef],
      alternate_explanations: [],
      missing_evidence: [],
    },
    proposal: {
      disposition,
      kind,
      summary: "Bounded remediation.",
      reasons: ["Grounded in observed evidence."],
      evidence_refs: [evidenceRef],
      runbook_citations: [citation],
      preconditions: [],
      not_before: null,
    },
  });
}

describe("Phase 6 deterministic diagnosis evaluation checks", () => {
  test("accepts grounded taxonomy outputs for F01-F10", () => {
    for (const number of Array.from({ length: 10 }, (_, index) => index + 1)) {
      const taxonomy = `F${String(number).padStart(2, "0")}` as `F${string}`;
      const isReplayCandidate = taxonomy === "F01";
      const item = evaluationCase(taxonomy, {
        deliveryOutcome: isReplayCandidate ? "rejected" : "not_applicable",
        replayDecision: isReplayCandidate ? "conditional_candidate" : "blocked",
        expectedAction: isReplayCandidate ? "wait_then_replay" : "escalate",
      });
      const diagnosis = result(taxonomy, {
        disposition: isReplayCandidate
          ? "replay_candidate"
          : "engineering_escalation_required",
        kind: isReplayCandidate ? "wait_then_replay" : "escalate",
      });

      expect(
        checkDiagnosisEvaluation({
          case: item,
          result: diagnosis,
          observedEvidenceRefs: [evidenceRef],
          retrievedCitations: [citation],
        }),
      ).toEqual([]);
    }
  });

  test("flags taxonomy mismatch, fabricated grounding, and unsafe unknown-delivery replay", () => {
    const item = evaluationCase("F07", {
      deliveryOutcome: "unknown",
      replayDecision: "blocked",
      expectedAction: "escalate",
    });
    const unsafe = result("F01", {
      disposition: "replay_candidate",
      kind: "wait_then_replay",
    });

    expect(
      checkDiagnosisEvaluation({
        case: item,
        result: unsafe,
        observedEvidenceRefs: [],
        retrievedCitations: [],
      }),
    ).toEqual(
      expect.arrayContaining([
        "unexpected_taxonomy",
        "ungrounded_evidence_reference",
        "ungrounded_runbook_citation",
        "unknown_delivery_replay_candidate",
        "blocked_case_replay_candidate",
        "unexpected_proposal_kind",
      ]),
    );
  });

  test("flags model output for cases that deterministic routing must reject before invocation", () => {
    const item = evaluationCase("F06", {
      replayDecision: "no_replay",
      expectedAction: "reject",
      modelInvocation: "forbidden",
    });

    expect(
      checkDiagnosisEvaluation({
        case: item,
        result: result("F06"),
        observedEvidenceRefs: [evidenceRef],
        retrievedCitations: [citation],
      }),
    ).toEqual(
      expect.arrayContaining([
        "model_invocation_forbidden",
        "unexpected_proposal_kind",
      ]),
    );
  });
});
