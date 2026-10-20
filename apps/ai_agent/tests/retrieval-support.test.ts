import { expect, test } from "bun:test";
import type { StructuredRunbookSearchInput } from "../src/tools/retrieval-profile.ts";
import type { RunbookMatch } from "../src/tools/search-runbooks.ts";
import { decideSupport } from "../src/tools/retrieval-support.ts";

const supportMatch = (
  citation: string,
  heading: string,
  content: string,
): RunbookMatch => ({
  runbookId: "RB-F01-F02",
  version: "1.0.0",
  citation,
  heading,
  content,
  contentHash: "a".repeat(64),
  taxonomy: ["F01"],
  providers: ["telegram"],
  simulated: true,
  authority: "untrusted_procedural_guidance",
  canChangePolicy: false,
  score: 0.5,
});

const genericEvidenceMatch = supportMatch(
  "RB-F01-F02@1.0.0#evidence-needed",
  "Evidence needed",
  "Require the provider and bounded status.",
);
const rateLimitMatch = supportMatch(
  "RB-F01-F02@1.0.0#allowed-remediation",
  "Allowed remediation",
  "Wait for the recorded 429 retry-after before any replay.",
);
const withRoute: StructuredRunbookSearchInput = {
  query: "429",
  route: { hints: ["F01"], confident: true, reasons: ["provider_status:429"] },
};
const noRouteInput: StructuredRunbookSearchInput = { query: "failure" };

test("abstains when there is no candidate", () => {
  expect(decideSupport([], withRoute)).toEqual({
    abstain: true,
    reason: "no_candidates",
  });
});

test("abstains on a generic section with no route and no observed anchor", () => {
  expect(decideSupport([genericEvidenceMatch], noRouteInput)).toEqual({
    abstain: true,
    reason: "no_observed_anchor",
  });
});

test("keeps a routed observed 429 section", () => {
  expect(
    decideSupport([rateLimitMatch], {
      ...withRoute,
      anchors: ["429", "telegram"],
    }),
  ).toEqual({ abstain: false, reason: "supported" });
});

test("requires the calibrated number of distinct anchors", () => {
  expect(
    decideSupport(
      [rateLimitMatch],
      { query: "429", anchors: ["429"] },
      { minAnchorHits: 2 },
    ),
  ).toEqual({ abstain: true, reason: "no_observed_anchor" });
});
