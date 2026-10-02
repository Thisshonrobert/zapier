-- Status and event history commit together, including lease exhaustion and decision reconciliation.
ALTER TABLE ai_agent.investigation ADD COLUMN IF NOT EXISTS event_sequence integer NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS ai_agent.investigation_event (
  investigation_id uuid NOT NULL REFERENCES ai_agent.investigation(id),
  sequence integer NOT NULL CHECK (sequence > 0),
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (investigation_id, sequence)
);

CREATE OR REPLACE FUNCTION ai_agent.sequence_investigation_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.event_sequence := 1;
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.event_sequence := OLD.event_sequence + 1;
  ELSE
    NEW.event_sequence := OLD.event_sequence;
  END IF;
  RETURN NEW;
END;
$$;
CREATE OR REPLACE FUNCTION ai_agent.append_investigation_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.event_sequence IS DISTINCT FROM OLD.event_sequence THEN
    INSERT INTO ai_agent.investigation_event (investigation_id, sequence, status)
      VALUES (NEW.id, NEW.event_sequence, NEW.status);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS investigation_event_sequence ON ai_agent.investigation;
CREATE TRIGGER investigation_event_sequence BEFORE INSERT OR UPDATE ON ai_agent.investigation
  FOR EACH ROW EXECUTE FUNCTION ai_agent.sequence_investigation_event();
DROP TRIGGER IF EXISTS investigation_event_append ON ai_agent.investigation;
CREATE TRIGGER investigation_event_append AFTER INSERT OR UPDATE ON ai_agent.investigation
  FOR EACH ROW EXECUTE FUNCTION ai_agent.append_investigation_event();
DROP TRIGGER IF EXISTS investigation_event_immutable ON ai_agent.investigation_event;
CREATE TRIGGER investigation_event_immutable BEFORE UPDATE OR DELETE ON ai_agent.investigation_event
  FOR EACH ROW EXECUTE FUNCTION ai_agent.reject_snapshot_mutation();
