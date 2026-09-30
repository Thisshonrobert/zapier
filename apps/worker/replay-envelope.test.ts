import { expect, test } from "bun:test";
import { parseZapEvent } from "./orchestration.ts";

test("ordinary envelopes stay compatible; replay authority must be a UUID", () => {
  expect(parseZapEvent(Buffer.from(JSON.stringify({ zapRunId: "run", stage: 0 }))))
    .toEqual({ zapRunId: "run", stage: 0 });
  for (const replayRequestId of [null, "", "forged", 1]) {
    expect(() => parseZapEvent(Buffer.from(JSON.stringify({ zapRunId: "run", stage: 0, replayRequestId }))))
      .toThrow("invalid Kafka event");
  }
});
