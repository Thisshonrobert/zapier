import { afterEach, expect, test } from "bun:test";
import { createServer, type Server } from "node:http";
import express from "express";
import jwt from "jsonwebtoken";
import { renderToStaticMarkup } from "react-dom/server";
import { InvestigationAuthority, type SqlClient } from "../../../primary_backend/services/investigation-authority.ts";
import { TriageOperatorDenied } from "../../../primary_backend/services/triage-operator.ts";
import { requestTriage, pollInvestigation } from "./triage-client";
import { SavedInvestigationControls } from "../app/triage/TriageResults";
import type { SavedInvestigation } from "../types/triage";

process.env.JWT_SECRET ??= "phase-10a-http-test-secret";
const { createTriageRouter } = await import("../../../primary_backend/route/triage.ts");
const servers: Server[] = [];
afterEach(async () => { await Promise.all(servers.splice(0).map(server =>
  new Promise<void>(resolve => server.close(() => resolve())))); });

const caseId = "10000000-0000-4000-8000-000000000001";
const investigationId = "10000000-0000-4000-8000-000000000002";
const proposalId = "10000000-0000-4000-8000-000000000003";
const decisionId = "10000000-0000-4000-8000-000000000004";
const token = () => jwt.sign({ id: 4 }, process.env.JWT_SECRET!);

// SQL/agent transport fixtures only; production routes, authority, browser client and UI projection run below.
async function fixture(disposition = "replay_candidate") {
  let decision: { id: string; decision: string; approvedBy: number } | null = null;
  let replay: { id: string; status: string; publishedAt: Date | null; completedAt: Date | null } | null = null;
  let operator = true;
  let owner = 9;
  let version = 1;
  let expiresAt = new Date(Date.now() + 60_000);
  let policyStatus = "requires_approval";
  const writes: string[] = [];
  const proposal = () => ({ id: proposalId, investigationId, caseId, subjectOwnerId: 9,
    disposition, status: disposition === "replay_candidate" ? "requires_approval" : "no_action",
    expiresAt, version, policy: {} });
  const db: SqlClient & { $transaction<T>(fn: (tx: SqlClient) => Promise<T>): Promise<T> } = {
    async $queryRaw<T>(query: unknown): Promise<T> {
      const sql = (query as { strings: string[] }).strings.join("?");
      if (sql.includes('FROM "ZapRunRetry"')) return [{ subjectOwnerId: owner, isSupportOperator: operator }] as T;
      if (sql.includes('FROM "User"')) return [{ isSupportOperator: operator }] as T;
      if (sql.includes('FROM "TriageProposal"')) return [proposal()] as T;
      if (sql.includes('FROM "TriageApproval"')) return (decision ? [decision] : []) as T;
      if (sql.includes('FROM "ReplayRequest"')) return (replay ? [replay] : []) as T;
      throw new Error("Unexpected projection query");
    },
    async $executeRaw(query: unknown) {
      const { strings, values } = query as { strings: string[]; values: unknown[] };
      const sql = strings.join("?");
      writes.push(sql);
      if (sql.includes('INSERT INTO "TriageApproval"')) decision = {
        id: values[0] as string, approvedBy: values[4] as number, decision: values[5] as string,
      };
      return 1;
    },
    async $transaction<T>(fn: (tx: SqlClient) => Promise<T>): Promise<T> { return fn(db); },
  };
  const app = express();
  app.use(express.json());
  app.use("/triage", createTriageRouter({ evidence: {} as never,
    operator: { resolveCase: async () => {
      if (!operator) throw new TriageOperatorDenied();
      return { case_id: caseId, subject_owner_id: owner, zap_run_id: investigationId, stage: 0 };
    } } as never,
    agent: { read: async () => ({ id: investigationId, status: "proposed",
      binding: { caseId, subjectOwnerId: 9, zapRunId: investigationId, stage: 0 }, result: {}, evidence: {} }) } as never,
    proposals: { submit: async () => ({ id: proposalId }) } as never,
    authority: new InvestigationAuthority(db, async () => ({ status: policyStatus, reasons: policyStatus === "blocked" ? ["changed_fingerprint"] : [] })),
    serviceSecret: "phase10b-secret-that-is-at-least-32-chars",
  }));
  const server = createServer(app); servers.push(server);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("missing test server address");
  const baseUrl = `http://127.0.0.1:${address.port}/triage/operator`;
  const path = `/cases/${caseId}/investigations/${investigationId}`;
  const request = <T,>(suffix = "", init?: RequestInit) => requestTriage<T>({ baseUrl, token: token(),
    path: path + suffix, init, signal: new AbortController().signal });
  const decide = (choice: string, proposalVersion = 1) => request("/decision", { method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": decisionId },
    body: JSON.stringify({ proposalId, proposalVersion, decision: choice }) });
  return { request, decide, writes, baseUrl, path,
    setOperator: (value: boolean) => { operator = value; }, setOwner: (value: number) => { owner = value; },
    setVersion: (value: number) => { version = value; }, expire: () => { expiresAt = new Date(0); },
    block: () => { policyStatus = "blocked"; }, setReplay: (value: typeof replay) => { replay = value; } };
}

test("HTTP client -> typed decision -> saved read -> UI retains approval without initiating replay", async () => {
  const f = await fixture();
  await f.decide("approve");
  await f.decide("approve");
  expect(f.writes.filter(sql => sql.includes('INSERT INTO "TriageApproval"'))).toHaveLength(1);
  expect(f.writes.some(sql => sql.includes('INSERT INTO "ReplayRequest"'))).toBe(false);
  const read = await f.request<SavedInvestigation>();
  expect(read.authority?.decision).toMatchObject({ id: decisionId, decision: "approve", approvedBy: 4 });
  const html = renderToStaticMarkup(<SavedInvestigationControls saved={read} pending={false} onDecision={() => {}} />);
  expect(html).toContain("No replay request exists");
  expect(html).not.toContain(">Approve</button>");
  await expect(f.decide("reject")).rejects.toThrow("already decided");
});

test.each([
  ["owner_action_required", "mark_owner_action_required"],
  ["engineering_escalation_required", "escalate_to_engineering"],
  ["resolved_without_replay", "resolve_without_replay"],
  ["replay_candidate", "reject"],
])("commits and reloads %s through the operator API", async (disposition, choice) => {
  const f = await fixture(disposition);
  await f.decide(choice);
  expect(String((await f.request<SavedInvestigation>()).authority?.decision?.decision)).toBe(choice);
});

test("reads fail closed for unauthorized actors and mismatched subject owners", async () => {
  const f = await fixture();
  expect((await fetch(f.baseUrl + f.path)).status).toBe(401);
  f.setOperator(false);
  await expect(f.request()).rejects.toThrow("Support operator permission required");
  await expect(f.decide("approve")).rejects.toThrow("Support operator permission required");
  f.setOperator(true); f.setOwner(10);
  await expect(f.request()).rejects.toThrow("binding mismatch");
  await expect(f.decide("approve")).rejects.toThrow("binding");
  expect(f.writes).toHaveLength(0);
});

test("expiry, stale versions and changed policy supply explicit denial reasons", async () => {
  const f = await fixture();
  f.setVersion(2);
  await expect(f.decide("approve")).rejects.toThrow("stale proposal version");
  f.setVersion(1); f.block();
  await expect(f.decide("approve")).rejects.toThrow("changed_fingerprint");
  expect((await f.request<SavedInvestigation>()).authority?.allowedDecisions).toEqual(["reject"]);
  f.expire();
  await expect(f.decide("reject")).rejects.toThrow("expired");
  expect((await f.request<SavedInvestigation>()).authority?.allowedDecisions).toEqual([]);
});

test.each(["SUCCESS", "FAILED", "UNKNOWN"])("observes queued/publication/RUNNING/%s separately through polling and UI", async status => {
  const f = await fixture(); await f.decide("approve");
  f.setReplay({ id: "request", status: "RESERVED", publishedAt: null, completedAt: null });
  expect((await f.request<SavedInvestigation>()).authority?.replay).toMatchObject({ publication: "queued", execution: "PENDING" });
  f.setReplay({ id: "request", status: "RUNNING", publishedAt: new Date(), completedAt: null });
  expect((await f.request<SavedInvestigation>()).authority?.replay).toMatchObject({ publication: "published", execution: "RUNNING" });
  f.setReplay({ id: "request", status, publishedAt: new Date(), completedAt: new Date() });
  let reads = 0;
  await pollInvestigation({ signal: new AbortController().signal, read: async () => {
    reads++; return f.request<SavedInvestigation>();
  }, onSnapshot: snapshot => {
    const html = renderToStaticMarkup(<SavedInvestigationControls saved={snapshot} pending={false} onDecision={() => {}} />);
    expect(html).toContain(`Execution: ${status}`);
    expect(html).toContain("Publication: published");
    if (status === "UNKNOWN") expect(html).toContain("No resend");
  } });
  expect(reads).toBe(1);
});
