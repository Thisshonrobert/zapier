---
type: "query"
date: "2026-09-21T19:21:27.343214+00:00"
question: "Where should Phase 3 provider outcomes and durable failure evidence integrate in the worker?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["worker/index.ts", "withRetry()", "deadLetter()", "Action Handler Contract", ".()"]
---

# Q: Where should Phase 3 provider outcomes and durable failure evidence integrate in the worker?

## Answer

Expanded from the original query via graph vocabulary: [worker, execution, deadletter, retry, email, telegram, lease, action, transaction, transactional]. The graph shows worker/index.ts imports withRetry and deadLetter, provider actions sit behind the ActionHandler contract, deadLetter writes Kafka and SQL sinks, and Prisma exposes transaction support. Therefore Phase 3A belongs at the provider ActionHandler boundary, Phase 3B at worker execution plus transactional SQL failure persistence, and Phase 3C at dead-letter publication reconciliation. Sources: apps/worker/index.ts, apps/worker/actions/email.ts, apps/worker/actions/telegram.ts, apps/worker/deadletter.ts, packages/db/prisma/schema.prisma.

## Outcome

- Signal: useful

## Source Nodes

- worker/index.ts
- withRetry()
- deadLetter()
- Action Handler Contract
- .()