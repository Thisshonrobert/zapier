import { prisma } from "../../packages/db/prisma/db";
import { Kafka } from "kafkajs";

 const TOPIC_NAME = 'zap-events'
const kafka = new Kafka({
    clientId: 'outbox-processor',
    brokers: ['localhost:9092']
  })
  
async function main() {
    const producer = kafka.producer()
    await producer.connect();

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