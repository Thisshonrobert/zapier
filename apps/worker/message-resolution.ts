import type { MessageResolution, ZapEvent } from "./orchestration.ts";

// Shared by the worker and recovery tests so publication and offset boundaries stay identical.
export async function settleMessage(resolution: MessageResolution, event: ZapEvent,
  ordinaryNextStage: number | null, topic: string, partition: number, offset: string,
  transport: {
    send(input: { topic: string; messages: { value: string }[] }): Promise<unknown>;
    commitOffsets(input: { topic: string; partition: number; offset: string }[]): Promise<unknown>;
  }) {
  const nextStage = !resolution.advance ? null
    : resolution.nextStage !== undefined ? resolution.nextStage : ordinaryNextStage;
  if (nextStage !== null) await transport.send({ topic,
    messages: [{ value: JSON.stringify({ stage: nextStage, zapRunId: event.zapRunId }) }] });
  if (!resolution.ack) {
    console.error("stage remains unresolved", { zapRunId: event.zapRunId, stage: event.stage,
      reason: "durable_resolution_required" });
    throw new Error("stage remains unresolved");
  }
  await transport.commitOffsets([{ topic, partition, offset: (BigInt(offset) + 1n).toString() }]);
}
