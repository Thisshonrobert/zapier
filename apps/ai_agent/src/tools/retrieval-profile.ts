// Structured evidence profile for runbook retrieval.
//
// Everything here is derived from observed evidence only. Case ids, scenario
// families, expected diagnoses, and gold citations never enter the query, the
// route hints, the requested facets, or the anchors.
import type { DiagnosisEvidence } from "../contracts.ts";
import type { RunbookSearchInput } from "./search-runbooks.ts";

export type ObservedFacts = {
  finalError: string | null;
  actionType: string | null;
  provider: string | null;
  phase: string | null;
  outcome: string | null;
  status: number | null;
  retryAfterSeconds: number | null;
  safeCode: string | null;
  executionStatus: string | null;
  executionOutcome: string | null;
  ordering: string | null;
  missingPredecessors: number[];
  validationStatus: string | null;
  supported: boolean | null;
  blockedReasons: string[];
  missingFields: string[];
  invalidFields: string[];
  missingTemplates: string[];
  absentCredentials: string[];
  attempts: string[];
  providers: string[];
  sourceKind: string | null;
  fixtureFacts: string[];
  deliveryUnknown: boolean;
  outcomeUnknown: boolean;
};

export type EvidenceSignals = {
  dedupWindowExpired: boolean;
  deliveryUnknown: boolean;
  outcomeUnknown: boolean;
  rateLimited: boolean;
  transport: boolean;
  credential: boolean;
  validation: boolean;
  handler: boolean;
  ordering: boolean;
  duplicate: boolean;
  sdk: boolean;
  publication: boolean;
};

export type RequestedFacet =
  | "symptoms"
  | "evidence"
  | "investigation"
  | "remediation"
  | "forbidden"
  | "replay"
  | "verification";

export type EvidenceRoute = {
  hints: string[];
  confident: boolean;
  reasons: string[];
};

// Observation-only trace. It exists so the evaluation ledger can attribute a
// miss to a dropped facet or a rejected weak token; it never influences ranking.
export type RetrievalProfileTrace = {
  facetSelection: {
    requested: RequestedFacet[];
    dropped: RequestedFacet[];
  };
  weakTokenRejected: string[];
};

export type StructuredRunbookSearchInput = RunbookSearchInput & {
  route?: EvidenceRoute;
  requestedFacets?: readonly RequestedFacet[];
  anchors?: readonly string[];
  trace?: RetrievalProfileTrace;
};

const ignoredFixtureTokens = new Set([
  "controlled_fixture",
  "support_unknown",
  "fixture_inputs_unavailable",
]);

const normalize = (value: string) =>
  value.replaceAll("_", " ").replace(/\s+/g, " ").trim();

// Error text is untrusted search data. Remove credential/PII-shaped values before
// truncation; keep only bounded observations, never expected evaluation labels.
export function sanitizedQueryText(value: string): string {
  return value
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, " ")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+={0,2}/gi, " ")
    .replace(/\b\d{6,12}:[A-Za-z0-9_-]{20,}\b/g, " ")
    .replace(
      /\b(?:[a-z_]*token|[a-z_]*key|password|secret|authorization)\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi,
      " ",
    )
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function boundedHttpStatus(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.match(/\b([1-5]\d{2})\b/);
  return match ? Number(match[1]) : null;
}

function retryAfterFromError(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.match(/\bretry[_\s-]*after[_\s-]*(\d{1,5})\b/i);
  return match ? Number(match[1]) : null;
}

function retryAfterFromFixtureFacts(values: readonly string[]): number | null {
  for (const value of values) {
    const match = value.match(/^retry_after_(\d{1,5})_seconds$/i);
    if (match) return Number(match[1]);
  }
  return null;
}

const firstPresent = <T>(values: readonly (T | null | undefined)[]): T | null =>
  values.find((value): value is T => value !== null && value !== undefined) ??
  null;

export function observedFacts(evidence: DiagnosisEvidence): ObservedFacts {
  const failure = evidence.failureContext.facts;
  const execution = evidence.executionEvidence.facts;
  const validation = evidence.inputValidation.facts;
  const fixture = evidence.failureContext.simulated
    ? evidence.failureContext.fixture_observation
    : undefined;
  const attempts = execution.attempts;
  const fixtureFacts = fixture?.observed_facts ?? [];
  const attemptStatus = firstPresent(
    attempts.map((attempt) => attempt.provider_status),
  );
  const attemptPhase = firstPresent(attempts.map((attempt) => attempt.phase));
  const attemptSafeCode = firstPresent(
    attempts.map((attempt) => attempt.safe_code),
  );
  const finalError =
    failure.retry.final_error ?? fixture?.final_error ?? null;
  const provider = failure.retry.provider ?? fixture?.provider ?? null;
  const executionStatus =
    execution.current_execution?.status ?? fixture?.execution_status ?? null;
  const executionOutcome =
    execution.current_execution?.provider_outcome ??
    fixture?.delivery_outcome ??
    null;
  const observedOutcomes = [
    failure.retry.provider_outcome,
    execution.current_execution?.provider_outcome,
    ...attempts.map((attempt) => attempt.provider_outcome),
    fixture?.delivery_outcome,
  ];
  const attemptValues = attempts.flatMap((attempt) => [
    attempt.provider,
    attempt.phase,
    attempt.provider_outcome,
    attempt.safe_code,
    attempt.provider_status?.toString(),
  ]);
  const providers = [
    ...new Set(
      [failure.retry.provider, ...attempts.map((attempt) => attempt.provider)]
        .filter((value): value is string => Boolean(value))
        .map((value) => value.toLowerCase()),
    ),
  ];
  const conclusiveOutcomes = new Set([
    "rejected",
    "failed",
    "delivered",
    "accepted",
  ]);
  const hasConclusiveOutcome = observedOutcomes.some(
    (value) =>
      value !== null &&
      value !== undefined &&
      conclusiveOutcomes.has(value.toLowerCase()),
  );
  const providerBoundaryUnknown =
    observedOutcomes.some(
      (value) => value !== null && value?.toLowerCase() === "unknown",
    ) ||
    executionStatus === "UNKNOWN" ||
    executionStatus === "PENDING" ||
    fixtureFacts.includes("request_transmitted") ||
    fixtureFacts.includes("response_missing") ||
    /response was lost/i.test(finalError ?? "");

  return {
    finalError,
    actionType: failure.current_action_type ?? validation.action_type ?? null,
    provider,
    phase: failure.retry.phase ?? attemptPhase ?? null,
    outcome: failure.retry.provider_outcome ?? null,
    status:
      failure.retry.provider_status ??
      attemptStatus ??
      boundedHttpStatus(finalError),
    retryAfterSeconds:
      failure.retry.retry_after_seconds ??
      retryAfterFromError(finalError) ??
      retryAfterFromFixtureFacts(fixtureFacts),
    safeCode: failure.retry.safe_code ?? attemptSafeCode ?? null,
    executionStatus,
    executionOutcome,
    ordering: execution.ordering.status,
    missingPredecessors: [...execution.ordering.missing_predecessor_stages],
    validationStatus: validation.validation_status,
    supported: validation.supported,
    blockedReasons: [...validation.blocked_reasons],
    missingFields: [...validation.missing_required_fields],
    invalidFields: validation.invalid_field_types.map((item) => item.field),
    missingTemplates: [...validation.missing_template_paths],
    absentCredentials: validation.credential_presence
      .filter((item) => !item.present)
      .map((item) => item.field),
    attempts: attemptValues.filter(
      (value): value is string => Boolean(value),
    ),
    providers,
    sourceKind: failure.source_kind,
    fixtureFacts: [...fixtureFacts],
    // Provider-boundary unknown with no conclusive terminal outcome is the F07
    // signal. An isolated retry-bookkeeping unknown alongside a conclusive
    // outcome is outcomeUnknown and must not route to F07 or add `forbidden`.
    deliveryUnknown: providerBoundaryUnknown && !hasConclusiveOutcome,
    outcomeUnknown: providerBoundaryUnknown && hasConclusiveOutcome,
  };
}

const containsAny = (value: string | null, pattern: RegExp): boolean =>
  value ? pattern.test(value) : false;

const matchedToken = (value: string | null, pattern: RegExp): string | null => {
  if (!value) return null;
  const match = value.match(pattern);
  return match ? match[0].toLowerCase() : null;
};

const fixtureFactHits = (
  facts: readonly string[],
  pattern: RegExp,
): string[] =>
  facts.filter((fact) => pattern.test(fact)).map((fact) => fact.toLowerCase());

function boundedReason(reasons: string[], value: string): void {
  if (!reasons.includes(value) && reasons.length < 32) reasons.push(value);
}

type TransportClass = "errno" | "dns" | "phrase" | "weak";

// Closed transport vocabulary. A token's class decides whether it is
// sufficient on its own; weak words only fire with an observed corroborator and
// never when the same text names a non-provider subsystem.
const transportVocabulary: Record<
  TransportClass,
  ReadonlyArray<{ token: string; pattern: RegExp }>
> = {
  errno: [
    { token: "ECONNREFUSED", pattern: /\bECONNREFUSED\b/i },
    { token: "ECONNRESET", pattern: /\bECONNRESET\b/i },
    { token: "ECONNABORTED", pattern: /\bECONNABORTED\b/i },
    { token: "EPIPE", pattern: /\bEPIPE\b/i },
    { token: "ETIMEDOUT", pattern: /\bETIMEDOUT\b/i },
    { token: "EHOSTUNREACH", pattern: /\bEHOSTUNREACH\b/i },
    { token: "ENETUNREACH", pattern: /\bENETUNREACH\b/i },
  ],
  dns: [
    { token: "ENOTFOUND", pattern: /\bENOTFOUND\b/i },
    { token: "EAI_AGAIN", pattern: /\bEAI_AGAIN\b/i },
    { token: "EAI_NONAME", pattern: /\bEAI_NONAME\b/i },
    { token: "EAI_FAIL", pattern: /\bEAI_FAIL\b/i },
    { token: "getaddrinfo", pattern: /\bgetaddrinfo\b/i },
    { token: "name resolution", pattern: /\bname resolution\b/i },
    { token: "DNS lookup", pattern: /\bDNS lookup\b/i },
  ],
  phrase: [
    { token: "connection refused", pattern: /\bconnection refused\b/i },
    { token: "connect refused", pattern: /\bconnect refused\b/i },
    { token: "connection reset", pattern: /\bconnection reset\b/i },
    { token: "socket hang up", pattern: /\bsocket hang up\b/i },
    { token: "TLS handshake", pattern: /\bTLS handshake\b/i },
    { token: "network unreachable", pattern: /\bnetwork unreachable\b/i },
    { token: "host unreachable", pattern: /\bhost unreachable\b/i },
  ],
  weak: [
    { token: "timed out", pattern: /\btimed out\b/i },
    { token: "timeout", pattern: /\btimeout\b/i },
    { token: "network", pattern: /\bnetwork\b/i },
    { token: "refused", pattern: /\brefused\b/i },
    { token: "reset", pattern: /\breset\b/i },
  ],
};

const nonProviderSubsystem =
  /\b(?:database|postgres|postgresql|prisma|advisory|lock|queue capacity|admission|scheduler|heap|out of memory)\b/i;

function transportObservation(facts: ObservedFacts): {
  routed: boolean;
  reasons: string[];
  rejectedWeakTokens: string[];
} {
  const text = facts.finalError;
  if (!text) return { routed: false, reasons: [], rejectedWeakTokens: [] };

  const matches: Array<{ transportClass: TransportClass; token: string }> = [];
  for (const transportClass of ["errno", "dns", "phrase", "weak"] as const) {
    const match = transportVocabulary[transportClass].find((entry) =>
      entry.pattern.test(text),
    );
    if (match)
      matches.push({
        transportClass,
        token: match.token.toLowerCase(),
      });
  }

  // A provider name only says which subsystem observed the failure. It is not
  // evidence that the transport failed, so it never corroborates a weak token.
  const corroborators: string[] = [];
  const phase = facts.phase?.toLowerCase();
  if (phase && ["pre_send", "connect", "dns", "resolve"].includes(phase))
    corroborators.push(`phase:${phase}`);
  for (const fact of facts.fixtureFacts)
    if (fact === "failure_before_send" || fact === "all_attempts_not_delivered")
      corroborators.push(`fixture_fact:${fact}`);
  if (facts.status !== null) corroborators.push(`status:${facts.status}`);

  const strong = matches.filter(
    (match) => match.transportClass !== "weak",
  );
  const weak = matches.find((match) => match.transportClass === "weak");
  const weakRejectedBySubsystem = Boolean(weak) && nonProviderSubsystem.test(text);
  const weakRouted =
    Boolean(weak) && !weakRejectedBySubsystem && corroborators.length > 0;
  const reasons = strong.map(
    (match) =>
      `final_error_transport:${match.transportClass}:${match.token}`,
  );
  if (weakRouted && weak)
    reasons.push(
      `final_error_transport:weak:${weak.token}+${corroborators[0]}`,
    );

  // The trace keeps the rejection visible without putting it into the route
  // reason list, which must stay empty for an unrouted observation.
  const rejectedWeakTokens: string[] = [];
  if (weak && !weakRouted)
    rejectedWeakTokens.push(
      weakRejectedBySubsystem
        ? "weak_token_rejected:non_provider_subsystem"
        : "weak_token_rejected:no_transport_corroborator",
    );

  return {
    routed: strong.length > 0 || weakRouted,
    reasons,
    rejectedWeakTokens,
  };
}

function computeSignals(facts: ObservedFacts): {
  signals: EvidenceSignals;
  transportReasons: string[];
  rejectedWeakTokens: string[];
} {
  const transport = transportObservation(facts);
  const retryAfterHits = fixtureFactHits(facts.fixtureFacts, /^retry_after_/);
  const allAttemptsRejected = fixtureFactHits(
    facts.fixtureFacts,
    /^all_attempts_rejected$/,
  );
  const transportFacts = fixtureFactHits(
    facts.fixtureFacts,
    /^(?:failure_before_send|all_attempts_not_delivered)$/,
  );
  const credentialFacts = fixtureFactHits(
    facts.fixtureFacts,
    /^(?:configured_token_absent|resolver_error_generic|credential_.*|permission_.*)$/,
  );
  const credentialToken = matchedToken(
    facts.finalError,
    /\b(?:tokens?|credentials?|permissions?|channel username)\b/i,
  );
  const templateFacts = fixtureFactHits(
    facts.fixtureFacts,
    /^(?:template_path_missing|resolved_destination_empty|destination_format_invalid|missing_template)$/,
  );
  const handlerFacts = fixtureFactHits(
    facts.fixtureFacts,
    /^(?:handler_not_registered|unsupported_action_type)$/,
  );
  const handlerToken = matchedToken(
    facts.finalError,
    /unsupported action type|no action handler/i,
  );
  const orderingFacts = fixtureFactHits(
    facts.fixtureFacts,
    /^(?:ordering_invalid|missing_predecessor)$/,
  );
  const duplicatePattern =
    /duplicate|stale|already_success|same_retry_identity_seen_twice|success_stage_republished/;
  const duplicateFacts = fixtureFactHits(facts.fixtureFacts, duplicatePattern);
  const duplicateSafeCode = matchedToken(facts.safeCode, duplicatePattern);
  const duplicateToken = matchedToken(facts.finalError, duplicatePattern);
  const dlqFacts = fixtureFactHits(
    facts.fixtureFacts,
    /^(?:dead_letter_absent|dlq_publication_missing)$/,
  );
  const dlqToken = matchedToken(
    facts.finalError,
    /dead-letter|dlq|kafka.*publication/i,
  );
  const sdkFacts = fixtureFactHits(
    facts.fixtureFacts,
    /^(?:sdk_error_value_discarded|success_status_recorded)$/,
  );
  const sdkObservation =
    sdkFacts.length > 0 ||
    containsAny(facts.finalError, /sdk[_ ]error/i) ||
    containsAny(facts.safeCode, /sdk[_ ]error/i);

  return {
    signals: {
      // s05 observes exactly `deduplication_window_expired` and
      // `same_request_key_known`; both are required. The no-match cases nm02
      // (concurrent_idempotent_requests) and nm08 (invalid_idempotency_key)
      // must not fire this signal, so free text and the bare words "dedup" or
      // "idempotency" never match.
      dedupWindowExpired:
        facts.fixtureFacts.includes("deduplication_window_expired") &&
        facts.fixtureFacts.includes("same_request_key_known"),
      deliveryUnknown: facts.deliveryUnknown,
      outcomeUnknown: facts.outcomeUnknown,
      rateLimited:
        facts.status === 429 ||
        facts.retryAfterSeconds !== null ||
        retryAfterHits.length > 0 ||
        allAttemptsRejected.length > 0,
      transport:
        transport.routed ||
        (facts.status !== null && facts.status >= 500) ||
        transportFacts.length > 0,
      credential:
        facts.status === 401 ||
        facts.absentCredentials.length > 0 ||
        credentialFacts.length > 0 ||
        credentialToken !== null,
      validation:
        facts.validationStatus === "invalid" ||
        facts.missingFields.length > 0 ||
        facts.invalidFields.length > 0 ||
        facts.missingTemplates.length > 0 ||
        templateFacts.length > 0,
      handler:
        facts.supported === false ||
        handlerFacts.length > 0 ||
        handlerToken !== null,
      ordering:
        facts.ordering === "invalid" ||
        facts.missingPredecessors.length > 0 ||
        orderingFacts.length > 0,
      duplicate:
        duplicateFacts.length > 0 ||
        duplicateSafeCode !== null ||
        duplicateToken !== null,
      sdk:
        sdkObservation &&
        (sdkFacts.length > 0 ||
          facts.executionStatus === "SUCCESS" ||
          facts.executionOutcome === "accepted"),
      publication:
        facts.sourceKind === "reconciled_execution" ||
        dlqFacts.length > 0 ||
        dlqToken !== null,
    },
    transportReasons: transport.reasons,
    rejectedWeakTokens: transport.rejectedWeakTokens,
  };
}

export function deriveSignals(evidence: DiagnosisEvidence): EvidenceSignals {
  return computeSignals(observedFacts(evidence)).signals;
}

export function routeEvidence(evidence: DiagnosisEvidence): EvidenceRoute {
  const facts = observedFacts(evidence);
  const { signals, transportReasons } = computeSignals(facts);
  const hints: string[] = [];
  const reasons: string[] = [];
  const add = (hint: string, entries: readonly (string | null)[]) => {
    if (!hints.includes(hint)) hints.push(hint);
    for (const entry of entries) if (entry) boundedReason(reasons, entry);
  };

  // F01: explicit rate limiting or a bounded retry-after observation.
  const retryAfterHits = fixtureFactHits(facts.fixtureFacts, /^retry_after_/);
  const allAttemptsRejected = fixtureFactHits(
    facts.fixtureFacts,
    /^all_attempts_rejected$/,
  );
  if (signals.rateLimited) {
    add("F01", [
      facts.status === 429 ? "provider_status:429" : null,
      facts.retryAfterSeconds !== null
        ? `retry_after_seconds:${facts.retryAfterSeconds}`
        : null,
      ...retryAfterHits.map((fact) => `fixture_fact:${fact}`),
      ...allAttemptsRejected.map((fact) => `fixture_fact:${fact}`),
    ]);
  }

  // F02: typed pre-send transport failure or provider outage. Only errno, DNS,
  // and unambiguous phrase tokens self-route; weak words need a corroborator
  // and never fire when the same text names a non-provider subsystem.
  const transportFacts = fixtureFactHits(
    facts.fixtureFacts,
    /^(?:failure_before_send|all_attempts_not_delivered)$/,
  );
  if (signals.transport) {
    add("F02", [
      facts.status !== null && facts.status >= 500
        ? `provider_status:${facts.status}`
        : null,
      ...transportReasons,
      ...transportFacts.map((fact) => `fixture_fact:${fact}`),
    ]);
  }

  // F03: credential or destination permission fault. A bare 403 never routes.
  const credentialFacts = fixtureFactHits(
    facts.fixtureFacts,
    /^(?:configured_token_absent|resolver_error_generic|credential_.*|permission_.*)$/,
  );
  const credentialToken = matchedToken(
    facts.finalError,
    /\b(?:tokens?|credentials?|permissions?|channel username)\b/i,
  );
  if (signals.credential) {
    add("F03", [
      facts.status === 401 ? "provider_status:401" : null,
      ...facts.absentCredentials.map(
        (field) => `credential_presence:${field}`,
      ),
      ...credentialFacts.map((fact) => `fixture_fact:${fact}`),
      credentialToken ? `final_error:${credentialToken}` : null,
    ]);
  }

  // F04: template, destination, or validation fault.
  const templateFacts = fixtureFactHits(
    facts.fixtureFacts,
    /^(?:template_path_missing|resolved_destination_empty|destination_format_invalid|missing_template)$/,
  );
  if (signals.validation) {
    add("F04", [
      facts.validationStatus === "invalid"
        ? "validation_status:invalid"
        : null,
      facts.missingFields.length
        ? `missing_required_fields:${facts.missingFields.length}`
        : null,
      ...facts.invalidFields.map(
        (field) => `invalid_field_types:${field}`,
      ),
      facts.missingTemplates.length
        ? `missing_template_paths:${facts.missingTemplates.length}`
        : null,
      ...templateFacts.map((fact) => `fixture_fact:${fact}`),
    ]);
  }

  // F05: unsupported action or handler.
  const handlerFacts = fixtureFactHits(
    facts.fixtureFacts,
    /^(?:handler_not_registered|unsupported_action_type)$/,
  );
  const handlerToken = matchedToken(
    facts.finalError,
    /unsupported action type|no action handler/i,
  );
  if (signals.handler) {
    add("F05", [
      facts.supported === false ? "supported:false" : null,
      ...handlerFacts.map((fact) => `fixture_fact:${fact}`),
      handlerToken ? `final_error:${handlerToken}` : null,
    ]);
  }

  // F06: dependency ordering fault.
  const orderingFacts = fixtureFactHits(
    facts.fixtureFacts,
    /^(?:ordering_invalid|missing_predecessor)$/,
  );
  if (signals.ordering) {
    add("F06", [
      facts.ordering === "invalid" ? "ordering:invalid" : null,
      facts.missingPredecessors.length
        ? `missing_predecessor_stages:${facts.missingPredecessors.length}`
        : null,
      ...orderingFacts.map((fact) => `fixture_fact:${fact}`),
    ]);
  }

  // F07: delivery outcome is genuinely unknown.
  const unknownFacts = fixtureFactHits(
    facts.fixtureFacts,
    /^(?:request_transmitted|response_missing)$/,
  );
  const lostToken = matchedToken(facts.finalError, /response was lost/i);
  if (signals.deliveryUnknown) {
    add("F07", [
      facts.deliveryUnknown ? "delivery_outcome:unknown" : null,
      facts.executionStatus === "UNKNOWN" ||
      facts.executionStatus === "PENDING"
        ? `execution_status:${facts.executionStatus}`
        : null,
      ...unknownFacts.map((fact) => `fixture_fact:${fact}`),
      lostToken ? `final_error:${lostToken}` : null,
    ]);
  }

  // F08: duplicate, stale, or already-successful work.
  const duplicatePattern =
    /duplicate|stale|already_success|same_retry_identity_seen_twice|success_stage_republished/;
  const duplicateFacts = fixtureFactHits(facts.fixtureFacts, duplicatePattern);
  const duplicateSafeCode = matchedToken(facts.safeCode, duplicatePattern);
  const duplicateToken = matchedToken(facts.finalError, duplicatePattern);
  if (signals.duplicate) {
    add("F08", [
      ...duplicateFacts.map((fact) => `fixture_fact:${fact}`),
      duplicateSafeCode ? `safe_code:${duplicateSafeCode}` : null,
      duplicateToken ? `final_error:${duplicateToken}` : null,
    ]);
  }

  // F09: DLQ publication gap.
  const dlqFacts = fixtureFactHits(
    facts.fixtureFacts,
    /^(?:dead_letter_absent|dlq_publication_missing)$/,
  );
  const dlqToken = matchedToken(
    facts.finalError,
    /dead-letter|dlq|kafka.*publication/i,
  );
  if (signals.publication) {
    add("F09", [
      facts.sourceKind === "reconciled_execution"
        ? "source_kind:reconciled_execution"
        : null,
      ...dlqFacts.map((fact) => `fixture_fact:${fact}`),
      dlqToken ? `final_error:${dlqToken}` : null,
    ]);
  }

  // F10: SDK error recorded as success.
  const sdkFacts = fixtureFactHits(
    facts.fixtureFacts,
    /^(?:sdk_error_value_discarded|success_status_recorded)$/,
  );
  if (signals.sdk) {
    add("F10", [
      ...sdkFacts.map((fact) => `fixture_fact:${fact}`),
      facts.executionStatus === "SUCCESS"
        ? "execution_status:SUCCESS"
        : null,
    ]);
  }

  return { hints, confident: hints.length > 0, reasons };
}

// Fixed signal order: most specific first. Each present signal contributes its
// full demand; the union preserves first occurrence and then truncates to the
// three return slots. No early return and no per-facet suppression.
const signalDemands: ReadonlyArray<{
  signal: keyof EvidenceSignals;
  demand: readonly RequestedFacet[];
}> = [
  {
    // Must precede deliveryUnknown: a known request key means the guidance
    // class is idempotency-window recovery, not unknown delivery. Order is
    // the only mechanism — no suppression, per the table's contract above.
    signal: "dedupWindowExpired",
    demand: ["remediation", "forbidden", "verification"],
  },
  {
    signal: "deliveryUnknown",
    demand: ["investigation", "remediation", "verification"],
  },
  {
    signal: "rateLimited",
    demand: ["remediation", "replay", "verification"],
  },
  {
    signal: "handler",
    demand: ["investigation", "replay", "verification"],
  },
  {
    signal: "ordering",
    demand: ["investigation", "forbidden", "verification"],
  },
  {
    signal: "duplicate",
    demand: ["investigation", "forbidden", "verification"],
  },
  {
    signal: "sdk",
    demand: ["investigation", "forbidden", "verification"],
  },
  {
    signal: "transport",
    demand: ["investigation", "remediation", "verification"],
  },
  {
    signal: "credential",
    demand: ["investigation", "remediation", "verification"],
  },
  {
    signal: "validation",
    demand: ["investigation", "remediation", "verification"],
  },
  {
    signal: "publication",
    demand: ["investigation", "remediation", "verification"],
  },
  {
    signal: "outcomeUnknown",
    demand: ["verification", "evidence"],
  },
];

export const faultSignalKeys = signalDemands
  .map((entry) => entry.signal)
  .filter((signal) => signal !== "outcomeUnknown") as ReadonlyArray<
  Exclude<keyof EvidenceSignals, "outcomeUnknown">
>;

const defaultFacets: readonly RequestedFacet[] = [
  "investigation",
  "evidence",
  "remediation",
];

// Discretionary facets are shed in this order before any high-signal facet.
// `verification` is never on this list: a fault signal always needs it.
const facetDropOrder: readonly RequestedFacet[] = [
  "evidence",
  "symptoms",
  "replay",
];

export function selectRequestedFacets(signals: EvidenceSignals): {
  facets: RequestedFacet[];
  dropped: RequestedFacet[];
} {
  const present = signalDemands.filter(({ signal }) => signals[signal]);
  if (!present.length)
    return { facets: [...defaultFacets], dropped: [] };

  const faultPresent = present.some(
    ({ signal }) => signal !== "outcomeUnknown",
  );
  const facets: RequestedFacet[] = [];
  for (const { demand } of present)
    for (const facet of demand)
      if (!facets.includes(facet)) facets.push(facet);

  // Hard invariant: a fault observation always requests verification, even if
  // a later signal's demand would otherwise fill the three slots first.
  if (faultPresent && !facets.includes("verification"))
    facets.push("verification");

  const dropped: RequestedFacet[] = [];
  for (const facet of facetDropOrder) {
    if (facets.length <= 3) break;
    const index = facets.indexOf(facet);
    if (index < 0) continue;
    facets.splice(index, 1);
    dropped.push(facet);
  }

  // Last resort for a union with no discretionary facet left: shed the
  // lowest-priority tail entry, but never the verification invariant.
  while (facets.length > 3) {
    let last = facets.length - 1;
    while (last >= 0 && faultPresent && facets[last] === "verification")
      last -= 1;
    if (last < 0) break;
    dropped.push(facets[last]!);
    facets.splice(last, 1);
  }

  return { facets, dropped };
}

export function requestedFacetsForSignals(
  signals: EvidenceSignals,
): RequestedFacet[] {
  return selectRequestedFacets(signals).facets;
}

export function requestedGuidanceFacets(
  evidence: DiagnosisEvidence,
): RequestedFacet[] {
  return requestedFacetsForSignals(deriveSignals(evidence));
}

export function evidenceAnchors(evidence: DiagnosisEvidence): string[] {
  const facts = observedFacts(evidence);
  const statusAnchor =
    facts.status === 429 || (facts.status !== null && facts.status >= 500)
      ? facts.status.toString()
      : null;
  const faultAnchors = facts.fixtureFacts.filter((fact) =>
    /^(?:retry_after_|all_attempts_|failure_before_send|configured_token_absent|resolver_error_generic|template_path_missing|resolved_destination_empty|destination_format_invalid|handler_not_registered|unsupported_action_type|ordering_invalid|missing_predecessor|request_transmitted|response_missing|duplicate|stale|already_success|same_retry_identity_seen_twice|success_stage_republished|stage_already_successful|stale_event_received|dead_letter_absent|dlq_publication_missing|sdk_error_value_discarded|success_status_recorded)/.test(
      fact,
    ),
  );
  return [
    ...new Set(
      [
        statusAnchor,
        facts.retryAfterSeconds?.toString(),
        facts.safeCode,
        ...facts.missingFields,
        ...facts.missingTemplates,
        ...facts.absentCredentials,
        ...faultAnchors,
      ].filter((value): value is string => Boolean(value)),
    ),
  ].slice(0, 20);
}

export function buildStructuredRetrievalInput(
  evidence: DiagnosisEvidence,
): StructuredRunbookSearchInput {
  const facts = observedFacts(evidence);
  const query = [
    sanitizedQueryText(facts.finalError ?? "").slice(0, 180),
    normalize(
      [
        facts.actionType,
        facts.provider,
        facts.phase,
        facts.outcome,
        facts.status?.toString(),
        facts.retryAfterSeconds?.toString(),
        facts.safeCode,
        facts.executionStatus,
        facts.executionOutcome,
        facts.ordering,
        facts.validationStatus,
        facts.supported === false ? "unsupported" : null,
        ...facts.blockedReasons,
        ...facts.missingFields,
        ...facts.invalidFields,
        ...facts.missingTemplates,
        ...facts.absentCredentials,
        ...facts.fixtureFacts,
        ...facts.attempts,
      ]
        .filter(
          (value): value is string =>
            typeof value === "string" &&
            value.length > 0 &&
            !ignoredFixtureTokens.has(value),
        )
        .join(" "),
    ).slice(0, 320),
  ]
    .filter(Boolean)
    .join(" ") || "failure evidence";

  const observation = computeSignals(facts);
  const selection = selectRequestedFacets(observation.signals);
  const route = routeEvidence(evidence);

  return {
    query: query.slice(0, 500),
    ...(facts.providers.length ? { providers: facts.providers } : {}),
    limit: 3,
    route,
    requestedFacets: selection.facets,
    anchors: evidenceAnchors(evidence),
    trace: {
      facetSelection: {
        requested: [...selection.facets],
        dropped: [...selection.dropped],
      },
      weakTokenRejected: [...observation.rejectedWeakTokens],
    },
  };
}
