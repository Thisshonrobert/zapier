import type { TriageCase } from "../types/triage";
import type { CommandCenter } from "../../../../packages/triage-contracts/command-center";

export type CommandCenterState = { kind: "loading" } | { kind: "error" } |
  { kind: "ready"; data: CommandCenter };
export type CaseFilters = { query: string; outcome: string; source: string; order: "newest" | "oldest" };

export function filterCases(cases: TriageCase[], filters: CaseFilters) {
  const query = filters.query.trim().toLowerCase();
  return cases.filter(item =>
    (filters.outcome === "all" || (item.provider_outcome ?? "unavailable") === filters.outcome) &&
    (filters.source === "all" || item.source === filters.source) &&
    (!query || [item.case_id, item.zap_run_id, item.safe_code ?? "", String(item.subject_owner_id)]
      .some(value => value.toLowerCase().includes(query))))
    .sort((a, b) => (Date.parse(a.observed_at) - Date.parse(b.observed_at) || a.case_id.localeCompare(b.case_id)) *
      (filters.order === "oldest" ? 1 : -1));
}
