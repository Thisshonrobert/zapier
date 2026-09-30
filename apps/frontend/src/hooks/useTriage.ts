"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { BACKEND_URL } from "@/config";
import { requestTriage } from "@/lib/triage-client";
import type {
  TriageCase,
  TriageDiagnosis,
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
    throw new Error("Sign in with a support operator account to use triage.");
  return requestTriage<T>({
    baseUrl: operatorBaseUrl,
    token,
    path,
    init,
    signal,
  });
}

const errorState = (error: unknown): TriageDisplayState => {
  if ((error as ApiError).status === 403) return { kind: "blocked" };
  return {
    kind: "error",
    message:
      error instanceof Error ? error.message : "Triage service unavailable.",
  };
};

export function useTriage() {
  const [casesState, setCasesState] = useState<TriageDisplayState>({
    kind: "loading",
  });
  const [diagnosisState, setDiagnosisState] = useState<TriageDisplayState>({
    kind: "idle",
  });
  const [selectedCase, setSelectedCase] = useState<TriageCase | null>(null);
  const diagnosisController = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    operatorRequest<{ cases: TriageCase[] }>(
      "/cases?limit=50",
      { method: "GET" },
      controller.signal,
    )
      .then(({ cases }) => {
        if (cases.length === 0) setCasesState({ kind: "empty" });
        else setCasesState({ kind: "cases", cases });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setCasesState(errorState(error));
      });
    return () => controller.abort();
  }, []);

  useEffect(() => () => diagnosisController.current?.abort(), []);

  const selectCase = useCallback((caseItem: TriageCase) => {
    diagnosisController.current?.abort();
    setSelectedCase(caseItem);
    setDiagnosisState({ kind: "idle" });
  }, []);

  const diagnose = useCallback(async () => {
    if (!selectedCase) return;
    diagnosisController.current?.abort();
    const controller = new AbortController();
    diagnosisController.current = controller;
    setDiagnosisState({ kind: "loading" });
    try {
      const result = await operatorRequest<TriageDiagnosis>(
        `/cases/${encodeURIComponent(selectedCase.case_id)}/investigations/diagnose`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        },
        controller.signal,
      );
      if (!controller.signal.aborted) {
        setDiagnosisState({
          kind: "result",
          caseId: selectedCase.case_id,
          result,
        });
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      setDiagnosisState(errorState(error));
    }
  }, [selectedCase]);

  return { casesState, diagnosisState, selectedCase, selectCase, diagnose };
}
