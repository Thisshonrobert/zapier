"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/mycomponents/app/AppShell";
import { LoaderOne } from "@/components/ui/loader";
import { ZapFlow, ZapMonogram, stepsOf } from "@/mycomponents/app/AppFlow";
import { useZap } from "@/hooks/useZaps";

export default function ZapDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { loading, zap } = useZap(id);
  const router = useRouter();

  if (loading) {
    return (
      <AppShell>
        <div className="grid place-items-center py-24">
          <LoaderOne />
        </div>
      </AppShell>
    );
  }

  if (!zap) {
    return (
      <AppShell>
        <div className="mx-auto w-full max-w-4xl px-6 py-16 text-center">
          <p className="text-zinc-600">
            This Zap doesn&apos;t exist, or isn&apos;t yours.
          </p>
        </div>
      </AppShell>
    );
  }

  const steps = stepsOf(zap);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl px-6 py-10">
        <button
          onClick={() => router.push("/dashboard")}
          className="mb-6 flex items-center gap-1.5 text-sm text-zinc-600 transition hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Zaps
        </button>

        <div className="mb-8 flex items-center gap-3">
          <ZapMonogram name={zap.name} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              {zap.name}
            </h1>
            <p className="text-sm text-zinc-500">
              Published {new Date(zap.time).toLocaleDateString()} · read only
            </p>
          </div>
        </div>

        <section className="mb-8 rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-zinc-700">Workflow</h2>
          <ZapFlow steps={steps} max={10} />
          <ol className="mt-6 space-y-3">
            {steps.map((step, i) => (
              <li
                key={`${step.id}-${i}`}
                className="flex items-center gap-3 text-sm"
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-zinc-100 text-xs font-semibold text-zinc-600">
                  {i + 1}
                </span>
                <span className="font-medium text-zinc-900">{step.name}</span>
                <span className="text-xs text-zinc-500">
                  {i === 0 ? "Trigger" : "Action"}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-zinc-700">
            Runs ({zap.runs.length})
          </h2>
          {zap.runs.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No runs yet. Send a payload to this Zap&apos;s webhook to see one
              here.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {zap.runs.map((run) => (
                <li
                  key={run.id}
                  className="flex items-start justify-between gap-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-zinc-500">
                      {run.id}
                    </div>
                    <pre className="mt-1 max-w-md overflow-x-auto rounded bg-zinc-50 p-2 text-xs text-zinc-700">
                      {JSON.stringify(run.metadata, null, 2)}
                    </pre>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {run.failures > 0 && (
                      <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-red-200">
                        {run.failures} failed
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ring-1 ${
                        run.status === "success"
                          ? "bg-green-50 text-green-700 ring-green-200"
                          : "bg-amber-50 text-amber-700 ring-amber-200"
                      }`}
                    >
                      {run.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
