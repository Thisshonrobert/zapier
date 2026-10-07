"use client";

import { useEffect, useState } from "react";
import { BACKEND_URL } from "@/config";
import { requestTriage } from "@/lib/triage-client";
import type { CommandCenterState } from "@/lib/triage-command-center";
import type { SavedInvestigation } from "@/types/triage";
import type { CommandCenter } from "../../../../packages/triage-contracts/command-center";

export function useCommandCenter(caseId: string | undefined, saved: SavedInvestigation | null) {
  const key = caseId && saved ? `${caseId}:${saved.id}:${saved.status}:${saved.authority?.version ?? 0}:${saved.authority?.decision?.id ?? ""}:${saved.authority?.replay?.publication ?? ""}:${saved.authority?.replay?.execution ?? ""}` : null;
  const id = saved?.id;
  const [state, setState] = useState<{ key: string; value: CommandCenterState } | null>(null);
  useEffect(() => {
    if (!key || !caseId || !id) return;
    const controller = new AbortController();
    const token = window.localStorage.getItem("token");
    const load = async () => {
      try {
        if (!token) throw new Error("Sign in required");
        const data = await requestTriage<CommandCenter>({ baseUrl: `${BACKEND_URL}/api/v1/triage/operator`, token,
          path: `/cases/${encodeURIComponent(caseId)}/investigations/${encodeURIComponent(id)}/command-center`,
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]) });
        if (data.investigationId !== id) throw new Error("Investigation mismatch");
        if (!controller.signal.aborted) setState({ key, value: { kind: "ready", data } });
      } catch {
        if (!controller.signal.aborted) setState({ key, value: { kind: "error" } });
      }
    };
    void load();
    return () => controller.abort();
    // The key includes every displayed status transition; polling identical snapshots does not refetch panels.
  }, [key, caseId, id]);
  return key ? state?.key === key ? state.value : { kind: "loading" } as const : null;
}
