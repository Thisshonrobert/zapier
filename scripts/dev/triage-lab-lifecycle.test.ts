import { expect, test } from "bun:test";
import { labResources } from "./triage-lab-config.ts";
import { assertSupervisorIdentity, stopChildren } from "./triage-lab-lifecycle.ts";
import { runSupervisor, readSupervisor } from "./triage-lab-lifecycle.ts";
import { assertPortsFree, labPorts } from "./triage-lab-config.ts";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";

const marker = { version: 1, database: "triage_lab", labId: "a".repeat(32), resourceFingerprint: "one",
  ...labResources("a".repeat(32)) };

test("service reuse requires matching authenticated supervisor identity", () => {
  expect(() => assertSupervisorIdentity({ marker, mode: "pipeline-simulated", services: ["backend"] }, marker)).not.toThrow();
  expect(() => assertSupervisorIdentity({ marker: { ...marker, resourceFingerprint: "other" }, mode: "pipeline-simulated" }, marker)).toThrow();
  expect(() => assertSupervisorIdentity({ ok: true }, marker)).toThrow();
});

test("shutdown signals only supplied owned child handles and awaits exits", async () => {
  const signals: string[] = [];
  let done!: () => void;
  const child = { exitCode: null, exited: new Promise<number>(resolve => { done = () => resolve(0); }),
    kill: (signal: string) => { signals.push(signal); done(); } };
  await stopChildren([child] as never, 100);
  expect(signals).toEqual(["SIGTERM"]);
});

test("shutdown escalates a hung owned child within a bounded deadline", async () => {
  const signals: string[] = [];
  let done!: () => void;
  const child = { exitCode: null, exited: new Promise<number>(resolve => { done = () => resolve(0); }),
    kill: (signal: string) => { signals.push(signal); if (signal === "SIGKILL") done(); } };
  await stopChildren([child] as never, 10);
  expect(signals).toEqual(["SIGTERM", "SIGKILL"]);
});

test("supervisor starts owned processes, authenticates identity, and stops without deleting data", async () => {
  await assertPortsFree(Object.values(labPorts));
  const root = resolve(import.meta.dir, "../../.tmp-turbo-user", `lab-lifecycle-test-${randomBytes(6).toString("hex")}`);
  const output = resolve(root, "logs");
  await mkdir(output, { recursive: true });
  await mkdir(resolve(root, "apps/frontend"), { recursive: true });
  const fixture = `const server = Bun.serve({hostname:'127.0.0.1',port:Number(process.env.PORT),fetch:()=>new Response('fixture',{status:Number(process.env.PORT)===3202?404:200})});
process.once('SIGTERM',()=>{server.stop(true);process.exit(0)});`;
  for (const file of ["apps/primary_backend/index.ts", "apps/webhook/index.ts", "apps/ai_agent/src/index.ts"]) {
    const path = resolve(root, file);
    await mkdir(resolve(path, ".."), { recursive: true });
    await writeFile(path, fixture);
  }
  for (const file of ["apps/processor/index.ts", "apps/worker/index.ts", "apps/worker/dlq-publisher-index.ts"]) {
    const path = resolve(root, file);
    await mkdir(resolve(path, ".."), { recursive: true });
    await writeFile(path, "setInterval(()=>{},1000);process.once('SIGTERM',()=>process.exit(0));");
  }
  const frontendPath = resolve(root, "scripts/dev/triage-lab-frontend.ts");
  await mkdir(resolve(frontendPath, ".."), { recursive: true });
  await writeFile(frontendPath, `import {createServer} from 'node:http';const server=createServer((req,res)=>{res.setHeader('content-type','application/json');res.end(JSON.stringify({role:'frontend',labId:'${marker.labId}',resourceFingerprint:'${marker.resourceFingerprint}'}))}).listen(Number(process.env.PORT),'127.0.0.1');process.once('SIGTERM',()=>{server.close();process.exit(0)});`);
  const sentinel = resolve(root, "retained-history.txt");
  await writeFile(sentinel, "history retained");
  const token = randomBytes(32).toString("hex");
  let databaseAvailable = true;
  const supervisor = runSupervisor({ marker, token, root, output, env: process.env,
    verifyOwnership: async () => { if (!databaseAvailable) throw new Error("database outage"); } });
  // Attach immediately so a failed launch never becomes an unhandled rejection.
  const result = supervisor.then(() => null, error => error as Error);
  const deadline = Date.now() + 10_000;
  try {
    let identity: unknown;
    while (Date.now() < deadline) {
      try { identity = await readSupervisor(marker, token); if ((identity as { ready?: boolean })?.ready) break; } catch { /* Startup is not ready yet. */ }
      await Bun.sleep(50);
    }
    expect(identity).toBeTruthy();
    expect(identity).toMatchObject({ ready: true });
    expect((await fetch(`http://127.0.0.1:${labPorts.control}/stop`, { method: "POST" })).status).toBe(401);
    expect((await readSupervisor(marker, token))).toBeTruthy();
    databaseAvailable = false;
    expect(await readSupervisor(marker, token)).toMatchObject({ ready: true, databaseAvailable: false });
  } finally {
    await fetch(`http://127.0.0.1:${labPorts.control}/stop`, { method: "POST", headers: { authorization: `Bearer ${token}` } }).catch(() => {});
    expect(await result).toBeNull();
  }
  await assertPortsFree(Object.values(labPorts));
  expect(await readFile(sentinel, "utf8")).toBe("history retained");
}, 25_000);
