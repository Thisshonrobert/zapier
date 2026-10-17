import type { MarkTone } from "@/types/support";

/**
 * Compact state marks. This is the only place a status color is defined, so a support
 * surface cannot invent a seventh meaning for "amber". Tone is semantic:
 *
 * - neutral     settled with support, or nothing outstanding
 * - waiting     a person owes the next move
 * - submitted   recorded and published; a human or worker still owes the outcome
 * - engineering routed to engineering
 * - accepted    resolved, or the provider accepted a replay
 * - denied      blocked by policy, failed, or access revoked
 * - active      in progress right now
 */
const TONES: Record<MarkTone, string> = {
  neutral: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  waiting: "bg-amber-50 text-amber-800 ring-amber-200",
  submitted: "bg-sky-50 text-sky-800 ring-sky-200",
  engineering: "bg-violet-50 text-violet-700 ring-violet-200",
  accepted: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  denied: "bg-red-50 text-red-700 ring-red-200",
  active: "bg-[#FF4F00]/10 text-[#b33800] ring-[#FF4F00]/30",
};

export function StatusMark({ label, tone = "neutral" }: { label: string; tone?: MarkTone }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${TONES[tone]}`}>
      {label}
    </span>
  );
}

/** A 6px tone dot for dense rows where a full chip would not fit. */
export function ToneDot({ tone = "neutral", label }: { tone?: MarkTone; label: string }) {
  const dots: Record<MarkTone, string> = {
    neutral: "bg-zinc-300",
    waiting: "bg-amber-500",
    submitted: "bg-sky-500",
    engineering: "bg-violet-500",
    accepted: "bg-emerald-500",
    denied: "bg-red-500",
    active: "bg-[#FF4F00]",
  };
  return <span aria-hidden title={label} className={`h-1.5 w-1.5 shrink-0 rounded-full ${dots[tone]}`} />;
}

/**
 * A bounded policy reason. Reasons come from the application's fixed vocabulary, so they are
 * rendered as codes the operator can look up rather than translated into prose that would
 * blur two different denials together.
 */
export function ReasonList({ reasons, empty }: { reasons: string[]; empty?: string }) {
  if (reasons.length === 0)
    return <p className="text-xs text-zinc-500">{empty ?? "No policy reason was reported."}</p>;
  return (
    <ul className="flex flex-wrap gap-1">
      {reasons.map((reason) => (
        <li key={reason}>
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-zinc-700">{reason}</code>
        </li>
      ))}
    </ul>
  );
}
