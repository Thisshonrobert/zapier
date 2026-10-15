"use client";

import { useCallback, useEffect, useState } from "react";
import { LifeBuoy } from "lucide-react";

import { AppShell } from "@/mycomponents/app/AppShell";
import { OwnerRepairError, listOwnFailures } from "@/lib/owner-client";
import type { OwnerFailureSummary } from "@/types/owner";
import { OwnerFailureList } from "./OwnerFailureList";
import { RepairPanel } from "./RepairPanel";

type ListState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; failures: OwnerFailureSummary[] };

export default function FailuresPage() {
  const [state, setState] = useState<ListState>({ kind: "loading" });
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    listOwnFailures()
      .then((failures) => {
        if (!active) return;
        setState({ kind: "ready", failures });
        setSelectedCaseId((current) =>
          current && failures.some((failure) => failure.caseId === current)
            ? current
            : (failures[0]?.caseId ?? null),
        );
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          kind: "error",
          message: error instanceof OwnerRepairError ? error.message : "Could not load your failures.",
        });
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <header className="mb-8">
          <div className="flex items-center gap-2 text-sm font-medium text-[#FF4F00]">
            <LifeBuoy className="h-4 w-4" /> Your failures
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
            Fix what broke
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600">
            Every failure of your own Zaps, with the step to repair. Edits change how the Zap
            runs from now on; the original failure and its evidence are never rewritten.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-zinc-900">Failures</h2>
              <button
                onClick={reload}
                className="text-xs font-medium text-zinc-500 transition hover:text-zinc-800"
              >
                Refresh
              </button>
            </div>
            <OwnerFailureList
              state={state}
              selectedCaseId={selectedCaseId ?? undefined}
              onSelect={setSelectedCaseId}
            />
          </section>

          <section>
            {selectedCaseId ? (
              <RepairPanel caseId={selectedCaseId} onChanged={reload} />
            ) : (
              <div className="grid place-items-center rounded-xl border border-dashed border-zinc-200 bg-white py-20 text-sm text-zinc-500">
                Select a failure to see what needs fixing.
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
