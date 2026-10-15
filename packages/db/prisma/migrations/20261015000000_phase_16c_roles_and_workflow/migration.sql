-- Phase 16C: Role and durable routing foundation
ALTER TABLE "User" ADD COLUMN "isEngineer" BOOLEAN NOT NULL DEFAULT false;

-- Provision the seeded engineer account identity
UPDATE "User" SET "isEngineer" = true
WHERE email = 'thisshonrobert0205@gmail.com';

-- Expand access audit action check constraint
ALTER TABLE "TriageAccessAudit" DROP CONSTRAINT "TriageAccessAudit_action_check";
ALTER TABLE "TriageAccessAudit" ADD CONSTRAINT "TriageAccessAudit_action_check"
  CHECK (action IN (
    'list_cases', 'read_case', 'failure_context', 'execution_evidence',
    'validate_action_inputs', 'diagnose', 'investigation_proposal', 'investigation_decision',
    'replay_dry_run', 'replay_request',
    'engineering_list_cases', 'engineering_read_case', 'engineering_return_findings', 'engineering_resolve',
    'operator_route_case', 'owner_repair_acknowledgement'
  ));

CREATE TABLE "TriageCaseWorkflow" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "subjectOwnerId" INTEGER NOT NULL,
  "queue" TEXT NOT NULL DEFAULT 'support',
  "status" TEXT NOT NULL DEFAULT 'needing_support',
  "assignedEngineerId" INTEGER,
  "activeInvestigationId" TEXT,
  "activeProposalId" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "customerInstructions" JSONB,
  "repairNote" TEXT,
  "escalationReason" TEXT,
  "findings" TEXT,
  "resolutionReason" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TriageCaseWorkflow_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TriageCaseWorkflow_caseId_key" UNIQUE ("caseId"),
  CONSTRAINT "TriageCaseWorkflow_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ZapRunRetry"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "TriageCaseWorkflow_queue_status_idx" ON "TriageCaseWorkflow"("queue", "status");
CREATE INDEX "TriageCaseWorkflow_subjectOwnerId_idx" ON "TriageCaseWorkflow"("subjectOwnerId");

CREATE TABLE "TriageCaseWorkflowEvent" (
  "id" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "subjectOwnerId" INTEGER NOT NULL,
  "actorId" INTEGER NOT NULL,
  "action" TEXT NOT NULL,
  "fromQueue" TEXT NOT NULL,
  "toQueue" TEXT NOT NULL,
  "fromStatus" TEXT NOT NULL,
  "toStatus" TEXT NOT NULL,
  "notes" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TriageCaseWorkflowEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TriageCaseWorkflowEvent_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "TriageCaseWorkflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "TriageCaseWorkflowEvent_caseId_createdAt_idx" ON "TriageCaseWorkflowEvent"("caseId", "createdAt");
CREATE INDEX "TriageCaseWorkflowEvent_actorId_createdAt_idx" ON "TriageCaseWorkflowEvent"("actorId", "createdAt");
