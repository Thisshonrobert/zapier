CREATE TABLE IF NOT EXISTS ai_agent.investigation_budget (
  id uuid PRIMARY KEY,
  investigation_id uuid NOT NULL REFERENCES ai_agent.investigation(id),
  subject_owner_id integer NOT NULL,
  actor_id integer NOT NULL,
  reserved_tokens integer NOT NULL CHECK (reserved_tokens > 0),
  reserved_cents integer NOT NULL CHECK (reserved_cents >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS investigation_budget_owner_time
  ON ai_agent.investigation_budget (subject_owner_id, created_at);
CREATE INDEX IF NOT EXISTS investigation_budget_actor_time
  ON ai_agent.investigation_budget (actor_id, created_at);
