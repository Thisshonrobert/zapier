import assert from "node:assert/strict";
import { createDlqPublisher } from "./dlq-publisher.ts";

type Row = Record<string, any>;

const matches = (row: Row, where: Row): boolean =>
  Object.entries(where).every(([key, expected]: [string, any]) => {
    if (key === "AND") return expected.every((part: Row) => matches(row, part));
    if (key === "OR") return expected.some((part: Row) => matches(row, part));
    if (expected && typeof expected === "object" && "lte" in expected)
      return row[key] != null && row[key] <= expected.lte;
    return row[key] === expected;
  });

function fakeDb(seed: Row[]) {
  const rows = new Map(seed.map((row) => [row.id, { ...row }]));
  const db: any = {
    zapRunRetry: {
      findMany: async ({ where, take }: any) =>
        [...rows.values()]
          .filter((row) => matches(row, where))
          .slice(0, take)
          .map((row) => ({ ...row })),
      findUnique: async ({ where }: any) => {
        const row = rows.get(where.id);
        return row ? { ...row } : null;
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const [id, row] of rows) {
          if (!matches(row, where)) continue;
          const next = { ...row, ...data };
          for (const [key, value] of Object.entries(data) as [string, any][]) {
            if (value && typeof value === "object" && "increment" in value)
              next[key] = (row[key] ?? 0) + value.increment;
          }
          rows.set(id, next);
          count++;
        }
        return { count };
      },
    },
  };
  return { db, rows };
}

const createdAt = new Date("2026-09-23T00:00:00.000Z");
const base = {
  id: "failure-1",
  zapRunId: "run-1",
  stage: 2,
  attempt: 1,
  providerOutcome: "rejected",
  safeCode: "provider_rejected",
  evidenceSource: "captured",
  requiresHuman: true,
  lastError: "secret provider payload",
  createdAt,
  dlqPublishedAt: null,
  dlqPublishClaimToken: null,
  dlqPublishLeaseUntil: null,
  dlqNextAttemptAt: null,
  dlqPublishAttempts: 0,
};

{
  const { db, rows } = fakeDb([base]);
  const sent: any[] = [];
  const publisher = createDlqPublisher(
    db,
    { send: async (message) => void sent.push(message) },
    {
      now: () => new Date("2026-09-23T01:00:00.000Z"),
      randomUUID: () => "claim-1",
    },
  );
  assert.equal(await publisher.publishNext(), "PUBLISHED");
  assert.equal(await publisher.publishNext(), "EMPTY");
  assert.equal(sent[0].key, "failure-1");
  assert.deepEqual(JSON.parse(sent[0].value), {
    failureId: "failure-1",
    zapRunId: "run-1",
    stage: 2,
    attempt: 1,
    providerOutcome: "rejected",
    safeCode: "provider_rejected",
    requiresHuman: true,
    evidenceSource: "captured",
    failedAt: createdAt.toISOString(),
  });
  assert.equal(sent[0].value.includes("secret"), false);
  assert.ok(rows.get("failure-1")?.dlqPublishedAt instanceof Date);
}

{
  const { db } = fakeDb([base]);
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  let sends = 0;
  const options = {
    now: () => new Date("2026-09-23T01:00:00.000Z"),
    randomUUID: () => "concurrent-claim",
  };
  const first = createDlqPublisher(
    db,
    {
      send: async () => {
        sends++;
        await blocked;
      },
    },
    options,
  );
  const second = createDlqPublisher(
    db,
    {
      send: async () => {
        sends++;
      },
    },
    options,
  );
  const inFlight = first.publishNext();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(await second.publishNext(), "EMPTY");
  release();
  assert.equal(await inFlight, "PUBLISHED");
  assert.equal(sends, 1);
}

{
  let now = new Date("2026-09-23T01:00:00.000Z");
  const { db, rows } = fakeDb([base]);
  let fail = true;
  const publisher = createDlqPublisher(
    db,
    {
      send: async () => {
        if (fail) throw new Error("broker unavailable with sensitive details");
      },
    },
    { now: () => now, randomUUID: () => "claim-retry" },
  );
  assert.equal(await publisher.publishNext(), "RETRY_SCHEDULED");
  assert.equal(rows.get("failure-1")?.dlqPublishAttempts, 1);
  assert.equal(
    rows.get("failure-1")?.dlqNextAttemptAt.toISOString(),
    "2026-09-23T01:00:01.000Z",
  );
  assert.equal(await publisher.publishNext(), "EMPTY");
  fail = false;
  now = new Date("2026-09-23T01:00:01.000Z");
  assert.equal(await publisher.publishNext(), "PUBLISHED");
}

{
  const { db } = fakeDb([
    {
      ...base,
      attempt: -3,
      providerOutcome: "surprise",
      safeCode: "BAD CODE!",
      evidenceSource: null,
    },
  ]);
  let event: any;
  const publisher = createDlqPublisher(
    db,
    {
      send: async ({ value }) => {
        event = JSON.parse(value);
      },
    },
    {
      now: () => new Date("2026-09-23T01:00:00.000Z"),
      randomUUID: () => "claim-legacy",
    },
  );
  assert.equal(await publisher.publishNext(), "PUBLISHED");
  assert.equal(event.attempt, 0);
  assert.equal(event.providerOutcome, "unknown");
  assert.equal(event.safeCode, "legacy_unknown");
  assert.equal(event.evidenceSource, "legacy_unknown");
  assert.equal(event.requiresHuman, true);
}

console.log("dlq-publisher.test.ts OK");
