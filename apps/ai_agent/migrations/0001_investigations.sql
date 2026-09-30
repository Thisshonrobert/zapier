CREATE SCHEMA IF NOT EXISTS ai_agent;

CREATE TABLE IF NOT EXISTS ai_agent.investigation (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL,
  zap_run_id uuid NOT NULL,
  stage integer NOT NULL CHECK (stage >= 0 AND stage <= 1000),
  subject_owner_id integer NOT NULL,
  actor_id integer NOT NULL,
  support_operator_id integer NOT NULL,
  idempotency_key uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('queued', 'investigating', 'proposed', 'awaiting_approval', 'blocked', 'owner_action_required', 'engineering_escalation_required', 'resolved_without_replay', 'approved', 'rejected', 'expired', 'error')),
  graph_version text NOT NULL DEFAULT 'phase-6-v1',
  prompt_version text NOT NULL DEFAULT 'phase-6-v1',
  checkpoint_thread_id uuid NOT NULL UNIQUE,
  lease_token uuid,
  lease_until timestamptz,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0 AND attempts <= 3),
  decision_id uuid UNIQUE,
  decision text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (actor_id, case_id, idempotency_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS investigation_one_active_case
  ON ai_agent.investigation (case_id)
  WHERE status IN ('queued', 'investigating', 'proposed', 'awaiting_approval');
CREATE INDEX IF NOT EXISTS investigation_claim_idx
  ON ai_agent.investigation (status, lease_until, created_at);

CREATE TABLE IF NOT EXISTS ai_agent.investigation_snapshot (
  investigation_id uuid PRIMARY KEY REFERENCES ai_agent.investigation(id),
  evidence jsonb NOT NULL,
  result jsonb NOT NULL,
  content_hash char(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION ai_agent.reject_snapshot_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'investigation snapshots are immutable';
END;
$$;
DROP TRIGGER IF EXISTS investigation_snapshot_immutable ON ai_agent.investigation_snapshot;
CREATE TRIGGER investigation_snapshot_immutable BEFORE UPDATE OR DELETE ON ai_agent.investigation_snapshot
  FOR EACH ROW EXECUTE FUNCTION ai_agent.reject_snapshot_mutation();
