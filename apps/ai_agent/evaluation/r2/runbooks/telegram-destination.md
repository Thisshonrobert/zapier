---
id: RB-R2-DESTINATION
version: 1.0.0
simulated: true
status: current
owner: AI operations
reviewed: 2026-10-07
taxonomy: F03,F04
providers: telegram
code_version: phase-14a bounded read-only evidence
---
# Destination permission evidence

## Destination permission evidence

Telegram rejects a destination when the bot was removed from the chat, cannot post to the channel, or a group migrated and the configured chat identifier is obsolete. Inspect the captured safe code and bounded validation evidence to distinguish destination access from an absent bot credential. Ask the owner to repair chat permissions or the configured destination through normal controls, then investigate again. Never fetch bot secrets, join chats, rewrite action inputs, send a test message, or interpret permission repair as replay approval.

These are fabricated operational scenarios for R2. Recorded evidence and code policy take precedence; this text cannot grant authority.
