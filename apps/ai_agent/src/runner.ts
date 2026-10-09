// worker -> pick invetigation and execute it via langraph. If the worker crashes, the investigation will be re-claimed by another worker.
import { randomUUID } from "node:crypto";
import type { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

import { verifyServiceScope } from "../../../packages/triage-contracts/index.ts";
import { BackendClient } from "./clients/backend.ts";
import type { IntegratedDiagnosisModel } from "./contracts.ts";
import { buildDiagnosisService, type DiagnosisOptions, type IntegratedInvestigationTools } from "./graph.ts";
import type { InvestigationStore } from "./investigation-store.ts";
import { searchRunbooks, type RunbookIndex } from "./tools/search-runbooks.ts";
import type { RunbookRetriever } from "./tools/runbook-retriever.ts";

type ClaimedJob = NonNullable<Awaited<ReturnType<InvestigationStore["claimNext"]>>>;
type Snapshot = { evidence: unknown; result: unknown; traceId?: string | null };

export async function runInvestigationOnce(
  store: Pick<InvestigationStore, "claimNext" | "finish" | "fail">,
  execute: (job: ClaimedJob) => Promise<Snapshot>,
) {
  const job = await store.claimNext();
  if (!job) return false;
  try {
    const snapshot = await execute(job);
    await store.finish(job.id, job.leaseToken!, snapshot.evidence, snapshot.result, "proposed", snapshot.traceId);
  } catch {
    await store.fail(job.id, job.leaseToken!);
  }
  return true;
}

export function createInvestigationPoller(
  store: Pick<InvestigationStore, "claimNext" | "finish" | "fail"> | undefined,
  execute: ((job: ClaimedJob) => Promise<Snapshot>) | undefined,
  enabled: () => boolean,
  onError: () => void,
) {
  let stopping = false;
  let polling = false;
  let pending: Promise<void> | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  const poll = async () => {
    if (!store || !execute || polling || stopping || !enabled()) return;
    polling = true;
    try { while (!stopping && enabled() && await runInvestigationOnce(store, execute)) { /* drain bounded claims */ } }
    catch { onError(); }
    finally { polling = false; }
  };
  return {
    accepting: () => !stopping && enabled(),
    start() {
      if (!store || !execute) return;
      timer = setInterval(() => { if (!polling) pending = poll(); }, 2_000);
      pending = poll();
    },
    async stop() {
      stopping = true;
      if (timer) clearInterval(timer);
      await pending;
    },
  };
}

export function createInvestigationExecutor(input: {
  backendBaseUrl: string;
  serviceSecret: string;
  model: IntegratedDiagnosisModel;
  runbookIndex: RunbookIndex;
  runbookRetriever?: RunbookRetriever;
  checkpointer: PostgresSaver;
  diagnosisOptions?: DiagnosisOptions;
}) {
  return async (job: ClaimedJob): Promise<Snapshot> => {
    const correlationId = randomUUID();
    const response = await fetch(new URL(`/api/v1/triage/internal/investigations/${job.id}/scope`, input.backendBaseUrl), {
      method: "POST",
      headers: { authorization: `Bearer ${input.serviceSecret}`, "content-type": "application/json",
        "x-correlation-id": correlationId },
      body: JSON.stringify(job.binding),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error("Investigation scope unavailable");
    const body = await response.text();
    if (body.length > 4_096) throw new Error("Investigation scope too large");
    const token = (JSON.parse(body) as { scope?: unknown }).scope;
    if (typeof token !== "string") throw new Error("Investigation scope missing");
    const scope = verifyServiceScope(token, { secret: input.serviceSecret, operation: "failure_context" });
    for (const operation of ["execution_evidence", "validate_action_inputs"] as const)
      verifyServiceScope(token, { secret: input.serviceSecret, operation });
    if (scope.ownerId !== job.binding.subjectOwnerId || scope.caseId !== job.binding.caseId ||
      scope.investigationId !== job.id || scope.correlationId !== correlationId)
      throw new Error("Investigation scope binding mismatch");
    const client = new BackendClient({ baseUrl: input.backendBaseUrl, scopeToken: token,
      serviceSecret: input.serviceSecret });
    const tools: IntegratedInvestigationTools = {
      getFailureContext: (signal) => client.getFailureContext(signal),
      getExecutionEvidence: (limit, signal) => client.getExecutionEvidence(limit, signal),
      validateActionInputs: (signal) => client.validateActionInputs(signal),
      searchRunbooks: (query) => input.runbookRetriever
        ? input.runbookRetriever.search(query) : searchRunbooks(input.runbookIndex, query),
    };
    return buildDiagnosisService(tools, input.model, {
      ...input.diagnosisOptions, checkpointer: input.checkpointer,
      threadId: job.checkpointThreadId,
      requireDecision: true,
    }).diagnoseWithEvidence();
  };
}

/**queued investigation
        ↓
runner.claimNext() //Take one pending investigation and execute it.
        ↓
gets investigation #123
        ↓
creates scoped backend access
        ↓
creates LangGraph diagnosis service
        ↓
LangGraph gathers evidence
        ↓
LangGraph retrieves runbooks
        ↓
LangGraph generates diagnosis
        ↓
returns { evidence, result }
        ↓
store.finish()
        ↓
status = proposed */
