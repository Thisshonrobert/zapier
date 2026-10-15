import { expect, test } from "bun:test";
import { createServer } from "node:net";
import { assertLabDatabase, assertLabMarker, assertLabBrokers, assertPortsFree, labResources, seedAccounts } from "./triage-lab-config.ts";

test("only the dedicated local database with public schema is permitted", () => {
  expect(() => assertLabDatabase("postgresql://u@localhost/triage_lab", "development")).not.toThrow();
  for (const url of ["postgresql://u@remote/triage_lab", "postgresql://u@localhost/app",
    "postgresql://u@localhost/triage_lab?schema=other", "postgresql://u@localhost/triage_lab?host=remote",
    "https://localhost/triage_lab"]) expect(() => assertLabDatabase(url, "development")).toThrow();
  expect(() => assertLabDatabase("postgresql://u@localhost/triage_lab", "production")).toThrow();
});

test("markers bind exact database, lab id, version and topic resources", () => {
  const resources = labResources("a".repeat(32));
  const marker = { version: 1, labId: "a".repeat(32), database: "triage_lab", ...resources };
  expect(() => assertLabMarker(marker, marker)).not.toThrow();
  for (const changed of [{ labId: "b".repeat(32) }, { version: 2 }, { database: "app" },
    { eventsTopic: "zap-events" }]) expect(() => assertLabMarker({ ...marker, ...changed }, marker)).toThrow();
  expect(() => assertLabMarker(null, marker)).toThrow();
  expect(() => labResources("../ordinary")).toThrow();
});

test("lab refuses remote or malformed Kafka brokers", () => {
  expect(assertLabBrokers("127.0.0.1:9092,localhost:9093")).toEqual(["127.0.0.1:9092", "localhost:9093"]);
  for (const brokers of ["broker:9092", "localhost", "localhost:0", "localhost:9092,"])
    expect(() => assertLabBrokers(brokers)).toThrow();
});

test("three owners and engineer identity have no support permission", () => {
  expect(seedAccounts.filter(a => a.role === "owner")).toHaveLength(3);
  expect(seedAccounts.find(a => a.role === "engineer")).toMatchObject({
    email: "thisshonrobert0205@gmail.com", isSupportOperator: false,
  });
  expect(seedAccounts.filter(a => a.isSupportOperator).map(a => a.email)).toEqual(["triage-demo@example.invalid"]);
});

test("occupied unrelated ports are refused and their listener is left intact", async () => {
  const server = createServer();
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const port = (server.address() as { port: number }).port;
    await expect(assertPortsFree([port])).rejects.toThrow("occupied");
    expect(server.listening).toBe(true);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
