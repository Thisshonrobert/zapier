# R2.3: reranker failure analysis

R2.3 freezes R2.2's per-query candidate identities/order, r21-v1's 96 queries/labels/splits and the 12-runbook/60-section corpus. It keeps the pinned MiniLM q8 reranker, CPU batching, 512-token maximum and cutoff 0.001 unchanged. The sole tested intervention prefixes the target section with the same runbook/version's existing Symptoms section; no runbook text is edited and no query-specific relevance rules are introduced.

## Findings

- Truncation is ruled out for the captured pairs. Original inputs reach at most 163 tokens; contextual inputs at most 197, below 512.
- Original held-out Recall@3 is 59.72%, reproducing R2.2; context reduces it to 56.94%. Original development Recall@3 is 100%, context 97.22%; development selection therefore rejects context.
- Original held-out gold-section occurrences: 28 returned, 5 absent from candidates, 8 below the cutoff, 7 lost to top-three ranking. Context returns 26, with 5 candidate losses, 10 cutoff losses and 7 ranking losses.
- Topic/section confusion is visible in pairwise margins. A procedural gold section can rank below a related section from the same runbook. That observation does not establish a model-wide causal explanation; adding topical context failed this test.
- The earlier R2.2 baseline-logit control shows that batch score drift did not cause its measured quality regression. R2.3 captures token hashes/counts and fresh paired reranker timings, alternating variant order by query.

See [the frozen report](runs/r23-v1-local/report.md) and [gold/distractor margins, ranks and loss reasons](runs/r23-v1-local/report.json). Loss counts refer to labelled section occurrences; Recall@3 uses macro section recall over answerable queries. Labels remain frozen and may be incomplete; “distractor” means unlabelled for this evaluation, not independently proven irrelevant.

No variant reaches the plan's 90% top-three recall target. R2.1/R2.2/production remain unchanged. The separately isolated R2.4 model comparison follows this verified diagnostic result.

## Reproduction and boundaries

```powershell
rtk proxy bun apps/ai_agent/src/evaluation/retrieval-r23.ts
rtk proxy bun apps/ai_agent/src/evaluation/retrieval-r23.ts --scores apps/ai_agent/evaluation/r23/runs/r23-v1-local/scores.json --output .tmp-turbo-user/r23-replay-new
```

Inputs exclude labels and split/group information from inference. Baseline byte hashes, corpus/dataset identity, exact candidate order, model revisions, source hashes, complete score/token coverage and saved report score hashes are validated. Existing output directories and baseline paths are rejected. New runs use only previously cached MiniLM models; there is no network inference or paid fallback.

Fresh reranker latency is reported separately. Pipeline latency adds historical R2.2 embedding/candidate timings to fresh reranker timing and is explicitly an estimate. Setup/token-inspection times are excluded from reranker timing. Author-labelled synthetic queries in 24 correlated scenario groups and reuse of held-out diagnostics make the comparison exploratory.

Production retrieval, Phase 11/11A, downstream diagnosis, replay authority and dependencies are untouched. See [the combined comparison and exact Git handoff](../r24/handoff.md). **Graphify required: no.**
