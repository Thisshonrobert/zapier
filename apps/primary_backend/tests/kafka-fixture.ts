import { randomUUID } from "node:crypto";
import { Kafka, logLevel, type EachMessagePayload } from "kafkajs";

// Never subscribe to the live zap-events topic or the production worker group.
export async function createKafkaFixture() {
  const brokers = process.env.KAFKA_TEST_BROKERS?.split(",").filter(Boolean);
  if (!brokers?.length) throw new Error("Explicitly set KAFKA_TEST_BROKERS for recovery tests");
  const id = randomUUID();
  const topic = `test-replay-${id}`, groupId = `test-replay-${id}`;
  const kafka = new Kafka({ clientId: groupId, brokers, logLevel: logLevel.NOTHING,
    retry: { retries: 2 }, connectionTimeout: 3000, requestTimeout: 30000 });
  const admin = kafka.admin(), producer = kafka.producer();
  await admin.connect();
  try {
    await admin.createTopics({ waitForLeaders: true,
      topics: [{ topic, numPartitions: 1, replicationFactor: 1 }] });
    await producer.connect();
  } catch (error) { await admin.disconnect(); throw error; }
  return { topic, producer, admin, groupId,
    send: (message: { key?: string; value: string }) => producer.send({ topic, messages: [message] }),
    async offset() {
      const offsets = await admin.fetchOffsets({ groupId, topics: [topic] });
      return offsets[0]?.partitions[0]?.offset ?? "-1";
    },
    async deliver(handler: (message: EachMessagePayload,
      consumer: ReturnType<typeof kafka.consumer>) => Promise<void>) {
      // A fresh consumer proves recovery from the broker's committed offset.
      const consumer = kafka.consumer({ groupId, sessionTimeout: 10000 });
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await consumer.connect();
        await consumer.subscribe({ topic, fromBeginning: true });
        await new Promise<void>((resolve, reject) => {
          timer = setTimeout(() => reject(new Error("Kafka recovery delivery timed out")), 20000);
          consumer.on(consumer.events.CRASH, ({ payload }) => reject(payload.error));
          void consumer.run({ autoCommit: false, eachMessage: async payload => {
            payload.pause();
            try { await handler(payload, consumer); resolve(); }
            catch (error) { reject(error); }
          } }).catch(reject);
        });
      } finally {
        if (timer) clearTimeout(timer);
        await consumer.disconnect();
      }
    },
    async close() {
      await producer.disconnect();
      try {
        await admin.deleteGroups([groupId]);
        await admin.deleteTopics({ topics: [topic], timeout: 5000 });
      } finally { await admin.disconnect(); }
    },
  };
}
