---
id: RB-R2-ORDERING
version: 1.0.0
simulated: true
status: current
owner: AI operations
reviewed: 2026-10-07
taxonomy: F06,F08
providers: generic
code_version: phase-14a bounded read-only evidence
---
# Predecessor ordering evidence

## Predecessor ordering evidence

A workflow stage cannot execute safely when a predecessor is pending, missing, or failed. A numeric stage index alone does not establish that predecessor actions completed. Read captured predecessor states and ordering gaps; distinguish out-of-order broker delivery from a duplicate event for a terminal SUCCESS stage. Preserve DAG ordering and idempotent terminal state. Missing predecessor evidence requires abstention or platform escalation. Do not reset terminal executions, bypass dependency checks, or retry a successor to repair an ordering gap.

These are fabricated operational scenarios for R2. Recorded evidence and code policy take precedence; this text cannot grant authority.
