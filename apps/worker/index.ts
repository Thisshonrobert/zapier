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

async function main() {
  await consumer.connect();
  await consumer.subscribe({ topic: TOPIC_NAME, fromBeginning: true });
  const producer = kafka.producer();
  await producer.connect();
  while (1) {
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
            zapId: zapRunId,
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

        if (currentAction.type.id === "email") {
          try {
            console.log("email action");
            const to = parse(
              (currentAction.metadata as JsonObject)?.email as string,
              zapRunMetaData
            );
            const body = parse(
              (currentAction.metadata as JsonObject)?.body as string,
              zapRunMetaData
            );

            const from = parse(
              (currentAction.metadata as JsonObject)?.from as string,
              zapRunMetaData
            );
            const subject = parse(
              (currentAction.metadata as JsonObject)?.subject as string,
              zapRunMetaData
            );

            await email(to, body, from, subject);
          } catch (error) {
            console.log(error);
          }
        }
        if (currentAction.type.id === "telegram") {
          try {
            console.log("telegram post action ");
            if (currentAction.type.id === "telegram") {
              const channelUsername = parse(
                (currentAction.metadata as JsonObject)?.chatId as string,
                zapRunMetaData
              );
              const chatId = await resolveChatId(channelUsername);
              const message = parse(
                (currentAction.metadata as JsonObject)?.message as string,
                zapRunMetaData
              );
              await sendTelegram(chatId, message);
            }
          } catch (error) {
            console.log(error);
          }
        }

        const lastStage = zapDetails!.zap.actions.length - 1;

        if (lastStage !== stage) {
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

        await new Promise((r) => setTimeout(r, 2000));

        console.log("processing done");

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
}
main().catch(console.error);
