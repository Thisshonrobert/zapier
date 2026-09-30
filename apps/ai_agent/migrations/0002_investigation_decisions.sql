BEGIN;

ALTER TABLE ai_agent.investigation
  ADD COLUMN IF NOT EXISTS decision_id uuid,
  ADD COLUMN IF NOT EXISTS decision text;
CREATE UNIQUE INDEX IF NOT EXISTS investigation_decision_id_key
  ON ai_agent.investigation (decision_id);

ALTER TABLE ai_agent.investigation DROP CONSTRAINT IF EXISTS investigation_status_check;
ALTER TABLE ai_agent.investigation ADD CONSTRAINT investigation_status_check
  CHECK (status IN ('queued', 'investigating', 'proposed', 'awaiting_approval', 'blocked',
    'owner_action_required', 'engineering_escalation_required', 'resolved_without_replay',
    'approved', 'rejected', 'expired', 'error'));

DROP INDEX IF EXISTS ai_agent.investigation_one_active_case;
CREATE UNIQUE INDEX investigation_one_active_case
  ON ai_agent.investigation (case_id)
  WHERE status IN ('queued', 'investigating', 'proposed', 'awaiting_approval');

COMMIT;
