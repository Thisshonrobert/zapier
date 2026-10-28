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
  deriveSignals,
  evidenceAnchors,
  faultSignalKeys,
  observedFacts,
  requestedFacetsForSignals,
  requestedGuidanceFacets,
  routeEvidence,
  selectRequestedFacets,
  type EvidenceSignals,
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

type TransportOverrides = {
  finalError: string;
  provider?: string | null;
  phase?: string | null;
  status?: number | null;
  fixtureFacts?: string[];
  providerOutcome?: string | null;
};

// Start from a real no-signal no-match fixture, then expose only the transport
// observation under test. Everything else is cleared so a route can only come
// from the typed vocabulary.
const transportEvidence = ({
  finalError,
  provider = null,
  phase = null,
  status = null,
  fixtureFacts = [],
  providerOutcome = "rejected",
}: TransportOverrides): DiagnosisEvidence => {
  const evidence = structuredClone(
    evidenceFor("nm05-email-invalid-region"),
  ) as DiagnosisEvidence & {
    failureContext: {
      facts: { retry: Record<string, unknown> };
      fixture_observation: Record<string, unknown>;
    };
    executionEvidence: { facts: Record<string, unknown> };
    inputValidation: { facts: Record<string, unknown> };
  };
  const retry = evidence.failureContext.facts.retry;
  retry.final_error = finalError;
  retry.provider = provider;
  retry.phase = phase;
  retry.provider_status = status;
  retry.provider_outcome = providerOutcome;
  retry.retry_after_seconds = null;
  retry.safe_code = null;
  evidence.failureContext.fixture_observation.final_error = finalError;
  evidence.failureContext.fixture_observation.provider = provider;
  evidence.failureContext.fixture_observation.observed_facts = fixtureFacts;
  evidence.failureContext.fixture_observation.delivery_outcome = "rejected";
  evidence.failureContext.fixture_observation.execution_status = "FAILED";
  evidence.executionEvidence.facts.attempts = [];
  evidence.executionEvidence.facts.current_execution = null;
  evidence.executionEvidence.facts.ordering = {
    status: "unknown",
    missing_predecessor_stages: [],
  };
  const validation = evidence.inputValidation.facts;
  validation.validation_status = "valid";
  validation.missing_required_fields = [];
  validation.invalid_field_types = [];
  validation.missing_template_paths = [];
  validation.credential_presence = [];
  validation.supported = null;
  return evidence;
};

describe("typed transport route", () => {
  test("errno token self-routes with a typed reason", () => {
    const route = routeEvidence(
      transportEvidence({ finalError: "connect ETIMEDOUT" }),
    );
    expect(route.hints).toEqual(["F02"]);
    expect(route.reasons).toContain(
      "final_error_transport:errno:etimedout",
    );
  });

  test("weak token routes only with an observed corroborator", () => {
    const route = routeEvidence(
      transportEvidence({
        finalError: "timed out",
        provider: "smtp",
        phase: "pre_send",
      }),
    );
    expect(route.hints).toEqual(["F02"]);
    expect(
      route.reasons.some((reason) =>
        reason.startsWith("final_error_transport:weak:timed out+"),
      ),
    ).toBe(true);
  });

  test("a corroborated weak route cites the phase, not the provider", () => {
    const route = routeEvidence(
      transportEvidence({
        finalError: "timed out",
        provider: "smtp",
        phase: "pre_send",
      }),
    );
    expect(route.reasons).toEqual([
      "final_error_transport:weak:timed out+phase:pre_send",
    ]);
  });

  test("a provider name alone does not corroborate a weak token", () => {
    expect(
      routeEvidence(transportEvidence({ finalError: "timed out", provider: "smtp" })),
    ).toEqual({ hints: [], confident: false, reasons: [] });
  });

  test("worker admission refusal stays unrouted even with a provider", () => {
    expect(
      routeEvidence(
        transportEvidence({
          finalError: "worker admission refused: local queue capacity",
          provider: "smtp",
        }),
      ),
    ).toEqual({ hints: [], confident: false, reasons: [] });
  });

  test("TLS handshake failure routes to F02", () => {
    expect(
      routeEvidence(transportEvidence({ finalError: "TLS handshake failed" })).hints,
    ).toEqual(["F02"]);
  });

  test("DNS token self-routes and prefers the specific code", () => {
    const route = routeEvidence(
      transportEvidence({ finalError: "DNS lookup returned EAI_AGAIN" }),
    );
    expect(route.hints).toEqual(["F02"]);
    expect(route.reasons).toContain("final_error_transport:dns:eai_again");
  });

  test("errno token inside a longer error self-routes", () => {
    const route = routeEvidence(
      transportEvidence({
        finalError: "connect ECONNREFUSED 10.0.0.4:25",
      }),
    );
    expect(route.hints).toEqual(["F02"]);
    expect(route.reasons).toContain(
      "final_error_transport:errno:econnrefused",
    );
  });

  test("worker admission refusal never routes", () => {
    expect(
      routeEvidence(
        transportEvidence({
          finalError: "worker admission refused: local queue capacity",
        }),
      ),
    ).toEqual({ hints: [], confident: false, reasons: [] });
  });

  test("database lock timeout never routes", () => {
    expect(
      routeEvidence(
        transportEvidence({
          finalError: "database query timed out acquiring lock",
        }),
      ),
    ).toEqual({ hints: [], confident: false, reasons: [] });
  });

  test("a bare weak word with no corroborator never routes", () => {
    expect(
      routeEvidence(transportEvidence({ finalError: "request refused" })),
    ).toEqual({ hints: [], confident: false, reasons: [] });
  });

  test("every bare ambiguous word stays unrouted", () => {
    for (const word of ["refused", "reset", "timeout", "timed out", "network"]) {
      expect(
        routeEvidence(transportEvidence({ finalError: `request ${word}` })),
      ).toEqual({ hints: [], confident: false, reasons: [] });
    }
  });

  test("unambiguous phrases and typed codes route F02", () => {
    for (const text of [
      "connection refused",
      "connect ECONNREFUSED",
      "EAI_AGAIN",
      "ETIMEDOUT",
    ]) {
      const route = routeEvidence(transportEvidence({ finalError: text }));
      expect(route.hints).toEqual(["F02"]);
      expect(route.reasons.some((reason) => reason.startsWith("final_error_transport:"))).toBe(
        true,
      );
    }
  });
});

describe("per-signal facet derivation", () => {
  const emptySignals = (): EvidenceSignals => ({
    dedupWindowExpired: false,
    deliveryUnknown: false,
    outcomeUnknown: false,
    rateLimited: false,
    transport: false,
    credential: false,
    validation: false,
    handler: false,
    ordering: false,
    duplicate: false,
    sdk: false,
    publication: false,
  });

  test("no signal keeps the unchanged default demand", () => {
    expect(requestedFacetsForSignals(emptySignals())).toEqual([
      "investigation",
      "evidence",
      "remediation",
    ]);
  });

  test("outcomeUnknown alone never adds forbidden", () => {
    expect(
      requestedFacetsForSignals({ ...emptySignals(), outcomeUnknown: true }),
    ).toEqual(["verification", "evidence"]);
  });

  test("the verification invariant holds over every signal subset", () => {
    const keys = faultSignalKeys;
    expect(keys).toHaveLength(11);
    for (let mask = 1; mask < 2 ** keys.length; mask += 1) {
      const signals = emptySignals();
      keys.forEach((key, index) => {
        signals[key] = Boolean(mask & (1 << index));
      });
      const facets = requestedFacetsForSignals(signals);
      expect(facets).toContain("verification");
      expect(facets).toHaveLength(3);
    }
  });

  test("deliveryUnknown alone requests remediation instead of forbidden", () => {
    expect(
      requestedFacetsForSignals({ ...emptySignals(), deliveryUnknown: true }),
    ).toEqual(["investigation", "remediation", "verification"]);
  });

  test("an expired dedup window outranks deliveryUnknown without suppression", () => {
    expect(
      requestedFacetsForSignals({
        ...emptySignals(),
        dedupWindowExpired: true,
        deliveryUnknown: true,
      }),
    ).toEqual(["remediation", "forbidden", "verification"]);
  });

  test("concurrent and malformed idempotency no-match evidence never signals", () => {
    for (const id of [
      "nm02-email-concurrent-idempotency",
      "nm08-email-invalid-idempotency-key",
    ]) {
      const signals = deriveSignals(evidenceFor(id));
      expect(signals.dedupWindowExpired).toBe(false);
      expect(signals.deliveryUnknown).toBe(false);
    }
  });

  test("publication plus bookkeeping-only unknown keeps verification", () => {
    const signals = {
      ...emptySignals(),
      publication: true,
      outcomeUnknown: true,
    };
    expect(requestedFacetsForSignals(signals)).toEqual([
      "investigation",
      "remediation",
      "verification",
    ]);
    expect(deriveSignals(evidenceFor("f09-database-sink-only")).publication).toBe(
      true,
    );
  });

  test("drop order removes evidence before verification", () => {
    const selection = selectRequestedFacets({
      ...emptySignals(),
      publication: true,
      outcomeUnknown: true,
    });
    expect(selection.facets).toEqual([
      "investigation",
      "remediation",
      "verification",
    ]);
    expect(selection.dropped).toEqual(["evidence"]);
  });

  test("drop order removes replay before investigation", () => {
    const selection = selectRequestedFacets({
      ...emptySignals(),
      rateLimited: true,
      transport: true,
    });
    expect(selection.facets).toEqual([
      "remediation",
      "verification",
      "investigation",
    ]);
    expect(selection.dropped).toEqual(["replay"]);
  });

  test("a no-signal observation drops nothing", () => {
    expect(selectRequestedFacets(emptySignals())).toEqual({
      facets: ["investigation", "evidence", "remediation"],
      dropped: [],
    });
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

  test("bare refused does not set route.confident", () => {
    const input = buildStructuredRetrievalInput(
      transportEvidence({ finalError: "request refused" }),
    );
    expect(input.route?.confident).toBe(false);
    expect(input.trace?.weakTokenRejected).toContain(
      "weak_token_rejected:no_transport_corroborator",
    );
  });

  test("worker admission refused does not set a confident route", () => {
    const input = buildStructuredRetrievalInput(
      transportEvidence({
        finalError: "worker admission refused: local queue capacity",
        provider: "smtp",
        providerOutcome: null,
      }),
    );
    expect(input.route?.confident).toBe(false);
  });

  test("confident transport route sets route.confident", () => {
    const input = buildStructuredRetrievalInput(
      transportEvidence({ finalError: "connect ECONNREFUSED 10.0.0.4:25" }),
    );
    expect(input.route?.confident).toBe(true);
    expect(input.trace?.weakTokenRejected).toEqual([]);
  });

  test("the trace exposes dropped facets", () => {
    const input = buildStructuredRetrievalInput(
      evidenceFor("f09-database-sink-only"),
    );
    expect(input.trace?.facetSelection.requested).toEqual([
      ...(input.requestedFacets ?? []),
    ]);
    expect(input.trace?.facetSelection.dropped).toEqual([]);
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
    ).toEqual(["investigation", "remediation", "verification"]);
    expect(
      requestedGuidanceFacets(evidenceFor("f08-success-stage-republished")),
    ).toEqual(["investigation", "forbidden", "verification"]);
    expect(
      requestedGuidanceFacets(evidenceFor("f10-sdk-error-recorded-success")),
    ).toEqual(["investigation", "remediation", "verification"]);
    expect(
      requestedGuidanceFacets(evidenceFor("s05-expired-email-dedup-window")),
    ).toEqual(["remediation", "forbidden", "verification"]);
  });
});
