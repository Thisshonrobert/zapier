import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { DiagnosisEvidence } from "../src/contracts.ts";
import { loadTargetCases } from "../src/evaluation/retrieval-target.ts";
import { retrievalInput } from "../src/graph.ts";
import { defaultRunbookDirectory } from "../src/paths.ts";
import {
  loadRunbooks,
  type RunbookSearchInput,
} from "../src/tools/search-runbooks.ts";
import {
  buildStructuredRetrievalInput,
  evidenceAnchors,
  observedFacts,
  requestedGuidanceFacets,
  routeEvidence,
} from "../src/tools/retrieval-profile.ts";

const taskA = JSON.parse(
  readFileSync(
    join(
      import.meta.dir,
      "../evaluation/production-selection/runs/task-a-20261013-v1/development-inputs.json",
    ),
    "utf8",
  ),
) as Array<{
  id: string;
  input: RunbookSearchInput;
  evidence: DiagnosisEvidence;
}>;

const review = JSON.parse(
  readFileSync(
    join(
      import.meta.dir,
      "../evaluation/production-selection/development-review-v3.json",
    ),
    "utf8",
  ),
) as {
  cases: Array<{
    id: string;
    kind: "answerable" | "no_match";
    evidence: DiagnosisEvidence;
  }>;
};

const evidenceFor = (id: string): DiagnosisEvidence =>
  taskA.find((item) => item.id === id)?.evidence ??
  review.cases.find((item) => item.id === id)!.evidence;

describe("legacy retrieval input", () => {
  test("remains byte-for-byte stable over all task-A evidence bundles", () => {
    const withEvidence = taskA.filter((item) => item.evidence);
    expect(withEvidence).toHaveLength(16);
    for (const item of withEvidence)
      expect(
        retrievalInput(
          item.evidence as Parameters<typeof retrievalInput>[0],
        ),
      ).toEqual(item.input);
  });

  test("task-A contexts without evidence are the authorization rejections", () => {
    expect(taskA.filter((item) => !item.evidence).map((item) => item.id)).toEqual([
      "f06-malformed-envelope",
      "s01-cross-tenant-case",
    ]);
  });
});

describe("observed facts", () => {
  test("derives the 429 and retry-after from fixture observations", () => {
    expect(observedFacts(evidenceFor("f01-rate-limit-rejected"))).toMatchObject({
      provider: "telegram",
      status: 429,
      retryAfterSeconds: 30,
      deliveryUnknown: false,
      fixtureFacts: ["all_attempts_rejected", "retry_after_30_seconds"],
    });
  });

  test("does not invent facts that are absent from the evidence", () => {
    expect(observedFacts(evidenceFor("nm05-email-invalid-region"))).toMatchObject({
      status: 422,
      retryAfterSeconds: null,
      deliveryUnknown: false,
      ordering: "unknown",
    });
  });
});

describe("evidence route", () => {
  test("routes an explicit 429 to F01", () => {
    expect(routeEvidence(evidenceFor("f01-rate-limit-rejected"))).toMatchObject({
      hints: ["F01"],
      confident: true,
    });
  });

  test("routes ambiguous delivery to F07 without inventing a cause", () => {
    expect(
      routeEvidence(evidenceFor("f07-provider-response-lost")).hints,
    ).toContain("F07");
  });

  test("returns no route for every development no-match incident", () => {
    for (const item of review.cases.filter((candidate) => candidate.kind === "no_match")) {
      expect(routeEvidence(item.evidence)).toEqual({
        hints: [],
        confident: false,
        reasons: [],
      });
    }
  });

  test("routes credential and destination faults from fixture observations", () => {
    expect(routeEvidence(evidenceFor("f03-token-missing")).hints).toContain("F03");
    expect(routeEvidence(evidenceFor("f03-permission-ambiguous")).hints).toContain("F03");
    expect(routeEvidence(evidenceFor("s03-sensitive-fields-present")).hints).toContain("F03");
    expect(routeEvidence(evidenceFor("f04-template-path-missing")).hints).toContain("F04");
    expect(routeEvidence(evidenceFor("f04-invalid-destination")).hints).toContain("F04");
  });

  test("routes unsupported handlers, duplicates, DLQ gaps, and SDK errors", () => {
    expect(routeEvidence(evidenceFor("f05-unsupported-action")).hints).toContain("F05");
    expect(routeEvidence(evidenceFor("f05-handler-version-unknown")).hints).toContain("F05");
    expect(routeEvidence(evidenceFor("f08-duplicate-retry-row")).hints).toContain("F08");
    expect(routeEvidence(evidenceFor("f09-database-sink-only")).hints).toContain("F09");
    expect(routeEvidence(evidenceFor("f10-sdk-error-recorded-success")).hints).toContain("F10");
  });

  test("a bare 403 routes nowhere", () => {
    const evidence = structuredClone(
      evidenceFor("nm04-email-sender-domain-unverified"),
    ) as DiagnosisEvidence & {
      failureContext: {
        facts: { retry: Record<string, unknown> };
        fixture_observation: { observed_facts: string[] };
      };
    };
    evidence.failureContext.facts.retry.provider_status = 403;
    evidence.failureContext.facts.retry.safe_code = null;
    evidence.failureContext.facts.retry.final_error = null;
    evidence.failureContext.fixture_observation.observed_facts = [];

    expect(routeEvidence(evidence)).toEqual({
      hints: [],
      confident: false,
      reasons: [],
    });
  });

  test("email alone does not route to F10", () => {
    const evidence = structuredClone(
      evidenceFor("f10-sdk-error-recorded-success"),
    ) as DiagnosisEvidence & {
      failureContext: {
        facts: { retry: Record<string, unknown> };
        fixture_observation: { observed_facts: string[]; execution_status: string };
      };
    };
    evidence.failureContext.fixture_observation.observed_facts = [];
    evidence.failureContext.fixture_observation.execution_status = "FAILED";
    evidence.failureContext.facts.retry.provider_outcome = "rejected";

    expect(routeEvidence(evidence).hints).not.toContain("F10");
  });

  test("records only bounded, safe reasons", () => {
    const route = routeEvidence(evidenceFor("f01-rate-limit-rejected"));
    expect(route.reasons).toContain("provider_status:429");
    expect(route.reasons.join(" ")).not.toContain("Telegram sendMessage");
    expect(route.reasons.length).toBeLessThanOrEqual(32);
  });
});

describe("route coverage", () => {
  test("covers every accepted development citation", async () => {
    const index = await loadRunbooks(defaultRunbookDirectory());
    const byCitation = new Map(index.map((section) => [section.citation, section]));
    const cases = await loadTargetCases(
      join(import.meta.dir, "../evaluation/r3/development-cases-v1.json"),
    );
    let accepted = 0;
    let covered = 0;

    for (const item of cases.filter((candidate) => candidate.kind === "answerable")) {
      const hints = new Set(
        routeEvidence(evidenceFor(item.id)).hints.map((hint) => hint.toLowerCase()),
      );
      for (const facet of item.requiredFacets) {
        for (const citation of facet.accepted) {
          const section = byCitation.get(citation);
          expect(section).toBeDefined();
          accepted += 1;
          if (
            hints.size === 0 ||
            section!.taxonomy.some((taxonomy) => hints.has(taxonomy.toLowerCase()))
          )
            covered += 1;
        }
      }
    }

    expect(accepted).toBeGreaterThan(0);
    expect(covered / accepted).toBe(1);
  });
});

describe("structured retrieval input", () => {
  test("removes fixture-only controls and keeps observed anchors", () => {
    const input = buildStructuredRetrievalInput(
      evidenceFor("f01-rate-limit-rejected"),
    );

    expect(input.query).not.toContain("controlled_fixture");
    expect(input.query).not.toContain("support_unknown");
    expect(input.query).not.toContain("fixture_inputs_unavailable");
    expect(input.query).toContain("429");
    expect(input.route?.hints).toContain("F01");
    expect(input.anchors).toContain("429");
    expect(input.requestedFacets).toEqual([
      "remediation",
      "replay",
      "verification",
    ]);
  });

  test("anchors exclude generic fields that every runbook repeats", () => {
    const anchors = evidenceAnchors(evidenceFor("f01-rate-limit-rejected"));
    expect(anchors).not.toContain("telegram");
    expect(anchors).not.toContain("blocked");
    expect(anchors).not.toContain("FAILED");
  });

  test("requests the facets each evidence family needs", () => {
    expect(requestedGuidanceFacets(evidenceFor("f02-connection-refused"))).toEqual([
      "investigation",
      "remediation",
      "verification",
    ]);
    expect(requestedGuidanceFacets(evidenceFor("f05-unsupported-action"))).toEqual([
      "investigation",
      "replay",
      "verification",
    ]);
    expect(
      requestedGuidanceFacets(evidenceFor("f07-provider-response-lost")),
    ).toEqual(["investigation", "remediation", "forbidden"]);
    expect(
      requestedGuidanceFacets(evidenceFor("f08-success-stage-republished")),
    ).toEqual(["investigation", "forbidden", "verification"]);
    expect(
      requestedGuidanceFacets(evidenceFor("f10-sdk-error-recorded-success")),
    ).toEqual(["investigation", "remediation", "forbidden"]);
    expect(
      requestedGuidanceFacets(evidenceFor("s05-expired-email-dedup-window")),
    ).toEqual(["investigation", "remediation", "forbidden"]);
  });
});
