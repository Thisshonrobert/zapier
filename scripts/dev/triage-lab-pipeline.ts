import { randomUUID, createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { labPorts, seedAccounts, type LabMarker } from "./triage-lab-config.ts";
import { checkOwnership } from "./triage-lab-store.ts";
import { selectScenarios } from "./triage-lab-scenarios.ts";

export function parsePipelineFlags(command: string, flags: string[]) {
  const values = new Map<string, string>();
  for (let n = 0; n < flags.length; n += 2) {
    const key = flags[n]!, value = flags[n + 1];
    if (!["--scenario", "--batch", "--timeout-ms"].includes(key) || !value || values.has(key)) throw new Error("Invalid lab pipeline flags");
    values.set(key, value);
  }
  const scenario = values.get("--scenario") ?? "all";
  selectScenarios(scenario);
  const batch = values.get("--batch");
  const timeout = Number(values.get("--timeout-ms") ?? 90000);
  if (batch !== undefined && !/^[a-zA-Z0-9_-]{1,80}$/.test(batch)) throw new Error("Invalid lab batch ID");
  if (!Number.isInteger(timeout) || timeout < 1000 || timeout > 300000) throw new Error("Lab timeout must be 1000..300000 milliseconds");
  if (command === "verify" && (!batch || values.has("--scenario"))) throw new Error("Verify requires --batch and no scenario selection");
  return { scenario, batch, timeout };
}

export function reconcileIngestion(status: string, matches: { id: string }[]) {
  if (matches.length > 1) throw new Error("Duplicate correlated lab runs");
  if (matches.length === 1) return matches[0]!.id;
  if (status === "reserved") return "POST";
  throw new Error("Interrupted webhook ingestion is ambiguous; retry reconciliation or use a new batch, never resend blindly");
}

export async function runLabBatch(input: { client: PoolClient; marker: LabMarker; zapSecret: string;
  scenario: string; batch?: string; timeout: number }) {
  const { client, marker } = input;
  await checkOwnership(client, marker);
  const batchId = input.batch ?? randomUUID();
  const selected = selectScenarios(input.scenario);
  const deadline = Date.now() + input.timeout;
  // Serialize same-batch CLI retries without relying on an in-memory counter.
  await client.query("SELECT pg_advisory_lock(hashtext($1))", [`triage-lab-batch:${batchId}`]);
  try {
    const existing = await client.query("SELECT scenarios FROM triage_lab.batch WHERE id=$1", [batchId]);
    const keys = selected.map(s => s.key);
    if (existing.rows.length && JSON.stringify(existing.rows[0].scenarios) !== JSON.stringify(keys)) throw new Error("Batch scenario selection changed");
    await client.query("INSERT INTO triage_lab.batch (id,scenarios) VALUES ($1,$2::jsonb) ON CONFLICT (id) DO NOTHING", [batchId, JSON.stringify(keys)]);
    console.log(`Lab batch: ${batchId}`);
    for (const account of seedAccounts.filter(a => a.role === "owner")) {
      const owner = await client.query("SELECT resource_id FROM triage_lab.seed WHERE key=$1", [`account:${account.key}`]);
      for (const scenario of selected) {
        if (Date.now() >= deadline) throw new Error(`Batch ${batchId} ingestion timed out`);
        const zap = await client.query("SELECT resource_id FROM triage_lab.seed WHERE key=$1", [`scenario:${account.key}:${scenario.key}`]);
        if (owner.rows.length !== 1 || zap.rows.length !== 1) throw new Error("Seed Phase 16B scenario definitions first");
        const actions = await client.query('SELECT "actionId" AS type,metadata FROM "Action" WHERE "zapId"=$1 ORDER BY "sortingOrder"', [zap.rows[0].resource_id]);
        // Compare canonical fingerprints, since PostgreSQL JSONB key ordering differs from JS.
        const canonical = (value: unknown): string => {
          if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
          if (value !== null && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
          return JSON.stringify(value);
        };
        if (canonical(actions.rows) !== canonical(scenario.actions)) throw new Error("Scenario definition was repaired/changed; seed preserves it, reset explicitly to restore fixtures");
        const nonce = createHash("sha256").update(`${marker.labId}:${batchId}:${account.key}:${scenario.key}`).digest("hex");
        await client.query(`INSERT INTO triage_lab.run (nonce,batch_id,scenario,owner_key,owner_id,zap_id)
          VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (nonce) DO NOTHING`,
        [nonce, batchId, scenario.key, account.key, Number(owner.rows[0].resource_id), zap.rows[0].resource_id]);
        const journal = (await client.query("SELECT * FROM triage_lab.run WHERE nonce=$1", [nonce])).rows[0];
        const matches = await client.query(`SELECT id FROM "ZapRun" WHERE metadata->'_lab'->>'nonce'=$1`, [nonce]);
        let runId = reconcileIngestion(journal.status, matches.rows);
        if (runId === "POST") {
          await client.query("UPDATE triage_lab.run SET status='posting' WHERE nonce=$1", [nonce]);
          const response = await fetch(`http://127.0.0.1:${labPorts.webhook}/hooks/catch/${journal.owner_id}/${journal.zap_id}`, {
            method: "POST", headers: { "content-type": "application/json", "x-zap-secret": input.zapSecret },
            body: JSON.stringify({ _lab: { labId: marker.labId, batchId, nonce, scenario: scenario.key, ownerKey: account.key } }),
            signal: AbortSignal.timeout(Math.min(5000, Math.max(1, deadline - Date.now()))),
          });
          if (!response.ok) throw new Error(`Batch ${batchId} webhook rejected with HTTP ${response.status}`);
          const captured = await client.query(`SELECT id FROM "ZapRun" WHERE metadata->'_lab'->>'nonce'=$1`, [nonce]);
          runId = reconcileIngestion("posting", captured.rows);
        }
        if (journal.run_id && journal.run_id !== runId) throw new Error("Lab run journal binding changed");
        await client.query("UPDATE triage_lab.run SET status='posted',run_id=$2 WHERE nonce=$1", [nonce, runId]);
      }
    }
    return batchId;
  } finally { await client.query("SELECT pg_advisory_unlock(hashtext($1))", [`triage-lab-batch:${batchId}`]); }
}
