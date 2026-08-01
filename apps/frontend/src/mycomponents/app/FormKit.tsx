"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Shared button styles so every CTA in the builder reads the same way. */
export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#FF4F00] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e64700] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4F00]/40 disabled:cursor-not-allowed disabled:opacity-60";

export const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:cursor-not-allowed disabled:opacity-60";

export const TINTS = {
  orange: "bg-orange-50 text-[#FF4F00] ring-orange-100",
  violet: "bg-violet-50 text-violet-600 ring-violet-100",
  sky: "bg-sky-50 text-sky-600 ring-sky-100",
} as const;

/** Dialog header with an icon tile, a tight title and a muted one-liner. */
export function DialogHeading({
  icon: Icon,
  title,
  description,
  tint = "orange",
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  tint?: keyof typeof TINTS;
}) {
  return (
    <DialogHeader className="space-y-0">
      <div className="flex items-start gap-3">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 ${TINTS[tint]}`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 pt-0.5">
          <DialogTitle className="text-base font-semibold tracking-tight text-zinc-900">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="mt-0.5 text-sm text-zinc-500">
              {description}
            </DialogDescription>
          )}
        </div>
      </div>
    </DialogHeader>
  );
}

/** Label + optional hint + optional right-aligned control, above a field. */
export function Field({
  label,
  hint,
  action,
  children,
}: {
  label: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-zinc-800">{label}</label>
        {action}
      </div>
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
      {children}
    </div>
  );
}

/** Grouped section inside a dialog body. */
export function Section({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4">
      {title && (
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
      )}
      {description && (
        <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
      )}
      <div className={title || description ? "mt-3" : ""}>{children}</div>
    </div>
  );
}
