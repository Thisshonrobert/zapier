import { useEffect, useState } from "react";
import {
  AlertCircle,
  FileWarning,
  LoaderCircle,
  ShieldAlert,
} from "lucide-react";

import type { ReplayCapabilities, ReplayRequestHistoryItem, SavedInvestigation, TriageDecision, TriageCase, TriageDisplayState } from "../../types/triage";

export function TriageResults({
  state,
  onSelectCase,
}: {
  state: TriageDisplayState;
  onSelectCase: (caseItem: TriageCase) => void;
}) {
  if (state.kind === "idle") {
    return (
      <p className="text-sm text-zinc-600">Select a case to investigate.</p>
    );
  }
  if (state.kind === "loading") {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-zinc-600">
        <LoaderCircle className="h-4 w-4 animate-spin" /> Loading cases or
        diagnosis…
      </div>
    );
  }
  if (state.kind === "blocked") {
    return (
      <StateNotice
        icon={ShieldAlert}
        title="Support access is required"
        detail="This account cannot access the support triage console."
      />
    );
  }
  if (state.kind === "empty") {
    return (
      <StateNotice
        icon={FileWarning}
        title="No cases are available"
        detail="There are no recent failed workflow cases within this bounded view."
      />
    );
  }
  if (state.kind === "error") {
    return (
      <StateNotice
        icon={AlertCircle}
        title="Triage could not load"
        detail={state.message}
      />
    );
  }
  if (state.kind === "cases") {
    return (
      <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
        {state.cases.map((caseItem) => (
          <button
            type="button"
            aria-pressed={state.selectedCaseId === caseItem.case_id}
            className={`flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-zinc-50 ${state.selectedCaseId === caseItem.case_id ? "bg-orange-50" : ""}`}
            key={caseItem.case_id}
            onClick={() => onSelectCase(caseItem)}
          >
            <span>
              <span className="block font-mono text-xs text-zinc-500">
                {caseItem.case_id}
              </span>
              <span className="mt-1 block text-sm font-semibold text-zinc-900">
                Stage {caseItem.stage} ·{" "}
                {caseItem.provider_outcome ?? "provider outcome unavailable"}
              </span>
            </span>
            <span className="text-xs text-zinc-500">
              {new Date(caseItem.observed_at).toLocaleString()}
            </span>
          </button>
        ))}
      </div>
    );
  }

  const { diagnosis, proposal } = state.result;
  const isUnknown =
    proposal.disposition === "outcome_unknown" ||
    diagnosis.taxonomy_id === "unknown";
  return (
    <section
      aria-live="polite"
      className="space-y-5 rounded-xl border border-zinc-200 bg-white p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Diagnosis
          </p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-900">
            {isUnknown ? "Outcome unknown" : diagnosis.taxonomy_id}
          </h2>
        </div>
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium capitalize text-zinc-700">
          {diagnosis.confidence} confidence
        </span>
      </div>
      <p className="text-sm text-zinc-700">{diagnosis.summary}</p>
      <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
        <span className="font-semibold">Proposed next step: </span>
        {proposal.summary}
      </div>
      {diagnosis.missing_evidence.length > 0 ? (
        <DetailList
          title="Missing evidence"
          items={diagnosis.missing_evidence}
        />
      ) : null}
      <DetailList title="Evidence references" items={diagnosis.evidence_refs} />
      <DetailList
        title="Runbook citations"
        items={proposal.runbook_citations}
      />
      <p className="text-xs text-zinc-500">
        Diagnosis is advisory. Only backend policy can authorize replay.
      </p>
    </section>
  );
}

const decisionLabels: Record<TriageDecision, string> = {
  approve: "Approve", reject: "Reject", mark_owner_action_required: "Owner action required",
  escalate_to_engineering: "Escalate to engineering", resolve_without_replay: "Resolve without replay",
};

export function SavedInvestigationControls({ saved, pending, onDecision, capabilities,
  replayAction, onDryRun, onRequestReplay }: {
  saved: SavedInvestigation; pending: boolean; onDecision: (decision: TriageDecision) => void;
  capabilities?: ReplayCapabilities | null;
  replayAction?: { kind: "dry-run" | "request"; pending: boolean; message: string } | null;
  onDryRun?: () => void; onRequestReplay?: () => void;
}) {
  const authority = saved.authority;
  const [now, setNow] = useState(() => Date.now());
  const expiresAt = authority?.expiresAt;
  useEffect(() => {
    if (!expiresAt) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, Date.parse(expiresAt) - Date.now()) + 1);
    return () => clearTimeout(timer);
  }, [expiresAt]);
  const expired = authority ? Date.parse(authority.expiresAt) <= now : false;
  const replayBusy = pending || replayAction?.pending === true;
  const replayBlocked = replayBusy || expired || capabilities?.replayIntent === false;
  return <section aria-live="polite" className="mt-4 space-y-3 rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-700">
    <p className="font-mono text-xs">Saved investigation {saved.id}</p>
    <p>Status: {saved.status}</p>
    <CapabilitySummary capabilities={capabilities} />
    {!authority ? <p>No decision proposal is available yet.</p> : <>
      <p>Proposal version {authority.version} · Expires {new Date(authority.expiresAt).toLocaleString()}</p>
      {expired ? <p role="alert">Proposal expired. Start a new investigation.</p> : null}
      <section aria-label="Application eligibility">
        <h3 className="text-sm font-semibold text-zinc-900">Application eligibility</h3>
        <p data-eligibility={authority.eligibility.status}>
          Policy: {authority.eligibility.status === "eligible" ? "eligible for operator review" : authority.eligibility.status}
          {authority.eligibility.notBefore ? ` · cooldown ends ${new Date(authority.eligibility.notBefore).toLocaleString()}` : ""}
        </p>
        <p>{authority.eligibility.candidateGrounded
          ? "The advisory candidate is grounded in captured evidence."
          : "The advisory candidate is not grounded; diagnosis confidence does not grant eligibility."}</p>
        <DetailList title="Policy reasons" items={authority.eligibility.reasons.length ? authority.eligibility.reasons : authority.reasons} />
      </section>
      {authority.decision ? <p>Committed decision: {decisionLabels[authority.decision.decision]} · operator {authority.decision.approvedBy}</p>
        : authority.allowedDecisions.length === 0 ? <p>Decision controls are blocked by backend policy.</p>
        : <div className="flex flex-wrap gap-2">{authority.allowedDecisions.map((decision) =>
          <button key={decision} type="button" disabled={pending || expired}
            className="rounded-lg border border-zinc-300 px-3 py-2 font-medium hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => onDecision(decision)}>{decisionLabels[decision]}</button>)}</div>}
      {pending ? <p role="status">Saving decision… Controls are blocked while this request is pending.</p> : null}
      <section aria-label="Replay dispatch">
        <h3 className="text-sm font-semibold text-zinc-900">Replay dispatch</h3>
        {!authority.decision ? <p>An approval is required before a replay can be requested. Approval alone does not dispatch.</p> : (
          <div className="space-y-2">
            <p>Approved by operator {authority.decision.approvedBy}. Approval is recorded but no replay is dispatched yet.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={replayBlocked}
                className="rounded-lg border border-zinc-300 px-3 py-2 font-medium hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={onDryRun}>Run dry run review</button>
              <button type="button" disabled={replayBlocked}
                className="rounded-lg bg-[#FF4F00] px-3 py-2 font-medium text-white hover:bg-[#e64700] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={onRequestReplay}>Request replay</button>
            </div>
          </div>)}
        {replayAction?.pending ? <p role="status">Replay {replayAction.kind === "dry-run" ? "dry run" : "request"} in progress… Actions are blocked while this request is pending.</p> : null}
        {replayAction && !replayAction.pending ? <p role="status" data-replay-action={replayAction.kind}>{replayAction.message}</p> : null}
        {authority.replay ? <div>
          <p>Publication: {authority.replay.publication}{authority.replay.publication === "queued" ? " (publication not confirmed)" : ""}</p>
          <p>This investigation&apos;s execution: {authority.replay.execution}</p>
          <p>Publication does not prove execution success. This outcome describes the selected replay stage.</p>
          {authority.replay.execution === "UNKNOWN" ? <p>No resend. Delivery is unknown and terminal.</p> : null}
        </div> : <p>No replay request exists for this investigation. An approved decision alone is not execution.</p>}
      </section>
      <ReplayHistory items={authority.replayHistory} />
    </>}
  </section>;
}

function CapabilitySummary({ capabilities }: { capabilities?: ReplayCapabilities | null }) {
  if (!capabilities) return <p>Replay capability is unavailable from the server. No replay action is offered until it responds.</p>;
  const states = [
    ["investigation", capabilities.investigation],
    ["replay intent", capabilities.replayIntent],
    ["replay execution", capabilities.replayExecution],
  ] as const;
  return <div>
    <h3 className="text-sm font-semibold text-zinc-900">Server capability</h3>
    <p>{states.map(([label, value]) => `${label}: ${value ? "enabled" : "disabled"}`).join(" · ")}</p>
    <p>Release ready: {capabilities.releaseReady ? "yes" : "no"}{capabilities.labProfile ? ` · verified lab profile ${capabilities.labProfile}` : ""}</p>
    <DetailList title="Capability reasons" items={capabilities.reasons} />
  </div>;
}

/** One row per replay request for the case, across investigations. */
function ReplayHistory({ items }: { items: ReplayRequestHistoryItem[] }) {
  if (!items.length) return <section aria-label="Replay request history">
    <h3 className="text-sm font-semibold text-zinc-900">Replay request history</h3>
    <p>No replay request has been recorded for this case in any investigation.</p>
  </section>;
  return <section aria-label="Replay request history">
    <h3 className="text-sm font-semibold text-zinc-900">Replay request history</h3>
    <ul className="space-y-2">
      {items.map((item) => <li key={item.requestId} className="rounded-lg bg-zinc-50 p-3">
        <span className="block font-mono text-xs">{item.requestId}</span>
        <span className="mt-1 block">Publication: {item.publication} · Execution: {item.execution} · Provider outcome: {item.outcome}</span>
        <span className="mt-1 block font-mono text-xs">authorized by proposal {item.proposalId} (v{item.proposalVersion}) · investigation {item.investigationId}</span>
        <span className="mt-1 block font-mono text-xs">requested by operator {item.requestedBy} · approved by {item.approvedBy}</span>
      </li>)}
    </ul>
  </section>;
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
      <ul className="mt-2 space-y-1 text-sm text-zinc-700">
        {items.map((item) => (
          <li className="font-mono text-xs" key={item}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StateNotice({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof AlertCircle;
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
      <Icon className="mx-auto h-6 w-6 text-zinc-400" />
      <h2 className="mt-3 font-semibold text-zinc-900">{title}</h2>
      <p className="mt-1 text-sm text-zinc-600">{detail}</p>
    </div>
  );
}
