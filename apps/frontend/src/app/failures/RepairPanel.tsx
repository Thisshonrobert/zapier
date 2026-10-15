"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ExternalLink, Wrench } from "lucide-react";

import { LoaderOne } from "@/components/ui/loader";
import { Field, Section, btnPrimary, btnSecondary } from "@/mycomponents/app/FormKit";
import { OwnerRepairError, readOwnRepairCase, saveActionRepair, submitRepairCompletion } from "@/lib/owner-client";
import {
  canSaveRepair,
  changedRepairFields,
  draftFromRepairCase,
  editDraftField,
  fieldLabels,
  missingRequiredFields,
  repairStatusCopy,
  type OwnerRepairCase,
  type OwnerRepairDraft,
} from "@/types/owner";
import { StatusChip } from "./OwnerFailureList";

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition placeholder:text-zinc-400 focus:border-[#FF4F00] focus:outline-none focus:ring-2 focus:ring-[#FF4F00]/20";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; view: OwnerRepairCase };

export function RepairPanel({ caseId, onChanged }: { caseId: string; onChanged?: () => void }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [draft, setDraft] = useState<OwnerRepairDraft | null>(null);
  const [repairNote, setRepairNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<
    { tone: "ok" | "warn" | "error"; message: string } | null
  >(null);

  useEffect(() => {
    let active = true;
    readOwnRepairCase(caseId)
      .then((view) => {
        if (!active) return;
        setState({ kind: "ready", view });
        setDraft(draftFromRepairCase(view));
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          kind: "error",
          message: error instanceof OwnerRepairError ? error.message : "Could not load this failure.",
        });
      });
    return () => {
      active = false;
    };
  }, [caseId]);

  async function save(view: OwnerRepairCase, current: OwnerRepairDraft) {
    if (!current.actionId || !current.actionToken) return;
    setSaving(true);
    setNotice(null);
    try {
      const result = await saveActionRepair({
        caseId: view.caseId,
        actionId: current.actionId,
        actionToken: current.actionToken,
        fields: changedRepairFields(current),
      });
      setNotice({
        tone: "ok",
        message: result.changedFields.length
          ? `Saved ${result.changedFields.map((field) => fieldLabels[field] ?? field).join(", ")}.`
          : "Nothing needed saving.",
      });
      // Re-read so the token, the fields and the instructions reflect durable state.
      const refreshed = await readOwnRepairCase(caseId);
      setState({ kind: "ready", view: refreshed });
      setDraft(draftFromRepairCase(refreshed));
      onChanged?.();
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
          const refreshed = await readOwnRepairCase(caseId);
          setState({ kind: "ready", view: refreshed });
          setDraft(draftFromRepairCase(refreshed));
        } catch {
          /* keep the previous view; the notice already explains what happened */
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function submit(view: OwnerRepairCase, current: OwnerRepairDraft | null) {
    setSubmitting(true);
    setNotice(null);
    try {
      // Persist any pending edit first so the acknowledgement reflects real state.
      if (current && current.actionId && changedRepairFields(current).length > 0) {
        await saveActionRepair({
          caseId: view.caseId,
          actionId: current.actionId,
          actionToken: current.actionToken!,
          fields: changedRepairFields(current),
        });
      }
      await submitRepairCompletion({
        caseId: view.caseId,
        ...(repairNote.trim() ? { repairNote: repairNote.trim() } : {}),
      });
      setNotice({ tone: "ok", message: "Repair submitted. Support will review it." });
      const refreshed = await readOwnRepairCase(caseId);
      setState({ kind: "ready", view: refreshed });
      setDraft(draftFromRepairCase(refreshed));
      setRepairNote("");
      onChanged?.();
    } catch (error: unknown) {
      setNotice({
        tone: "error",
        message: error instanceof OwnerRepairError
          ? error.message
          : "Could not submit the repair. Try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (state.kind === "loading") {
    return (
      <div className="grid place-items-center rounded-xl border border-zinc-200 bg-white py-20">
        <LoaderOne />
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{state.message}</p>
      </div>
    );
  }

  const { view } = state;
  const status = repairStatusCopy(view);
  const edits = draft ? changedRepairFields(draft) : [];
  const missing = draft ? missingRequiredFields(draft) : [];
  const canSave = draft ? canSaveRepair(view, draft, edits.length > 0) : false;
  const instructions = view.workflow.customerInstructions;

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold tracking-tight text-zinc-900">
              {view.zap.name}
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              {view.stepLabel} · failed {new Date(view.observedAt).toLocaleString()}
            </p>
          </div>
          <StatusChip status={view.workflow.status} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            className={btnSecondary}
            onClick={() => router.push(`${view.zap.editorPath}#repair-case=${view.caseId}`)}
          >
            <ExternalLink className="h-4 w-4" /> Open {view.zap.name}
          </button>
          {view.safeCode ? (
            <span className="rounded-md bg-zinc-100 px-2 py-1 font-mono text-xs text-zinc-600">
              {view.safeCode}
            </span>
          ) : null}
        </div>
      </section>

      {instructions ? (
        <Section title="What support asked you to fix" description="Written by a person, not by a model.">
          <p className="text-sm text-zinc-800">{instructions.instructions}</p>
          {instructions.missingFields.length > 0 ? (
            <p className="mt-2 text-xs text-zinc-600">
              Missing:{" "}
              <span className="font-medium text-zinc-800">
                {instructions.missingFields.map((field) => fieldLabels[field] ?? field).join(", ")}
              </span>
            </p>
          ) : null}
        </Section>
      ) : (
        <Section title="No repair request yet">
          <p className="text-sm text-zinc-600">
            Support has not published instructions for this failure. Nothing for you to change.
          </p>
        </Section>
      )}

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <Wrench className="h-4 w-4 text-[#FF4F00]" />
          <h3 className="text-sm font-semibold text-zinc-900">Fix the step</h3>
        </div>

        {notice ? (
          <div
            className={`mb-4 rounded-lg border p-3 text-sm ${
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

        <p className="mb-4 text-sm text-zinc-600">{status.message}</p>

        {draft && draft.fields.length > 0 ? (
          <div className="space-y-4">
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
                      setDraft((current) =>
                        current ? editDraftField(current, field.field, event.target.value) : current,
                      )
                    }
                  />
                </Field>
              ))}

            {draft.fields.some((field) => field.sensitive) ? (
              <p className="rounded-lg bg-zinc-50 p-3 text-xs text-zinc-500">
                Credentials such as{" "}
                {draft.fields
                  .filter((field) => field.sensitive)
                  .map((field) => fieldLabels[field.field] ?? field.field)
                  .join(", ")}{" "}
                are never shown here and are left unchanged.
              </p>
            ) : null}

            {missing.length > 0 ? (
              <p className="text-xs text-amber-700">
                Fill in {missing.map((field) => fieldLabels[field] ?? field).join(", ")} before saving.
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <button
                className={btnPrimary}
                disabled={!canSave || saving}
                onClick={() => void save(view, draft)}
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
              <span className="text-xs text-zinc-500">
                {edits.length > 0
                  ? `${edits.length} unsaved change${edits.length === 1 ? "" : "s"}`
                  : "No unsaved changes"}
              </span>
            </div>
          </div>
        ) : null}
      </section>

      {view.workflow.awaitingOwnerRepair ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-zinc-900">Tell support you are done</h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            Only your own Zap configuration changes. The original failed run and its evidence are kept.
          </p>
          <div className="mt-3">
            <Field label="Note for support" hint="Optional">
              <textarea
                rows={3}
                className={inputClass}
                value={repairNote}
                onChange={(event) => setRepairNote(event.target.value)}
                placeholder="What did you change?"
              />
            </Field>
          </div>
          <button
            className={`${btnPrimary} mt-4`}
            disabled={submitting || missing.length > 0}
            onClick={() => void submit(view, draft)}
          >
            {submitting ? "Submitting…" : "Submit repair completion"}
          </button>
        </section>
      ) : null}

      {view.workflow.repairNote ? (
        <Section title="What you submitted">
          <p className="text-sm text-zinc-800">{view.workflow.repairNote}</p>
        </Section>
      ) : null}
    </div>
  );
}
