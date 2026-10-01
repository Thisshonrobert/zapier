import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { SavedInvestigationControls, TriageResults } from "./TriageResults";
import type { SavedInvestigation } from "../../types/triage";

const saved: SavedInvestigation = { id: "saved", status: "proposed", result: null, authority: {
  id: "proposal", version: 1, status: "requires_approval", expiresAt: "2099-01-01T00:00:00Z",
  reasons: [], allowedDecisions: ["approve", "reject"], decision: null, replay: null, replayEnabled: false,
} };
const controls = (value: SavedInvestigation, pending = false) => renderToStaticMarkup(
  <SavedInvestigationControls saved={value} pending={pending} onDecision={() => {}} />);

test("approval controls distinguish approval from replay and lock repeated clicks", () => {
  assert.match(controls(saved), /Approve/);
  assert.match(controls(saved), /does not initiate replay/);
  assert.match(controls(saved, true), /disabled/);
  assert.match(controls(saved, true), /Saving decision/);
});

test("expired and blocked proposals cannot offer approval", () => {
  assert.match(controls({ ...saved, authority: { ...saved.authority!, expiresAt: "2000-01-01" } }), /expired/);
  assert.doesNotMatch(controls({ ...saved, authority: { ...saved.authority!, allowedDecisions: [], reasons: ["changed_fingerprint"] } }), />Approve</);
});

test("publication is separate from success, failure and terminal unknown", () => {
  for (const execution of ["PENDING", "SUCCESS", "FAILED", "UNKNOWN"] as const) {
    const html = controls({ ...saved, authority: { ...saved.authority!, decision: { id: "decision", decision: "approve", approvedBy: 4 },
      replay: { id: "request", publication: "published", execution, completedAt: null } } });
    assert.match(html, /Publication: published/);
    assert.match(html, new RegExp(`Execution: ${execution}`));
    assert.doesNotMatch(html, />Approve</);
    if (execution === "UNKNOWN") assert.match(html, /No resend/);
  }
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
