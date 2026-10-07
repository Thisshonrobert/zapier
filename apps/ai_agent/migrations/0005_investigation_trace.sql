-- A trace identifier is advisory metadata, separate from model evidence and decision authority.
ALTER TABLE ai_agent.investigation_snapshot ADD COLUMN IF NOT EXISTS trace_id text
  CHECK (trace_id IS NULL OR trace_id ~ '^[a-f0-9]{32}$');
