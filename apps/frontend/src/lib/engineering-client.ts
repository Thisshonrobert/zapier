import { BACKEND_URL } from "@/config";
import type {
  EngineeringCase,
  EngineeringCaseHistory,
  EngineeringTransitionResult,
  ViewerCapabilities,
} from "@/types/engineering";

/**
 * Engineering workspace client. Every request is bearer-authenticated and the
 * backend derives the actor from the token: the browser never names an engineer,
 * an owner or a role, and holds no replay controls.
 */

export type EngineeringFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class EngineeringError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "EngineeringError";
  }
}

function authToken(): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem("token");
}

async function engineeringRequest<T>(
  path: string,
  init: RequestInit = {},
  fetchImpl: EngineeringFetch = fetch,
): Promise<T> {
  const token = authToken();
  if (!token) throw new EngineeringError("Sign in to open the engineering workspace.", 401);

  const response = await fetchImpl(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...init.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof (payload as { detail?: unknown }).detail === "string"
      ? (payload as { detail: string }).detail
      : "The engineering service is unavailable.";
    throw new EngineeringError(detail, response.status);
  }
  return payload as T;
}

export async function readViewerCapabilities(fetchImpl?: EngineeringFetch): Promise<ViewerCapabilities | null> {
  try {
    const payload = await engineeringRequest<{ capabilities?: ViewerCapabilities }>(
      "/api/v1/triage/viewer",
      {},
      fetchImpl,
    );
    return payload.capabilities ?? null;
  } catch {
    // Navigation degrades to the roles-free links rather than guessing a role.
    return null;
  }
}

export async function listEngineeringCases(
  limit?: number,
  fetchImpl?: EngineeringFetch,
): Promise<EngineeringCase[]> {
  const query = typeof limit === "number" ? `?limit=${encodeURIComponent(String(limit))}` : "";
  const payload = await engineeringRequest<{ cases?: EngineeringCase[] }>(
    `/api/v1/triage/engineering/cases${query}`,
    {},
    fetchImpl,
  );
  return Array.isArray(payload.cases) ? payload.cases : [];
}

export async function readEngineeringCaseHistory(
  caseId: string,
  fetchImpl?: EngineeringFetch,
): Promise<EngineeringCaseHistory> {
  return engineeringRequest<EngineeringCaseHistory>(
    `/api/v1/triage/engineering/cases/${encodeURIComponent(caseId)}/history`,
    {},
    fetchImpl,
  );
}

export async function returnFindings(input: {
  caseId: string;
  findings: string;
  notes?: string;
  idempotencyKey?: string;
}, fetchImpl?: EngineeringFetch): Promise<EngineeringTransitionResult> {
  return engineeringRequest<EngineeringTransitionResult>(
    `/api/v1/triage/engineering/cases/${encodeURIComponent(input.caseId)}/findings`,
    {
      method: "POST",
      headers: input.idempotencyKey ? { "idempotency-key": input.idempotencyKey } : {},
      body: JSON.stringify({
        findings: input.findings,
        ...(input.notes ? { notes: input.notes } : {}),
      }),
    },
    fetchImpl,
  );
}

export async function resolveEngineeringCase(input: {
  caseId: string;
  resolutionReason: string;
  notes?: string;
  idempotencyKey?: string;
}, fetchImpl?: EngineeringFetch): Promise<EngineeringTransitionResult> {
  return engineeringRequest<EngineeringTransitionResult>(
    `/api/v1/triage/engineering/cases/${encodeURIComponent(input.caseId)}/resolve`,
    {
      method: "POST",
      headers: input.idempotencyKey ? { "idempotency-key": input.idempotencyKey } : {},
      body: JSON.stringify({
        resolutionReason: input.resolutionReason,
        ...(input.notes ? { notes: input.notes } : {}),
      }),
    },
    fetchImpl,
  );
}
