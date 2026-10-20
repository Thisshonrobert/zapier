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

export type StructuredRunbookSearchInput = RunbookSearchInput & {
  route?: EvidenceRoute;
  requestedFacets?: readonly RequestedFacet[];
  anchors?: readonly string[];
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
    deliveryUnknown: observedOutcomes.includes("unknown"),
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

export function routeEvidence(evidence: DiagnosisEvidence): EvidenceRoute {
  const facts = observedFacts(evidence);
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
  if (
    facts.status === 429 ||
    facts.retryAfterSeconds !== null ||
    retryAfterHits.length > 0 ||
    allAttemptsRejected.length > 0
  ) {
    add("F01", [
      facts.status === 429 ? "provider_status:429" : null,
      facts.retryAfterSeconds !== null
        ? `retry_after_seconds:${facts.retryAfterSeconds}`
        : null,
      ...retryAfterHits.map((fact) => `fixture_fact:${fact}`),
      ...allAttemptsRejected.map((fact) => `fixture_fact:${fact}`),
    ]);
  }

  // F02: pre-send transport failure or provider outage.
  const transportToken = matchedToken(
    facts.finalError,
    /\b(?:timeout|network|connection|refused)\b/i,
  );
  const transportFacts = fixtureFactHits(
    facts.fixtureFacts,
    /^(?:failure_before_send|all_attempts_not_delivered)$/,
  );
  if (
    (facts.status !== null && facts.status >= 500) ||
    transportToken !== null ||
    transportFacts.length > 0
  ) {
    add("F02", [
      facts.status !== null && facts.status >= 500
        ? `provider_status:${facts.status}`
        : null,
      transportToken ? `final_error:${transportToken}` : null,
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
  if (
    facts.status === 401 ||
    facts.absentCredentials.length > 0 ||
    credentialFacts.length > 0 ||
    credentialToken !== null
  ) {
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
  if (
    facts.validationStatus === "invalid" ||
    facts.missingFields.length > 0 ||
    facts.invalidFields.length > 0 ||
    facts.missingTemplates.length > 0 ||
    templateFacts.length > 0
  ) {
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
  if (
    facts.supported === false ||
    handlerFacts.length > 0 ||
    handlerToken !== null
  ) {
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
  if (
    facts.ordering === "invalid" ||
    facts.missingPredecessors.length > 0 ||
    orderingFacts.length > 0
  ) {
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
  if (
    facts.deliveryUnknown ||
    facts.executionStatus === "UNKNOWN" ||
    facts.executionStatus === "PENDING" ||
    unknownFacts.length > 0 ||
    lostToken !== null
  ) {
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
  if (
    duplicateFacts.length > 0 ||
    duplicateSafeCode !== null ||
    duplicateToken !== null
  ) {
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
  if (
    facts.sourceKind === "reconciled_execution" ||
    dlqFacts.length > 0 ||
    dlqToken !== null
  ) {
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
  const sdkObservation =
    sdkFacts.length > 0 ||
    containsAny(facts.finalError, /sdk[_ ]error/i) ||
    containsAny(facts.safeCode, /sdk[_ ]error/i);
  if (
    sdkObservation &&
    (sdkFacts.length > 0 ||
      facts.executionStatus === "SUCCESS" ||
      facts.executionOutcome === "accepted")
  ) {
    add("F10", [
      ...sdkFacts.map((fact) => `fixture_fact:${fact}`),
      facts.executionStatus === "SUCCESS"
        ? "execution_status:SUCCESS"
        : null,
    ]);
  }

  return { hints, confident: hints.length > 0, reasons };
}

export function requestedGuidanceFacets(
  evidence: DiagnosisEvidence,
): RequestedFacet[] {
  const facts = observedFacts(evidence);
  const hints = new Set(routeEvidence(evidence).hints);
  if (facts.deliveryUnknown) return ["investigation", "remediation", "forbidden"];
  if (
    hints.has("F01") ||
    facts.status === 429 ||
    facts.retryAfterSeconds !== null
  )
    return ["remediation", "replay", "verification"];
  if (hints.has("F05")) return ["investigation", "replay", "verification"];
  if (hints.has("F08") || hints.has("F10") || hints.has("F06"))
    return ["investigation", "forbidden", "verification"];
  if (
    hints.has("F02") ||
    hints.has("F03") ||
    hints.has("F04") ||
    hints.has("F09")
  )
    return ["investigation", "remediation", "verification"];
  return ["investigation", "evidence", "remediation"];
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

  return {
    query: query.slice(0, 500),
    ...(facts.providers.length ? { providers: facts.providers } : {}),
    limit: 3,
    route: routeEvidence(evidence),
    requestedFacets: requestedGuidanceFacets(evidence),
    anchors: evidenceAnchors(evidence),
  };
}
