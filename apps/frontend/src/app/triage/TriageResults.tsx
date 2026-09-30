import {
  AlertCircle,
  FileWarning,
  LoaderCircle,
  ShieldAlert,
} from "lucide-react";

import type { TriageCase, TriageDisplayState } from "@/types/triage";

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
            Transient diagnosis
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
        This result is read-only and transient. It cannot approve, replay, or
        change a workflow.
      </p>
    </section>
  );
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
