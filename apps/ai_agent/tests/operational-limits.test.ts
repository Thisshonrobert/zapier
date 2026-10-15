import { afterEach, expect, test } from "bun:test";
import { createServer } from "node:http";
import express from "express";
import { operationalLimits } from "../src/operational-limits.ts";
import { createInvestigationRouter } from "../src/investigation-http.ts";

const names = ["INVESTIGATION_ENABLED", "INVESTIGATION_INPUT_USD_PER_MILLION_TOKENS",
  "INVESTIGATION_OUTPUT_USD_PER_MILLION_TOKENS", "INVESTIGATION_OWNER_SPEND_CENTS_PER_DAY",
  "INVESTIGATION_OPERATOR_SPEND_CENTS_PER_DAY", "INVESTIGATION_MODEL_TIMEOUT_MS"] as const;
const original = Object.fromEntries(names.map(name => [name, process.env[name]]));
afterEach(() => { for (const name of names) {
  const value = original[name];
  if (value === undefined) delete process.env[name]; else process.env[name] = value;
} });

test("model deadline keeps the production default and bounds the slower local demo", () => {
  process.env.INVESTIGATION_ENABLED = "false";
  delete process.env.INVESTIGATION_MODEL_TIMEOUT_MS;
  expect(operationalLimits().modelTimeoutMs).toBe(15000);
  process.env.INVESTIGATION_MODEL_TIMEOUT_MS = "45000";
  expect(operationalLimits().modelTimeoutMs).toBe(45000);
  for (const value of ["0", "45001", "NaN", "1.5"]) {
    process.env.INVESTIGATION_MODEL_TIMEOUT_MS = value;
    expect(() => operationalLimits()).toThrow("INVESTIGATION_MODEL_TIMEOUT_MS");
  }
});

test("paid investigations fail closed without pricing and reserve a conservative cost", () => {
  process.env.INVESTIGATION_ENABLED = "true";
  delete process.env.INVESTIGATION_INPUT_USD_PER_MILLION_TOKENS;
  delete process.env.INVESTIGATION_OUTPUT_USD_PER_MILLION_TOKENS;
  expect(() => operationalLimits()).toThrow("INVESTIGATION_INPUT_USD_PER_MILLION_TOKENS");
  process.env.INVESTIGATION_INPUT_USD_PER_MILLION_TOKENS = "0.3";
  process.env.INVESTIGATION_OUTPUT_USD_PER_MILLION_TOKENS = "2.5";
  expect(operationalLimits()).toMatchObject({ tokensPerAttempt: 64000,
    costCentsPerAttempt: 16, ownerSpendCentsPerDay: 100, operatorSpendCentsPerDay: 100 });
  process.env.INVESTIGATION_OWNER_SPEND_CENTS_PER_DAY = "0";
  expect(() => operationalLimits()).toThrow("INVESTIGATION_OWNER_SPEND_CENTS_PER_DAY");
});

test("private status hides work from unauthenticated callers and shutdown latch rejects starts", async () => {
  const secret = "phase-14a-private-service-secret-long-enough";
  let reads = 0;
  const app = express();
  app.use(express.json());
  app.use("/private/v1/investigations", createInvestigationRouter({ serviceSecret: secret,
    enabled: () => false,
    store: { status: async () => { reads++; return { queued: 2, stale: 1 }; } } as never }));
  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as { port: number };
  const url = `http://127.0.0.1:${address.port}/private/v1/investigations`;
  try {
    expect((await fetch(`${url}/status`)).status).toBe(401);
    expect(reads).toBe(0);
    const allowed = await fetch(`${url}/status`, { headers: { authorization: `Bearer ${secret}` } });
    expect(await allowed.json()).toEqual({ queued: 2, stale: 1 });
    expect((await fetch(url, { method: "POST", headers: { "content-type": "application/json" },
      body: "{}" })).status).toBe(503);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
