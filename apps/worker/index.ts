import { Kafka } from "kafkajs";
import { prisma } from "../../packages/db/prisma/db";
import { withRetry } from "./retry";
import { deadLetter, DLQ_TOPIC } from "./deadletter";
import { getActionHandler } from "./actions";
import type { ActionContext } from "./types";

const TOPIC_NAME = "zap-events";
const RETRY_ATTEMPTS = 3;
const LEASE_DURATION_MS = 2 * 60_000; // 120s lease window for worker crash recovery

const kafka = new Kafka({
  clientId: "worker",
  brokers: ["localhost:9092"],
});

const consumer = kafka.consumer({ groupId: "zap-group" });

/**
 * Main worker entry point:
 * Consumes zap events from Kafka, uses lease-based atomic reservation (PENDING + lease -> SUCCESS/FAILED)
 * to prevent concurrent execution races and recover from worker crashes, executes actions, and commits offsets.
 */
async function main() {
  await consumer.connect();
  await consumer.subscribe({ topic: TOPIC_NAME, fromBeginning: true });
  const producer = kafka.producer();
  await producer.connect();

  await consumer.run({
    autoCommit: false,
    eachMessage: async ({ topic, partition, message }) => {
      console.log({
        partition,
        offset: message.offset,
        value: message.value?.toString(),
      });
      if (!message.value?.toString()) return;

      const parsedValue = JSON.parse(message.value?.toString());
      const zapRunId = parsedValue.zapRunId;
      const stage = parsedValue.stage;

      const zapDetails = await prisma.zapRun.findFirst({
        where: {
          id: zapRunId,
        },
        include: {
          zap: {
            include: {
              actions: {
                include: {
                  type: true,
                },
              },
            },
          },
        },
      });

      const currentAction = zapDetails?.zap.actions.find(
        (x) => x.sortingOrder === stage
      );

      if (!currentAction) {
        console.log("Current action not found for stage", stage);
        return;
      }

      // 1. Atomic Lease Claim:
      // Try to insert a 'PENDING' row with a 60s lease.
      // - If insert succeeds: this worker holds the lease and executes the stage.
      // - If unique constraint fails (P2002): check if SUCCESS, active PENDING, or an expired lease to reclaim.
      let executionClaimed = false;
      let alreadySucceeded = false;
      const now = new Date();
      const leaseUntil = new Date(now.getTime() + LEASE_DURATION_MS);

      try {
        await prisma.zapRunExecution.create({
          data: {
            zapRunId,
            stage,
            status: "PENDING",
            leaseUntil,
          },
        });
        executionClaimed = true;
      } catch (err: any) {
        if (err.code === "P2002") {
          const existing = await prisma.zapRunExecution.findUnique({
            where: {
              zapRunId_stage: {
                zapRunId,
                stage,
              },
            },
          });

          if (existing?.status === "SUCCESS") {
            console.log(
              `[Idempotency] zapRunId=${zapRunId} stage=${stage} already completed successfully. Skipping.`
            );
            alreadySucceeded = true;
          } else if (existing?.status === "FAILED") {
            console.log(
              `[Idempotency] zapRunId=${zapRunId} stage=${stage} previously failed (terminal). Skipping.`
            );
          } else if (existing?.status === "PENDING") {
            if (existing.leaseUntil && existing.leaseUntil > now) {
              console.log(
                `[Idempotency] zapRunId=${zapRunId} stage=${stage} actively locked by another worker. Skipping.`
              );
            } else {
              // Worker crashed previously: attempt atomic lease reclamation
              const reclaimResult = await prisma.zapRunExecution.updateMany({
                where: {
                  zapRunId,
                  stage,
                  status: "PENDING",
                  OR: [
                    { leaseUntil: { lte: now } },
                    { leaseUntil: null },
                  ],
                },
                data: {
                  leaseUntil,
                },
              });

              if (reclaimResult.count > 0) {
                console.log(
                  `[Idempotency] zapRunId=${zapRunId} stage=${stage} reclaimed expired lease from crashed worker.`
                );
                executionClaimed = true;
              } else {
                console.log(
                  `[Idempotency] zapRunId=${zapRunId} stage=${stage} lease reclaimed concurrently by another worker. Skipping.`
                );
              }
            }
          }
        } else {
          throw err;
        }
      }

      let succeeded = alreadySucceeded;

      if (executionClaimed) {
        const handler = getActionHandler(currentAction.type.id);

        if (!handler) {
          console.error(`Unsupported action type: ${currentAction.type.id}`);
          succeeded = false;
          await prisma.zapRunExecution.update({
            where: { zapRunId_stage: { zapRunId, stage } },
            data: { status: "FAILED", leaseUntil: null, completedAt: new Date() },
          });
        } else {
          const idempotencyKey = `zaprun_${zapRunId}_stage_${stage}`;
          const ctx: ActionContext = {
            zapRunId,
            stage,
            idempotencyKey,
            zapRunMetadata: (zapDetails?.metadata as Record<string, unknown>) ?? {},
          };

          try {
            // 2. Execute action handler with in-process retry
            await withRetry(
              () => handler.execute(currentAction.metadata as Record<string, unknown>, ctx),
              RETRY_ATTEMPTS
            );

            // 3. Mark execution as SUCCESS in DB and release lease
            await prisma.zapRunExecution.update({
              where: { zapRunId_stage: { zapRunId, stage } },
              data: {
                status: "SUCCESS",
                leaseUntil: null,
                completedAt: new Date(),
              },
            });
            succeeded = true;
          } catch (error) {
            succeeded = false;
            // 4. Mark status as FAILED, release lease, and route to DLQ topic and retry table
            await prisma.zapRunExecution
              .update({
                where: { zapRunId_stage: { zapRunId, stage } },
                data: {
                  status: "FAILED",
                  leaseUntil: null,
                  completedAt: new Date(),
                },
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
              error
            );
          }
        }
      }

      const lastStage = zapDetails!.zap.actions.length - 1;

      // 5. Advance to next stage if current stage succeeded and is not the final stage
      if (succeeded && lastStage !== stage) {
        await producer.send({
          topic: TOPIC_NAME,
          messages: [
            {
              value: JSON.stringify({
                stage: stage + 1,
                zapRunId,
              }),
            },
          ],
        });
      }

      console.log(
        succeeded ? "processing done" : "processing failed, stage not advanced"
      );

      // 6. Commit offset now that message has been either processed or dead-lettered
      await consumer.commitOffsets([
        {
          topic: TOPIC_NAME,
          partition: partition,
          offset: (parseInt(message.offset) + 1).toString(),
        },
      ]);
    },
  });
}

main().catch(console.error);
