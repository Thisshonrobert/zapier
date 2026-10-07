import { useState } from "react";
import { filterCases, type CaseFilters, type CommandCenterState } from "../../lib/triage-command-center";
import type { TriageCase } from "../../types/triage";
import { TriageResults } from "./TriageResults";
import type { EvaluationSummary } from "../../../../../packages/triage-contracts/command-center";

const control = "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600";
const label = (value: string) => value.replaceAll("_", " ");

export function CaseBrowser({ cases, selectedCaseId, onSelectCase }: {
  cases: TriageCase[]; selectedCaseId?: string; onSelectCase: (item: TriageCase) => void;
}) {
  const [filters, setFilters] = useState<CaseFilters>({ query: "", outcome: "all", source: "all", order: "newest" });
  const visible = filterCases(cases, filters);
  const update = (patch: Partial<CaseFilters>) => setFilters(previous => ({ ...previous, ...patch }));
  const outcomes = [...new Set(cases.map(item => item.provider_outcome ?? "unavailable"))].sort();
  return <div className="space-y-3">
    <label className="block text-xs font-medium text-zinc-700" htmlFor="case-search">Search case, run, owner or error code</label>
    <input id="case-search" type="search" maxLength={120} className={control} value={filters.query}
      onChange={event => update({ query: event.target.value })} />
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <label className="space-y-1 text-xs font-medium text-zinc-700">Provider outcome
        <select className={control} value={filters.outcome} onChange={event => update({ outcome: event.target.value })}>
          <option value="all">All outcomes</option>{outcomes.map(outcome => <option key={outcome} value={outcome}>{label(outcome)}</option>)}
        </select>
      </label>
      <label className="space-y-1 text-xs font-medium text-zinc-700">Evidence source
        <select className={control} value={filters.source} onChange={event => update({ source: event.target.value })}>
          <option value="all">All sources</option><option value="retry_row">Retry row</option><option value="reconciled_execution">Reconciled</option>
        </select>
      </label>
      <label className="space-y-1 text-xs font-medium text-zinc-700">Order
        <select className={control} value={filters.order} onChange={event => update({ order: event.target.value as CaseFilters["order"] })}>
          <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
        </select>
      </label>
    </div>
    <p role="status" className="text-xs text-zinc-500">{visible.length} of {cases.length} loaded cases. Filters apply to the latest 50 cases.</p>
    {visible.length ? <TriageResults state={{ kind: "cases", cases: visible, selectedCaseId }} onSelectCase={onSelectCase} /> :
      <div className="rounded-lg border border-dashed border-zinc-300 p-5 text-sm text-zinc-600">
        <p>No loaded cases match these filters.</p>
        <button type="button" className="mt-2 underline focus-visible:outline-2 focus-visible:outline-orange-600"
          onClick={() => setFilters({ query: "", outcome: "all", source: "all", order: "newest" })}>Clear filters</button>
      </div>}
    {selectedCaseId && !visible.some(item => item.case_id === selectedCaseId) ?
      <p className="text-xs text-amber-800">The selected case is hidden by these filters. Its investigation remains selected.</p> : null}
  </div>;
}

export function CommandCenterPanel({ state }: { state: CommandCenterState }) {
  if (state.kind === "loading") return <p role="status" className="mt-4 text-sm text-zinc-600">Loading timeline and evaluation…</p>;
  if (state.kind === "error") return <p role="status" className="mt-4 text-sm text-amber-800">Timeline and evaluation unavailable. Refresh saved status to retry.</p>;
  const { history, evaluation, trace } = state.data;
  return <div className="mt-6 space-y-5">
    <section aria-labelledby="timeline-heading" className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 id="timeline-heading" className="text-sm font-semibold text-zinc-900">Investigation timeline</h2>
      {history.data ? <>
        <p className="mt-1 text-xs text-zinc-600">Saved status: {label(history.data.currentStatus)} · sequence {history.data.currentSequence}</p>
        {history.data.truncated ? <p className="mt-2 text-xs text-amber-800">History is partial: showing at most 64 milestones from the last seven days.</p> : null}
        <ol className="mt-4 space-y-3 border-l-2 border-orange-200 pl-4">
          {history.data.events.map(event => <li key={event.sequence} className="text-sm text-zinc-800">
            <span className="font-medium capitalize">{label(event.status)}</span>
            <time dateTime={event.observedAt} className="mt-1 block font-mono text-xs text-zinc-500">{new Date(event.observedAt).toLocaleString()}</time>
          </li>)}
        </ol>
        {!history.data.events.length ? <p className="mt-3 text-sm text-zinc-600">No retained milestones are available.</p> : null}
      </> : <p role="status" className="mt-2 text-sm text-amber-800">Timeline unavailable. Diagnosis and decisions remain in the saved status panel.</p>}
      <div className="mt-4 border-t border-zinc-100 pt-3 text-xs text-zinc-600">
        {trace ? <>
          {trace.url ? <a href={trace.url} target="_blank" rel="noopener noreferrer" className="font-medium text-orange-700 underline">Open investigation trace ↗</a> : <span>Trace link unavailable.</span>}
          <p className="mt-1 break-all font-mono">Trace {trace.id}</p>
          <p className="mt-1">Export is best effort; a recorded trace ID does not confirm delivery to the trace service. Trace access requires project membership.</p>
        </> : <p>No trace was recorded for this saved investigation.</p>}
      </div>
    </section>
    {evaluation.data ? <EvaluationPanel report={evaluation.data} /> :
      <section aria-label="Evaluation" className="rounded-xl border border-zinc-200 bg-white p-5"><p role="status" className="text-sm text-amber-800">Evaluation unavailable. This does not change case policy or approval authority.</p></section>}
  </div>;
}

export function EvaluationPanel({ report }: { report: EvaluationSummary }) {
  const percent = (rate: number | null) => rate === null ? "Unmeasured" : `${(rate * 100).toFixed(1)}%`;
  return <section aria-labelledby="evaluation-heading" className="rounded-xl border border-zinc-200 bg-white p-5">
    <h2 id="evaluation-heading" className="text-sm font-semibold text-zinc-900">Offline evaluation baseline</h2>
    <p className="mt-2 text-xs text-zinc-600">{report.measurement} · {report.model}</p>
    <p className="mt-2 text-sm text-zinc-600">Fixture control, not a measurement of this case or real-model quality. Small samples; these results do not establish live replay eligibility.</p>
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-left text-xs">
        <caption className="sr-only">Diagnosis acceptance and retrieval recall, including denominators and targets</caption>
        <thead><tr className="border-b border-zinc-200 text-zinc-500"><th scope="col" className="py-2 pr-4">Split / metric</th><th scope="col" className="py-2 pr-4">Result</th><th scope="col" className="py-2">Target</th></tr></thead>
        <tbody>{Object.entries(report.splits).flatMap(([name, split]) => split ? ([
          ["Diagnosis acceptance", split.diagnosisAcceptance], ["Retrieval Recall@3", split.retrievalRecallAt3],
        ] as const).map(([title, metric]) => {
          return <tr key={`${name}:${title}`} className="border-b border-zinc-100"><th scope="row" className="py-3 pr-4 font-medium text-zinc-700">{label(name)} · {title}</th>
            <td className="py-3 pr-4 font-mono">{metric.numerator}/{metric.denominator} ({percent(metric.rate)})</td>
            <td className={`py-3 ${metric.met ? "text-emerald-800" : "text-amber-800"}`}>{percent(metric.target)} · {metric.met ? "Met" : "Shortfall"}</td></tr>;
        }) : [])}</tbody>
      </table>
    </div>
    <p className="mt-3 text-xs text-zinc-600">Evaluated safety violations: {report.safety.violations}. Contract checks {report.safety.complete && report.safety.passed ? "complete" : "incomplete or failed"}; they do not prove provider delivery safety.</p>
    <p className="mt-2 text-xs text-zinc-600">Real-model cost and latency remain unmeasured in this fixture control.</p>
    <details className="mt-3 text-xs text-zinc-500"><summary className="cursor-pointer">Baseline provenance</summary>
      <p className="mt-2">Report version {report.reportVersion} · dataset version {report.datasetVersion}</p><p className="mt-1 break-all font-mono">Dataset SHA-256 {report.datasetHash}</p>
    </details>
  </section>;
}
