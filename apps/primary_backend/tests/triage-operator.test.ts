import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  TriageOperatorCaseNotFound,
  TriageOperatorDenied,
  TriageOperatorService,
} from "../services/triage-operator.ts";

const caseId = "f0100000-0000-4000-8000-000000000001";
const runId = "11111111-1111-4111-8111-111111111111";

function database(input: { permitted?: boolean; ownerId?: number; failAudit?: boolean } = {}) {
  const audits: unknown[] = [];
  const db = {
    $queryRaw: async <T>(query: unknown): Promise<T> => {
      const sql = String((query as { sql?: string }).sql);
      if (sql.includes('"isSupportOperator"')) {
        return [{ isSupportOperator: input.permitted ?? true }] as T;
      }
      if (sql.includes('retry.id AS "caseId"')) {
        return [{
          caseId,
          zapRunId: runId,
          stage: 1,
          subjectOwnerId: input.ownerId ?? 9,
          observedAt: new Date("2026-09-24T00:00:00Z"),
          providerOutcome: "rejected",
          safeCode: "telegram_http_429",
          evidenceSource: "captured",
        }] as T;
      }
      throw new Error("unexpected query");
    },
    $executeRaw: async (query: unknown) => {
      if (input.failAudit) throw new Error("audit unavailable");
      audits.push(query);
      return 1;
    },
  };
  return { db, audits };
}

describe("support operator access", () => {
  test("bounded discovery audits each returned case with its owner", async () => {
    const { db, audits } = database();
    const cases = await new TriageOperatorService(db).listCases(4, 500);
    assert.equal(cases.length, 1);
    assert.equal(cases[0]?.subject_owner_id, 9);
    assert.equal(audits.length, 1);
    assert.match(JSON.stringify(audits[0]), /list_cases/);
  });

  test("binds a selected case to its subject owner and audits the actor", async () => {
    const { db, audits } = database();
    const service = new TriageOperatorService(db);
    const selected = await service.resolveCase(4, caseId, "diagnose");
    assert.equal(selected.case_id, caseId);
    assert.equal(selected.zap_run_id, runId);
    assert.equal(selected.stage, 1);
    assert.equal(selected.subject_owner_id, 9);
    assert.equal(audits.length, 1);
    assert.match(JSON.stringify(audits[0]), /diagnose/);
  });

  test("denies an ordinary or revoked operator and audits the denial", async () => {
    const { db, audits } = database({ permitted: false });
    await assert.rejects(new TriageOperatorService(db).resolveCase(4, caseId, "diagnose"), TriageOperatorDenied);
    assert.equal(audits.length, 1);
    assert.match(JSON.stringify(audits[0]), /denied/);
  });

  test("fails closed when the access audit cannot be stored", async () => {
    const { db } = database({ failAudit: true });
    await assert.rejects(new TriageOperatorService(db).resolveCase(4, caseId, "diagnose"), /audit unavailable/);
  });

  test("denies a mismatched case binding and records no subject owner", async () => {
    const { db, audits } = database();
    await assert.rejects(
      new TriageOperatorService(db).resolveCase(4, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
      TriageOperatorCaseNotFound,
    );
    assert.equal(audits.length, 1);
    assert.match(JSON.stringify(audits[0]), /denied/);
  });
});
