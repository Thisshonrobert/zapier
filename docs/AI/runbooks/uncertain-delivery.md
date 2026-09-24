---
id: RB-F07
version: 1.0.0
simulated: true
status: current
owner: AI operations
reviewed: 2026-09-24
taxonomy: F07
providers: telegram, email
code_version: phase-3c execution evidence and phase-4 tools
---
# Uncertain external delivery

## Symptoms

Use this runbook when a provider call may have been accepted but its response or terminal database write was lost, when a receipt is missing, or when a live execution lease expires. A lease describes worker ownership, not external delivery.

## Evidence needed

Require every attempt outcome, provider phase, safe receipt if captured, request and action fingerprints, lease and completion state, fencing evidence, and provider reconciliation. PostgreSQL state alone cannot establish non-delivery.

## Read-only investigation

Reconstruct what was observed before and after the provider boundary. Separate action failure from persistence failure. Treat Telegram transport errors, invalid responses, missing receipts, and expired pending executions as unknown unless independent provider evidence resolves them.

## Allowed remediation

Preserve all evidence and ask an operator to reconcile with the provider. Engineering may repair capture or fencing for future executions. Email can only be reconsidered when the identical request and key remain inside a currently verified provider deduplication window.

## Forbidden actions

Do not resend Telegram, reclaim an expired lease for another provider call, delete the execution, reset status, or assume an idempotency key protects a changed or expired request. Human approval cannot turn unknown delivery into known non-delivery.

## Replay and approval

Phase 5 has no replay. Telegram unknown delivery is blocked. Email replay is deferred; future consideration requires verified provider guarantees, the same request and key, captured timing, deterministic policy, and owner approval.

## Verification, rollback, or escalation

Verify provider receipts through authorized manual reconciliation and retain the unknown state until proof exists. Escalate missing receipts or stale workers to engineering. There is no safe rollback for an external side effect that may already have occurred.

## Simulated example

Fabricated example: the Telegram request is sent, the response connection drops, and the lease later expires. This remains unknown even if the database contains no success receipt.

## Sources

See the [failure taxonomy](../failure-taxonomy.md), [idempotency documentation](../../idempotency.md), [execution store](../../../apps/worker/execution-store.ts), and provider reference linked by the taxonomy. Current code and provider terms take precedence.
