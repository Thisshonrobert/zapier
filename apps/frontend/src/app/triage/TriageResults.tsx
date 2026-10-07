import { useEffect, useState } from "react";
import {
  AlertCircle,
  FileWarning,
  LoaderCircle,
  ShieldAlert,
} from "lucide-react";

import type { SavedInvestigation, TriageDecision, TriageCase, TriageDisplayState } from "../../types/triage";

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

export function SavedInvestigationControls({ saved, pending, onDecision }: {
  saved: SavedInvestigation; pending: boolean; onDecision: (decision: TriageDecision) => void;
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
  return <section aria-live="polite" className="mt-4 space-y-3 rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-700">
    <p className="font-mono text-xs">Saved investigation {saved.id}</p>
    <p>Status: {saved.status}</p>
    <p>Live replay is disabled. Approval does not initiate replay.</p>
    {!authority ? <p>No decision proposal is available yet.</p> : <>
      <p>Proposal version {authority.version} · Expires {new Date(authority.expiresAt).toLocaleString()}</p>
      {expired ? <p role="alert">Proposal expired. Start a new investigation.</p> : null}
      <DetailList title="Decision reasons" items={authority.reasons} />
      {authority.decision ? <p>Committed decision: {decisionLabels[authority.decision.decision]} · operator {authority.decision.approvedBy}</p>
        : authority.allowedDecisions.length === 0 ? <p>Decision controls are blocked by backend policy.</p>
        : <div className="flex flex-wrap gap-2">{authority.allowedDecisions.map((decision) =>
          <button key={decision} type="button" disabled={pending || expired}
            className="rounded-lg border border-zinc-300 px-3 py-2 font-medium hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => onDecision(decision)}>{decisionLabels[decision]}</button>)}</div>}
      {pending ? <p role="status">Saving decision… Controls are blocked while this request is pending.</p> : null}
      {authority.replay ? <div>
        <p>Publication: {authority.replay.publication}{authority.replay.publication === "queued" ? " (publication not confirmed)" : ""}</p>
        <p>Execution: {authority.replay.execution}</p>
        <p>Publication does not prove execution success. This outcome describes the selected replay stage.</p>
        {authority.replay.execution === "UNKNOWN" ? <p>No resend. Delivery is unknown and terminal.</p> : null}
      </div> : <p>No replay request exists. An approved decision alone is not execution.</p>}
    </>}
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
