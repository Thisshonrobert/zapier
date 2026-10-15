import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { mkdir } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { assertPortsFree, labPorts } from "./triage-lab-config.ts";
import { stopChildren } from "./triage-lab-lifecycle.ts";

const frontendTest = process.env.TRIAGE_LAB_FRONTEND_TEST === "true" ? test : test.skip;
frontendTest("real lab frontend starts in its own build directory and stops its owned process", async () => {
  await assertPortsFree([labPorts.frontend]);
  const root = resolve(import.meta.dir, "../..");
  const output = resolve(root, ".tmp-turbo-user/triage-lab");
  await mkdir(output, { recursive: true });
  const node = Bun.which("node");
  if (!node) throw new Error("Node is required for the lab frontend");
  const token = randomBytes(32).toString("hex");
  const child = Bun.spawn([node, "--experimental-transform-types", resolve(root, "scripts/dev/triage-lab-frontend.ts")], {
    cwd: resolve(root, "apps/frontend"), env: { ...process.env, TRIAGE_LAB: "true", PORT: "3200", NODE_ENV: "development",
      TRIAGE_LAB_CONTROL_TOKEN: token, TRIAGE_LAB_ID: "frontend-smoke", TRIAGE_LAB_RESOURCE_FINGERPRINT: "frontend-smoke",
      NEXT_PUBLIC_BACKEND_URL: "http://localhost:3201" }, windowsHide: true,
    stdout: Bun.file(resolve(output, "frontend-smoke.log")), stderr: Bun.file(resolve(output, "frontend-smoke-error.log")),
  });
  try {
    const deadline = Date.now() + 90_000;
    let status = 0;
    while (Date.now() < deadline && child.exitCode === null) {
      try { status = (await fetch("http://127.0.0.1:3200/__triage_lab/identity", {
        headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000) })).status; }
      catch { /* Wait for compilation. */ }
      if (status === 200) break;
      await Bun.sleep(250);
    }
    expect(status).toBe(200);
    expect(child.exitCode).toBeNull();
    expect((await fetch("http://127.0.0.1:3200/__triage_lab/identity")).status).toBe(401);
    expect(await (await fetch("http://127.0.0.1:3200/__triage_lab/identity", {
      headers: { authorization: `Bearer ${token}` },
    })).json()).toMatchObject({ role: "frontend", labId: "frontend-smoke", resourceFingerprint: "frontend-smoke" });
    expect(await Bun.file(resolve(root, "apps/frontend/.next/triage-lab/dev/lock")).exists()).toBe(true);
  } finally { await stopChildren([child]); }
  await assertPortsFree([labPorts.frontend]);
}, 115_000);
