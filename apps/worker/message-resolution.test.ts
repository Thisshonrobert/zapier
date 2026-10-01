import { expect, test } from "bun:test";
import { settleMessage } from "./message-resolution.ts";

test("lost progression ACK leaves the replay offset uncommitted", async () => {
  let committed = false;
  await expect(settleMessage({ ack: true, advance: true, nextStage: 1 },
    { zapRunId: "run", stage: 0 }, null, "events", 0, "4", {
      send: async () => { throw new Error("lost ACK"); },
      commitOffsets: async () => { committed = true; },
    })).rejects.toThrow("lost ACK");
  expect(committed).toBe(false);
});

test("unresolved delivery neither progresses nor commits its offset", async () => {
  let touched = false;
  await expect(settleMessage({ ack: false, advance: false },
    { zapRunId: "run", stage: 0 }, null, "events", 0, "4", {
      send: async () => { touched = true; },
      commitOffsets: async () => { touched = true; },
    })).rejects.toThrow("stage remains unresolved");
  expect(touched).toBe(false);
});

test("success publishes its persisted successor before committing a lossless Kafka offset", async () => {
  const effects: unknown[] = [];
  await settleMessage({ ack: true, advance: true, nextStage: 2 },
    { zapRunId: "run", stage: 1 }, null, "events", 3, "9007199254740993", {
      send: async value => { effects.push(value); },
      commitOffsets: async value => { effects.push(value); },
    });
  expect(effects).toEqual([
    { topic: "events", messages: [{ value: '{"stage":2,"zapRunId":"run"}' }] },
    [{ topic: "events", partition: 3, offset: "9007199254740994" }],
  ]);
});
