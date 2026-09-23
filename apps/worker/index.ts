import { Kafka } from "kafkajs";
import { prisma } from "../../packages/db/prisma/db";
import { getActionHandler } from "./actions";
import { createExecutionStore, type ExecutionDb } from "./execution-store.ts";
import { executeStage, parseZapEvent, requireLoadedAction, type ZapEvent } from "./orchestration.ts";

const TOPIC_NAME = "zap-events";
const kafka = new Kafka({ clientId: "worker", brokers: ["localhost:9092"] });
const consumer = kafka.consumer({ groupId: "zap-group" });
const store = createExecutionStore(prisma as unknown as ExecutionDb);

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
  const execution = requireLoadedAction(await loadStageExecution(event));

  const resolution = await executeStage({
    event,
    action: {
      id: execution.currentAction.id,
      typeId: execution.currentAction.type.id,
      metadata: execution.currentAction.metadata as Record<string, unknown>,
    },
    zapRunMetadata: execution.zapDetails.metadata as Record<string, unknown>,
    store,
    getHandler: getActionHandler,
  });

  if (resolution.advance && execution.zapDetails.zap.actions.length - 1 !== event.stage) {
    await producer.send({
      topic: TOPIC_NAME,
      messages: [{ value: JSON.stringify({ stage: event.stage + 1, zapRunId: event.zapRunId }) }],
    });
  }

  if (!resolution.ack) {
    console.error("stage remains unresolved", {
      zapRunId: event.zapRunId,
      stage: event.stage,
      reason: "durable_resolution_required",
    });
    throw new Error("stage remains unresolved");
  }

  await consumer.commitOffsets([{
    topic,
    partition,
    offset: (Number.parseInt(message.offset, 10) + 1).toString(),
  }]);
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
