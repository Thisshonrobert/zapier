import { BACKEND_URL } from "@/config";

/**
 * Read-only support evidence client. These are the existing operator endpoints; a support
 * operator can already read them through the investigation scope. The client performs one
 * extra job the raw payload cannot: it normalises an incomplete or unexpected response into
 * an `unavailable` reason, so the evidence room can say which fact is missing instead of
 * rendering a blank where a fact should be.
 */

export type EvidenceEnvelope<T> = { data: T | null; unavailable: string[] };

export type FailureContextFacts = {
  source_kind: "retry_row" | "reconciled_execution";
  current_action_type: string | null;
  retry: {
    provider: string | null;
    phase: string | null;
    provider_outcome: string | null;
    safe_code: string | null;
    provider_status: number | null;
    retry_after_seconds: number | null;
    requires_human: boolean;
    final_error: string | null;
  };
  action_metadata: { paths: { path: string; type: string }[]; truncated: boolean };
  payload: { paths: { path: string; type: string }[]; truncated: boolean };
};

export type FailureContextEvidence = {
  observed_at: string;
  content_hash: string;
  complete: boolean;
  facts: FailureContextFacts;
};

export type ExecutionAttempt = {
  attempt_number: number;
  status: string;
  provider: string | null;
  phase: string | null;
  provider_outcome: "accepted" | "rejected" | "not_attempted" | "unknown";
  safe_code: string | null;
  provider_status: number | null;
  retry_after_seconds: number | null;
  started_at: string | null;
  completed_at: string | null;
  provenance: "captured" | "reconciled_execution" | "legacy";
};

export type ExecutionEvidence = {
  observed_at: string;
  content_hash: string;
  complete: boolean;
  facts: {
    provenance: "captured" | "reconciled_execution" | "legacy";
    current_execution: {
      status: string;
      lease_until: string | null;
      completed_at: string | null;
      provider_outcome: string | null;
      requires_human: boolean;
    } | null;
    attempts: ExecutionAttempt[];
    history_limit: number;
    history_truncated: boolean;
    predecessors: { stage: number; status: string; provider_outcome: string | null; completed_at: string | null }[];
    ordering: { status: "valid" | "invalid" | "unknown"; missing_predecessor_stages: number[] };
  };
};

export type InputValidationEvidence = {
  observed_at: string;
  content_hash: string;
  complete: boolean;
  facts: {
    action_type: string | null;
    validation_status: "valid" | "invalid" | "blocked";
    supported: boolean;
    missing_required_fields: string[];
    invalid_field_types: { field: string; expected: string; actual: string }[];
    missing_template_paths: string[];
    credential_presence: { field: string; present: boolean; source: string }[];
    blocked_reasons: string[];
    input_fingerprint: string;
  };
};

export type SupportEvidence = {
  failureContext: EvidenceEnvelope<FailureContextEvidence>;
  execution: EvidenceEnvelope<ExecutionEvidence>;
  validation: EvidenceEnvelope<InputValidationEvidence>;
};

export class SupportEvidenceError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "SupportEvidenceError";
  }
}

export type EvidenceFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/** The global fetch in the shape the scoped readers expect. */
export const sameOriginFetch: EvidenceFetch = (input, init) => fetch(input, init);

/**
 * Which authorized surface a read belongs to. The engineering workspace reads the same
 * evidence through its own routed endpoints, and it has no input-validation route, so that
 * tab reports the authorization gap instead of a failure.
 */
export const EVIDENCE_SCOPES = {
  operator: { baseUrl: `${BACKEND_URL}/api/v1/triage/operator`, authorizeValidation: true },
  engineering: { baseUrl: `${BACKEND_URL}/api/v1/triage/engineering`, authorizeValidation: false },
} as const;

export type EvidenceScope = (typeof EVIDENCE_SCOPES)[keyof typeof EVIDENCE_SCOPES];

async function evidenceRequest<T>(
  scope: EvidenceScope,
  path: string,
  init: RequestInit,
  signal: AbortSignal,
  fetchImpl: EvidenceFetch = sameOriginFetch,
): Promise<T> {
  const token = typeof window === "undefined" ? null : window.localStorage.getItem("token");
  if (!token) throw new SupportEvidenceError("Sign in to read case evidence.", 401);
  const response = await fetchImpl(`${scope.baseUrl}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...init.headers },
    signal,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof (payload as { detail?: unknown }).detail === "string"
      ? (payload as { detail: string }).detail
      : "The evidence service is unavailable.";
    throw new SupportEvidenceError(detail, response.status);
  }
  return payload as T;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const asText = (value: unknown): string | null => (typeof value === "string" ? value : null);
const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const asBoolean = (value: unknown): boolean => value === true;

/** A malformed payload is reported as unavailable evidence, never as a partial fact. */
const unavailable = (reason: string): { data: null; unavailable: string[] } => ({ data: null, unavailable: [reason] });

export function normalizeFailureContext(payload: unknown): EvidenceEnvelope<FailureContextEvidence> {
  if (!isRecord(payload) || !isRecord(payload.facts)) return unavailable("failure_context_unreadable");
  const facts = payload.facts;
  const retry = isRecord(facts.retry) ? facts.retry : {};
  const structure = (value: unknown) => ({
    paths: asArray<Record<string, unknown>>(value && isRecord(value) ? value.paths : []).map((entry) => ({
      path: asText(entry?.path) ?? "",
      type: asText(entry?.type) ?? "unknown",
    })),
    truncated: isRecord(value) ? asBoolean(value.truncated) : false,
  });
  const sourceKind = facts.source_kind === "reconciled_execution" ? "reconciled_execution" : "retry_row";
  return {
    data: {
      observed_at: asText(payload.observed_at) ?? "",
      content_hash: asText(payload.content_hash) ?? "",
      complete: asBoolean(payload.complete),
      facts: {
        source_kind: sourceKind,
        current_action_type: asText(facts.current_action_type),
        retry: {
          provider: asText(retry.provider),
          phase: asText(retry.phase),
          provider_outcome: asText(retry.provider_outcome),
          safe_code: asText(retry.safe_code),
          provider_status: asNumber(retry.provider_status),
          retry_after_seconds: asNumber(retry.retry_after_seconds),
          requires_human: asBoolean(retry.requires_human),
          final_error: asText(retry.final_error),
        },
        action_metadata: structure(facts.action_metadata),
        payload: structure(facts.payload),
      },
    },
    unavailable: asArray<string>(payload.unavailable).filter((item) => typeof item === "string"),
  };
}

export function normalizeExecutionEvidence(payload: unknown): EvidenceEnvelope<ExecutionEvidence> {
  if (!isRecord(payload) || !isRecord(payload.facts)) return unavailable("execution_evidence_unreadable");
  const facts = payload.facts;
  const rawExecution = isRecord(facts.current_execution) ? facts.current_execution : null;
  const provenance = facts.provenance === "reconciled_execution" || facts.provenance === "legacy"
    ? facts.provenance : "captured";
  const attemptProvenance = (value: unknown) =>
    value === "reconciled_execution" || value === "legacy" ? value : "captured";
  const outcome = (value: unknown): ExecutionAttempt["provider_outcome"] =>
    value === "accepted" || value === "rejected" || value === "not_attempted" ? value : "unknown";
  return {
    data: {
      observed_at: asText(payload.observed_at) ?? "",
      content_hash: asText(payload.content_hash) ?? "",
      complete: asBoolean(payload.complete),
      facts: {
        provenance,
        current_execution: rawExecution
          ? {
              status: asText(rawExecution.status) ?? "unknown",
              lease_until: asText(rawExecution.lease_until),
              completed_at: asText(rawExecution.completed_at),
              provider_outcome: asText(rawExecution.provider_outcome),
              requires_human: asBoolean(rawExecution.requires_human),
            }
          : null,
        attempts: asArray<Record<string, unknown>>(facts.attempts).map((attempt) => ({
          attempt_number: asNumber(attempt.attempt_number) ?? 0,
          status: asText(attempt.status) ?? "unknown",
          provider: asText(attempt.provider),
          phase: asText(attempt.phase),
          provider_outcome: outcome(attempt.provider_outcome),
          safe_code: asText(attempt.safe_code),
          provider_status: asNumber(attempt.provider_status),
          retry_after_seconds: asNumber(attempt.retry_after_seconds),
          started_at: asText(attempt.started_at),
          completed_at: asText(attempt.completed_at),
          provenance: attemptProvenance(attempt.provenance),
        })),
        history_limit: asNumber(facts.history_limit) ?? 0,
        history_truncated: asBoolean(facts.history_truncated),
        predecessors: asArray<Record<string, unknown>>(facts.predecessors).map((entry) => ({
          stage: asNumber(entry.stage) ?? 0,
          status: asText(entry.status) ?? "unknown",
          provider_outcome: asText(entry.provider_outcome),
          completed_at: asText(entry.completed_at),
        })),
        ordering: {
          status: isRecord(facts.ordering) && (facts.ordering.status === "valid" ||
            facts.ordering.status === "invalid") ? facts.ordering.status : "unknown",
          missing_predecessor_stages: asArray<number>(isRecord(facts.ordering) ? facts.ordering.missing_predecessor_stages : [])
            .filter((stage) => typeof stage === "number"),
        },
      },
    },
    unavailable: asArray<string>(payload.unavailable).filter((item) => typeof item === "string"),
  };
}

export function normalizeInputValidation(payload: unknown): EvidenceEnvelope<InputValidationEvidence> {
  if (!isRecord(payload) || !isRecord(payload.facts)) return unavailable("input_validation_unreadable");
  const facts = payload.facts;
  const status = facts.validation_status === "valid" || facts.validation_status === "blocked"
    ? facts.validation_status : "invalid";
  return {
    data: {
      observed_at: asText(payload.observed_at) ?? "",
      content_hash: asText(payload.content_hash) ?? "",
      complete: asBoolean(payload.complete),
      facts: {
        action_type: asText(facts.action_type),
        validation_status: status,
        supported: asBoolean(facts.supported),
        missing_required_fields: asArray<string>(facts.missing_required_fields).filter((f) => typeof f === "string"),
        invalid_field_types: asArray<Record<string, unknown>>(facts.invalid_field_types).map((entry) => ({
          field: asText(entry.field) ?? "",
          expected: asText(entry.expected) ?? "string",
          actual: asText(entry.actual) ?? "unknown",
        })),
        missing_template_paths: asArray<string>(facts.missing_template_paths).filter((p) => typeof p === "string"),
        credential_presence: asArray<Record<string, unknown>>(facts.credential_presence).map((entry) => ({
          field: asText(entry.field) ?? "",
          present: asBoolean(entry.present),
          source: asText(entry.source) ?? "unknown_worker_environment",
        })),
        blocked_reasons: asArray<string>(facts.blocked_reasons).filter((r) => typeof r === "string"),
        input_fingerprint: asText(facts.input_fingerprint) ?? "",
      },
    },
    unavailable: asArray<string>(payload.unavailable).filter((item) => typeof item === "string"),
  };
}

/** A failed read becomes an unavailable envelope carrying the reason, not a thrown blank. */
async function readOrUnavailable<T>(
  read: () => Promise<unknown>,
  normalize: (payload: unknown) => EvidenceEnvelope<T>,
  fallbackReason: string,
): Promise<EvidenceEnvelope<T>> {
  try {
    return normalize(await read());
  } catch (error) {
    if (error instanceof SupportEvidenceError && (error.status === 401 || error.status === 403)) throw error;
    return unavailable(fallbackReason);
  }
}

export async function readSupportEvidence(
  caseId: string,
  signal: AbortSignal,
  fetchImpl: EvidenceFetch = sameOriginFetch,
  scope: EvidenceScope = EVIDENCE_SCOPES.operator,
): Promise<SupportEvidence> {
  const base = `/cases/${encodeURIComponent(caseId)}`;
  const [failureContext, execution, validation] = await Promise.all([
    readOrUnavailable(
      () => evidenceRequest(scope, `${base}/failure-context`, { method: "GET" }, signal, fetchImpl),
      normalizeFailureContext,
      "failure_context_unavailable",
    ),
    readOrUnavailable(
      () => evidenceRequest(scope, `${base}/execution-evidence?historyLimit=10`, { method: "GET" }, signal, fetchImpl),
      normalizeExecutionEvidence,
      "execution_evidence_unavailable",
    ),
    scope.authorizeValidation
      ? readOrUnavailable(
          () => evidenceRequest(scope, `${base}/validate-action-inputs`, { method: "POST" }, signal, fetchImpl),
          normalizeInputValidation,
          "input_validation_unavailable",
        )
      : Promise.resolve(unavailable("input_validation_not_authorized_here")),
  ]);
  return { failureContext, execution, validation };
}
