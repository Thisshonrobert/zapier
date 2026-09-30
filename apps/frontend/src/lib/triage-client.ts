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
