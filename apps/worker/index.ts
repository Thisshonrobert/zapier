import { Kafka } from "kafkajs";
import { prisma } from "../../packages/db/prisma/db";
import { getActionHandler } from "./actions";
import { createExecutionStore, createFingerprints, type ExecutionDb } from "./execution-store.ts";
import { executeStage, parseZapEvent, requireLoadedAction, type ZapEvent } from "./orchestration.ts";
import { createReplayStore, executeReplayStage } from "./replay.ts";
import { settleMessage } from "./message-resolution.ts";

const TOPIC_NAME = "zap-events";
const kafka = new Kafka({ clientId: "worker", brokers: ["localhost:9092"] });
const consumer = kafka.consumer({ groupId: "zap-group" });
const store = createExecutionStore(prisma as unknown as ExecutionDb,
  { handlerVersion: process.env.WORKER_HANDLER_VERSION });
const replayStore = createReplayStore(prisma);

async function loadStageExecution({ zapRunId, stage }: ZapEvent) {
  const zapDetails = await prisma.zapRun.findFirst({
    where: { id: zapRunId },
    include: { zap: { include: { actions: { include: { type: true } } } } },
  });
  if (!zapDetails) return null;
  const currentAction = zapDetails.zap.actions.find((action) => action.sortingOrder === stage);
  return currentAction ? { zapDetails, currentAction } : null;
}

async function processMessage(
  producer: ReturnType<typeof kafka.producer>,
  topic: string,
  partition: number,
  message: { offset: string; value: Buffer | null },
) {
  const event = parseZapEvent(message.value);
  const execution = event.replayRequestId ? null : requireLoadedAction(await loadStageExecution(event));
  const ordinaryInput = execution ? {
    event,
    action: {
      id: execution.currentAction.id,
      typeId: execution.currentAction.type.id,
      metadata: execution.currentAction.metadata as Record<string, unknown>,
    },
    zapRunMetadata: execution.zapDetails.metadata as Record<string, unknown>,
    store,
    getHandler: getActionHandler,
  } : null;
  const recovered = ordinaryInput ? await replayStore.stageResolution(event, createFingerprints({
    ...event, actionId: ordinaryInput.action.id, actionTypeId: ordinaryInput.action.typeId,
    actionMetadata: ordinaryInput.action.metadata, zapRunMetadata: ordinaryInput.zapRunMetadata,
  })) : null;
  const resolution = event.replayRequestId
    ? await executeReplayStage({ event, store: replayStore, getHandler: getActionHandler })
    : recovered ?? await executeStage(ordinaryInput!);

  const ordinaryNextStage = execution && execution.zapDetails.zap.actions.length - 1 !== event.stage
    ? event.stage + 1 : null;
  await settleMessage(resolution, event, ordinaryNextStage, topic, partition, message.offset, {
    send: input => producer.send(input),
    commitOffsets: input => consumer.commitOffsets(input),
  });
}

async function main() {
  await consumer.connect();
  await consumer.subscribe({ topic: TOPIC_NAME, fromBeginning: true });
  const producer = kafka.producer();
  await producer.connect();
  await consumer.run({
    autoCommit: false,
    eachMessage: async ({ topic, partition, message }) => {
      await processMessage(producer, topic, partition, message);
    },
  });
}

if (import.meta.main) main().catch(console.error);
