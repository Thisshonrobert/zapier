import { expect, test } from "bun:test";
import { scenarios, demoProviderFetch, assertDemoDatabase, demoFrontendPort } from "./scenarios.ts";
import { validateActionInputs } from "../../apps/worker/validation.ts";

test("demo preserves four seeded cases and two distinguishable pipeline failures", () => {
  expect(scenarios.filter(s => s.source === "seeded")).toHaveLength(4);
  expect(scenarios.filter(s => s.source === "pipeline")).toHaveLength(2);
  const invalid = scenarios.find(s => s.key === "invalid-input")!;
  expect(validateActionInputs({ actionType: "telegram", actionMetadata: invalid.metadata,
    zapRunMetadata: {} }).validation_status).toBe("invalid");
  const rejected = scenarios.find(s => s.key === "provider-rejection")!;
  expect(validateActionInputs({ actionType: "telegram", actionMetadata: rejected.metadata,
    zapRunMetadata: {} }).validation_status).toBe("valid");
});

test("stub rejects external sends and only simulates explicitly tagged demo tokens", async () => {
  await expect(demoProviderFetch("https://api.resend.com/emails")).rejects.toThrow();
  await expect(demoProviderFetch("https://api.telegram.org/botreal/sendMessage")).rejects.toThrow();
  const rejected = await demoProviderFetch("https://api.telegram.org/bot0:triage-demo/sendMessage");
  expect(rejected.status).toBe(403);
  const replayed = await demoProviderFetch("https://api.telegram.org/bot0:triage-demo-replay/sendMessage");
  expect(replayed.status).toBe(200);
  const invalid = await demoProviderFetch("https://api.telegram.org/bot0:triage-demo/getChat?chat_id=@");
  expect(invalid.status).toBe(400);
});

test("demo database guard refuses existing databases and remote hosts", () => {
  expect(() => assertDemoDatabase("postgresql://user@localhost/app")).toThrow();
  expect(() => assertDemoDatabase("postgresql://user@remote/triage_demo_123456789abc")).toThrow();
  expect(() => assertDemoDatabase("postgresql://user@localhost/triage_demo_123456789abc")).not.toThrow();
});

test("demo frontend can use another local port and rejects invalid ports", () => {
  expect(demoFrontendPort(undefined)).toBe(3000);
  expect(demoFrontendPort("3005")).toBe(3005);
  for (const value of ["0", "65536", "3005.5", "NaN", ""]) {
    expect(() => demoFrontendPort(value)).toThrow("TRIAGE_DEMO_FRONTEND_PORT");
  }
});
