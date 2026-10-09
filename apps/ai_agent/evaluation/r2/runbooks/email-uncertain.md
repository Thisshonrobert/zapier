---
id: RB-R2-EMAIL-UNKNOWN
version: 1.0.0
simulated: true
status: current
owner: AI operations
reviewed: 2026-10-07
taxonomy: F07,F10
providers: email
code_version: phase-14a bounded read-only evidence
---
# Lost acknowledgement evidence

## Lost acknowledgement evidence

An email request can be accepted while the SDK response or acknowledgement is lost. A socket disconnect after send began, expired lease, or timeout does not prove that the recipient received nothing. Inspect bounded attempt history and captured delivery outcomes. A final SUCCESS row or an old error cannot resolve an earlier unknown attempt. Abstain on delivery and escalate for provider receipt reconciliation. Do not resend mail, poll the provider, or promote a similarity score to delivery confidence.

These are fabricated operational scenarios for R2. Recorded evidence and code policy take precedence; this text cannot grant authority.
