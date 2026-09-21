import type { DiagnosisModel, Evidence } from "./contracts.ts";

export class FixtureDiagnosisModel implements DiagnosisModel {
  async diagnose(evidence: Evidence): Promise<unknown> {
    if (evidence.facts.delivery_outcome === "unknown") {
      return {
        status: "insufficient_evidence",
        diagnosis: {
          taxonomy_id: "F07",
          summary: "The external delivery outcome is unknown.",
          confidence: "high",
          evidence_refs: [evidence.evidence_id],
          missing_evidence: ["provider_delivery_receipt"],
        },
        proposal: {
          kind: "escalate",
          summary: "Reconcile delivery with the provider before any replay.",
          evidence_refs: [evidence.evidence_id],
          preconditions: ["Prove the original request was not delivered."],
          requires_human_approval: false,
        },
      };
    }

    return {
      status: "completed",
      diagnosis: {
        taxonomy_id: "F01",
        summary: "Telegram rejected every attempt because of rate limiting.",
        confidence: "high",
        evidence_refs: [evidence.evidence_id],
        missing_evidence: [],
      },
      proposal: {
        kind: "wait_then_replay",
        summary: "Wait for the retry window, then request an approved replay.",
        evidence_refs: [evidence.evidence_id],
        preconditions: ["Wait at least 30 seconds.", "Obtain human approval."],
        requires_human_approval: true,
        wait_seconds: 30,
      },
    };
  }

  async close(): Promise<void> {}
}
