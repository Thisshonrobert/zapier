ALTER TABLE "User" ADD COLUMN "isSupportOperator" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "TriageAccessAudit" (
  "id" TEXT NOT NULL,
  "actorId" INTEGER NOT NULL,
  "subjectOwnerId" INTEGER,
  "caseId" TEXT,
  "action" TEXT NOT NULL,
  "outcome" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TriageAccessAudit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TriageAccessAudit_action_check" CHECK ("action" IN ('list_cases', 'read_case', 'failure_context', 'execution_evidence', 'validate_action_inputs', 'diagnose')),
  CONSTRAINT "TriageAccessAudit_outcome_check" CHECK ("outcome" IN ('allowed', 'denied'))
);

CREATE INDEX "TriageAccessAudit_actorId_createdAt_idx" ON "TriageAccessAudit"("actorId", "createdAt");
CREATE INDEX "TriageAccessAudit_caseId_createdAt_idx" ON "TriageAccessAudit"("caseId", "createdAt");

-- Grant only an account that already exists at migration time. A later signup
-- using this email must not acquire operator access without an explicit grant.
UPDATE "User" SET "isSupportOperator" = true
WHERE email = 'thisshonrobert0205@gmail.com';
