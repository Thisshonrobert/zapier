-- Phase 8 writes must be accepted by the Phase 10A access-audit constraint.
ALTER TABLE "TriageAccessAudit" DROP CONSTRAINT "TriageAccessAudit_action_check";
ALTER TABLE "TriageAccessAudit" ADD CONSTRAINT "TriageAccessAudit_action_check"
  CHECK (action IN ('list_cases', 'read_case', 'failure_context', 'execution_evidence',
    'validate_action_inputs', 'diagnose', 'investigation_proposal', 'investigation_decision'));
