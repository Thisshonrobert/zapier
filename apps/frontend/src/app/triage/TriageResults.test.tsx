import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { TriageResults } from "./TriageResults";

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
