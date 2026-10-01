import type { SavedInvestigation } from "../types/triage";

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
