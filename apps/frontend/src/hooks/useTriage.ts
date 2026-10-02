"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { BACKEND_URL } from "@/config";
import { requestTriage } from "@/lib/triage-client";
import { useInvestigationStream } from "./useInvestigationStream";
import type {
  TriageCase,
  SavedInvestigation,
  TriageDecision,
  TriageDisplayState,
} from "@/types/triage";

const operatorBaseUrl = `${BACKEND_URL}/api/v1/triage/operator`;

type ApiError = Error & { status?: number };

async function operatorRequest<T>(
  path: string,
  init: RequestInit,
  signal: AbortSignal,
) {
  const token = window.localStorage.getItem("token");
  if (!token)
    throw Object.assign(new Error("Sign in with a support operator account to use triage."), { status: 401 });
  return requestTriage<T>({
    baseUrl: operatorBaseUrl,
    token,
    path,
    init,
    signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
  });
}

const errorState = (error: unknown): TriageDisplayState => {
  if ([401, 403].includes((error as ApiError).status ?? 0)) return { kind: "blocked" };
  return {
    kind: "error",
    message:
      error instanceof Error ? error.message : "Triage service unavailable.",
  };
};

export function useTriage() {
  const watchSaved = useInvestigationStream(operatorBaseUrl);
  const [casesState, setCasesState] = useState<TriageDisplayState>({
    kind: "loading",
  });
  const [diagnosisState, setDiagnosisState] = useState<TriageDisplayState>({
    kind: "idle",
  });
  const [selectedCase, setSelectedCase] = useState<TriageCase | null>(null);
  const [saved, setSaved] = useState<SavedInvestigation | null>(null);
  const [pendingDecision, setPendingDecision] = useState(false);
  const [polling, setPolling] = useState(false);
  const diagnosisController = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const investigationId = useRef<string | null>(null);
  const selectionGeneration = useRef(0);

  const readSaved = useCallback(async (caseId: string, id: string) => {
    diagnosisController.current?.abort();
    const controller = new AbortController();
    diagnosisController.current = controller;
    investigationId.current = id;
    setSaved(null);
    setDiagnosisState({ kind: "loading" });
    setPolling(true);
    try {
      await watchSaved({ signal: controller.signal,
        path: `/cases/${encodeURIComponent(caseId)}/investigations/${encodeURIComponent(id)}`,
        read: () => operatorRequest<SavedInvestigation>(
          `/cases/${encodeURIComponent(caseId)}/investigations/${encodeURIComponent(id)}`,
          { method: "GET" }, controller.signal),
        onSnapshot: (snapshot) => {
          setSaved(snapshot);
          setDiagnosisState(snapshot.result ? { kind: "result", caseId, result: snapshot.result }
            : snapshot.status === "error" ? { kind: "error", message: "Saved investigation failed. Start a new investigation." }
            : { kind: "loading" });
        },
      });
    } catch (error) {
      if (!controller.signal.aborted) {
        setSaved(null); setDiagnosisState(errorState(error));
        if (errorState(error).kind === "blocked") setCasesState({ kind: "blocked" });
      }
    } finally {
      if (!controller.signal.aborted) setPolling(false);
    }
  }, [watchSaved]);

  useEffect(() => {
    const controller = new AbortController();
    const generation = selectionGeneration.current;
    operatorRequest<{ cases: TriageCase[] }>(
      "/cases?limit=50",
      { method: "GET" },
      controller.signal,
    )
      .then(async ({ cases }) => {
        if (controller.signal.aborted) return;
        if (cases.length === 0) setCasesState({ kind: "empty" });
        else setCasesState({ kind: "cases", cases });
        const params = new URLSearchParams(window.location.search);
        const caseId = params.get("case");
        const id = params.get("investigation");
        if (caseId && /^[0-9a-f-]{36}$/i.test(caseId)) {
          const restored = cases.find((item) => item.case_id === caseId) ??
            await operatorRequest<TriageCase>(`/cases/${encodeURIComponent(caseId)}`, { method: "GET" }, controller.signal);
          if (controller.signal.aborted || selectionGeneration.current !== generation) return;
          setSelectedCase(restored);
          if (!cases.some((item) => item.case_id === caseId))
            setCasesState({ kind: "cases", cases: [restored, ...cases].slice(0, 50) });
          if (id && /^[0-9a-f-]{36}$/i.test(id)) void readSaved(restored.case_id, id);
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || selectionGeneration.current !== generation) return;
        setCasesState(errorState(error));
      });
    return () => controller.abort();
  }, [readSaved]);

  useEffect(() => () => diagnosisController.current?.abort(), []);

  const selectCase = useCallback((caseItem: TriageCase) => {
    selectionGeneration.current++;
    diagnosisController.current?.abort();
    investigationId.current = null;
    setSaved(null);
    setPolling(false);
    setPendingDecision(false);
    busy.current = false;
    const url = new URL(window.location.href);
    url.searchParams.set("case", caseItem.case_id);
    url.searchParams.delete("investigation");
    window.history.replaceState(null, "", url);
    setSelectedCase(caseItem);
    setDiagnosisState({ kind: "idle" });
  }, []);

  const diagnose = useCallback(async () => {
    if (!selectedCase || busy.current || casesState.kind === "blocked") return;
    busy.current = true;
    diagnosisController.current?.abort();
    const controller = new AbortController();
    diagnosisController.current = controller;
    setDiagnosisState({ kind: "loading" });
    setSaved(null);
    try {
      const keyName = `triage:start:${selectedCase.case_id}`;
      const key = window.sessionStorage.getItem(keyName) ?? crypto.randomUUID();
      window.sessionStorage.setItem(keyName, key);
      const result = await operatorRequest<{ id: string }>(
        `/cases/${encodeURIComponent(selectedCase.case_id)}/investigations`,
        {
          method: "POST",
          headers: { "content-type": "application/json", "idempotency-key": key },
          body: "{}",
        },
        controller.signal,
      );
      if (!controller.signal.aborted) {
        window.sessionStorage.removeItem(keyName);
        const url = new URL(window.location.href);
        url.searchParams.set("case", selectedCase.case_id);
        url.searchParams.set("investigation", result.id);
        window.history.replaceState(null, "", url);
        busy.current = false;
        void readSaved(selectedCase.case_id, result.id);
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      setDiagnosisState(errorState(error));
      if (errorState(error).kind === "blocked") setCasesState({ kind: "blocked" });
    } finally {
      if (diagnosisController.current === controller && !controller.signal.aborted) busy.current = false;
    }
  }, [selectedCase, readSaved, casesState.kind]);

  const refresh = useCallback(() => {
    if (selectedCase && investigationId.current && !busy.current)
      void readSaved(selectedCase.case_id, investigationId.current);
  }, [selectedCase, readSaved]);

  const decide = useCallback(async (decision: TriageDecision) => {
    const proposal = saved?.authority;
    if (!selectedCase || !saved || !proposal || busy.current || proposal.decision ||
      Date.parse(proposal.expiresAt) <= Date.now() || !proposal.allowedDecisions.includes(decision)) return;
    busy.current = true;
    setPendingDecision(true);
    diagnosisController.current?.abort();
    setPolling(false);
    const controller = new AbortController();
    diagnosisController.current = controller;
    try {
      const keyName = `triage:decision:${saved.id}:${proposal.id}:${decision}`;
      const key = window.sessionStorage.getItem(keyName) ?? crypto.randomUUID();
      window.sessionStorage.setItem(keyName, key);
      await operatorRequest(`/cases/${encodeURIComponent(selectedCase.case_id)}/investigations/${saved.id}/decision`, {
        method: "POST", headers: { "content-type": "application/json", "idempotency-key": key },
        body: JSON.stringify({ proposalId: proposal.id, proposalVersion: proposal.version, decision }),
      }, controller.signal);
      if (!controller.signal.aborted) {
        busy.current = false;
        setPendingDecision(false);
        void readSaved(selectedCase.case_id, saved.id);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setSaved(null); setDiagnosisState(errorState(error));
        if (errorState(error).kind === "blocked") setCasesState({ kind: "blocked" });
      }
    } finally {
      if (diagnosisController.current === controller && !controller.signal.aborted) {
        busy.current = false;
        setPendingDecision(false);
      }
    }
  }, [selectedCase, saved, readSaved]);

  return { casesState, diagnosisState, selectedCase, selectCase, diagnose,
    saved, pendingDecision, polling, decide, refresh };
}
