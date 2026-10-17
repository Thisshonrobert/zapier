"use client";

import { ChevronLeft, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Shared composition for the three support surfaces. The workbench is the only place in the
 * product that fills the viewport with columns: a case index, a case file and an evidence
 * room. Narrower screens never squeeze three columns; they move to index/detail and put the
 * evidence in a drawer, which is `ThreePane`'s job.
 */

/** Full-height three-pane frame. `main` is the scrolling case file. */
export function ThreePane({ index, main, aside }: { index: ReactNode; main: ReactNode; aside: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row" data-support-panes="">
      <div className="flex min-h-0 flex-col border-b border-zinc-200 lg:w-[320px] lg:shrink-0 lg:border-b-0 lg:border-r xl:w-[352px]">
        {index}
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">{main}</div>
      <div className="hidden min-h-0 flex-col border-zinc-200 lg:flex lg:w-[380px] lg:shrink-0 lg:border-l xl:w-[430px]">
        {aside}
      </div>
    </div>
  );
}

/**
 * Pane heading: title, the pane's one working control, and an optional count or status line.
 * No kicker above the title — the heading carries its own weight.
 */
export function PaneHeader({
  title,
  count,
  actions,
  level = 2,
}: {
  title: string;
  count?: string;
  actions?: ReactNode;
  level?: 1 | 2;
}) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-zinc-200 px-3" data-pane-header="">
      <Heading className="truncate text-[13px] font-semibold tracking-tight text-zinc-900">{title}</Heading>
      {count ? <span className="shrink-0 text-[11px] tabular-nums text-zinc-500">{count}</span> : null}
      <div className="ml-auto flex shrink-0 items-center gap-1.5">{actions}</div>
    </div>
  );
}

/** A titled block inside a scrolling pane. Sections are separated by hairlines, not cards. */
export function Section({
  title,
  description,
  actions,
  children,
  id,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section aria-labelledby={id ? `${id}-heading` : undefined} className="border-b border-zinc-100 px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 id={id ? `${id}-heading` : undefined} className="text-[13px] font-semibold tracking-tight text-zinc-900">
            {title}
          </h3>
          {description ? <p className="mt-0.5 text-xs text-zinc-500">{description}</p> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** A labelled value pair. Used for contract facts, never for invented metrics. */
export function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-zinc-100 py-1.5 last:border-b-0">
      <dt className="shrink-0 text-xs text-zinc-500">{label}</dt>
      <dd className={`min-w-0 text-right text-xs font-medium break-words text-zinc-800 ${mono ? "font-mono tabular-nums" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

/** Compact count with a label, e.g. the evidence attempt count. */
export function Chip({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums ${
        tone === "accent" ? "bg-[#FF4F00]/10 text-[#b33800]" : "bg-zinc-100 text-zinc-600"
      }`}
    >
      {children}
    </span>
  );
}

/**
 * The one place a pane states that a read failed, or that there is nothing to read yet. Both
 * cases are reported plainly, with the recovery the viewer can actually perform.
 */
export function PaneNotice({
  icon: Icon,
  title,
  detail,
  action,
  tone = "muted",
}: {
  icon?: LucideIcon;
  title: string;
  detail?: string;
  action?: ReactNode;
  tone?: "muted" | "alert";
}) {
  return (
    <div
      role={tone === "alert" ? "alert" : "status"}
      className={`flex items-start gap-3 px-4 py-4 text-sm ${
        tone === "alert" ? "bg-amber-50 text-amber-900" : "text-zinc-600"
      }`}
    >
      {Icon ? <Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" /> : null}
      <div className="min-w-0">
        <p className="font-medium text-zinc-800">{title}</p>
        {detail ? <p className="mt-0.5 text-xs text-zinc-600">{detail}</p> : null}
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    </div>
  );
}

/** Loading line for a pane that is waiting on a read. */
export function PaneLoading({ label }: { label: string }) {
  return (
    <p role="status" className="flex items-center gap-2 px-4 py-4 text-xs text-zinc-500">
      <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#FF4F00]" />
      {label}
    </p>
  );
}

/**
 * Narrow-screen control that returns from the case file to the index. `lg:hidden` keeps it out
 * of the desktop composition, where all three panes are already on screen.
 */
export function BackToIndex({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 lg:hidden"
    >
      <ChevronLeft aria-hidden className="h-3.5 w-3.5" /> Cases
    </button>
  );
}

/** Marks a workspace's identity line without introducing a card. */
export function WorkspaceMark({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#b33800]">
      <Icon aria-hidden className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}

