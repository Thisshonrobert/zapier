---
id: RB-F09-F10
version: 1.0.0
simulated: true
status: current
owner: AI operations
reviewed: 2026-09-24
taxonomy: F09, F10
providers: email, kafka, generic
code_version: phase-3c dlq publication and phase-4 evidence contracts
---
# Evidence gaps and progression failures

## Symptoms

Use this runbook for missing or split DLQ evidence, failed next-stage publication after SUCCESS, legacy gaps, or an email SDK result that historical code may have treated as success without retaining the provider error.

## Evidence needed

Require execution and linked failure IDs, publication claim and acknowledgement state, `dlqPublishedAt`, attempt provenance, current stage status, successor state, safe receipt metadata, and reconciliation results. Lost historical provider responses cannot be reconstructed.

## Read-only investigation

Report which source is complete, partial, or unavailable. Separate failure-publication repair from stage-progression recovery and both from repeating an external action. Preserve historical SUCCESS unless independent evidence and a separate repair process prove otherwise.

## Allowed remediation

The deterministic reconciler may publish a stored failure by its existing failure ID. Engineering may repair stage progression or provider-result normalization for future runs. Missing evidence requires explicit abstention and escalation.

## Forbidden actions

Do not fabricate an error, reinterpret SUCCESS from an error substring, replay an action to repair progression, bulk republish, expose raw provider responses, or claim all email failures reached the DLQ.

## Replay and approval

Phase 5 cannot replay. Missing evidence, historical email uncertainty, and SUCCESS action states are hard blocks. Progression recovery is a separate deterministic operation and is not authorized by action replay approval.

## Verification, rollback, or escalation

Verify failure visibility by shared failure ID and inspect stage status before recommending repair. Escalate irrecoverable evidence loss, hidden SDK outcomes, and broker/database contradictions to engineering. Roll back publisher or handler changes through deployment controls, not data deletion.

## Simulated example

Fabricated example: a stage is SUCCESS, its successor was never published, and an old log mentions an email error. The log does not justify changing SUCCESS or resending; progression and email evidence gaps need separate engineering review.

## Sources

See the [failure taxonomy](../failure-taxonomy.md), [Kafka documentation](../../kafka.md), [DLQ publisher](../../../apps/worker/dlq-publisher.ts), [DLQ reconciler](../../../apps/worker/dlq-reconciler.ts), and [email handler](../../../apps/worker/actions/email.ts). Current code wins conflicts.
