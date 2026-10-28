"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { BACKEND_URL } from "@/config";
import { readReplayCapabilities, requestTriage, submitReplayAction } from "@/lib/triage-client";
import { useInvestigationStream } from "./useInvestigationStream";
import type {
  ReplayCapabilities,
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

// A fresh dry run is required between approval and dispatch. The permit lives in session
// storage per approval, so a reload cannot turn an unvalidated approval into a request.
const reviewKey = (approvalId: string) => `triage:replay-reviewed:${approvalId}`;

export const markReplayReviewed = (approvalId: string) => {
  try { window.sessionStorage.setItem(reviewKey(approvalId), "1"); } catch { /* private mode */ }
};

export const hasReplayReview = (approvalId: string) => {
  try { return window.sessionStorage.getItem(reviewKey(approvalId)) === "1"; } catch { return false; }
};

export const clearReplayReview = (approvalId: string) => {
  try { window.sessionStorage.removeItem(reviewKey(approvalId)); } catch { /* private mode */ }
};

const replayStateText = (value: { status?: string; reasons?: string[]; notBefore?: string | null }) =>
  value.status === "requires_approval"
    ? `Dry run confirmed eligibility after ${value.notBefore ?? "the recorded cooldown"}.`
    : `Dry run blocked: ${(value.reasons ?? ["unknown"]).join(", ")}.`;

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
  const [capabilities, setCapabilities] = useState<ReplayCapabilities | null>(null);
  const [pendingDecision, setPendingDecision] = useState(false);
  const [replayAction, setReplayAction] = useState<{ kind: "dry-run" | "request"; pending: boolean; message: string } | null>(null);
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

  // Server-reported capability: the console states what the deployment permits instead of
  // printing a fixed disabled paragraph. A failed read is reported as unavailable, not as
  // an implicit denial or an implicit grant.
  useEffect(() => {
    const controller = new AbortController();
    const token = window.localStorage.getItem("token");
    if (!token) return () => controller.abort();
    readReplayCapabilities({ baseUrl: `${BACKEND_URL}/api/v1/triage`, token, signal: controller.signal })
      .then(setCapabilities)
      .catch(() => setCapabilities(null));
    return () => controller.abort();
  }, []);

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

  // Explicit operator actions: a fresh dry run against the committed approval and then the
  // request itself. Neither action approves anything and neither publishes to Kafka
  // directly; the backend records the intent and its dispatcher publishes it.
  const replayStep = useCallback(async (kind: "dry-run" | "request") => {
    const authority = saved?.authority;
    if (!selectedCase || !saved || !authority?.decision || busy.current) return;
    if (Date.parse(authority.expiresAt) <= Date.now()) {
      setReplayAction({ kind, pending: false, message: "Proposal expired. Start a new investigation." }); return;
    }
    if (kind === "request" && !hasReplayReview(authority.decision.id)) {
      setReplayAction({ kind, pending: false, message: "Run the dry run review before requesting replay." }); return;
    }
    busy.current = true;
    setReplayAction({ kind, pending: true, message: kind === "dry-run" ? "Running dry run review…" : "Requesting replay…" });
    const controller = new AbortController();
    diagnosisController.current = controller;
    const token = window.localStorage.getItem("token");
    try {
      if (!token) throw Object.assign(new Error("Sign in again to continue."), { status: 401 });
      const idempotencyKey = kind === "request"
        ? (window.sessionStorage.getItem(`triage:replay-request:${authority.decision.id}`) ?? crypto.randomUUID())
        : undefined;
      if (idempotencyKey) window.sessionStorage.setItem(`triage:replay-request:${authority.decision.id}`, idempotencyKey);
      const result = await submitReplayAction({ baseUrl: operatorBaseUrl, token, caseId: selectedCase.case_id,
        action: kind === "request" ? "requests" : "dry-run", approvalId: authority.decision.id, proposalVersion: authority.version,
        idempotencyKey, signal: controller.signal });
      if (controller.signal.aborted) return;
      if (kind === "dry-run") {
        markReplayReviewed(authority.decision.id);
        setReplayAction({ kind, pending: false, message: replayStateText(result) });
      } else {
        clearReplayReview(authority.decision.id);
        window.sessionStorage.removeItem(`triage:replay-request:${authority.decision.id}`);
        setReplayAction({ kind, pending: false, message: `Replay request recorded: ${result.id}. Publication and execution are reported separately below.` });
      }
      busy.current = false;
      void readSaved(selectedCase.case_id, saved.id);
    } catch (error) {
      if (controller.signal.aborted) return;
      setReplayAction({ kind, pending: false, message: error instanceof Error ? error.message : "Replay action unavailable." });
    } finally {
      if (diagnosisController.current === controller && !controller.signal.aborted) busy.current = false;
    }
  }, [selectedCase, saved, readSaved]);

  const dryRunReplay = useCallback(() => replayStep("dry-run"), [replayStep]);
  const requestReplay = useCallback(() => replayStep("request"), [replayStep]);

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
    saved, pendingDecision, polling, decide, refresh, capabilities, replayAction,
    dryRunReplay, requestReplay };
}
