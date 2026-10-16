import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { SavedInvestigationControls, TriageResults } from "./TriageResults";
import type { ReplayRequestHistoryItem, SavedInvestigation } from "../../types/triage";

const eligibility = { status: "eligible" as const, reasons: [], notBefore: null,
  requiresOperatorApproval: true, candidateGrounded: true };
const saved: SavedInvestigation = { id: "saved", status: "proposed", result: null, authority: {
  id: "proposal", version: 1, status: "requires_approval", expiresAt: "2099-01-01T00:00:00Z",
  reasons: [], eligibility, allowedDecisions: ["approve", "reject"], decision: null, replay: null,
  replayHistory: [], replayEnabled: false,
} };
const controls = (value: SavedInvestigation, pending = false) => renderToStaticMarkup(
  <SavedInvestigationControls saved={value} pending={pending} onDecision={() => {}} />);

test("approval controls distinguish approval from replay and lock repeated clicks", () => {
  assert.match(controls(saved), /Approve/);
  assert.match(controls(saved), /does not dispatch|does not initiate replay/);
  assert.match(controls(saved, true), /disabled/);
  assert.match(controls(saved, true), /Saving decision/);
});

test("expired and blocked proposals cannot offer approval", () => {
  assert.match(controls({ ...saved, authority: { ...saved.authority!, expiresAt: "2000-01-01" } }), /expired/);
  assert.doesNotMatch(controls({ ...saved, authority: { ...saved.authority!, allowedDecisions: [], reasons: ["changed_fingerprint"] } }), />Approve</);
});

test("publication is separate from success, failure and terminal unknown", () => {
  for (const execution of ["PENDING", "RESERVED", "RUNNING", "SUCCESS", "FAILED", "UNKNOWN"] as const) {
    const html = controls({ ...saved, authority: { ...saved.authority!, decision: { id: "decision", decision: "approve", approvedBy: 4 },
      replay: { id: "request", publication: "published", execution, completedAt: null } } });
    assert.match(html, /Publication: published/);
    assert.match(html, new RegExp(`execution: ${execution}`));
    assert.doesNotMatch(html, />Approve</);
    if (execution === "UNKNOWN") assert.match(html, /No resend/);
  }
});

const historyItem: ReplayRequestHistoryItem = { requestId: "11111111-1111-4111-8111-111111111111",
  approvalId: "22222222-2222-4222-8222-222222222222", proposalId: "33333333-3333-4333-8333-333333333333",
  investigationId: "44444444-4444-4444-8444-444444444444", proposalVersion: 1, publication: "published",
  execution: "SUCCESS", outcome: "accepted", requestedBy: 4, approvedBy: 5,
  createdAt: "2026-10-17T00:00:00.000Z", completedAt: "2026-10-17T00:00:01.000Z" };

test("server capability replaces the fixed disabled paragraph and reports reasons", () => {
  const denied = renderToStaticMarkup(<SavedInvestigationControls saved={saved} pending={false}
    onDecision={() => {}} capabilities={{ investigation: false, replayIntent: false, replayExecution: false,
      releaseReady: false, labProfile: null, reasons: ["release_not_ready", "replay_switch_off"] }} />);
  assert.doesNotMatch(denied, /Live replay is disabled/);
  assert.match(denied, /replay intent: disabled/);
  assert.match(denied, /Release ready: no/);
  assert.match(denied, /release_not_ready/);
  const enabled = renderToStaticMarkup(<SavedInvestigationControls saved={saved} pending={false}
    onDecision={() => {}} capabilities={{ investigation: false, replayIntent: true, replayExecution: true,
      releaseReady: true, labProfile: "triage-lab-v1", reasons: [] }} />);
  assert.match(enabled, /replay execution: enabled/);
  assert.match(enabled, /verified lab profile triage-lab-v1/);
});

test("approval, request publication and worker execution stay separate with cross-investigation history", () => {
  const html = renderToStaticMarkup(<SavedInvestigationControls pending={false} onDecision={() => {}}
    saved={{ ...saved, authority: { ...saved.authority!, decision: { id: "decision", decision: "approve", approvedBy: 5 },
      replay: { id: historyItem.requestId, publication: "published", execution: "SUCCESS", completedAt: historyItem.completedAt },
      replayHistory: [historyItem] } }} />);
  assert.match(html, /Approved by operator 5/);
  assert.match(html, /Approval is recorded but no replay is dispatched yet/);
  assert.match(html, /Request replay/);
  assert.match(html, /Run dry run review/);
  assert.match(html, /Provider outcome: accepted/);
  assert.match(html, new RegExp(historyItem.proposalId));
  assert.match(html, new RegExp(historyItem.investigationId));
});

test("eligibility is reported separately from diagnosis advice", () => {
  const blocked = renderToStaticMarkup(<SavedInvestigationControls pending={false} onDecision={() => {}}
    saved={{ ...saved, authority: { ...saved.authority!, eligibility: { status: "blocked", reasons: ["replay_limit"],
      notBefore: null, requiresOperatorApproval: false, candidateGrounded: false } } }} />);
  assert.match(blocked, /Policy: blocked/);
  assert.match(blocked, /replay_limit/);
  assert.match(blocked, /not grounded/);
});

test("a pending replay action blocks both replay controls", () => {
  const html = renderToStaticMarkup(<SavedInvestigationControls pending={false} onDecision={() => {}}
    replayAction={{ kind: "request", pending: true, message: "Requesting replay…" }}
    saved={{ ...saved, authority: { ...saved.authority!, decision: { id: "decision", decision: "approve", approvedBy: 5 } } }} />);
  assert.match(html, /Replay request in progress/);
  assert.match(html, /disabled/);
});

test("renders the support access blocked state", () => {
  const html = renderToStaticMarkup(
    <TriageResults state={{ kind: "blocked" }} onSelectCase={() => {}} />,
  );

  assert.match(html, /Support access is required/);
});

test("renders loading, empty, and error case discovery states", () => {
  assert.match(
    renderToStaticMarkup(
      <TriageResults state={{ kind: "loading" }} onSelectCase={() => {}} />,
    ),
    /Loading cases/,
  );
  assert.match(
    renderToStaticMarkup(
      <TriageResults state={{ kind: "empty" }} onSelectCase={() => {}} />,
    ),
    /No cases are available/,
  );
  assert.match(
    renderToStaticMarkup(
      <TriageResults
        state={{ kind: "error", message: "The service is unavailable." }}
        onSelectCase={() => {}}
      />,
    ),
    /The service is unavailable/,
  );
});

test("renders an explicit unknown diagnosis with safe citations", () => {
  const html = renderToStaticMarkup(
    <TriageResults
      state={{
        kind: "result",
        caseId: "case-1",
        result: {
          status: "abstained",
          diagnosis: {
            taxonomy_id: "unknown",
            summary: "Delivery status cannot be confirmed.",
            confidence: "low",
            evidence_refs: ["attempt:2"],
            missing_evidence: ["provider_delivery_receipt"],
          },
          proposal: {
            disposition: "outcome_unknown",
            kind: "no_action",
            summary: "Do not replay while delivery is unknown.",
            reasons: ["The provider receipt is unavailable."],
            evidence_refs: ["attempt:2"],
            runbook_citations: ["RB-F07@1.0.0#unknown-delivery"],
            preconditions: [],
            not_before: null,
          },
        },
      }}
      onSelectCase={() => {}}
    />,
  );

  assert.match(html, /Outcome unknown/);
  assert.match(html, /RB-F07@1.0.0#unknown-delivery/);
  assert.doesNotMatch(html, /<script/);
});
