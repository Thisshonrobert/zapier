# Offline retrieval investigation

Baseline parity passed: 28 direct questions, 28 provider-projected questions, 16 incident contexts. 54 unchanged corpus sections.

| Cohort | Variant | Recall | Precision | No-match abstention | Answerable abstention |
| --- | --- | ---: | ---: | ---: | ---: |
| direct-question | baseline | 1 | 0.3333333333333332 | 0.25 | 0 |
| direct-question | soft-intent | 1 | 0.3333333333333332 | 0.25 | 0 |
| direct-question | focused-query | 1 | 0.3333333333333332 | 0.25 | 0 |
| direct-question | relevance | 1 | 0.3333333333333332 | 1 | 0 |
| direct-question | focused-relevance | 1 | 0.3333333333333332 | 1 | 0 |
| observed-provider-projection | baseline | 0.6666666666666666 | 0.22222222222222218 | 0.25 | 0 |
| observed-provider-projection | soft-intent | 0.6666666666666666 | 0.22222222222222218 | 0.25 | 0 |
| observed-provider-projection | focused-query | 0.6666666666666666 | 0.22222222222222218 | 0.25 | 0 |
| observed-provider-projection | relevance | 0.6666666666666666 | 0.22222222222222218 | 1 | 0.125 |
| observed-provider-projection | focused-relevance | 0.6666666666666666 | 0.22222222222222218 | 1 | 0.08333333333333333 |

Historical planner searches: 0/44. No historical merge rule was exercised. Controlled follow-up selection changed 1/2 contexts; this is mechanical evidence only.

Oracle plumbing: 32 deterministic stub generations; 32/32 schema-valid. No semantic-quality claim. Paid model calls: zero; external spend: $0. Oracle prompt pairs and proposed live bounds are in report.json.

All incident fixtures lack runtime facts; existing procedures cannot establish missing receipts, worker environment, or historical definitions. No held-out data, production changes, runbook/label changes or dependency additions.
