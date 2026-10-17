"use client";

import type { ReactNode } from "react";

import { Section, Fact, Chip, BackToIndex } from "./Shell";
import { StatusMark, ReasonList } from "./Marks";
import { ageLabel, humanizeCode, providerOutcomeLabel, providerOutcomeShort, sourceLabel, timestampLabel } from "@/lib/support-copy";
import type { MarkTone } from "@/types/support";

// Re-exported so a surface composing a case file has one import for its facts and sections.
export { Section, Fact };

/**
 * The case file: the middle pane for every support surface. It carries identity,
 * responsibility and the actions the server currently allows. The three surfaces differ only
 * in which work sections they hand in; the frame, the facts and the honesty about what is
 * unknown are shared, which is what makes the three workspaces feel like one product.
 */

export type CaseIdentity = {
  caseId: string;
  title: string;
  subtitle: string;
  status: string;
  tone: MarkTone;
  observedAt: string;
  ownerLabel?: string;
  safeCode?: string | null;
  providerOutcome?: string | null;
  source?: string | null;
  stage: number;
  zapRunId?: string;
};

export function CaseFile({
  identity,
  context,
  activity,
  work,
  aside,
  onBack,
  onOpenEvidence,
  evidenceTriggerRef,
}: {
  identity: CaseIdentity;
  /** Zap/step context when the projection or evidence provides it. */
  context?: ReactNode;
  /** Activity and history sections, rendered under the work sections. */
  activity?: ReactNode;
  /** The role's own working sections and permitted actions. */
  work?: ReactNode;
  /** Rendered at the top of the pane, e.g. a routed notice. */
  aside?: ReactNode;
  onBack?: () => void;
  /** Narrow-screen affordance that opens the evidence drawer. */
  onOpenEvidence?: () => void;
  /** Lets the drawer return focus to this control when it closes. */
  evidenceTriggerRef?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <article className="pb-16" data-case-file="">
      <header className="border-b border-zinc-200 px-4 py-4">
        <div className="flex items-start gap-3">
          {onBack ? <BackToIndex onClick={onBack} /> : null}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold tracking-tight text-zinc-900" title={identity.title}>
              {identity.title}
            </h1>
            <p className="mt-0.5 text-xs text-zinc-500">{identity.subtitle}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <StatusMark label={identity.status} tone={identity.tone} />
            {onOpenEvidence ? (
              <button
                ref={evidenceTriggerRef}
                type="button"
                onClick={onOpenEvidence}
                className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 lg:hidden"
              >
                Evidence
              </button>
            ) : null}
          </div>
        </div>

        {aside ? <div className="mt-3">{aside}</div> : null}

        <dl className="mt-3 grid gap-x-6 sm:grid-cols-2">
          <Fact label="Stage" value={identity.stage === 0 ? "Trigger" : `Action ${identity.stage}`} />
          <Fact label="Age" value={`${ageLabel(identity.observedAt)} · ${timestampLabel(identity.observedAt)}`} />
          <Fact label="Provider outcome" value={providerOutcomeShort(identity.providerOutcome)} />
          <Fact label="Evidence source" value={sourceLabel(identity.source)} />
          {identity.ownerLabel ? <Fact label="Subject owner" value={identity.ownerLabel} mono /> : null}
          {identity.safeCode ? <Fact label="Safe code" value={identity.safeCode} mono /> : null}
          <Fact label="Case" value={identity.caseId} mono />
          {identity.zapRunId ? <Fact label="Zap run" value={identity.zapRunId} mono /> : null}
        </dl>
      </header>

      {context}
      {work}
      {activity}
    </article>
  );
}

/** Zap and step context for a case, when an evidence read could supply it. */
export function StepContext({
  zapName,
  stepLabel,
  handler,
  editorHref,
  editorLabel,
}: {
  zapName?: string | null;
  stepLabel?: string | null;
  handler?: string | null;
  editorHref?: string | null;
  editorLabel?: string;
}) {
  if (!zapName && !stepLabel && !handler) return null;
  return (
    <Section title="Where it broke" description="The Zap and step this failure belongs to." id="step-context">
      <dl>
        {zapName ? <Fact label="Zap" value={zapName} /> : null}
        {stepLabel ? <Fact label="Step" value={stepLabel} /> : null}
        {handler ? <Fact label="Handler" value={handler} mono /> : null}
      </dl>
      {editorHref ? (
        <a
          href={editorHref}
          className="mt-3 inline-flex items-center rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF4F00]"
        >
          {editorLabel ?? "Open Zap editor"}
        </a>
      ) : null}
    </Section>
  );
}

/**
 * An honest statement of the case's current responsibility. Used where a surface has no
 * workflow projection to read, so it must not dress a raw status up as routing truth.
 */
export function ResponsibilityNote({ queue, status }: { queue?: string | null; status?: string | null }) {
  if (!queue && !status) return null;
  return (
    <Section title="Responsibility" description="Derived from the durable case workflow." id="responsibility">
      <dl>
        {queue ? <Fact label="Queue" value={humanizeCode(queue)} /> : null}
        {status ? <Fact label="Status" value={humanizeCode(status)} /> : null}
      </dl>
    </Section>
  );
}

/** A bounded list of identifiers or codes, e.g. policy reasons or missing evidence. */
export function CodeList({ title, description, items, empty, id }: {
  title: string;
  description?: string;
  items: string[];
  empty: string;
  id?: string;
}) {
  return (
    <Section title={title} description={description} id={id} actions={<Chip>{items.length}</Chip>}>
      <ReasonList reasons={items} empty={empty} />
    </Section>
  );
}
