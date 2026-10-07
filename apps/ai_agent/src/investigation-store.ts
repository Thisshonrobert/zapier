//managing the lifecycle of an investigation job.
import { createHash, randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { sanitizeInvestigationEvent, type InvestigationEvent } from "../../../packages/triage-contracts/events.ts";
import { operationalLimits } from "./operational-limits.ts";
import { HistorySchema } from "../../../packages/triage-contracts/command-center.ts";

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

  async status() {
    const { rows } = await this.pool.query<{ queued: number; investigating: number; stale: number;
      error: number; oldestQueuedAt: Date | null; oldestStaleAt: Date | null }>(`
      SELECT count(*) FILTER (WHERE status = 'queued')::int AS queued,
        count(*) FILTER (WHERE status = 'investigating' AND lease_until > now())::int AS investigating,
        count(*) FILTER (WHERE status = 'investigating' AND lease_until <= now())::int AS stale,
        count(*) FILTER (WHERE status = 'error')::int AS error,
        min(created_at) FILTER (WHERE status = 'queued') AS "oldestQueuedAt",
        min(lease_until) FILTER (WHERE status = 'investigating' AND lease_until <= now()) AS "oldestStaleAt"
      FROM ai_agent.investigation`);
    return rows[0]!;
  }

  async events(id: string, caseId: string, subjectOwnerId: number, cursor: number | null) {
    // One statement gives a consistent snapshot and history watermark, without pinning a DB connection.
    const result = await this.pool.query<{ sequence: number; status: string; first: number | null;
      events: InvestigationEvent[] }>(`
      SELECT job.event_sequence AS sequence, job.status,
        (SELECT min(sequence) FROM ai_agent.investigation_event
          WHERE investigation_id = job.id AND created_at > now() - interval '7 days') AS first,
        COALESCE((SELECT jsonb_agg(e ORDER BY e.sequence) FROM (
          SELECT sequence, status FROM ai_agent.investigation_event
          WHERE investigation_id = job.id AND sequence > $4
            AND created_at > now() - interval '7 days'
          ORDER BY sequence LIMIT 64
        ) e), '[]'::jsonb) AS events
      FROM ai_agent.investigation job
      WHERE job.id = $1 AND job.case_id = $2 AND job.subject_owner_id = $3`,
    [id, caseId, subjectOwnerId, cursor ?? 0]);
    const row = result.rows[0];
    if (!row) throw new Error("Investigation not found");
    const snapshot = sanitizeInvestigationEvent(row);
    const expired = cursor === null || cursor > row.sequence ||
      (cursor < row.sequence && (row.first === null || cursor < row.first - 1));
    return { snapshot: expired ? snapshot : null, events: expired ? [] : row.events.map(sanitizeInvestigationEvent) };
  }

  async start(input: StartInvestigation) {
    const limits = operationalLimits();
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(812085)");
      const existing = await client.query<JobRow>(`
        SELECT * FROM ai_agent.investigation WHERE actor_id = $1 AND case_id = $2
          AND idempotency_key = $3`, [input.actorId, input.caseId, input.idempotencyKey]);
      if (!existing.rows[0]) {
        const active = await client.query<JobRow>(`
          SELECT * FROM ai_agent.investigation WHERE case_id = $1
            AND status IN ('queued', 'investigating', 'proposed', 'awaiting_approval')`, [input.caseId]);
        if (!active.rows[0]) {
          const { rows: [counts] } = await client.query<{ owner: number; actor: number }>(`
            SELECT count(*) FILTER (WHERE subject_owner_id = $1)::int AS owner,
              count(*) FILTER (WHERE actor_id = $2)::int AS actor
            FROM ai_agent.investigation WHERE created_at > now() - interval '24 hours'`,
          [input.subjectOwnerId, input.actorId]);
          if (counts!.owner >= limits.ownerRequestsPerDay || counts!.actor >= limits.operatorRequestsPerDay)
            throw new Error("Investigation request budget exhausted");
        }
      }
      const inserted = await client.query<JobRow>(`
        INSERT INTO ai_agent.investigation
          (id, case_id, zap_run_id, stage, subject_owner_id, actor_id, support_operator_id,
           idempotency_key, status, checkpoint_thread_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'queued', $9)
        ON CONFLICT DO NOTHING RETURNING *`, [input.id, input.caseId, input.zapRunId, input.stage,
        input.subjectOwnerId, input.actorId, input.supportOperatorId, input.idempotencyKey, randomUUID()]);
      const repeated = inserted.rows[0] ?? (await client.query<JobRow>(`
        SELECT * FROM ai_agent.investigation
        WHERE actor_id = $1 AND case_id = $2 AND idempotency_key = $3`,
      [input.actorId, input.caseId, input.idempotencyKey])).rows[0];
      const row = repeated ?? (await client.query<JobRow>(`
        SELECT * FROM ai_agent.investigation
        WHERE case_id = $1 AND status IN ('queued', 'investigating', 'proposed', 'awaiting_approval')`,
      [input.caseId])).rows[0];
      if (!row) throw new Error("Investigation start conflict");
      if (row.case_id !== input.caseId || row.subject_owner_id !== input.subjectOwnerId ||
        row.zap_run_id !== input.zapRunId || row.stage !== input.stage ||
        row.actor_id !== input.actorId || row.support_operator_id !== input.supportOperatorId)
        throw new Error("Investigation binding conflict");
      await client.query("COMMIT");
      return project(row);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }

  async claimNext(maxConcurrency = 2) {
    const limits = operationalLimits();
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
        WHERE id = (SELECT job.id FROM ai_agent.investigation job
          WHERE (job.status = 'queued' OR (job.status = 'investigating' AND job.lease_until < now()))
            AND job.attempts < 3
            AND (SELECT count(*) FROM ai_agent.investigation active WHERE active.subject_owner_id = job.subject_owner_id
              AND active.status = 'investigating' AND active.lease_until > now()) < $2
            AND (SELECT count(*) FROM ai_agent.investigation active WHERE active.actor_id = job.actor_id
              AND active.status = 'investigating' AND active.lease_until > now()) < $3
            AND (SELECT coalesce(sum(reserved_tokens), 0) FROM ai_agent.investigation_budget budget
              WHERE budget.subject_owner_id = job.subject_owner_id AND budget.created_at > now() - interval '24 hours') + $4 <= $5
            AND (SELECT coalesce(sum(reserved_tokens), 0) FROM ai_agent.investigation_budget budget
              WHERE budget.actor_id = job.actor_id AND budget.created_at > now() - interval '24 hours') + $4 <= $6
            AND (SELECT coalesce(sum(reserved_cents), 0) FROM ai_agent.investigation_budget budget
              WHERE budget.subject_owner_id = job.subject_owner_id AND budget.created_at > now() - interval '24 hours') + $7 <= $8
            AND (SELECT coalesce(sum(reserved_cents), 0) FROM ai_agent.investigation_budget budget
              WHERE budget.actor_id = job.actor_id AND budget.created_at > now() - interval '24 hours') + $7 <= $9
          ORDER BY job.created_at FOR UPDATE SKIP LOCKED LIMIT 1)
        RETURNING *`, [randomUUID(), limits.ownerConcurrency, limits.operatorConcurrency,
          limits.tokensPerAttempt, limits.ownerTokenBudgetPerDay, limits.operatorTokenBudgetPerDay,
          limits.costCentsPerAttempt, limits.ownerSpendCentsPerDay, limits.operatorSpendCentsPerDay]);
      if (claimed.rows[0]) await client.query(`INSERT INTO ai_agent.investigation_budget
        (id, investigation_id, subject_owner_id, actor_id, reserved_tokens, reserved_cents) VALUES ($1, $2, $3, $4, $5, $6)`,
      [randomUUID(), claimed.rows[0].id, claimed.rows[0].subject_owner_id,
        claimed.rows[0].actor_id, limits.tokensPerAttempt, limits.costCentsPerAttempt]);
      await client.query("COMMIT");
      return claimed.rows[0] ? project(claimed.rows[0]) : null;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async history(id: string, caseId: string, subjectOwnerId: number) {
    const { rows } = await this.pool.query(`
      SELECT job.event_sequence AS "currentSequence", job.status AS "currentStatus",
        COALESCE((SELECT jsonb_agg(e ORDER BY e.sequence) FROM (
          SELECT sequence, status, to_char(created_at AT TIME ZONE 'UTC',
            'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "observedAt"
          FROM ai_agent.investigation_event WHERE investigation_id = job.id
            AND created_at > now() - interval '7 days' ORDER BY sequence DESC LIMIT 64
        ) e), '[]'::jsonb) AS events
      FROM ai_agent.investigation job
      WHERE job.id = $1 AND job.case_id = $2 AND job.subject_owner_id = $3`, [id, caseId, subjectOwnerId]);
    const row = rows[0];
    if (!row) throw new Error("Investigation not found");
    return HistorySchema.parse({ ...row, truncated: row.events.length < row.currentSequence });
  }

  async finish(id: string, leaseToken: string, evidence: unknown, result: unknown, status: string, traceId?: string | null) {
    if (status !== "proposed") throw new Error("Invalid investigation status");
    if (traceId != null && !/^[a-f0-9]{32}$/.test(traceId)) throw new Error("Invalid trace identifier");
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
        (investigation_id, evidence, result, content_hash, trace_id) VALUES ($1, $2::jsonb, $3::jsonb, $4, $5)`,
      [id, JSON.stringify(evidence), JSON.stringify(result), contentHash, traceId ?? null]);
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
    const rows = await this.pool.query<JobRow & { evidence: unknown | null; result: unknown | null; trace_id: string | null }>(`
      SELECT job.*, snapshot.evidence, snapshot.result, snapshot.trace_id FROM ai_agent.investigation job
      LEFT JOIN ai_agent.investigation_snapshot snapshot ON snapshot.investigation_id = job.id
      WHERE job.id = $1 AND job.case_id = $2 AND job.subject_owner_id = $3`,
    [id, caseId, subjectOwnerId]);
    if (!rows.rows[0]) throw new Error("Investigation not found");
    return { ...project(rows.rows[0]), evidence: rows.rows[0].evidence, result: rows.rows[0].result,
      traceId: rows.rows[0].trace_id };
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
