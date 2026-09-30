import { describe, expect, test } from "bun:test";

import { InvestigationProposals } from "../services/investigation-proposals.ts";

const input = { investigationId: "11111111-1111-4111-8111-111111111111",
  caseId: "22222222-2222-4222-8222-222222222222", subjectOwnerId: 9, actorId: 4,
  result: { proposal: { disposition: "replay_candidate", kind: "wait_then_replay" },
    diagnosis: { taxonomy_id: "F01" } }, evidence: { safe: true } };

function fake(failAudit = false) {
  let committed = false;
  const writes: string[] = [];
  const tx = {
    async $queryRaw<T>(query: { strings: readonly string[] }): Promise<T> {
      const sql = query.strings.join("?");
      if (sql.includes('FROM "User"')) return [{ isSupportOperator: true }] as T;
      if (sql.includes('FROM "ZapRunRetry"')) return [{ subjectOwnerId: 9 }] as T;
      return [] as T;
    },
    async $executeRaw(query: { strings: readonly string[] }) {
      const sql = query.strings.join("?");
      if (failAudit && sql.includes('INSERT INTO "TriageAccessAudit"')) throw new Error("audit failed");
      writes.push(sql);
      return 1;
    },
  };
  return { writes, get committed() { return committed; },
    async $transaction<T>(fn: (client: typeof tx) => Promise<T>) {
      const result = await fn(tx);
      committed = true;
      return result;
    } };
}
const policy = async () => ({ result: { status: "requires_approval" as const, reasons: [],
  notBefore: null, actionFingerprint: null, requestFingerprint: null, handlerVersion: null },
  facts: {}, sourceHashes: { failure: "a".repeat(64), execution: "b".repeat(64),
    validation: "c".repeat(64) } });

describe("Phase 8 immutable proposals", () => {
  test("saves an eligible proposal and audit in one transaction", async () => {
    const database = fake();
    const result = await new InvestigationProposals(database, policy as never).submit(input as never);
    expect(result.status).toBe("requires_approval");
    expect(database.writes.some((sql) => sql.includes('INSERT INTO "TriageProposal"'))).toBe(true);
    expect(database.writes.some((sql) => sql.includes('INSERT INTO "TriageAccessAudit"'))).toBe(true);
    expect(database.committed).toBe(true);
  });

  test("an audit failure prevents a proposal commit", async () => {
    const database = fake(true);
    expect(new InvestigationProposals(database, policy as never).submit(input as never)).rejects.toThrow("audit failed");
    expect(database.committed).toBe(false);
  });
});
