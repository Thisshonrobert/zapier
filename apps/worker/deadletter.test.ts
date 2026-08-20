import assert from "node:assert";
import { deadLetter, DLQ_TOPIC } from "./deadletter";

async function main() {
  assert.equal(DLQ_TOPIC, "zap-events-dlq");

  // happy path: both sinks see the failure
  const sent: any[] = [];
  const rows: any[] = [];
  await deadLetter(
    {
      send: async (p) => {
        sent.push(p);
      },
      record: async (r) => {
        rows.push(r);
      },
    },
    "run-1",
    2,
    3,
    new Error("smtp down")
  );
  assert.equal(sent.length, 1);
  assert.equal(sent[0].zapRunId, "run-1");
  assert.equal(sent[0].stage, 2);
  assert.match(sent[0].error, /smtp down/);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].attempt, 3);
  assert.match(rows[0].lastError, /smtp down/);

  // one dead sink must not stop the other
  const only: any[] = [];
  await deadLetter(
    {
      send: async () => {
        throw new Error("kafka gone");
      },
      record: async (r) => {
        only.push(r);
      },
    },
    "run-2",
    0,
    3,
    "plain string failure"
  );
  assert.equal(only.length, 1, "record should still run when send throws");
  assert.equal(only[0].lastError, "plain string failure");

  // both dead: never throws, or it takes the consumer loop down with it
  await deadLetter(
    {
      send: async () => {
        throw new Error("kafka gone");
      },
      record: async () => {
        throw new Error("db gone");
      },
    },
    "run-3",
    1,
    3,
    new Error("nope")
  );

  console.log("deadletter.test.ts OK");
}

main();
