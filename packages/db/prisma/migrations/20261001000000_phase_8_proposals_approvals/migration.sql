CREATE TABLE "TriageProposal" (
  id text PRIMARY KEY,
  "investigationId" text NOT NULL,
  "caseId" text NOT NULL,
  "subjectOwnerId" integer NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  disposition text NOT NULL,
  status text NOT NULL CHECK (status IN ('blocked', 'requires_approval', 'no_action')),
  proposal jsonb NOT NULL,
  policy jsonb NOT NULL,
  "evidenceHash" char(64) NOT NULL,
  "configurationHash" char(64),
  "expiresAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("investigationId", version)
);
ALTER TABLE "ZapRunExecution" ADD COLUMN "handlerVersion" text;
CREATE INDEX "TriageProposal_case_owner_idx" ON "TriageProposal" ("caseId", "subjectOwnerId");

CREATE TABLE "TriageApproval" (
  id text PRIMARY KEY,
  "proposalId" text NOT NULL UNIQUE REFERENCES "TriageProposal"(id),
  "caseId" text NOT NULL,
  "subjectOwnerId" integer NOT NULL,
  "approvedBy" integer NOT NULL,
  decision text NOT NULL CHECK (decision IN ('approve', 'reject', 'mark_owner_action_required', 'escalate_to_engineering', 'resolve_without_replay')),
  "proposalVersion" integer NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "TriageApproval_case_owner_idx" ON "TriageApproval" ("caseId", "subjectOwnerId");

CREATE TABLE "TriageDecisionNotification" (
  "decisionId" text PRIMARY KEY REFERENCES "TriageApproval"(id),
  "investigationId" text NOT NULL,
  "caseId" text NOT NULL,
  "subjectOwnerId" integer NOT NULL,
  decision text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "deliveredAt" timestamptz,
  "nextAttemptAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "TriageDecisionNotification_pending_idx"
  ON "TriageDecisionNotification" ("deliveredAt", "nextAttemptAt");

CREATE FUNCTION reject_triage_authority_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'triage proposals and decisions are immutable';
END;
$$;
CREATE TRIGGER triage_proposal_immutable BEFORE UPDATE OR DELETE ON "TriageProposal"
  FOR EACH ROW EXECUTE FUNCTION reject_triage_authority_mutation();
CREATE TRIGGER triage_approval_immutable BEFORE UPDATE OR DELETE ON "TriageApproval"
  FOR EACH ROW EXECUTE FUNCTION reject_triage_authority_mutation();
