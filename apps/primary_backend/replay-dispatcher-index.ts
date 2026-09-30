import { Kafka } from "kafkajs";
import { prisma } from "../../packages/db/prisma/db.ts";
import { createReplayDispatcher, liveReplayEnabled } from "./services/replay-dispatcher.ts";

async function main() {
  if (!liveReplayEnabled()) { console.log("Replay dispatch disabled pending Phase 9C"); return; }
  const kafka = new Kafka({ clientId: "replay-dispatcher", brokers: ["localhost:9092"] });
  const producer = kafka.producer();
  await producer.connect();
  const dispatcher = createReplayDispatcher(prisma, { send: async message => {
    await producer.send({ topic: "zap-events", messages: [message] });
  } });
  let stopped = false;
  const stop = () => { stopped = true; };
  process.once("SIGINT", stop); process.once("SIGTERM", stop);
  try {
    while (!stopped) {
      await dispatcher.dispatchOne();
      await Bun.sleep(1000);
    }
  } finally { await producer.disconnect(); }
}

if (import.meta.main) main().catch(() => { console.error("Replay dispatcher failed"); process.exitCode = 1; });
