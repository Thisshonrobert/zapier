---
type: "query"
date: "2026-09-23T06:41:29.785446+00:00"
question: "Start Phase 3C durable DLQ publication and reconciliation"
contributor: "graphify"
outcome: "useful"
source_nodes: ["DLQ failure taxonomy and investigation requirements", "Dual-Sink Dead Letter Handling", ".failure()", "kafka"]
---

# Q: Start Phase 3C durable DLQ publication and reconciliation

## Answer

Expanded from original query via graph vocab: [dlq, dead, letter, publish, failure, retry, kafka, execution, outbox]. The graph places Phase 3C between durable ZapRunRetry failure identity and Kafka zap-events-dlq publication: publish sanitized evidence keyed by failureId, then stamp dlqPublishedAt only after broker acknowledgement. Publication retries may duplicate Kafka messages and must never invoke an action provider; reconciliation operates on database evidence and preserves unknowns.

## Outcome

- Signal: useful

## Source Nodes

- DLQ failure taxonomy and investigation requirements
- Dual-Sink Dead Letter Handling
- .failure()
- kafka