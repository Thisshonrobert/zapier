ALTER TABLE "TriageAccessAudit" DROP CONSTRAINT "TriageAccessAudit_action_check";
ALTER TABLE "TriageAccessAudit" ADD CONSTRAINT "TriageAccessAudit_action_check"
  CHECK (action IN ('list_cases', 'read_case', 'failure_context', 'execution_evidence',
    'validate_action_inputs', 'diagnose', 'investigation_proposal', 'investigation_decision',
    'replay_dry_run', 'replay_request'));

CREATE TABLE "ReplayRequest" (
  id text PRIMARY KEY,
  "approvalId" text NOT NULL UNIQUE REFERENCES "TriageApproval"(id),
  "proposalVersion" integer NOT NULL CHECK ("proposalVersion" > 0),
  "caseId" text NOT NULL UNIQUE REFERENCES "ZapRunRetry"(id),
  "subjectOwnerId" integer NOT NULL,
  "approvedBy" integer NOT NULL,
  "requestedBy" integer NOT NULL,
  "zapRunId" text NOT NULL REFERENCES "ZapRun"(id),
  stage integer NOT NULL CHECK (stage >= 0),
  "originalExecutionId" text NOT NULL REFERENCES "ZapRunExecution"(id),
  generation integer NOT NULL CHECK (generation = 1),
  "actionFingerprint" char(64) NOT NULL,
  "requestFingerprint" char(64) NOT NULL,
  "handlerVersion" text NOT NULL,
  "evidenceHash" char(64) NOT NULL,
  "notBefore" timestamptz NOT NULL,
  "expiresAt" timestamptz NOT NULL CHECK ("expiresAt" > "notBefore"),
  "auditId" text NOT NULL UNIQUE REFERENCES "TriageAccessAudit"(id),
  "originalExecution" jsonb NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("originalExecutionId", generation)
);
CREATE INDEX "ReplayRequest_run_stage_idx" ON "ReplayRequest" ("zapRunId", stage);
CREATE TRIGGER replay_request_immutable BEFORE UPDATE OR DELETE ON "ReplayRequest"
  FOR EACH ROW EXECUTE FUNCTION reject_triage_authority_mutation();

CREATE TABLE "ReplayExecution" (
  "requestId" text PRIMARY KEY REFERENCES "ReplayRequest"(id),
  status text NOT NULL DEFAULT 'RESERVED'
    CHECK (status IN ('RESERVED', 'RUNNING', 'SUCCESS', 'FAILED', 'UNKNOWN')),
  "claimToken" text,
  "leaseUntil" timestamptz,
  "completedAt" timestamptz
);
CREATE TABLE "ReplayExecutionAttempt" (
  id text PRIMARY KEY,
  "requestId" text NOT NULL REFERENCES "ReplayExecution"("requestId"),
  "attemptNumber" integer NOT NULL CHECK ("attemptNumber" = 1),
  status text NOT NULL,
  provider text, phase text, "safeCode" text, "providerStatus" integer,
  "retryAfterSeconds" integer, "safeReceiptId" text,
  "actionFingerprint" char(64) NOT NULL, "requestFingerprint" char(64) NOT NULL,
  "startedAt" timestamptz NOT NULL DEFAULT now(), "completedAt" timestamptz,
  UNIQUE ("requestId", "attemptNumber")
);
CREATE TABLE "ReplayFailure" (
  id text PRIMARY KEY,
  "requestId" text NOT NULL UNIQUE REFERENCES "ReplayExecution"("requestId"),
  "providerOutcome" text NOT NULL CHECK ("providerOutcome" IN ('rejected', 'unknown', 'not_attempted')),
  provider text, phase text, "safeCode" text, "providerStatus" integer,
  "retryAfterSeconds" integer, "safeReceiptId" text,
  "actionFingerprint" char(64) NOT NULL, "requestFingerprint" char(64) NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER replay_failure_immutable BEFORE UPDATE OR DELETE ON "ReplayFailure"
  FOR EACH ROW EXECUTE FUNCTION reject_triage_authority_mutation();
