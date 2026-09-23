import assert from "node:assert/strict";
import { Prisma, PrismaClient } from "../generated/prisma/client.ts";

const generatedClient = new PrismaClient();
const runtimeModels = (generatedClient as any)._runtimeDataModel.models as Record<string, object>;
const dmmf = (Prisma as any).dmmf ?? {
  datamodel: {
    models: Object.entries(runtimeModels).map(([name, value]) => ({ name, ...value })),
  },
};

const migrationPath = new URL(
  "./migrations/20260922000000_phase_3b_durable_failures/migration.sql",
  import.meta.url,
);

const model = (name: string) => {
  const value = dmmf.datamodel.models.find((item: { name: string }) => item.name === name);
  assert.ok(value, `${name} model is missing`);
  return value;
};

const field = (modelName: string, fieldName: string) => {
  const value = model(modelName).fields.find((item) => item.name === fieldName);
  assert.ok(value, `${modelName}.${fieldName} is missing`);
  return value;
};

const assertField = (
  modelName: string,
  fieldName: string,
  expected: {
    type: string;
    required: boolean;
    list?: boolean;
    default?: unknown;
  },
) => {
  const value = field(modelName, fieldName);
  assert.equal(value.type, expected.type, `${modelName}.${fieldName} type`);
  assert.equal(
    value.isRequired,
    expected.required,
    `${modelName}.${fieldName} nullability`,
  );
  assert.equal(value.isList, expected.list ?? false, `${modelName}.${fieldName} list`);
  if ("default" in expected) {
    assert.deepEqual(
      value.default,
      expected.default,
      `${modelName}.${fieldName} default`,
    );
  }
};

assertField("ZapRunExecution", "claimToken", {
  type: "String",
  required: false,
});
assertField("ZapRunExecution", "providerOutcome", {
  type: "String",
  required: false,
});
assertField("ZapRunExecution", "actionFingerprint", {
  type: "String",
  required: false,
});
assertField("ZapRunExecution", "requestFingerprint", {
  type: "String",
  required: false,
});
assertField("ZapRunExecution", "requiresHuman", {
  type: "Boolean",
  required: true,
  default: false,
});
assertField("ZapRunExecution", "attempts", {
  type: "ZapRunExecutionAttempt",
  required: true,
  list: true,
});
assertField("ZapRunExecution", "failure", {
  type: "ZapRunRetry",
  required: false,
});

const attemptFields = {
  id: { type: "String", required: true },
  executionId: { type: "String", required: true },
  execution: { type: "ZapRunExecution", required: true },
  attemptNumber: { type: "Int", required: true },
  status: { type: "String", required: true },
  provider: { type: "String", required: false },
  phase: { type: "String", required: false },
  safeCode: { type: "String", required: false },
  providerStatus: { type: "Int", required: false },
  retryAfterSeconds: { type: "Int", required: false },
  safeReceiptId: { type: "String", required: false },
  actionFingerprint: { type: "String", required: true },
  requestFingerprint: { type: "String", required: true },
  startedAt: { type: "DateTime", required: true },
  completedAt: { type: "DateTime", required: false },
} as const;

for (const [name, expected] of Object.entries(attemptFields)) {
  assertField("ZapRunExecutionAttempt", name, expected);
}

const attempt = model("ZapRunExecutionAttempt");
assert.ok(
  attempt.uniqueFields.some(
    (fields) =>
      fields.length === 2 &&
      fields[0] === "executionId" &&
      fields[1] === "attemptNumber",
  ),
  "ZapRunExecutionAttempt must be unique on (executionId, attemptNumber)",
);

for (const [name, type] of Object.entries({
  executionId: "String",
  provider: "String",
  phase: "String",
  providerOutcome: "String",
  safeCode: "String",
  providerStatus: "Int",
  retryAfterSeconds: "Int",
  safeReceiptId: "String",
  actionFingerprint: "String",
  requestFingerprint: "String",
  dlqPublishedAt: "DateTime",
})) {
  assertField("ZapRunRetry", name, { type, required: false });
}
assertField("ZapRunRetry", "execution", {
  type: "ZapRunExecution",
  required: false,
});
assertField("ZapRunRetry", "requiresHuman", {
  type: "Boolean",
  required: true,
  default: true,
});

for (const legacyField of [
  "id",
  "zapRunId",
  "stage",
  "attempt",
  "lastError",
  "nextRunAt",
  "createdAt",
]) {
  field("ZapRunRetry", legacyField);
}
assert.equal(field("ZapRunRetry", "id").isId, true, "ZapRunRetry.id remains the failureId");
assert.equal((field("ZapRunRetry", "id").default as { name?: string }).name, "uuid");
assert.equal(field("ZapRunRetry", "executionId").isUnique, true);

const migration = await Bun.file(migrationPath).text();
assert.match(migration, /CREATE TABLE "ZapRunExecutionAttempt"/);
assert.match(
  migration,
  /CREATE UNIQUE INDEX "ZapRunRetry_executionId_key" ON "ZapRunRetry"\("executionId"\)/,
);
assert.match(
  migration,
  /FOREIGN KEY \("executionId"\) REFERENCES "ZapRunExecution"\("id"\)/,
);
assert.doesNotMatch(migration, /DROP\s+TABLE/i);
assert.doesNotMatch(migration, /DROP\s+COLUMN/i);

console.log("durable-failures-schema.test.ts OK");
await generatedClient.$disconnect();
