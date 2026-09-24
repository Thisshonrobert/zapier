//executable process + Kafka wiring + loop
import { createDlqPublisher, type DlqPublisherDb } from "./dlq-publisher.ts";
import { createDlqReconciler, type ReconcilerDb } from "./dlq-reconciler.ts";

type ProcessDependencies = {
  reconciler: { reconcileNext(): Promise<string> };
  publisher: { publishNext(): Promise<string> };
  isStopping(): boolean;
  sleep(milliseconds: number): Promise<void>;
  idleDelayMs?: number;
};

export async function runDlqProcess({
  reconciler,
  publisher,
  isStopping,
  sleep,
  idleDelayMs = 1_000,
}: ProcessDependencies): Promise<void> {
  while (!isStopping()) {
    const reconciliation = await reconciler.reconcileNext();
    const publication = await publisher.publishNext();
    if (reconciliation === "EMPTY" && publication === "EMPTY")
      await sleep(idleDelayMs);
  }
}

async function main() {
  const [{ Kafka }, { prisma }] = await Promise.all([
    import("kafkajs"),
    import("../../packages/db/prisma/db.ts"),
  ]);
  const kafka = new Kafka({
    clientId: "dlq-publisher",
    brokers: ["localhost:9092"],
  });
  const producer = kafka.producer();
  let stopping = false;
  let connected = false;
  const stop = () => {
    stopping = true;
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  try {
    await producer.connect();
    connected = true;
    const db = prisma as unknown as DlqPublisherDb & ReconcilerDb;
    await runDlqProcess({
      reconciler: createDlqReconciler(db),
      publisher: createDlqPublisher(db, {
        send: async (message) => {
          await producer.send({ topic: "zap-events-dlq", messages: [message] });
        },
      }),
      isStopping: () => stopping,
      sleep: (milliseconds) =>
        new Promise((resolve) => setTimeout(resolve, milliseconds)),
    });
  } finally {
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
    if (connected) await producer.disconnect();
    await prisma.$disconnect();
  }
}

if (import.meta.main)
  main().catch((error) => {
    console.error("DLQ publisher stopped", error);
    process.exitCode = 1;
  });

  /**dlq-publisher.ts
        ↓
"how do I safely publish?"

dlq-publisher-index.ts
        ↓
"run this publisher continuously using Kafka" */