"use client";

import { useEffect, useState } from "react";

import { Section, Chip } from "./Shell";
import { StatusMark } from "./Marks";
import { executionMark, publicationMark, timestampLabel } from "@/lib/support-copy";
import type { ReplayCapabilities, ReplayRequestHistoryItem, SavedInvestigation, TriageDecision } from "@/types/triage";

/**
 * The replay ledger. Policy eligibility, operator approval, request publication and worker
 * execution are four separate durable facts, and this is the one place in the product that
 * shows them as four rows on one timeline. Approval alone dispatches nothing; publication
 * does not prove the worker executed; a provider acceptance is not confirmed delivery.
 */

export const decisionLabels: Record<TriageDecision, string> = {
  approve: "Approve",
  reject: "Reject",
  mark_owner_action_required: "Owner action required",
  escalate_to_engineering: "Escalate to engineering",
  resolve_without_replay: "Resolve without replay",
};

export type ReplayActionState = { kind: "dry-run" | "request"; pending: boolean; message: string } | null;

export function ReplayLedger({
  saved,
  capabilities,
  pending,
  replayAction,
  onDecision,
  onDryRun,
  onRequestReplay,
}: {
  saved: SavedInvestigation;
  capabilities?: ReplayCapabilities | null;
  pending: boolean;
  replayAction?: ReplayActionState;
  onDecision: (decision: TriageDecision) => void;
  onDryRun?: () => void;
  onRequestReplay?: () => void;
}) {
  const authority = saved.authority;
  const [now, setNow] = useState(() => Date.now());
  const expiresAt = authority?.expiresAt;

  // A proposal expiring while the pane is open must lock its controls without a reload, so the
  // countdown is armed once against the recorded expiry.
  useEffect(() => {
    if (!expiresAt) return;
    const delay = Math.max(0, Date.parse(expiresAt) - Date.now()) + 1;
    const timer = setTimeout(() => setNow(Date.now()), delay);
    return () => clearTimeout(timer);
  }, [expiresAt]);

  const expired = authority ? Date.parse(authority.expiresAt) <= now : false;
  const busy = pending || replayAction?.pending === true;
  const eligibility = authority?.eligibility;
  const decision = authority?.decision ?? null;
  const replay = authority?.replay ?? null;
  const intentOff = capabilities?.replayIntent === false;

  return (
    <>
      <Section
        title="Replay ledger"
        description="Four separate facts in order. Each one is recorded independently."
        id="replay-ledger"
        actions={expired ? <StatusMark label="Proposal expired" tone="denied" /> : null}
      >
        <ol className="space-y-1.5">
          <LedgerRow
            index={1}
            stage="Policy eligibility"
            mark={
              eligibility
                ? eligibility.status === "eligible"
                  ? { label: "eligible", tone: "submitted" as const }
                  : eligibility.status === "blocked"
                    ? { label: "blocked", tone: "denied" as const }
                    : { label: eligibility.status, tone: "neutral" as const }
                : { label: "not reported", tone: "neutral" as const }
            }
            detail={
              eligibility
                ? `Policy: ${
                    eligibility.status === "eligible" ? "eligible for operator review" : eligibility.status
                  }${
                    eligibility.notBefore ? ` · cooldown ends ${timestampLabel(eligibility.notBefore)}` : ""
                  }`
                : "The investigation snapshot did not report application eligibility."
            }
          />
          <LedgerRow
            index={2}
            stage="Operator approval"
            mark={
              decision
                ? { label: decisionLabels[decision.decision], tone: "submitted" as const }
                : expired
                  ? { label: "expired", tone: "denied" as const }
                  : { label: "not recorded", tone: "neutral" as const }
            }
            detail={
              decision
                ? `Approved by operator: ${decision.approvedBy}. Approval is recorded but no replay is dispatched yet.`
                : "No decision is committed on this proposal."
            }
          />
          <LedgerRow
            index={3}
            stage="Request publication"
            mark={
              replay
                ? { label: publicationMark(replay.publication).label, tone: publicationMark(replay.publication).tone }
                : { label: "no request", tone: "neutral" as const }
            }
            detail={
              replay
                ? `Publication: ${replay.publication}${
                    replay.publication === "queued" ? " (publication not confirmed)" : ""
                  }`
                : "No replay request exists for this investigation. An approved decision alone is not execution."
            }
          />
          <LedgerRow
            index={4}
            stage="Worker execution"
            mark={
              replay
                ? { label: executionMark(replay.execution).label, tone: executionMark(replay.execution).tone }
                : { label: "not requested", tone: "neutral" as const }
            }
            detail={
              replay
                ? `Execution: ${replay.execution}${
                    replay.execution === "UNKNOWN"
                      ? " · No resend. Delivery is unknown and terminal."
                      : replay.execution === "SUCCESS"
                        ? " · The provider accepted the request; end-user delivery is still not confirmed."
                        : replay.execution === "RUNNING"
                          ? " · The worker is executing this replay now."
                          : ""
                  }`
                : "Publication does not prove execution success."
            }
          />
        </ol>

        {eligibility ? (
          <p className="mt-3 text-xs text-zinc-600">
            {eligibility.candidateGrounded
              ? "The advisory candidate is grounded in captured evidence."
              : "The advisory candidate is not grounded; diagnosis confidence does not grant eligibility."}
          </p>
        ) : null}
        <div className="mt-2">
          <p className="mb-1 text-[11px] font-medium text-zinc-500">
            Policy reasons for this proposal
          </p>
          <ul className="flex flex-wrap gap-1">
            {[...new Set([...(eligibility?.reasons ?? []), ...(authority?.reasons ?? [])])].map((reason) => (
              <li key={reason}>
                <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-zinc-700">{reason}</code>
              </li>
            ))}
            {[...new Set([...(eligibility?.reasons ?? []), ...(authority?.reasons ?? [])])].length === 0 ? (
              <li className="text-xs text-zinc-500">No blocking policy reason was reported.</li>
            ) : null}
          </ul>
        </div>
      </Section>

      <Section
        title="Support decision"
        description="Decisions are committed against this proposal version and expire with it."
        id="support-decision"
        actions={<Chip>{`proposal v${authority?.version ?? 0}`}</Chip>}
      >
        {expired ? (
          <p role="alert" className="mb-2 text-xs font-medium text-red-700">
            This proposal expired. Start a new investigation for the case.
          </p>
        ) : null}
        {decision ? (
          <p className="text-xs text-zinc-700">
            Committed decision: <span className="font-semibold">{decisionLabels[decision.decision]}</span> · operator{" "}
            {decision.approvedBy}
          </p>
        ) : authority && authority.allowedDecisions.length === 0 ? (
          <p className="text-xs text-zinc-600">
            Decision controls are blocked by backend policy. The reasons above are the current denials.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(authority?.allowedDecisions ?? []).map((choice) => (
              <button
                key={choice}
                type="button"
                disabled={pending || expired}
                onClick={() => onDecision(choice)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF4F00]"
              >
                {decisionLabels[choice]}
              </button>
            ))}
          </div>
        )}
        {pending ? (
          <p role="status" className="mt-2 text-xs text-zinc-600">
            Saving decision… controls are blocked while this request is pending.
          </p>
        ) : null}
      </Section>

      <Section
        title="Request a replay"
        description="A fresh dry run review is required after approval. The request revalidates policy immediately before it commits."
        id="request-replay"
      >
        {!decision ? (
          <p className="text-xs text-zinc-600">
            An approval is required before a replay can be requested. Approval alone does not dispatch.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy || expired || intentOff}
              onClick={onDryRun}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF4F00]"
            >
              Run dry run review
            </button>
            <button
              type="button"
              disabled={busy || expired || intentOff}
              onClick={onRequestReplay}
              className="rounded-lg bg-[#FF4F00] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#e64700] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF4F00]"
            >
              Request replay
            </button>
            {intentOff ? (
              <span className="text-[11px] text-zinc-500">
                Replay intent is disabled by the server for this deployment.
              </span>
            ) : null}
          </div>
        )}
        {replayAction?.pending ? (
          <p role="status" className="mt-2 text-xs text-zinc-600">
            Replay {replayAction.kind === "dry-run" ? "dry run" : "request"} in progress… actions are blocked while this
            request is pending.
          </p>
        ) : null}
        {replayAction && !replayAction.pending ? (
          <p role="status" data-replay-action={replayAction.kind} className="mt-2 text-xs text-zinc-700">
            {replayAction.message}
          </p>
        ) : null}
      </Section>

      {authority ? <ReplayHistory items={authority.replayHistory} /> : null}
    </>
  );
}

function LedgerRow({
  index,
  stage,
  mark,
  detail,
}: {
  index: number;
  stage: string;
  mark: { label: string; tone: "neutral" | "waiting" | "submitted" | "engineering" | "accepted" | "denied" | "active" };
  detail: string;
}) {
  return (
    <li className="flex gap-3 rounded-md border border-zinc-200 px-3 py-2">
      <span aria-hidden className="mt-0.5 w-3 shrink-0 text-[11px] font-semibold tabular-nums text-zinc-400">
        {index}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-zinc-900">{stage}</span>
          <StatusMark label={mark.label} tone={mark.tone} />
        </div>
        <p className="mt-0.5 text-[11px] break-words text-zinc-600">{detail}</p>
      </div>
    </li>
  );
}

/** Request history for the case, across investigations. */
export function ReplayHistory({ items }: { items: ReplayRequestHistoryItem[] }) {
  return (
    <Section
      title="Replay request history"
      description="Every request recorded for this case, in any investigation."
      actions={<Chip>{items.length}</Chip>}
      id="replay-history"
    >
      {items.length === 0 ? (
        <p className="text-xs text-zinc-500">No replay request has been recorded for this case in any investigation.</p>
      ) : (
        <ol className="space-y-2">
          {items.map((item) => (
            <li key={item.requestId} className="rounded-md border border-zinc-200 p-2.5 text-[11px]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-zinc-800">
                  Publication: {item.publication} · Execution: {item.execution}
                </span>
                <span className="text-zinc-500">Provider outcome: {item.outcome}</span>
              </div>
              <p className="mt-1 text-zinc-500">
                Requested by operator {item.requestedBy} · approved by {item.approvedBy} · {timestampLabel(item.createdAt)}
                {item.completedAt ? ` → ${timestampLabel(item.completedAt)}` : ""}
              </p>
              <p className="mt-0.5 font-mono break-all text-zinc-400">
                authorized by proposal {item.proposalId} (v{item.proposalVersion}) · investigation {item.investigationId}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}

/**
 * Server-reported capability. This replaces the fixed "replay disabled" paragraph: the console
 * states what the deployment currently permits, and why not when it does not.
 */
export function CapabilitySummary({ capabilities }: { capabilities?: ReplayCapabilities | null }) {
  if (!capabilities)
    return (
      <Section title="Server capability" id="capability">
        <p className="text-xs text-zinc-600">
          Replay capability is unavailable from the server. No replay action is offered until it responds.
        </p>
      </Section>
    );
  const states = [
    ["Investigation", capabilities.investigation],
    ["Replay intent", capabilities.replayIntent],
    ["Replay execution", capabilities.replayExecution],
  ] as const;
  return (
    <Section title="Server capability" description="Reported by the backend on every load." id="capability">
      <dl>
        {states.map(([label, enabled]) => (
          <div key={label} className="flex items-baseline justify-between gap-3 border-b border-zinc-100 py-1.5 last:border-b-0">
            <dt className="text-xs text-zinc-500">{label}</dt>
            <dd className="text-xs font-medium text-zinc-800">{enabled ? "enabled" : "disabled"}</dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-3 py-1.5">
          <dt className="text-xs text-zinc-500">Release ready</dt>
          <dd className="text-xs font-medium text-zinc-800">
            {capabilities.releaseReady ? "yes" : "no"}
            {capabilities.labProfile ? ` · verified lab profile ${capabilities.labProfile}` : ""}
          </dd>
        </div>
      </dl>
      {capabilities.reasons.length ? (
        <div className="mt-2">
          <p className="mb-1 text-[11px] font-medium text-zinc-500">Capability reasons</p>
          <ul className="flex flex-wrap gap-1">
            {capabilities.reasons.map((reason) => (
              <li key={reason}>
                <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-zinc-700">{reason}</code>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Section>
  );
}
