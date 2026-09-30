import { describe, expect, test } from "bun:test";

import { InvestigationAuthority, InvestigationDecisionDenied } from "../services/investigation-authority.ts";

const proposal = {
  id: "11111111-1111-4111-8111-111111111111",
  investigationId: "22222222-2222-4222-8222-222222222222",
  caseId: "33333333-3333-4333-8333-333333333333",
  subjectOwnerId: 9,
  disposition: "replay_candidate",
  status: "requires_approval",
  expiresAt: new Date("2030-01-01T00:00:00Z"),
  version: 1,
};

function db(input: { operator?: boolean; owner?: number; failAudit?: boolean;
  existing?: { id: string; decision: string; approvedBy: number } } = {}) {
  const writes: string[] = [];
  let committed = false;
  const tx = {
    async $queryRaw<T>(query: { strings: readonly string[] }): Promise<T> {
      const sql = query.strings.join("?");
      if (sql.includes('FROM "TriageApproval"') && input.existing) return [input.existing] as T;
      if (sql.includes('FROM "TriageProposal"')) return [proposal] as T;
      if (sql.includes('FROM "User"')) return [{ isSupportOperator: input.operator ?? true }] as T;
      if (sql.includes('FROM "ZapRunRetry"')) return [{ subjectOwnerId: input.owner ?? 9 }] as T;
      return [] as T;
    },
    async $executeRaw(query: { strings: readonly string[] }) {
      const sql = query.strings.join("?");
      if (input.failAudit && sql.includes('INSERT INTO "TriageAccessAudit"')) throw new Error("audit unavailable");
      writes.push(sql);
      return 1;
    },
  };
  return {
    writes,
    $queryRaw: tx.$queryRaw,
    $executeRaw: tx.$executeRaw,
    get committed() { return committed; },
    async $transaction<T>(fn: (client: typeof tx) => Promise<T>): Promise<T> {
      const result = await fn(tx);
      committed = true;
      return result;
    },
  };
}

const input = {
  proposalId: proposal.id,
  investigationId: proposal.investigationId,
  caseId: proposal.caseId,
  subjectOwnerId: 9,
  actorId: 4,
  decisionId: "44444444-4444-4444-8444-444444444444",
  decision: "approve" as const,
};
const currentPolicy = async () => ({ status: "requires_approval" as const, reasons: [] });
const authority = (database: ReturnType<typeof db>,
  policy: () => Promise<{ status: string; reasons: string[] }> = currentPolicy) =>
  new InvestigationAuthority(database, policy);

describe("Phase 8 approval authority", () => {
  test("commits decision and business audit together", async () => {
    const database = db();
    const result = await authority(database).decide(input, new Date("2029-01-01T00:00:00Z"));
    expect(result).toMatchObject({ id: input.decisionId, decision: "approve", approvedBy: 4 });
    expect(database.committed).toBe(true);
    expect(database.writes.some((sql) => sql.includes('INSERT INTO "TriageApproval"'))).toBe(true);
    expect(database.writes.some((sql) => sql.includes('INSERT INTO "TriageAccessAudit"'))).toBe(true);
    expect(database.writes.some((sql) => sql.includes('INSERT INTO "TriageDecisionNotification"'))).toBe(true);
  });

  test.each([
    [{ operator: false }, "operator"],
    [{ owner: 10 }, "binding"],
  ] as const)("rejects revoked permission or case binding %#", async (setup, reason) => {
    const database = db(setup);
    expect(authority(database).decide(input, new Date("2029-01-01T00:00:00Z")))
      .rejects.toBeInstanceOf(InvestigationDecisionDenied);
    try { await authority(database).decide(input, new Date("2029-01-01T00:00:00Z")); }
    catch (error) { expect((error as Error).message).toContain(reason); }
    expect(database.writes).toHaveLength(0);
    expect(database.committed).toBe(false);
  });

  test("duplicate decision ID is idempotent only for the same actor and choice", async () => {
    const existing = { id: input.decisionId, decision: "approve", approvedBy: 4 };
    const database = db({ existing });
    expect(await authority(database).decide(input, new Date("2029-01-01T00:00:00Z")))
      .toMatchObject(existing);
    expect(database.writes).toHaveLength(0);
    expect(authority(database).decide({ ...input, decision: "reject" }, new Date("2029-01-01T00:00:00Z")))
      .rejects.toBeInstanceOf(InvestigationDecisionDenied);
  });

  test("expired proposal cannot be approved", async () => {
    const database = db();
    expect(authority(database).decide(input, new Date("2030-01-01T00:00:00Z")))
      .rejects.toBeInstanceOf(InvestigationDecisionDenied);
    expect(database.writes).toHaveLength(0);
  });

  test("cannot approve when current policy hard-blocks the saved proposal", async () => {
    const database = db();
    const blocked = async () => ({ status: "blocked" as const, reasons: ["changed_fingerprint"] });
    expect(authority(database, blocked).decide(input, new Date("2029-01-01T00:00:00Z")))
      .rejects.toBeInstanceOf(InvestigationDecisionDenied);
    expect(database.writes).toHaveLength(0);
  });

  test("audit failure prevents committing an approval or notification", async () => {
    const database = db({ failAudit: true });
    expect(authority(database).decide(input, new Date("2029-01-01T00:00:00Z")))
      .rejects.toThrow("audit unavailable");
    expect(database.committed).toBe(false);
    expect(database.writes.some((sql) => sql.includes('INSERT INTO "TriageDecisionNotification"'))).toBe(false);
  });
});
