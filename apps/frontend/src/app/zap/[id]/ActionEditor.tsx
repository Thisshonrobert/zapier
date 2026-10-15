"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Save } from "lucide-react";

import { Field, btnPrimary, btnSecondary } from "@/mycomponents/app/FormKit";
import { OwnerRepairError, readOwnRepairCase, saveActionRepair } from "@/lib/owner-client";
import {
  changedRepairFields,
  draftFromRepairCase,
  editDraftField,
  fieldLabels,
  missingRequiredFields,
  type OwnerRepairCase,
  type OwnerRepairDraft,
} from "@/types/owner";

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition placeholder:text-zinc-400 focus:border-[#FF4F00] focus:outline-none focus:ring-2 focus:ring-[#FF4F00]/20";

type State =
  | { kind: "loading" }
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | { kind: "ready"; view: OwnerRepairCase; draft: OwnerRepairDraft };

/**
 * Real editor for one action step of a Zap. It is scoped to a repair case, so a
 * save goes through the same bounded, owner-authorized, stale-checked endpoint as
 * the failures page instead of a general-purpose Zap update.
 */
export function ActionEditor({ zapId, caseId }: { zapId: string; caseId?: string }) {
  const [state, setState] = useState<State>(caseId ? { kind: "loading" } : { kind: "idle" });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "warn" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!caseId) {
      setState({ kind: "idle" });
      return;
    }
    let active = true;
    readOwnRepairCase(caseId)
      .then((view) => {
        if (!active) return;
        if (view.zap.id !== zapId) {
          setState({ kind: "error", message: "This repair belongs to a different Zap." });
          return;
        }
        setState({ kind: "ready", view, draft: draftFromRepairCase(view) });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          kind: "error",
          message: error instanceof OwnerRepairError ? error.message : "Could not load the repair.",
        });
      });
    return () => {
      active = false;
    };
  }, [caseId, zapId]);

  if (!caseId && state.kind === "idle") {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-zinc-700">Edit this Zap</h2>
        <p className="mt-2 text-sm text-zinc-600">
          This Zap is read-only here. Open a failure from{" "}
          <Link href="/failures" className="font-medium text-[#FF4F00] underline-offset-2 hover:underline">
            Your failures
          </Link>{" "}
          to repair the exact step that broke.
        </p>
        <Link className={`${btnSecondary} mt-4`} href="/failures">
          Go to your failures
        </Link>
      </section>
    );
  }

  if (state.kind === "loading") {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <p className="text-sm text-zinc-500">Loading the repair for this Zap…</p>
      </section>
    );
  }

  if (state.kind === "error") {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <span className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {state.message}
        </span>
      </section>
    );
  }

  if (state.kind !== "ready") return null;

  const { view, draft } = state;
  const edits = changedRepairFields(draft);
  const missing = missingRequiredFields(draft);
  const canSave = Boolean(view.action && view.workflow.awaitingOwnerRepair && edits.length > 0 && missing.length === 0);

  async function save() {
    if (!view.action || !draft.actionId || !draft.actionToken) return;
    setSaving(true);
    setNotice(null);
    try {
      const result = await saveActionRepair({
        caseId: view.caseId,
        actionId: draft.actionId,
        actionToken: draft.actionToken,
        fields: edits,
      });
      setNotice({
        tone: "ok",
        message: result.changedFields.length
          ? `Saved ${result.changedFields.map((field) => fieldLabels[field] ?? field).join(", ")}.`
          : "Nothing needed saving.",
      });
      const refreshed = await readOwnRepairCase(view.caseId);
      setState({ kind: "ready", view: refreshed, draft: draftFromRepairCase(refreshed) });
    } catch (error: unknown) {
      const stale = error instanceof OwnerRepairError && error.status === 409;
      setNotice({
        tone: stale ? "warn" : "error",
        message: stale
          ? "This step changed since you opened it. Reloading the latest version."
          : error instanceof OwnerRepairError
            ? error.message
            : "Saving failed. Try again.",
      });
      if (stale) {
        try {
          const refreshed = await readOwnRepairCase(view.caseId);
          setState({ kind: "ready", view: refreshed, draft: draftFromRepairCase(refreshed) });
        } catch {
          /* keep the previous view; the notice already explains what happened */
        }
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-700">Repair {view.stepLabel}</h2>
          <p className="mt-1 text-xs text-zinc-500">
            {view.workflow.awaitingOwnerRepair
              ? "Changes apply to future runs of this Zap."
              : "This case is no longer awaiting a repair."}
          </p>
        </div>
      </div>

      {notice ? (
        <div
          className={`mt-4 rounded-lg border p-3 text-sm ${
            notice.tone === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : notice.tone === "warn"
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <span className="flex items-start gap-2">
            {notice.tone === "ok" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : null}
            {notice.message}
          </span>
        </div>
      ) : null}

      {draft.fields.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-600">
          This step type cannot be edited here yet. Support can see the same limitation.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {draft.fields
            .filter((field) => !field.sensitive)
            .map((field) => (
              <Field
                key={field.field}
                label={fieldLabels[field.field] ?? field.field}
                hint={field.required ? "Required" : "Optional"}
              >
                <textarea
                  rows={field.field === "body" || field.field === "message" ? 4 : 1}
                  className={inputClass}
                  value={draft.values[field.field] ?? ""}
                  onChange={(event) =>
                    setState((current) =>
                      current.kind === "ready"
                        ? { ...current, draft: editDraftField(current.draft, field.field, event.target.value) }
                        : current,
                    )
                  }
                />
              </Field>
            ))}

          {missing.length > 0 ? (
            <p className="text-xs text-amber-700">
              Fill in {missing.map((field) => fieldLabels[field] ?? field).join(", ")} before saving.
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button className={btnPrimary} disabled={!canSave || saving} onClick={() => void save()}>
              <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
            </button>
            <span className="text-xs text-zinc-500">
              {edits.length > 0
                ? `${edits.length} unsaved change${edits.length === 1 ? "" : "s"}`
                : "No unsaved changes"}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
