"use client";

import { useCallback, useEffect, useState } from "react";
import { Wrench } from "lucide-react";

import { AppShell } from "@/mycomponents/app/AppShell";
import { useViewerCapabilities } from "@/hooks/useViewerCapabilities";
import { listEngineeringCases } from "@/lib/engineering-client";
import { EngineeringCaseList, type EngineeringListState } from "./EngineeringCaseList";
import { EngineeringWorkspace } from "./EngineeringWorkspace";

export default function EngineeringPage() {
  const capabilities = useViewerCapabilities();
  const [state, setState] = useState<EngineeringListState>({ kind: "loading" });
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listEngineeringCases()
      .then((cases) => {
        if (!active) return;
        setState({ kind: "ready", cases });
        setSelectedCaseId((current) =>
          current && cases.some((item) => item.case_id === current)
            ? current
            : (cases[0]?.case_id ?? null),
        );
      })
      .catch((error: unknown) => {
        if (!active) return;
        const status = (error as { status?: number }).status;
        if (status === 403) {
          setState({
            kind: "denied",
            message: "This workspace needs an engineering role. Ask an administrator to grant access.",
          });
          return;
        }
        setState({
          kind: "error",
          message: error instanceof Error ? error.message : "Could not load the engineering queue.",
        });
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  // A case that left the queue (returned to support or resolved) must not stay selected:
  // re-read the queue and drop the stale selection.
  const onRouted = useCallback(() => {
    setNotice("Findings recorded. The queue was refreshed so only open escalations remain.");
    reload();
  }, [reload]);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <header className="mb-8">
          <div className="flex items-center gap-2 text-sm font-medium text-[#FF4F00]">
            <Wrench className="h-4 w-4" /> Engineering
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
            Escalated cases
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600">
            Cases a support operator explicitly routed to engineering, with their handoff
            history. You can record findings and return a case to support; replay stays with
            support operators.
          </p>
        </header>

        {notice ? (
          <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            {notice}
          </p>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-zinc-900">Engineering queue</h2>
              <button
                onClick={reload}
                className="text-xs font-medium text-zinc-500 transition hover:text-zinc-800"
              >
                Refresh
              </button>
            </div>
            <EngineeringCaseList
              state={state}
              selectedCaseId={selectedCaseId ?? undefined}
              onSelect={setSelectedCaseId}
            />
          </section>

          <section>
            {selectedCaseId && state.kind === "ready" ? (
              <EngineeringWorkspace
                key={selectedCaseId}
                caseId={selectedCaseId}
                capabilities={capabilities}
                onRouted={onRouted}
                onUnauthorized={() => {
                  setSelectedCaseId(null);
                  reload();
                }}
              />
            ) : (
              <div className="grid place-items-center rounded-xl border border-dashed border-zinc-200 bg-white py-20 px-6 text-center text-sm text-zinc-500">
                {state.kind === "denied"
                  ? "Engineering access is required to inspect escalated cases."
                  : "Select an escalated case to inspect it."}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
