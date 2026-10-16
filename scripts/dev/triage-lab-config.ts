import { createConnection, createServer } from "node:net";

// The portable lab identity (ports, database/broker guards, resource names, marker and the
// ownership fingerprint) lives in the shared contract layer so the application release gate
// can prove the same identity without depending on this script.
export { assertLabDatabase, assertLabBrokers, labPorts, labResources, assertLabMarker,
  labResourceFingerprint, type LabMarker } from "../../packages/triage-contracts/lab-profile.ts";

export const seedAccounts = [
  { key: "support", email: "triage-demo@example.invalid", name: "Local demo operator", role: "support", isSupportOperator: true, isEngineer: false },
  { key: "engineer", email: "thisshonrobert0205@gmail.com", name: "Lab engineer", role: "engineer", isSupportOperator: false, isEngineer: true },
  ...[1, 2, 3].map(n => ({ key: `owner-${n}`, email: `triage-lab-owner-${n}@example.invalid`,
    name: `Lab owner ${n}`, role: "owner", isSupportOperator: false, isEngineer: false })),
] as const;

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
