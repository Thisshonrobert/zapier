# Multi-query and metadata development comparison

28 operational-intent queries (24 answerable, 4 no-match); 18 captured development cases. Fixed production corpus: 54 sections.

| Variant | Section Recall@3 | Precision among returns | No-match abstention | Wrong-intent flags | Mean local ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| baseline | 100.00% | 33.33% | 25.00% | 18 | 0.164 |
| metadata | 95.83% | 31.94% | 25.00% | 0 | 0.156 |
| multi-query | 100.00% | 33.33% | 25.00% | 30 | 0.421 |
| combined | 95.83% | 31.94% | 25.00% | 0 | 0.153 |

baseline: family coverage 16/16; 2 controls excluded; mean local retrieval 0.102 ms.

metadata: family coverage 16/16; 2 controls excluded; mean local retrieval 0.354 ms.

multi-query: family coverage 13/16; 2 controls excluded; mean local retrieval 0.711 ms.

combined: family coverage 12/16; 2 controls excluded; mean local retrieval 0.577 ms.

Keep production baseline; combined candidate does not meet the development improvement gate.

External API cost: $0; model calls: 0. Downstream diagnosis remains unmeasured.

- Development-only, synthetic, previously inspected and author-labeled inputs; fresh held-out data is never read. No statistical or production acceptance claim.
- Graph family hit rate is coarse any-family coverage, not section-level recall or precision. Operational-intent metrics use direct section labels.
- Heading metadata is a heuristic; mixed passage intent is not semantically adjudicated. Most production runbooks allow generic providers, limiting provider-filter discrimination.
- Query expansion only reranks candidates with original-query lexical overlap. It cannot recover zero-overlap paraphrases. Prefixes and RRF k=60 are fixed before this run.
- No diagnosis model is invoked. Downstream diagnosis quality, grounding and end-to-end latency/cost remain unmeasured; prompt construction is not model acceptance evidence.
- Local retrieval timing is a single CPU sample per query, including validation and candidate gating; it is not a production performance benchmark.
- Production graph, retrieval contract, runbooks, prompts and replay authority remain unchanged. At most three excerpts retain their existing citations, hashes and untrusted-guidance markers.
