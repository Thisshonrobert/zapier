---
id: RB-F04-F06
version: 1.0.0
simulated: true
status: current
owner: AI operations
reviewed: 2026-09-24
taxonomy: F04, F05, F06
providers: telegram, email, generic
code_version: phase-4 validation contract and current worker registry
---
# Template, registry, and stage validation

## Symptoms

Use this runbook for missing template paths, wrong field types, an unsupported action type, a missing run, or an invalid, gapped, or duplicate stage sequence. Malformed or unowned broker events are not normal tenant DLQ cases.

## Evidence needed

Require the redacted validation result, current action type, deployed registry keys or version, run and stage identity, ordered predecessor states, provenance, and fingerprints. Current definitions are not proof of the historical execution-time definition.

## Read-only investigation

Run deterministic input validation. The parser replaces a missing template path with an empty string, so report the missing path rather than the rendered value. Compare action type with the current `email` and `telegram` registry and inspect contiguous stage ordering.

## Allowed remediation

An operator may repair the producing data or workflow definition for future runs. Engineering may align seeded action IDs with deployed handlers. Reinvestigate after deployment or configuration repair.

## Forbidden actions

Do not invent missing IDs, map an orphan event to a user, generate a handler, edit the registry, rewrite historical payloads, or bypass stage validation. Do not call an action handler or provider during validation.

## Replay and approval

Phase 5 is read-only. Repeating invalid input is not useful, changed input is outside same-input replay, and malformed or orphaned events have no replay path. Unsupported handlers remain blocked until deployment and inputs are verified.

## Verification, rollback, or escalation

Verify parser results against current worker semantics and confirm registry and stage order without executing actions. Escalate missing historical snapshots, ambiguous ordering, and producer schema faults to engineering. Roll back definition changes through normal deployment controls.

## Simulated example

Fabricated example: `{{customer.channel}}` is missing and the action type is `slack`, which is absent from the current registry. These are two observed validation findings, not permission to add a handler or modify the run.

## Sources

See the [failure taxonomy](../failure-taxonomy.md), [worker parser](../../../apps/worker/parse.ts), [worker validation](../../../apps/worker/validation.ts), and [action registry](../../../apps/worker/actions/index.ts). Code takes precedence.
