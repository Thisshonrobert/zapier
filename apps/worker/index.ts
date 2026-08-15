import { Kafka } from "kafkajs";
import { prisma } from "../../packages/db/prisma/db";
import { parse } from "./parse";
import type { JsonObject } from "@prisma/client/runtime/binary";
import { resolveChatId, sendTelegram } from "./telegram";
import { email } from "./email";
const TOPIC_NAME = "zap-events";
const kafka = new Kafka({
  clientId: "worker",
  brokers: ["localhost:9092"],
});
const consumer = kafka.consumer({ groupId: "zap-group" });

// ponytail: in-process retry only — covers transient failures (network blip, rate limit).
// Permanent failures are logged and skipped so one bad message can't block the partition.
// Upgrade path: persist an attempt counter + DLQ topic if delivery must survive a restart.
async function withRetry(fn: () => Promise<void>, attempts = 3) {
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === attempts) throw err;
      const wait = 1000 * 2 ** (i - 1); // 1s, 2s
      console.log(`attempt ${i}/${attempts} failed, retrying in ${wait}ms`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

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
        console.log(zapDetails);

        const currentAction = zapDetails?.zap.actions.find(
          (x) => x.sortingOrder === stage
        );

        if (!currentAction) {
          console.log("Current action not found");
          return;
        }

        const zapRunMetaData = zapDetails?.metadata ?? {};

        let succeeded = true;

        try {
          if (currentAction.type.id === "email") {
            console.log("email action");
            const to = parse(
              (currentAction.metadata as JsonObject)?.to as string,
              zapRunMetaData
            ).trim();
            const body = parse(
              (currentAction.metadata as JsonObject)?.body as string,
              zapRunMetaData
            ).trim();

            const from = parse(
              (currentAction.metadata as JsonObject)?.from as string,
              zapRunMetaData
            ).trim();
            const subject = parse(
              (currentAction.metadata as JsonObject)?.subject as string,
              zapRunMetaData
            ).trim();
            console.log("results from parser = ", to,from,body,subject)
            await withRetry(() => email(to, body, from, subject));
          }

          if (currentAction.type.id === "telegram") {
            console.log("telegram post action ");
            const botToken =( parse(
              (currentAction.metadata as JsonObject)?.botToken as string,
              zapRunMetaData).trim() || process.env.TELEGRAM_BOT_TOKEN
            ) || "";
            const channelUserName = parse(
              (currentAction.metadata as JsonObject)?.channelUserName as string,
              zapRunMetaData
            ).trim();
            const chatId = await resolveChatId(channelUserName,botToken);
            const message = parse(
              (currentAction.metadata as JsonObject)?.message as string,
              zapRunMetaData
            ).trim();
            await withRetry(() => sendTelegram(chatId, message, botToken));
          }
        } catch (error) {
          succeeded = false;
          console.error("action failed after retries", { zapRunId, stage, error });
        }

        const lastStage = zapDetails!.zap.actions.length - 1;

        // only advance and mark done when the action actually succeeded
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

        console.log(succeeded ? "processing done" : "processing failed, stage not advanced");

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
