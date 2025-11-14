
import { Kafka } from "kafkajs";
import { prisma } from "../../packages/db/prisma/db"
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
        if(!message.value?.toString()) return;

        const parsedValue = JSON.parse(message.value?.toString())
        const zapRunId = parsedValue.zapRunId;
        const stage = parsedValue.stage;
        const zapDetails = await prisma.zapRun.findFirst({
          where:{
            zapId:zapRunId
          },
          include:{
            zap: {
              include: {
                actions: {
                  include: {
                    type: true,
                  },
                },
              },
            },
          }
        })
        console.log(zapDetails);

        const currentAction = zapDetails?.zap.actions.find(x=> x.sortingOrder === stage);

        if (!currentAction) {
          console.log("Current action not found");
          return;
        }

        const zapRunMetaData = zapDetails?.metadata

        if(currentAction.type.id === "email") console.log("email action")
        if(currentAction.type.id === "send-sol") console.log("sol action")
          
        const lastStage = (zapDetails?.zap.actions.length || 1) - 1;
        
        if(lastStage!==stage){
          await producer.send({
            topic:TOPIC_NAME,
            messages: [
              {
                value: JSON.stringify({
                  stage: stage + 1,
                  zapRunId,
                }),
              },
            ],
          })
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
