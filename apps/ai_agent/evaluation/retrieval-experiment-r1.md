# R1 retrieval experiment

Status: completed as a dependency-free screening experiment on 2026-09-29. No production retrieval behavior changed.

## Method

- Corpus: the six current, versioned simulated runbooks and their existing section boundaries.
- Variants: current weighted-keyword retrieval and local BM25 with the same taxonomy/provider filters.
- Queries: six fixed exact development queries and six fixed paraphrased held-out queries. The relevant target is a labelled `Symptoms` section. A separate unrelated no-match query is excluded from recall and MRR denominators.
- Safety: both variants retain metadata filtering, stale exclusion supplied by `loadRunbooks`, at-most-three results, versioned citations, content hashes, and untrusted-guidance output. No providers, embeddings, models, rerankers, or vector stores were called.

## Results

| Variant          | Development recall@3 / MRR | Held-out recall@3 / MRR | Held-out mean latency |
| ---------------- | -------------------------- | ----------------------- | --------------------- |
| Weighted keyword | 4/6 (66.7%) / 0.417        | 2/6 (33.3%) / 0.333     | 0.047 ms              |
| BM25             | 5/6 (83.3%) / 0.556        | 3/6 (50.0%) / 0.389     | 0.142 ms              |

Both variants returned only valid versioned citations, respected the three-result bound, and returned no result for the no-match control. External retrieval cost was zero. Timing is a local micro-benchmark and is not a production latency estimate.

## Recommendation

BM25 is only the better result among the two methods R1 tested, not the final or best retriever. It misses the plan's 90% retrieval recall target on only six held-out queries. Do not adopt it: keep weighted-keyword retrieval as the application default. Semantic retrieval, hybrid retrieval, reranking, embeddings, and pgvector were not evaluated or added; the expanded comparison is deferred to R2 after Phase 14.

Grounded diagnosis and abstention were not re-evaluated because this experiment did not alter the retriever used by the diagnosis graph.
