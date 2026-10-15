import { createConnection, createServer } from "node:net";

export const labPorts = { frontend: 3200, backend: 3201, webhook: 3202, agent: 3204, control: 3205 } as const;
export const seedAccounts = [
  { key: "support", email: "triage-demo@example.invalid", name: "Local demo operator", role: "support", isSupportOperator: true },
  { key: "engineer", email: "thisshonrobert0205@gmail.com", name: "Lab engineer", role: "engineer", isSupportOperator: false },
  ...[1, 2, 3].map(n => ({ key: `owner-${n}`, email: `triage-lab-owner-${n}@example.invalid`,
    name: `Lab owner ${n}`, role: "owner", isSupportOperator: false })),
] as const;

export function assertLabDatabase(value: string, environment: string | undefined = process.env.NODE_ENV) {
  const url = new URL(value);
  if (environment === "production" || !["postgres:", "postgresql:"].includes(url.protocol) ||
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.pathname !== "/triage_lab" ||
      [...url.searchParams].some(([key, value]) => key !== "schema" || value !== "public") || url.hash) {
    throw new Error("Requires the dedicated local triage_lab database with public schema");
  }
  return url;
}

export function assertLabBrokers(value: string) {
  const brokers = value.split(",");
  if (brokers.some(broker => {
    const match = /^(localhost|127\.0\.0\.1|\[::1\]):(\d+)$/.exec(broker);
    return !match || Number(match[2]) < 1 || Number(match[2]) > 65535;
  })) throw new Error("Lab requires explicit local Kafka brokers");
  return brokers;
}

export function labResources(labId: string) {
  if (!/^[a-f0-9]{32}$/.test(labId)) throw new Error("Invalid lab identity");
  return { eventsTopic: `triage-lab-${labId}-events`, dlqTopic: `triage-lab-${labId}-dlq`,
    workerGroup: `triage-lab-${labId}-worker` };
}

export type LabMarker = ReturnType<typeof labResources> & {
  version: number; labId: string; database: string; resourceFingerprint: string;
};

export function assertLabMarker(actual: unknown, expected: Omit<LabMarker, "resourceFingerprint"> & { resourceFingerprint?: string }) {
  const marker = actual as LabMarker | null;
  const resources = labResources(expected.labId);
  if (expected.version !== 1 || expected.database !== "triage_lab" || !marker ||
    ["version", "labId", "database", "eventsTopic", "dlqTopic", "workerGroup", "resourceFingerprint"]
      .some(key => marker[key as keyof LabMarker] !== expected[key as keyof typeof expected]) ||
    Object.entries(resources).some(([key, value]) => marker[key as keyof LabMarker] !== value)) {
    throw new Error("Lab ownership marker mismatch; refusing ordinary or unmarked resources");
  }
}

export async function assertPortsFree(ports: readonly number[]) {
  for (const port of ports) {
    for (const host of ["127.0.0.1", "::1"]) {
      const occupied = await new Promise<boolean>(resolve => {
        const socket = createConnection({ host, port });
        socket.setTimeout(500);
        socket.once("connect", () => { socket.destroy(); resolve(true); });
        socket.once("error", () => { socket.destroy(); resolve(false); });
        socket.once("timeout", () => { socket.destroy(); resolve(true); });
      });
      if (occupied) throw new Error(`Lab port ${port} is occupied; refusing unrelated services`);
    }
    await new Promise<void>((resolve, reject) => {
      const server = createServer();
      server.once("error", () => reject(new Error(`Lab port ${port} is occupied; refusing unrelated services`)));
      // Bind all interfaces, matching the current HTTP services' listen behavior.
      server.listen({ port, exclusive: true }, () => server.close(error => error ? reject(error) : resolve()));
    });
  }
}
