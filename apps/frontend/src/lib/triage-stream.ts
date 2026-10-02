import { sanitizeInvestigationEvent } from "../../../../packages/triage-contracts/events";

type StreamOptions = {
  baseUrl: string; path: string; token: () => string | null; signal: AbortSignal;
  onRefresh: () => Promise<boolean>; // true when the saved execution has reached a terminal outcome
  fetchImpl?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  attempts?: number; retryMs?: number;
};

async function pause(ms: number, signal: AbortSignal) {
  signal.throwIfAborted();
  await new Promise<void>((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, ms);
    signal.addEventListener("abort", abort, { once: true });
  });
}

export async function watchInvestigation({ baseUrl, path, token, signal, onRefresh,
  fetchImpl = fetch, attempts = 4, retryMs = 1_000 }: StreamOptions) {
  let cursor: number | null = null;
  let lastError: unknown = new Error("Investigation stream disconnected");
  for (let attempt = 0; attempt < attempts; attempt++) {
    signal.throwIfAborted();
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      const auth = token();
      if (!auth) throw Object.assign(new Error("Support operator sign-in required."), { status: 401 });
      // The deadline also bounds a proxy that accepts the connection but never sends another byte.
      const streamSignal = AbortSignal.any([signal, AbortSignal.timeout(35_000)]);
      const response = await fetchImpl(`${baseUrl}${path}`, {
        headers: { Authorization: `Bearer ${auth}`, Accept: "text/event-stream",
          ...(cursor === null ? {} : { "Last-Event-ID": String(cursor) }) },
        signal: streamSignal,
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw Object.assign(new Error("Investigation stream unavailable."), { status: response.status });
      }
      if (!response.body || !response.headers.get("content-type")?.startsWith("text/event-stream")) {
        await response.body?.cancel();
        throw new Error("Invalid investigation stream.");
      }
      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const chunk = await reader.read();
        streamSignal.throwIfAborted();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        // Our server emits LF; normalize CRLF too, including chunks split between CR and LF.
        let boundary: RegExpExecArray | null;
        while ((boundary = /\r?\n\r?\n/.exec(buffer))) {
          if (boundary.index > 4096) throw new Error("Investigation event too large.");
          const frame = buffer.slice(0, boundary.index).replaceAll("\r\n", "\n");
          buffer = buffer.slice(boundary.index + boundary[0].length);
          if (frame.startsWith(":")) {
            if (await onRefresh()) return;
            signal.throwIfAborted();
            continue;
          }
          const lines = frame.split("\n");
          const type = lines.find(line => line.startsWith("event:"))?.slice(6).trim();
          if (type !== "snapshot" && type !== "milestone") throw new Error("Invalid investigation event.");
          const event = sanitizeInvestigationEvent(JSON.parse(lines.filter(line => line.startsWith("data:"))
            .map(line => line.slice(5).trimStart()).join("\n")));
          const id = lines.find(line => line.startsWith("id:"))?.slice(3).trim();
          if (id !== String(event.sequence)) throw new Error("Invalid investigation sequence.");
          if (type === "milestone" && cursor !== null && event.sequence <= cursor) continue;
          // Snapshot refresh also covers expired or future cursors, including a lower watermark.
          if (await onRefresh()) return;
          signal.throwIfAborted();
          cursor = event.sequence;
        }
        if (buffer.length > 4096) throw new Error("Investigation event too large.");
      }
    } catch (error) {
      signal.throwIfAborted();
      if ([401, 403, 404, 409].includes((error as { status?: number }).status ?? 0)) throw error;
      lastError = error;
    } finally {
      await reader?.cancel().catch(() => {});
      reader?.releaseLock();
    }
    if (attempt + 1 < attempts) await pause(retryMs, signal);
  }
  throw lastError;
}
