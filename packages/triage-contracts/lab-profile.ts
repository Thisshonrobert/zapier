import { createHash } from "node:crypto";

/**
 * Portable lab identity helpers. They live in the shared contract layer because both the
 * lab scripts and the application's release gate must derive the same resource names and
 * the same ownership fingerprint from the same environment, without either depending on
 * the other's runtime.
 */

export const labPorts = { frontend: 3200, backend: 3201, webhook: 3202, agent: 3204, control: 3205 } as const;

/** The dedicated local lab database, with no extra connection parameters beyond the schema. */
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

/**
 * Fingerprints exactly the database and broker resources a lab holds. Both the lab
 * supervisor (publishing the ownership manifest) and the application release gate (proving
 * it is bound to those resources) derive it from this one function, so the two can never
 * drift apart. The local host aliases are canonicalised, so naming the same loopback lab as
 * `localhost` or `127.0.0.1` cannot look like a different lab.
 */
export function labResourceFingerprint(input: { databaseUrl: string; brokers: string }): string | null {
  try {
    const url = assertLabDatabase(input.databaseUrl, "development");
    const host = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ? "loopback" : url.hostname;
    const brokers = assertLabBrokers(input.brokers).map(broker => {
      const [, name, port] = /^(localhost|127\.0\.0\.1|\[::1\]):(\d+)$/.exec(broker)!;
      void name;
      return `loopback:${port}`;
    });
    return createHash("sha256").update(JSON.stringify({
      host, port: url.port || "5432", user: url.username, database: "triage_lab", brokers,
    })).digest("hex");
  } catch {
    return null;
  }
}
