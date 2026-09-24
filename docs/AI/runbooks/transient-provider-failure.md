---
id: RB-F01-F02
version: 1.0.0
simulated: true
status: current
owner: AI operations
reviewed: 2026-09-24
taxonomy: F01, F02
providers: telegram, email, generic
code_version: phase-4 evidence contracts and phase-3c worker
---
# Transient provider failure

## Symptoms

Use this runbook for a captured provider rate limit, provider outage, or transport failure. Separate an explicit HTTP 429 rejection from a 5xx response or network timeout whose delivery outcome may be unknown.

## Evidence needed

Require the provider, request phase, bounded status and safe code, retry-after value, attempt outcome, completion time, execution state, predecessor states, and current fingerprints. A final error string alone does not prove non-delivery or recovery.

## Read-only investigation

Read failure context and execution evidence. Confirm whether the failure happened before a send, was explicitly rejected, or became ambiguous after a send began. Validate current inputs only when configuration may be involved. Do not probe the provider.

## Allowed remediation

An operator may restore connectivity or reduce sending pressure. For a proven Telegram 429 rejection, record the conservative cooldown deadline and investigate again after it passes. Guidance is not a scheduler and does not claim that the provider recovered.

## Forbidden actions

Do not restart infrastructure, call a provider, expose credentials, rewrite a payload, or infer delivery from a lease or error substring. Do not describe a 5xx response as proof of rejection.

## Replay and approval

Phase 5 is read-only. Replay is unavailable. The future initial replay case is limited to complete evidence for one Telegram send-stage 429 rejection, unchanged inputs, passed ordering and safety gates, and owner approval. Unknown outcomes remain blocked.

## Verification, rollback, or escalation

Verify the recorded retry delay and timestamps without sending. If evidence conflicts or recovery is unproven, abstain and escalate to the provider or platform operator. Roll back any operator configuration change through that system's normal process.

## Simulated example

Fabricated example: a Telegram send returns HTTP 429 with `retry_after: 30`. This illustrates retrieval only and is not evidence that any real incident was rejected or is safe to replay.

## Sources

See the [failure taxonomy](../failure-taxonomy.md), [master plan](../../ai-dlq-master-plan.md), and current [Telegram handler](../../../apps/worker/actions/telegram.ts). Code and deterministic policy take precedence over this simulated runbook.
