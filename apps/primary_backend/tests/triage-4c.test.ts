import { describe, expect, test } from "bun:test";

import { TriageEvidenceService, type TriageEvidenceDb } from "../services/triage-evidence.ts";
import { ActionInputValidationEvidenceSchema } from "../../ai_agent/src/contracts.ts";

const row = {
  caseId: "11111111-1111-4111-8111-111111111111",
  zapRunId: "44444444-4444-4444-8444-444444444444",
  stage: 0,
  attempt: 1,
  createdAt: new Date("2026-09-24T00:00:00.000Z"),
  evidenceSource: "captured",
  provider: null,
  phase: null,
  providerOutcome: "not_attempted",
  safeCode: "unsupported_action_type",
  providerStatus: null,
  retryAfterSeconds: null,
  requiresHuman: true,
  lastError: null,
  actionTypeId: "unknown-action",
  actionMetadata: { token: "must-not-leak" },
  runMetadata: { customer: { email: "must-not-leak@example.invalid" } },
};

describe("Phase 4C backend validation adapter", () => {
  test("returns blocked secret-safe evidence for unsupported registry entries", async () => {
    const db: TriageEvidenceDb = { $queryRaw: async <T>() => [row] as T };
    const evidence = await new TriageEvidenceService(db).validateActionInputs(
      7,
      row.caseId,
    );
    ActionInputValidationEvidenceSchema.parse(evidence);

    expect(evidence.type).toBe("action_input_validation");
    expect(evidence.facts.validation_status).toBe("blocked");
    expect(evidence.unavailable).toContain("supported_action_handler");
    expect(JSON.stringify(evidence)).not.toContain("must-not-leak");
  });
});
