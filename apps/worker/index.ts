import { Kafka } from "kafkajs";
import { prisma } from "../../packages/db/prisma/db";
import { getActionHandler } from "./actions";
import { deadLetter, DLQ_TOPIC } from "./deadletter";
import { withRetry } from "./retry";
import type { ActionContext } from "./types";

// -----------------------------------------------------------------------------
// Worker configuration
// -----------------------------------------------------------------------------

const TOPIC_NAME = "zap-events";
const RETRY_ATTEMPTS = 3;
const LEASE_DURATION_MS = 2 * 60_000; // Worker-crash recovery window.

const kafka = new Kafka({
  clientId: "worker",
  brokers: ["localhost:9092"],
});
const consumer = kafka.consumer({ groupId: "zap-group" });

type ZapEvent = {
  zapRunId: string;
  stage: number;
};

// -----------------------------------------------------------------------------
// Worker lifecycle
// -----------------------------------------------------------------------------

/** Connect the Kafka clients and begin processing zap-stage events. */
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

// -----------------------------------------------------------------------------
// Message orchestration
// -----------------------------------------------------------------------------

async function processMessage(
  producer: ReturnType<typeof kafka.producer>,
  topic: string,
  partition: number,
  message: { offset: string; value: Buffer | null },
) {
  console.log({
    partition,
    offset: message.offset,
    value: message.value?.toString(),
  });

  const value = message.value?.toString();
  if (!value) return;

  const event = JSON.parse(value) as ZapEvent;
  const execution = await loadStageExecution(event);

  if (!execution) {
    console.log("Current action not found for stage", event.stage);
    return;
  }

  const claim = await claimExecution(event);
  const succeeded =
    claim.alreadySucceeded ||
    (claim.executionClaimed &&
      (await executeClaimedAction(producer, execution, event)));

  await publishNextStage(producer, event, execution.zapDetails, succeeded);

  console.log(
    succeeded ? "processing done" : "processing failed, stage not advanced",
  );

  // Commit only after the event was processed, skipped, or dead-lettered.
  await consumer.commitOffsets([
    {
      topic,
      partition,
      offset: (parseInt(message.offset) + 1).toString(),
    },
  ]);
}

/** Load the run and the action identified by an event's stage. */
async function loadStageExecution({ zapRunId, stage }: ZapEvent) {
  const zapDetails = await prisma.zapRun.findFirst({
    where: { id: zapRunId },
    include: {
      zap: {
        include: {
          actions: {
            include: { type: true },
          },
        },
      },
    },
  });

  const currentAction = zapDetails?.zap.actions.find(
    (action) => action.sortingOrder === stage,
  );

  return currentAction ? { zapDetails, currentAction } : null;
}

// -----------------------------------------------------------------------------
// Idempotency lease management
// -----------------------------------------------------------------------------

/**
 * Claim a stage exactly once. Existing completed or terminally failed stages are
 * skipped; expired PENDING leases are reclaimed after a worker crash.
 */
async function claimExecution({ zapRunId, stage }: ZapEvent) {
  let executionClaimed = false;
  let alreadySucceeded = false;
  const now = new Date();
  const leaseUntil = new Date(now.getTime() + LEASE_DURATION_MS);

  try {
    await prisma.zapRunExecution.create({
      data: { zapRunId, stage, status: "PENDING", leaseUntil },
    });
    executionClaimed = true;
  } catch (err: any) {
    if (err.code !== "P2002") throw err;

    const existing = await prisma.zapRunExecution.findUnique({
      where: { zapRunId_stage: { zapRunId, stage } },
    });

    if (existing?.status === "SUCCESS") {
      console.log(
        `[Idempotency] zapRunId=${zapRunId} stage=${stage} already completed successfully. Skipping.`,
      );
      alreadySucceeded = true;
    } else if (existing?.status === "FAILED") {
      console.log(
        `[Idempotency] zapRunId=${zapRunId} stage=${stage} previously failed (terminal). Skipping.`,
      );
    } else if (existing?.status === "PENDING") {
      if (existing.leaseUntil && existing.leaseUntil > now) {
        console.log(
          `[Idempotency] zapRunId=${zapRunId} stage=${stage} actively locked by another worker. Skipping.`,
        );
      } else {
        const reclaimResult = await prisma.zapRunExecution.updateMany({
          where: {
            zapRunId,
            stage,
            status: "PENDING",
            OR: [{ leaseUntil: { lte: now } }, { leaseUntil: null }],
          },
          data: { leaseUntil },
        });

        if (reclaimResult.count > 0) {
          console.log(
            `[Idempotency] zapRunId=${zapRunId} stage=${stage} reclaimed expired lease from crashed worker.`,
          );
          executionClaimed = true;
        } else {
          console.log(
            `[Idempotency] zapRunId=${zapRunId} stage=${stage} lease reclaimed concurrently by another worker. Skipping.`,
          );
        }
      }
    }
  }

  return { executionClaimed, alreadySucceeded };
}

// -----------------------------------------------------------------------------
// Action execution and stage progression
// -----------------------------------------------------------------------------

async function executeClaimedAction(
  producer: ReturnType<typeof kafka.producer>,
  execution: NonNullable<Awaited<ReturnType<typeof loadStageExecution>>>,
  { zapRunId, stage }: ZapEvent,
) {
  const handler = getActionHandler(execution.currentAction.type.id);

  if (!handler) {
    console.error(
      `Unsupported action type: ${execution.currentAction.type.id}`,
    );
    await updateExecutionStatus(zapRunId, stage, "FAILED");
    return false;
  }

  const ctx: ActionContext = {
    zapRunId,
    stage,
    idempotencyKey: `zaprun_${zapRunId}_stage_${stage}`,
    zapRunMetadata:
      (execution.zapDetails?.metadata as Record<string, unknown>) ?? {},
  };

  try {
    await withRetry(
      () =>
        handler.execute(
          execution.currentAction.metadata as Record<string, unknown>,
          ctx,
        ),
      RETRY_ATTEMPTS,
    );
    await updateExecutionStatus(zapRunId, stage, "SUCCESS");
    return true;
  } catch (error) {
    await prisma.zapRunExecution
      .update({
        where: { zapRunId_stage: { zapRunId, stage } },
        data: { status: "FAILED", leaseUntil: null, completedAt: new Date() },
      })
      .catch(() => {});

    await deadLetter(
      {
        send: async (payload) => {
          await producer.send({
            topic: DLQ_TOPIC,
            messages: [{ value: JSON.stringify(payload) }],
          });
        },
        record: async (row) => {
          await prisma.zapRunRetry.create({ data: row });
        },
      },
      zapRunId,
      stage,
      RETRY_ATTEMPTS,
      error,
    );
    return false;
  }
}

async function updateExecutionStatus(
  zapRunId: string,
  stage: number,
  status: "SUCCESS" | "FAILED",
) {
  await prisma.zapRunExecution.update({
    where: { zapRunId_stage: { zapRunId, stage } },
    data: { status, leaseUntil: null, completedAt: new Date() },
  });
}

async function publishNextStage(
  producer: ReturnType<typeof kafka.producer>,
  { zapRunId, stage }: ZapEvent,
  zapDetails: NonNullable<
    Awaited<ReturnType<typeof loadStageExecution>>
  >["zapDetails"],
  succeeded: boolean,
) {
  const lastStage = zapDetails!.zap.actions.length - 1;
  if (succeeded && lastStage !== stage) {
    await producer.send({
      topic: TOPIC_NAME,
      messages: [{ value: JSON.stringify({ stage: stage + 1, zapRunId }) }],
    });
  }
}
main().catch(console.error);
