import { expect, test } from "bun:test";
import { EventEmitter } from "node:events";
import { parseEventCursor } from "../../../packages/triage-contracts/events.ts";
import { streamInvestigationEvents, writeEvent } from "../src/events.ts";

test("event cursors accept bounded sequence numbers only", () => {
  expect(parseEventCursor(undefined)).toBe(null);
  expect(parseEventCursor("0")).toBe(0);
  expect(parseEventCursor("42")).toBe(42);
  for (const value of ["-1", "1.5", "1e2", "", "9007199254740992", ["1", "2"]])
    expect(() => parseEventCursor(value)).toThrow();
});

test("a slow consumer pauses until drain and disconnect cancels the wait", async () => {
  const response = Object.assign(new EventEmitter(), { write: () => false });
  const controller = new AbortController();
  let finished = false;
  const pending = writeEvent(response as never, "event", controller.signal).then(() => { finished = true; });
  await Promise.resolve();
  expect(finished).toBe(false);
  response.emit("drain");
  await pending;
  expect(finished).toBe(true);
  const disconnected = writeEvent(response as never, "event", controller.signal);
  controller.abort();
  await expect(disconnected).rejects.toThrow();
  expect(response.listenerCount("drain")).toBe(0);
});

test("the private deadline aborts a slow full page before all frames are transmitted", async () => {
  let frames = 0;
  const response = Object.assign(new EventEmitter(), { write: () => {
    frames++;
    setTimeout(() => response.emit("drain"), 5);
    return false;
  } });
  const pending = streamInvestigationEvents({ response: response as never,
    store: { events: async () => ({ snapshot: null, events: Array.from({ length: 64 }, (_, index) =>
      ({ sequence: index + 1, status: "investigating" as const })) }) },
    id: "id", caseId: "case", ownerId: 9, cursor: 0, signal: new AbortController().signal,
    expiresAt: Date.now() + 40,
  });
  await expect(pending).rejects.toThrow();
  expect(frames).toBeLessThan(64);
  expect(response.listenerCount("drain")).toBe(0);
});
