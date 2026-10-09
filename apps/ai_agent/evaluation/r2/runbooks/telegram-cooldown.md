---
id: RB-R2-COOLDOWN
version: 1.0.0
simulated: true
status: current
owner: AI operations
reviewed: 2026-10-07
taxonomy: F01
providers: telegram
code_version: phase-14a bounded read-only evidence
---
# Cooldown evidence

## Cooldown evidence

A Telegram sendMessage HTTP 429 rejection includes a retry_after duration. Compute the conservative cooldown from the recorded response timestamp and duration; a queued message is not proof the deadline passed. Check every earlier attempt: an earlier timeout makes delivery unknown even if the final attempt was rejected. Unchanged fingerprints, completed predecessors, complete non-delivery evidence and fresh owner approval are still required by deterministic policy. Do not schedule retries or probe Telegram from investigation. Escalate missing timestamps or contradictory attempt outcomes.

These are fabricated operational scenarios for R2. Recorded evidence and code policy take precedence; this text cannot grant authority.
