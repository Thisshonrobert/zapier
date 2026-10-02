import { expect, test } from "bun:test";
import { watchInvestigation } from "./triage-stream";

const encoder = new TextEncoder();
const event = (sequence: number, type = "milestone") =>
  `id: ${sequence}\nevent: ${type}\ndata: {"sequence":${sequence},"status":"investigating"}\n\n`;

test("fetch stream uses Bearer headers, reconnects by sequence and ignores duplicate events", async () => {
  const requests: RequestInit[] = [];
  const notices: string[] = [];
  let connections = 0;
  await expect(watchInvestigation({ baseUrl: "https://api.invalid", path: "/events", token: () => "secret",
    signal: new AbortController().signal, attempts: 2, retryMs: 0,
    onRefresh: async () => { notices.push("refresh"); return false; },
    fetchImpl: async (_url, init) => {
      requests.push(init!);
      const text = connections++ === 0 ? event(1) : event(1) + event(2, "snapshot");
      return new Response(new ReadableStream({ start(controller) {
        for (const byte of encoder.encode(text)) controller.enqueue(new Uint8Array([byte]));
        controller.close();
      } }), { headers: { "content-type": "text/event-stream" } });
    },
  })).rejects.toThrow("disconnected");
  expect(new Headers(requests[0]!.headers).get("Authorization")).toBe("Bearer secret");
  expect(new Headers(requests[1]!.headers).get("Last-Event-ID")).toBe("1");
  expect(notices).toHaveLength(2);
});

test("authorization failures stop reconnects and aborted selections never refresh", async () => {
  let calls = 0;
  const options = { baseUrl: "https://api.invalid", path: "/events", token: () => "secret",
    signal: new AbortController().signal, onRefresh: async () => { throw new Error("must not refresh"); },
    fetchImpl: async () => { calls++; return new Response("", { status: 403 }); } };
  await expect(watchInvestigation(options)).rejects.toMatchObject({ status: 403 });
  expect(calls).toBe(1);
  const controller = new AbortController();
  controller.abort();
  await expect(watchInvestigation({ ...options, signal: controller.signal })).rejects.toThrow();
  expect(calls).toBe(1);
});

test("oversized event frames fail boundedly", async () => {
  await expect(watchInvestigation({ baseUrl: "https://api.invalid", path: "/events", token: () => "secret",
    signal: new AbortController().signal, attempts: 1,
    onRefresh: async () => false,
    fetchImpl: async () => new Response("data: " + "x".repeat(8192), {
      headers: { "content-type": "text/event-stream" },
    }),
  })).rejects.toThrow();
});

test("expired-cursor snapshots reset the watermark and heartbeat refreshes stop at terminal outcomes", async () => {
  const requests: RequestInit[] = [];
  let refreshes = 0;
  await watchInvestigation({ baseUrl: "https://api.invalid", path: "/events", token: () => "secret",
    signal: new AbortController().signal, retryMs: 0,
    onRefresh: async () => ++refreshes === 3,
    fetchImpl: async (_url, init) => {
      requests.push(init!);
      const body = requests.length === 1 ? event(9) : event(2, "snapshot") + ": heartbeat\n\n";
      return new Response(body, { headers: { "content-type": "text/event-stream" } });
    },
  });
  expect(new Headers(requests[1]!.headers).get("Last-Event-ID")).toBe("9");
  expect(refreshes).toBe(3);
  expect(requests).toHaveLength(2);
});

test("an abort while refreshing a frame prevents reconnect and cancels the reader", async () => {
  const controller = new AbortController();
  let cancelled = false;
  let calls = 0;
  await expect(watchInvestigation({ baseUrl: "https://api.invalid", path: "/events", token: () => "secret",
    signal: controller.signal, onRefresh: async () => { controller.abort(); return false; },
    fetchImpl: async () => {
      calls++;
      return new Response(new ReadableStream({ start(stream) { stream.enqueue(encoder.encode(event(1))); },
        cancel() { cancelled = true; } }), { headers: { "content-type": "text/event-stream" } });
    },
  })).rejects.toThrow();
  expect(cancelled).toBe(true);
  expect(calls).toBe(1);
});
