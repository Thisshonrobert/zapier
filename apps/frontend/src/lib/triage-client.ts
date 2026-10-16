import type { ReplayCapabilities, SavedInvestigation } from "../types/triage";

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type TriageRequestOptions = {
  baseUrl: string;
  token: string;
  path: string;
  signal: AbortSignal;
  init?: RequestInit;
  fetchImpl?: FetchLike;
};

export async function requestTriage<T>({
  baseUrl,
  token,
  path,
  signal,
  init = {},
  fetchImpl = fetch,
}: TriageRequestOptions): Promise<T> {
  const response = await fetchImpl(`${baseUrl}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...init.headers },
    signal,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      typeof payload.detail === "string"
        ? payload.detail
        : "Triage service unavailable.",
    ) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return payload as T;
}

export async function readReplayCapabilities(options: {
  baseUrl: string; token: string; signal: AbortSignal; fetchImpl?: FetchLike;
}): Promise<ReplayCapabilities> {
  const payload = await requestTriage<{ capabilities: ReplayCapabilities }>({
    baseUrl: options.baseUrl, token: options.token, path: "/replay/capabilities",
    init: { method: "GET" }, signal: options.signal, fetchImpl: options.fetchImpl,
  });
  return payload.capabilities;
}

export type ReplayOperatorAction = "dry-run" | "requests";

/**
 * Operator replay actions. Each call carries its own idempotency identity for the request
 * action, so a repeated submit recovers the same durable intent instead of creating a
 * second one, and the backend rechecks authorization, policy and the release profile.
 */
export async function submitReplayAction(options: {
  baseUrl: string; token: string; caseId: string; action: ReplayOperatorAction;
  approvalId: string; proposalVersion: number; idempotencyKey?: string;
  signal: AbortSignal; fetchImpl?: FetchLike;
}) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (options.action === "requests") {
    if (!options.idempotencyKey) throw new Error("A replay request requires an idempotency key");
    headers["idempotency-key"] = options.idempotencyKey;
  }
  return requestTriage<{ id: string; status?: string; reasons?: string[]; notBefore?: string | null }>({
    baseUrl: `${options.baseUrl}/cases/${encodeURIComponent(options.caseId)}/replay`,
    token: options.token,
    path: `/${options.action}`,
    init: { method: "POST", headers,
      body: JSON.stringify({ approvalId: options.approvalId, proposalVersion: options.proposalVersion }) },
    signal: options.signal, fetchImpl: options.fetchImpl,
  });
}

export async function pollInvestigation({ signal, read, onSnapshot, attempts = 30, intervalMs = 2_000 }: {
  signal: AbortSignal;
  read: () => Promise<SavedInvestigation>;
  onSnapshot: (snapshot: SavedInvestigation) => void;
  attempts?: number;
  intervalMs?: number;
}) {
  for (let attempt = 0; attempt < Math.min(Math.max(attempts, 1), 30); attempt++) {
    signal.throwIfAborted();
    const snapshot = await read();
    signal.throwIfAborted();
    onSnapshot(snapshot);
    if (snapshot.status === "error" ||
      (snapshot.authority?.replay && ["SUCCESS", "FAILED", "UNKNOWN"].includes(snapshot.authority.replay.execution))) return;
    if (attempt + 1 >= Math.min(Math.max(attempts, 1), 30)) return;
    await new Promise<void>((resolve, reject) => {
      const abort = () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); };
      const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, intervalMs);
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) abort();
    });
  }
}
