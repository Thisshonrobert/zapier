//managing the lifecycle of an investigation job.
import { createHash, randomUUID } from "node:crypto";
import type { Pool } from "pg";

export type InvestigationBinding = {
  id: string;
  caseId: string;
  zapRunId: string;
  stage: number;
  subjectOwnerId: number;
  actorId: number;
  supportOperatorId: number;
};
export type StartInvestigation = InvestigationBinding & { idempotencyKey: string };
type JobRow = {
  id: string; case_id: string; zap_run_id: string; stage: number;
  subject_owner_id: number; actor_id: number; support_operator_id: number;
  idempotency_key: string; status: string; checkpoint_thread_id: string;
  lease_token: string | null; attempts: number;
  decision_id: string | null; decision: string | null;
};

function project(row: JobRow) {
  return {
    id: row.id,
    binding: {
      id: row.id, caseId: row.case_id, zapRunId: row.zap_run_id, stage: row.stage,
      subjectOwnerId: row.subject_owner_id, actorId: row.actor_id,
      supportOperatorId: row.support_operator_id,
    },
    idempotencyKey: row.idempotency_key,
    status: row.status,
    checkpointThreadId: row.checkpoint_thread_id,
    leaseToken: row.lease_token,
    attempts: row.attempts,
    decisionId: row.decision_id,
    decision: row.decision,
  };
}

export class InvestigationStore {
  constructor(private readonly pool: Pool) {}

  async start(input: StartInvestigation) {
    const inserted = await this.pool.query<JobRow>(`
      INSERT INTO ai_agent.investigation
        (id, case_id, zap_run_id, stage, subject_owner_id, actor_id, support_operator_id,
         idempotency_key, status, checkpoint_thread_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'queued', $9)
      ON CONFLICT DO NOTHING RETURNING *`, [input.id, input.caseId, input.zapRunId, input.stage,
        input.subjectOwnerId, input.actorId, input.supportOperatorId, input.idempotencyKey, randomUUID()]);
    const repeated = inserted.rows[0] ?? (await this.pool.query<JobRow>(`
      SELECT * FROM ai_agent.investigation
      WHERE actor_id = $1 AND case_id = $2 AND idempotency_key = $3`,
    [input.actorId, input.caseId, input.idempotencyKey])).rows[0];
    const row = repeated ?? (await this.pool.query<JobRow>(`
      SELECT * FROM ai_agent.investigation
      WHERE case_id = $1 AND status IN ('queued', 'investigating', 'proposed', 'awaiting_approval')`,
    [input.caseId])).rows[0];
    if (!row) throw new Error("Investigation start conflict");
    if (row.case_id !== input.caseId || row.subject_owner_id !== input.subjectOwnerId ||
      row.zap_run_id !== input.zapRunId || row.stage !== input.stage ||
      row.actor_id !== input.actorId || row.support_operator_id !== input.supportOperatorId)
      throw new Error("Investigation binding conflict");
    return project(row);
  }

  async claimNext(maxConcurrency = 2) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(812084)");
      await client.query(`UPDATE ai_agent.investigation SET status = 'error', lease_token = NULL,
        lease_until = NULL, updated_at = now()
        WHERE status = 'investigating' AND lease_until < now() AND attempts >= 3`);
      const capacity = await client.query<{ count: number }>(`
        SELECT count(*)::int AS count FROM ai_agent.investigation
        WHERE status = 'investigating' AND lease_until > now()`);
      if (capacity.rows[0]!.count >= maxConcurrency) {
        await client.query("COMMIT");
        return null;
      }
      const claimed = await client.query<JobRow>(`
        UPDATE ai_agent.investigation SET status = 'investigating', lease_token = $1,
          lease_until = now() + interval '90 seconds', attempts = attempts + 1, updated_at = now()
        WHERE id = (SELECT id FROM ai_agent.investigation
          WHERE (status = 'queued' OR (status = 'investigating' AND lease_until < now()))
            AND attempts < 3
          ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1)
        RETURNING *`, [randomUUID()]);
      await client.query("COMMIT");
      return claimed.rows[0] ? project(claimed.rows[0]) : null;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async finish(id: string, leaseToken: string, evidence: unknown, result: unknown, status: string) {
    if (status !== "proposed") throw new Error("Invalid investigation status");
    const serialized = JSON.stringify({ evidence, result });
    if (serialized.length > 100_000) throw new Error("Investigation snapshot too large");
    const contentHash = createHash("sha256").update(serialized).digest("hex");
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const owned = await client.query<JobRow>(`
        SELECT * FROM ai_agent.investigation WHERE id = $1 AND lease_token = $2
          AND status = 'investigating' AND lease_until > now() FOR UPDATE`, [id, leaseToken]);
      if (!owned.rows[0]) throw new Error("Investigation lease lost");
      await client.query(`INSERT INTO ai_agent.investigation_snapshot
        (investigation_id, evidence, result, content_hash) VALUES ($1, $2::jsonb, $3::jsonb, $4)`,
      [id, JSON.stringify(evidence), JSON.stringify(result), contentHash]);
      await client.query(`UPDATE ai_agent.investigation SET status = $2, lease_token = NULL,
        lease_until = NULL, updated_at = now() WHERE id = $1`, [id, status]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async fail(id: string, leaseToken: string) {
    await this.pool.query(`UPDATE ai_agent.investigation SET status = 'error', lease_token = NULL,
      lease_until = NULL, updated_at = now() WHERE id = $1 AND lease_token = $2`, [id, leaseToken]);
  }

  async read(id: string, caseId: string, subjectOwnerId: number) {
    const rows = await this.pool.query<JobRow & { evidence: unknown | null; result: unknown | null }>(`
      SELECT job.*, snapshot.evidence, snapshot.result FROM ai_agent.investigation job
      LEFT JOIN ai_agent.investigation_snapshot snapshot ON snapshot.investigation_id = job.id
      WHERE job.id = $1 AND job.case_id = $2 AND job.subject_owner_id = $3`,
    [id, caseId, subjectOwnerId]);
    if (!rows.rows[0]) throw new Error("Investigation not found");
    return { ...project(rows.rows[0]), evidence: rows.rows[0].evidence, result: rows.rows[0].result };
  }

  async applyDecision(id: string, caseId: string, subjectOwnerId: number,
    decisionId: string, decision: string) {
    const statuses: Record<string, string> = {
      approve: "approved", reject: "rejected", mark_owner_action_required: "owner_action_required",
      escalate_to_engineering: "engineering_escalation_required",
      resolve_without_replay: "resolved_without_replay", blocked: "blocked",
    };
    const status = statuses[decision];
    if (!status) throw new Error("Invalid investigation decision");
    const updated = await this.pool.query<JobRow>(`
      UPDATE ai_agent.investigation SET decision_id = $4, decision = $5, status = $6, updated_at = now()
      WHERE id = $1 AND case_id = $2 AND subject_owner_id = $3
        AND status = 'proposed' AND decision_id IS NULL RETURNING *`,
    [id, caseId, subjectOwnerId, decisionId, decision, status]);
    if (updated.rows[0]) return project(updated.rows[0]);
    const existing = await this.pool.query<JobRow>(`
      SELECT * FROM ai_agent.investigation WHERE id = $1 AND case_id = $2 AND subject_owner_id = $3`,
    [id, caseId, subjectOwnerId]);
    if (existing.rows[0]?.decision_id === decisionId && existing.rows[0].decision === decision)
      return project(existing.rows[0]);
    throw new Error("Investigation decision conflict");
  }
}
