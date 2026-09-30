"use client";

import { Play, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTriage } from "@/hooks/useTriage";
import { AppShell } from "@/mycomponents/app/AppShell";
import { TriageResults } from "./TriageResults";

export default function TriagePage() {
  const { casesState, diagnosisState, selectedCase, selectCase, diagnose } =
    useTriage();
  const caseListState =
    casesState.kind === "cases"
      ? { ...casesState, selectedCaseId: selectedCase?.case_id }
      : casesState;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-[#FF4F00]">
              <ShieldCheck className="h-4 w-4" /> Support console
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
              Workflow triage
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-600">
              Review a bounded set of failed cases. Investigation is read-only
              and its diagnosis is not saved.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-zinc-900">
              Recent cases
            </h2>
            <TriageResults state={caseListState} onSelectCase={selectCase} />
          </section>
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-zinc-900">
                Investigation
              </h2>
              <Button
                className="bg-[#FF4F00] text-white hover:bg-[#e64700]"
                disabled={!selectedCase || diagnosisState.kind === "loading"}
                onClick={diagnose}
              >
                <Play className="h-4 w-4" /> Investigate
              </Button>
            </div>
            {selectedCase ? (
              <p className="mb-3 font-mono text-xs text-zinc-500">
                Case {selectedCase.case_id} · subject owner binding is resolved
                by the backend.
              </p>
            ) : null}
            <TriageResults state={diagnosisState} onSelectCase={selectCase} />
          </section>
        </div>
      </div>
    </AppShell>
  );
}
