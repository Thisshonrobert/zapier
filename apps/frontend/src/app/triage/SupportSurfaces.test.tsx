import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { ReplayLedger, CapabilitySummary } from "@/mycomponents/support/ReplayLedger";
import { EvidenceRoom } from "@/mycomponents/support/EvidenceRoom";
import { InvestigationActivity } from "@/mycomponents/support/SupportWorkbench";
import { TicketIndex } from "@/mycomponents/support/TicketIndex";
import type { ReplayRequestHistoryItem, SavedInvestigation } from "@/types/triage";
import type { SupportEvidence } from "@/lib/support-evidence";

/**
 * Render assertions for the support surfaces. These are the honesty rules of the product, so
 * they are asserted on the markup a reader actually gets: approval is not dispatch, publication
 * is not execution, missing evidence is named, and access denial is not dressed as an outage.
 */

const eligibility = {
  status: "eligible" as const,
  reasons: [],
  notBefore: null,
  requiresOperatorApproval: true,
  candidateGrounded: true,
};
const saved: SavedInvestigation = {
  id: "saved",
  status: "proposed",
  result: null,
  authority: {
    id: "proposal",
    version: 1,
    status: "requires_approval",
    expiresAt: "2099-01-01T00:00:00Z",
    reasons: [],
    eligibility,
    allowedDecisions: ["approve", "reject"],
    decision: null,
    replay: null,
    replayHistory: [],
    replayEnabled: false,
  },
};
const ledger = (value: SavedInvestigation, pending = false) =>
  renderToStaticMarkup(<ReplayLedger saved={value} pending={pending} onDecision={() => {}} />);

test("approval controls distinguish approval from replay and lock repeated clicks", () => {
  assert.match(ledger(saved), /Approve/);
  assert.match(ledger(saved), /does not dispatch/);
  assert.match(ledger(saved, true), /disabled/);
  assert.match(ledger(saved, true), /Saving decision/);
});

test("expired and blocked proposals cannot offer approval", () => {
  assert.match(ledger({ ...saved, authority: { ...saved.authority!, expiresAt: "2000-01-01" } }), /expired/);
  assert.doesNotMatch(
    ledger({ ...saved, authority: { ...saved.authority!, allowedDecisions: [], reasons: ["changed_fingerprint"] } }),
    />Approve</,
  );
});

test("publication is separate from success, failure and terminal unknown", () => {
  for (const execution of ["PENDING", "RESERVED", "RUNNING", "SUCCESS", "FAILED", "UNKNOWN"] as const) {
    const html = ledger({
      ...saved,
      authority: {
        ...saved.authority!,
        decision: { id: "decision", decision: "approve", approvedBy: 4 },
        replay: { id: "request", publication: "published", execution, completedAt: null },
      },
    });
    assert.match(html, /Publication: published/);
    assert.match(html, new RegExp(`Execution: ${execution}`));
    // The committed decision is reported; no second approval control is offered for it.
    assert.match(html, /Committed decision: <span class="font-semibold">Approve<\/span>/);
    assert.doesNotMatch(html, /<button[^>]*>Approve<\/button>/);
    if (execution === "UNKNOWN") assert.match(html, /No resend/);
  }
});

const historyItem: ReplayRequestHistoryItem = {
  requestId: "11111111-1111-4111-8111-111111111111",
  approvalId: "22222222-2222-4222-8222-222222222222",
  proposalId: "33333333-3333-4333-8333-333333333333",
  investigationId: "44444444-4444-4444-8444-444444444444",
  proposalVersion: 1,
  publication: "published",
  execution: "SUCCESS",
  outcome: "accepted",
  requestedBy: 4,
  approvedBy: 5,
  createdAt: "2026-10-17T00:00:00.000Z",
  completedAt: "2026-10-17T00:00:01.000Z",
};

test("a request lists its provider outcome and the proposal that authorized it", () => {
  const html = ledger({
    ...saved,
    authority: {
      ...saved.authority!,
      decision: { id: "decision", decision: "approve", approvedBy: 5 },
      replay: { id: historyItem.requestId, publication: "published", execution: "SUCCESS", completedAt: historyItem.completedAt },
      replayHistory: [historyItem],
    },
  });
  assert.match(html, /Provider outcome: accepted/);
  assert.match(html, new RegExp(historyItem.proposalId));
  assert.match(html, new RegExp(historyItem.investigationId));
  assert.match(html, /Request replay/);
  assert.match(html, /Run dry run review/);
});

test("eligibility denies the model's confidence and keeps its reasons readable", () => {
  const blocked = ledger({
    ...saved,
    authority: {
      ...saved.authority!,
      eligibility: {
        status: "blocked",
        reasons: ["replay_limit"],
        notBefore: null,
        requiresOperatorApproval: false,
        candidateGrounded: false,
      },
    },
  });
  assert.match(blocked, /Policy: blocked/);
  assert.match(blocked, /replay_limit/);
  assert.match(blocked, /not grounded/);
});

test("a pending replay action blocks both replay controls", () => {
  const html = renderToStaticMarkup(
    <ReplayLedger
      saved={{ ...saved, authority: { ...saved.authority!, decision: { id: "decision", decision: "approve", approvedBy: 5 } } }}
      pending={false}
      onDecision={() => {}}
      replayAction={{ kind: "request", pending: true, message: "Requesting replay…" }}
    />,
  );
  assert.match(html, /Replay request in progress/);
  assert.match(html, /disabled/);
});

test("server capability replaces fixed disabled copy and reports bounded reasons", () => {
  const denied = renderToStaticMarkup(
    <CapabilitySummary
      capabilities={{
        investigation: false,
        replayIntent: false,
        replayExecution: false,
        releaseReady: false,
        labProfile: null,
        reasons: ["release_not_ready", "replay_switch_off"],
      }}
    />,
  );
  assert.doesNotMatch(denied, /Live replay is disabled/);
  assert.match(denied, /Replay intent/);
  assert.match(denied, /disabled/);
  assert.match(denied, /Release ready/);
  assert.match(denied, /release_not_ready/);
});

test("a missing capability read offers no replay action at all", () => {
  const html = renderToStaticMarkup(<CapabilitySummary capabilities={null} />);
  assert.match(html, /capability is unavailable from the server/);
  assert.doesNotMatch(html, /enabled/);
});

test("a disabled replay intent disables both replay controls and says why", () => {
  const html = renderToStaticMarkup(
    <ReplayLedger
      saved={{ ...saved, authority: { ...saved.authority!, decision: { id: "decision", decision: "approve", approvedBy: 5 } } }}
      pending={false}
      onDecision={() => {}}
      capabilities={{
        investigation: true,
        replayIntent: false,
        replayExecution: false,
        releaseReady: false,
        labProfile: null,
        reasons: ["replay_switch_off"],
      }}
    />,
  );
  assert.match(html, /Replay intent is disabled by the server/);
  assert.match(html, /<button[^>]*disabled[^>]*>Run dry run review<\/button>/);
  assert.match(html, /<button[^>]*disabled[^>]*>Request replay<\/button>/);
});

const enumState = (label: string) =>
  renderToStaticMarkup(
    <TicketIndex
      title="Support queue"
      state={{ kind: "ready", rows: [] }}
      toTicket={(row: { id: string }) => ({
        caseId: row.id,
        summary: label,
        status: "With support",
        tone: "neutral",
        observedAt: "2026-10-17T00:00:00.000Z",
      })}
      onSelect={() => {}}
      filteredEmpty={{ title: "No case matches these filters", detail: "2 cases are loaded.", onClear: () => {} }}
    />,
  );

test("an index with rows filters to nothing offers the recovery, and an empty queue explains itself", () => {
  assert.match(enumState("x"), /No case matches these filters/);
  assert.match(enumState("x"), /Clear filters/);
  const empty = renderToStaticMarkup(
    <TicketIndex
      title="Support queue"
      state={{ kind: "empty", title: "No failures need support", detail: "No recent case is inside this bounded view." }}
      toTicket={(row: never) => row}
      onSelect={() => {}}
    />,
  );
  assert.match(empty, /No failures need support/);
});

test("evidence room states name what is missing instead of rendering a blank", () => {
  const evidence: SupportEvidence = {
    failureContext: {
      data: null,
      unavailable: ["failure_context_unavailable"],
    },
    execution: {
      data: {
        observed_at: "2026-10-17T00:00:00.000Z",
        content_hash: "a".repeat(64),
        complete: true,
        facts: {
          provenance: "captured",
          current_execution: null,
          attempts: [
            {
              attempt_number: 2,
              status: "REJECTED",
              provider: "telegram",
              phase: "send",
              provider_outcome: "rejected",
              safe_code: "telegram_http_429",
              provider_status: 429,
              retry_after_seconds: 30,
              started_at: "2026-10-17T00:00:00.000Z",
              completed_at: "2026-10-17T00:00:01.000Z",
              provenance: "captured",
            },
          ],
          history_limit: 10,
          history_truncated: false,
          predecessors: [{ stage: 0, status: "SUCCESS", provider_outcome: "accepted", completed_at: null }],
          ordering: { status: "valid", missing_predecessor_stages: [] },
        },
      },
      unavailable: [],
    },
    validation: { data: null, unavailable: ["input_validation_unavailable"] },
  };
  const html = renderToStaticMarkup(
    <EvidenceRoom caseId="case-1" state={{ kind: "ready", evidence }} onReload={() => {}} saved={null} diagnosis={null} />,
  );
  assert.match(html, /Observed/);
  assert.match(html, /failure_context_unavailable/);
  assert.match(html, /Re-read evidence/);
  assert.doesNotMatch(html, /<script/);
});

test("a denied evidence read states that reloading will not help", () => {
  const html = renderToStaticMarkup(
    <EvidenceRoom
      caseId="case-1"
      state={{ kind: "denied", message: "Support operator permission required" }}
      onReload={() => {}}
      saved={null}
      diagnosis={null}
    />,
  );
  assert.match(html, /Evidence access denied/);
  assert.match(html, /Reloading will not change this/);
});

test("no selected case means no evidence is implied", () => {
  const html = renderToStaticMarkup(
    <EvidenceRoom caseId={null} state={{ kind: "idle" }} onReload={() => {}} saved={null} diagnosis={null} />,
  );
  assert.match(html, /No case selected/);
});

test("the workbench reaches its activity panel without an investigation", () => {
  assert.equal(renderToStaticMarkup(<InvestigationActivity state={null} />), "");
});
