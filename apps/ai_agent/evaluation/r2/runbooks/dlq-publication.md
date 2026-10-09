---
id: RB-R2-PUBLICATION
version: 1.0.0
simulated: true
status: current
owner: AI operations
reviewed: 2026-10-07
taxonomy: F09,F10
providers: generic
code_version: phase-14a bounded read-only evidence
---
# Publication reconciliation evidence

## Publication reconciliation evidence

A durable dead-letter outbox record may remain unpublished when Kafka is unavailable or broker acknowledgement is lost. Inspect publication state, bounded last error and reconciliation evidence separately from action execution outcome. Duplicate broker delivery is compatible with at-least-once publication and must retain stable identity. A missing DLQ message is not evidence the external action failed to deliver. Escalate to platform operations when publication is stuck. Do not restart Kafka, mark records published, replay actions, or weaken reconciliation idempotency from investigation.

These are fabricated operational scenarios for R2. Recorded evidence and code policy take precedence; this text cannot grant authority.
