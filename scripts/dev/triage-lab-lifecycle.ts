import { assertLabMarker, assertPortsFree, labPorts, type LabMarker } from "./triage-lab-config.ts";
import { resolve } from "node:path";
import { setTimeout, clearTimeout } from "node:timers";

export function assertSupervisorIdentity(value: unknown, marker: LabMarker, allowLifecycleStop = false) {
  const identity = value as { marker?: unknown; mode?: string } | null;
  if (!identity || (identity.mode !== "pipeline-simulated" && !(allowLifecycleStop && identity.mode === "lifecycle-only")))
    throw new Error("Unrelated or outdated lab control service; stop the old lab before starting 16B");
  assertLabMarker(identity.marker, marker);
}

async function bounded<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  let timer: number | NodeJS.Timeout | undefined;
  try {
    return await Promise.race([promise, new Promise<undefined>(resolve => { timer = setTimeout(resolve, ms); })]);
  } finally { clearTimeout(timer); }
}

export async function stopChildren(children: Bun.Subprocess[], timeout = 10_000) {
  for (const child of children) if (child.exitCode === null) child.kill("SIGTERM");
  if (await bounded(Promise.all(children.map(child => child.exited)), timeout)) return;
  for (const child of children) if (child.exitCode === null) child.kill("SIGKILL");
  if (!await bounded(Promise.all(children.map(child => child.exited)), 5_000))
    throw new Error("Owned lab services did not stop; resources were retained");
}

export async function readSupervisor(marker: LabMarker, token: string, allowLifecycleStop = false) {
  let response: Response;
  try {
    response = await fetch(`http://127.0.0.1:${labPorts.control}/identity`, {
      headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(1500),
    });
  } catch {
    // A refused connection is stopped; an occupied unresponsive listener is a collision.
    await assertPortsFree([labPorts.control]);
    return null;
  }
  if (!response.ok) throw new Error("Lab control authentication refused; will not adopt or stop it");
  const identity: unknown = await response.json();
  assertSupervisorIdentity(identity, marker, allowLifecycleStop);
  return identity;
}

export async function runSupervisor(input: {
  marker: LabMarker; token: string; root: string; output: string; env: Record<string, string | undefined>;
  verifyOwnership: () => Promise<void>;
}) {
  await assertPortsFree(Object.values(labPorts));
  const children: Bun.Subprocess[] = [];
  const services = ["backend", "webhook", "agent", "frontend", "processor", "worker", "dlq"];
  let ready = false;
  let shuttingDown: Promise<void> | undefined;
  let finish!: () => void;
  const finished = new Promise<void>(resolve => { finish = resolve; });
  const server = Bun.serve({ hostname: "127.0.0.1", port: labPorts.control,
    async fetch(request) {
      if (request.headers.get("authorization") !== `Bearer ${input.token}`)
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      const path = new URL(request.url).pathname;
      if (path !== "/identity" && path !== "/stop") return new Response(null, { status: 404 });
      if (path === "/stop" && request.method !== "POST") return new Response(null, { status: 405 });
      if (path === "/stop") {
        void shutdown();
        return Response.json({ stopping: true });
      }
      let databaseAvailable = true;
      try { await input.verifyOwnership(); } catch { databaseAvailable = false; }
      return Response.json({ marker: input.marker, mode: "pipeline-simulated", services,
        ready: ready && !shuttingDown && children.every(child => child.exitCode === null), databaseAvailable,
        executionEnabled: true, providerMode: "simulated", investigationEnabled: false, replayEnabled: false });
    },
  });

  async function shutdown() {
    shuttingDown ??= (async () => {
      try { await stopChildren(children); } finally { await server.stop(true); finish(); }
    })();
    return shuttingDown;
  }
  const onSignal = () => { void shutdown().catch(() => { process.exitCode = 1; }); };
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);
  try {
    const entries: Array<{ name: string; cwd: string; entry: string; port?: number }> = [
      { name: "backend", cwd: "apps/primary_backend", entry: "index.ts", port: labPorts.backend },
      { name: "webhook", cwd: "apps/webhook", entry: "index.ts", port: labPorts.webhook },
      { name: "agent", cwd: "apps/ai_agent", entry: "src/index.ts", port: labPorts.agent },
      { name: "frontend", cwd: "apps/frontend", entry: resolve(input.root, "scripts/dev/triage-lab-frontend.ts"), port: labPorts.frontend },
      { name: "processor", cwd: "apps/processor", entry: "index.ts" },
      { name: "worker", cwd: "apps/worker", entry: "index.ts" },
      { name: "dlq", cwd: "apps/worker", entry: "dlq-publisher-index.ts" },
    ];
    for (const entry of entries) {
      if (shuttingDown) throw new Error("Lab startup stopped");
      // Next uses Node async_hooks; Bun does not implement the hooks needed by dev proxy compilation.
      const node = entry.name === "frontend" ? Bun.which("node") : undefined;
      if (entry.name === "frontend" && !node) throw new Error("Lab frontend requires Node with TypeScript support");
      const child = Bun.spawn(node ? [node, "--experimental-transform-types", entry.entry] : [process.execPath, "run", entry.entry], {
        cwd: resolve(input.root, entry.cwd), env: { ...input.env, ...(entry.port ? { PORT: String(entry.port) } : {}) },
        stdout: Bun.file(resolve(input.output, `${entry.name}.log`)),
        stderr: Bun.file(resolve(input.output, `${entry.name}-error.log`)), windowsHide: true,
      });
      children.push(child);
      void child.exited.then(() => {
        if (!shuttingDown) { process.exitCode = 1; void shutdown(); }
      });
    }
    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline && !shuttingDown) {
      const healthy = await Promise.all(entries.map(async entry => {
        if (!entry.port) return true; // Data-plane readiness is proved by lab:run/verify with bounded deadlines.
        try {
          const path = entry.name === "frontend" ? "__triage_lab/identity" : "";
          const response = await fetch(`http://127.0.0.1:${entry.port}/${path}`,
            { signal: AbortSignal.timeout(2000), redirect: "manual", headers: { authorization: `Bearer ${input.token}` } });
          if (entry.name === "frontend") {
            if (!response.ok) return false;
            const identity = await response.json() as { labId?: string; resourceFingerprint?: string; role?: string };
            return identity.role === "frontend" && identity.labId === input.marker.labId && identity.resourceFingerprint === input.marker.resourceFingerprint;
          }
          return entry.name === "webhook" ? response.status === 404 : response.status < 500;
        } catch { return false; }
      }));
      if (healthy.every(Boolean)) { ready = true; break; }
      await Bun.sleep(250);
    }
    if (!ready) throw new Error(`Lab startup failed; inspect logs in ${input.output}`);
    console.log(`Lab services started: http://localhost:${labPorts.frontend}. Providers are simulated; investigation and replay remain off. Use lab:run to verify data-plane readiness.`);
    await finished;
    await shuttingDown;
  } finally {
    await shutdown();
    process.removeListener("SIGINT", onSignal);
    process.removeListener("SIGTERM", onSignal);
  }
}
