"use client";

import { useCallback, useEffect, useState } from "react";

import {
  EVIDENCE_SCOPES,
  SupportEvidenceError,
  readSupportEvidence,
  sameOriginFetch,
  type EvidenceFetch,
  type EvidenceScope,
  type SupportEvidence,
} from "@/lib/support-evidence";

/**
 * Case-scoped evidence reads for the support workbench. One hook owns the three existing
 * reads, so the evidence room's tabs share one request round and one honest error state
 * instead of three panels disagreeing about whether the service is up.
 *
 * The state is keyed by the read it belongs to. That keeps the loading state a derived value
 * rather than a synchronous write inside the effect, so switching cases never briefly shows
 * the previous case's evidence and never triggers a cascading render.
 */
export type SupportEvidenceState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "denied"; message: string }
  | { kind: "ready"; evidence: SupportEvidence };

type StoredState = {
  caseId: string;
  reloadKey: number;
  value: Exclude<SupportEvidenceState, { kind: "idle" }>;
};

export function useSupportEvidence(
  caseId: string | null,
  enabled: boolean,
  options: { scope?: EvidenceScope; fetchImpl?: EvidenceFetch } = {},
) {
  const [stored, setStored] = useState<StoredState | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const scope = options.scope ?? EVIDENCE_SCOPES.operator;
  const fetchImpl = options.fetchImpl ?? sameOriginFetch;

  useEffect(() => {
    if (!enabled || !caseId) return;
    const controller = new AbortController();
    readSupportEvidence(caseId, controller.signal, fetchImpl, scope)
      .then((evidence) => {
        if (!controller.signal.aborted) setStored({ caseId, reloadKey, value: { kind: "ready", evidence } });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        // Authorization is not a transient failure: the room says access is gone rather than
        // offering a retry that can never succeed.
        const value = error instanceof SupportEvidenceError && (error.status === 401 || error.status === 403)
          ? { kind: "denied" as const, message: error.message }
          : { kind: "denied" as const, message: "Evidence reads are unavailable right now." };
        setStored({ caseId, reloadKey, value });
      });
    return () => controller.abort();
  }, [caseId, enabled, reloadKey, scope, fetchImpl]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  if (!enabled || !caseId) return { state: { kind: "idle" } as const, reload };
  const current = stored?.caseId === caseId && stored.reloadKey === reloadKey ? stored.value : null;
  return { state: current ?? ({ kind: "loading" } as const), reload };
}
