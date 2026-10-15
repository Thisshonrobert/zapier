import { BACKEND_URL } from "@/config";
import type { OwnerActionRepairResult, OwnerFailureSummary, OwnerRepairCase } from "@/types/owner";

/**
 * Owner failure and repair client. The subject owner is never sent: the backend
 * derives it from the bearer token, so a caller cannot address another tenant.
 */

export type OwnerFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class OwnerRepairError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "OwnerRepairError";
  }
}

function authToken(): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem("token");
}

async function ownerRequest<T>(path: string, init: RequestInit = {}, fetchImpl: OwnerFetch = fetch): Promise<T> {
  const token = authToken();
  if (!token) throw new OwnerRepairError("Sign in to see your failures.", 401);

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
      : "The failure service is unavailable.";
    throw new OwnerRepairError(detail, response.status);
  }
  return payload as T;
}

export async function listOwnFailures(fetchImpl?: OwnerFetch): Promise<OwnerFailureSummary[]> {
  const payload = await ownerRequest<{ failures?: OwnerFailureSummary[] }>(
    "/api/v1/triage/cases/failures",
    {},
    fetchImpl,
  );
  return Array.isArray(payload.failures) ? payload.failures : [];
}

export async function readOwnRepairCase(caseId: string, fetchImpl?: OwnerFetch): Promise<OwnerRepairCase> {
  return ownerRequest<OwnerRepairCase>(
    `/api/v1/triage/cases/${encodeURIComponent(caseId)}/repair`,
    {},
    fetchImpl,
  );
}

export async function saveActionRepair(input: {
  caseId: string;
  actionId: string;
  actionToken: string;
  fields: { field: string; value: string }[];
  notes?: string;
}, fetchImpl?: OwnerFetch): Promise<OwnerActionRepairResult> {
  return ownerRequest<OwnerActionRepairResult>(
    `/api/v1/triage/cases/${encodeURIComponent(input.caseId)}/actions/${encodeURIComponent(input.actionId)}/repair`,
    {
      method: "POST",
      body: JSON.stringify({
        actionToken: input.actionToken,
        fields: input.fields,
        ...(input.notes ? { notes: input.notes } : {}),
      }),
    },
    fetchImpl,
  );
}

export async function submitRepairCompletion(input: {
  caseId: string;
  repairNote?: string;
  idempotencyKey?: string;
}, fetchImpl?: OwnerFetch): Promise<{ workflow: { queue: string; status: string } }> {
  return ownerRequest<{ workflow: { queue: string; status: string } }>(
    `/api/v1/triage/cases/${encodeURIComponent(input.caseId)}/repair-acknowledgement`,
    {
      method: "POST",
      headers: input.idempotencyKey ? { "idempotency-key": input.idempotencyKey } : {},
      body: JSON.stringify(input.repairNote ? { repairNote: input.repairNote } : {}),
    },
    fetchImpl,
  );
}
