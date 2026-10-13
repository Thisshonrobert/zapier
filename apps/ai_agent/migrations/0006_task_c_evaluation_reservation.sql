-- Development diagnosis reservations share production's rolling allowance and lock.
CREATE TABLE IF NOT EXISTS ai_agent.task_c_evaluation_reservation (
  source_manifest_hash char(64) NOT NULL,
  slot integer NOT NULL CHECK (slot BETWEEN 1 AND 72),
  reserved_tokens integer NOT NULL CHECK (reserved_tokens = 64000),
  reserved_cents integer NOT NULL CHECK (reserved_cents = 16),
  started_at timestamptz NOT NULL DEFAULT now(),
  provider_first_started_at timestamptz,
  stop_reason text,
  state text NOT NULL CHECK (state IN ('reserved', 'finished')),
  PRIMARY KEY (source_manifest_hash, slot)
);
ALTER TABLE ai_agent.task_c_evaluation_reservation
  ADD COLUMN IF NOT EXISTS provider_first_started_at timestamptz;
ALTER TABLE ai_agent.task_c_evaluation_reservation
  ADD COLUMN IF NOT EXISTS stop_reason text;
CREATE INDEX IF NOT EXISTS task_c_evaluation_reservation_time
  ON ai_agent.task_c_evaluation_reservation (started_at);
