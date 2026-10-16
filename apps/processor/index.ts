import { prisma } from "../../packages/db/prisma/db";
import { Kafka } from "kafkajs";

 const TOPIC_NAME = process.env.KAFKA_EVENTS_TOPIC ?? 'zap-events'
const kafka = new Kafka({
    clientId: 'outbox-processor',
    brokers: process.env.KAFKA_BROKERS?.split(',') ?? ['localhost:9092']
  })
  
async function main() {
    const producer = kafka.producer()
    await producer.connect();

    // The verified lab replay profile runs the production dispatcher on the processor's own
    // producer and marked topic. Without that profile this branch is never taken, so the
    // ordinary lab and every production deployment keep the closed release gate. The
    // processor verifies the marked database itself before dispatch starts.
    if (process.env.TRIAGE_LAB_REPLAY_PROFILE) {
        const { startVerifiedLabReplayDispatch } = await import("../../scripts/dev/triage-lab-replay.ts");
        await startVerifiedLabReplayDispatch(prisma as never, { send: message => producer.send(message) });
        console.log("processor: lab replay dispatch enabled");
    }
    while(1){
        const pendingRows = await prisma.zapRunOutbox.findMany({
            where:{},
            orderBy:{ id: 'asc' },
            take:10
        })

        if (pendingRows.length === 0) {
            await new Promise(r => setTimeout(r, 500))
            continue
        }

        // await before deleting: if the broker never acks, the rows stay in the
        // outbox and get picked up on the next loop instead of being lost.
        await producer.send({
            topic:TOPIC_NAME,
            messages:pendingRows.map(row => ({
                value: JSON.stringify({zapRunId: row.zapRunId, stage: 0})
            }))
        })

        await prisma.zapRunOutbox.deleteMany({
            where:{
                id:{
                    in:pendingRows.map(x=>x.id)
                }
            }
        })
        console.log(`processor: published ${pendingRows.length} event(s)`)
    }
}
main();
