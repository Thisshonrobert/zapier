import { expect, test } from "bun:test";

import { prisma } from "../../../packages/db/prisma/db.ts";
import { buildDiagnosisService } from "../../ai_agent/src/graph.ts";
import { defaultRunbookDirectory } from "../../ai_agent/src/paths.ts";
import {
  loadRunbooks,
  searchRunbooks,
} from "../../ai_agent/src/tools/search-runbooks.ts";
import {
  TriageEvidenceService,
  type TriageEvidenceDb,
} from "../services/triage-evidence.ts";
import { F01_CASE_ID, seedF01Case } from "./seed-f01-case.ts";

test("dev F01 seed is resettable, owner-scoped, and investigable by Phase 6", async () => {
  try {
    const first = await seedF01Case("reset");
    const second = await seedF01Case("seed");
    expect(second).toEqual(first);
    expect(first.caseId).toBe(F01_CASE_ID);

    const service = new TriageEvidenceService(
      prisma as unknown as TriageEvidenceDb,
    );
    const [failure, execution, validation] = await Promise.all([
      service.getFailureContext(first.ownerId, first.caseId),
      service.getExecutionEvidence(first.ownerId, first.caseId),
      service.validateActionInputs(first.ownerId, first.caseId),
    ]);
    expect(failure.facts.retry).toMatchObject({
      provider: "telegram",
      phase: "send",
      provider_outcome: "rejected",
      provider_status: 429,
      retry_after_seconds: 60,
    });
    expect(execution.facts).toMatchObject({
      provenance: "captured",
      ordering: { status: "valid", missing_predecessor_stages: [] },
      current_execution: { status: "FAILED" },
    });
    expect(execution.facts.predecessors).toEqual([
      expect.objectContaining({ stage: 0, status: "SUCCESS" }),
    ]);
    expect(execution.facts.attempts[0]).toMatchObject({
      provider_outcome: "rejected",
      provider_status: 429,
      retry_after_seconds: 60,
      provenance: "captured",
    });
    expect(execution.facts.current_execution?.action_fingerprint).toHaveLength(
      64,
    );
    expect(execution.facts.current_execution?.request_fingerprint).toHaveLength(
      64,
    );
    expect(validation.facts).toMatchObject({
      action_type: "telegram",
      validation_status: "valid",
      supported: true,
    });
    const stored = await prisma.zapRunRetry.findUnique({
      where: { id: first.caseId },
      include: { execution: { include: { attempts: true } } },
    });
    expect(stored?.executionId).toBe(stored?.execution?.id);
    expect(stored?.execution?.zapRunId).toBe(first.runId);
    expect(stored?.actionFingerprint).toHaveLength(64);
    expect(stored?.requestFingerprint).toHaveLength(64);
    expect(stored?.execution?.attempts[0]?.actionFingerprint).toBe(
      stored?.actionFingerprint ?? undefined,
    );
    expect(stored?.execution?.attempts[0]?.requestFingerprint).toBe(
      stored?.requestFingerprint ?? undefined,
    );
    expect(
      await prisma.zapRunOutbox.count({ where: { zapRunId: first.runId } }),
    ).toBe(0);
    await expect(
      service.getFailureContext(first.ownerId + 1, first.caseId),
    ).rejects.toThrow();

    const index = await loadRunbooks(defaultRunbookDirectory());
    const result = await buildDiagnosisService(
      {
        getFailureContext: async () => failure,
        getExecutionEvidence: async () => execution,
        validateActionInputs: async () => validation,
        searchRunbooks: (input) => searchRunbooks(index, input),
      },
      {
        generate: async () => ({
          output: {
            status: "completed",
            diagnosis: {
              taxonomy_id: "F01",
              summary: "Telegram rejected the send with HTTP 429.",
              confidence: "high",
              evidence_refs: [
                failure.evidence_id,
                execution.evidence_id,
                validation.evidence_id,
              ],
              alternate_explanations: [],
              missing_evidence: ["historical_action_snapshot"],
            },
            proposal: {
              disposition: "replay_candidate",
              kind: "wait_then_replay",
              summary: "Request deterministic policy review after cooldown.",
              reasons: ["Captured rejection"],
              evidence_refs: [
                failure.evidence_id,
                execution.evidence_id,
                validation.evidence_id,
              ],
              runbook_citations: [],
              preconditions: ["Wait for cooldown", "Require operator approval"],
            },
          },
          usage: { input_tokens: 10, output_tokens: 10, total_tokens: 20 },
        }),
        close: async () => {},
      },
    ).diagnose();
    expect(result.diagnosis.taxonomy_id).toBe("F01");
    expect(result.proposal.disposition).toBe("replay_candidate");
  } finally {
    await prisma.$disconnect();
  }
});

test("F01 seed refuses production and non-local databases", async () => {
  const originalEnvironment = process.env.NODE_ENV;
  const originalDatabaseUrl = process.env.DATABASE_URL;
  try {
    process.env.NODE_ENV = "production";
    await expect(seedF01Case("reset")).rejects.toThrow(
      "local development database",
    );
    process.env.NODE_ENV = "test";
    process.env.DATABASE_URL =
      "postgresql://fixture:fixture@example.com/fixture";
    await expect(seedF01Case("reset")).rejects.toThrow("non-local databases");
  } finally {
    if (originalEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalEnvironment;
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
  }
});
