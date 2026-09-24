---
id: RB-F03-F04
version: 1.0.0
simulated: true
status: current
owner: AI operations
reviewed: 2026-09-24
taxonomy: F03, F04
providers: telegram, email
code_version: phase-4 evidence contracts and current worker validation
---
# Credentials and destinations

## Symptoms

Use this runbook for missing configured credentials, HTTP 401 or 403, inaccessible Telegram chats, invalid email destinations, or errors while resolving a Telegram username. Similar symptoms can have different causes.

## Evidence needed

Require redacted credential-presence results, the credential source, provider phase and status, destination field structure, missing template paths, fingerprints, and prior delivery outcomes. The API cannot prove whether a worker environment fallback contains a valid secret.

## Read-only investigation

Validate action inputs without returning values. Distinguish an absent action field from an unknown worker environment fallback. Check whether Telegram failed during destination resolution or send. Ask an operator to confirm bot membership and permissions outside the agent.

## Allowed remediation

An authorized operator may rotate or configure credentials and repair destination membership or permissions. Correct invalid workflow configuration through the owning application, then start a fresh investigation with new evidence.

## Forbidden actions

Never request, display, store, test, or transmit a secret. Do not send a test message, mutate a destination, claim a generic resolver error proves invalid credentials, or treat credential repair as replay approval.

## Replay and approval

Phase 5 cannot replay. Credential or destination repair is manual. Any later replay also requires resolved prior-delivery uncertainty, unchanged approved inputs, deterministic policy checks, and separate owner approval.

## Verification, rollback, or escalation

Verify only non-secret configuration presence and operator-provided permission evidence. If the worker environment or prior delivery remains unknown, abstain. Roll back credential changes in the credential manager and escalate permission failures to the destination owner.

## Simulated example

Fabricated example: validation reports no configured bot token while the worker environment is unknown, and Telegram returns 403. The correct result is uncertainty plus operator repair, not secret discovery.

## Sources

See the [failure taxonomy](../failure-taxonomy.md), [action documentation](../../actions.md), [Telegram handler](../../../apps/worker/actions/telegram.ts), and [email handler](../../../apps/worker/actions/email.ts). Code and deterministic policy take precedence.
