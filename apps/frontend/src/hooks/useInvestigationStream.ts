"use client";

import { useCallback } from "react";
import { pollInvestigation } from "@/lib/triage-client";
import { watchInvestigation } from "@/lib/triage-stream";
import type { SavedInvestigation } from "@/types/triage";

export function useInvestigationStream(baseUrl: string) {
  return useCallback(async (input: {
    path: string; signal: AbortSignal; read: () => Promise<SavedInvestigation>;
    onSnapshot: (snapshot: SavedInvestigation) => void;
  }) => {
    const refresh = async () => {
      input.signal.throwIfAborted();
      const snapshot = await input.read();
      input.signal.throwIfAborted();
      input.onSnapshot(snapshot);
      return snapshot.status === "error" || !!(snapshot.authority?.replay &&
        ["SUCCESS", "FAILED", "UNKNOWN"].includes(snapshot.authority.replay.execution));
    };
    if (await refresh()) return;
    try {
      await watchInvestigation({ baseUrl, path: `${input.path}/events`, signal: input.signal,
        token: () => window.localStorage.getItem("token"), onRefresh: refresh });
    } catch (error) {
      input.signal.throwIfAborted();
      if ([401, 403, 404, 409].includes((error as { status?: number }).status ?? 0)) throw error;
      await pollInvestigation(input);
    }
  }, [baseUrl]);
}
