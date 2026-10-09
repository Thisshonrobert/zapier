# MiniLM integration candidate

Authorized 2026-10-09: prepare the recommended feature-flagged MiniLM integration, retaining keyword as the default and rollback. This is a candidate for validation, not approval to deploy or a claim of independent 80% acceptance. The fresh scenario set remains unopened. Intent conditioning stays rejected.

The durable investigation executor uses `RUNBOOK_RETRIEVAL_METHOD=keyword` by default (also the rollback setting). `minilm-original` selects exhaustive scoring of eligible sections, the frozen MiniLM revision `a09144355adeed5f58c8ed011d209bf8ee5a1fec`, q8 CPU, batch eight, token limit 512, sigmoid cutoff .001 and top three. Original query and `heading\ncontent` passages are preserved. The production corpus remains six allowlisted runbooks, 54 sections. Taxonomy/provider filters, stale exclusion, citation hashes and untrusted guidance markers remain intact. Existing graph output validation, evidence requirements and replay safeguards apply unchanged.

No implicit keyword fallback follows MiniLM abstention or errors. A genuine no-match returns no guidance. Invalid scores, missing/corrupt model files, process errors, concurrent scoring or timeout fail the investigation before model generation. The existing durable runner records this as an error. Restart with `keyword` to roll back. No deployment environment has been changed.

## Local opt-in and rollback

The Bun service starts one local Node subprocess for native ONNX inference. Node must be available on PATH. The existing experimental dependency `@huggingface/transformers` **3.8.1**, currently in `apps/ai_agent/package.json` devDependencies, must be installed; a production-only dependency install does not supply it. Package/lock changes were deliberately excluded to preserve the frozen experiment dependency inputs. Dependency packaging must be resolved separately before rollout. Keep keyword as the default in that environment.

Set `RUNBOOK_RETRIEVAL_METHOD=minilm-original` and `RUNBOOK_MINILM_CACHE_DIR` to an absolute path containing the already-provisioned model cache. The expected layout is `<cache>/Xenova/ms-marco-MiniLM-L-6-v2/<revision>/` with config.json, tokenizer.json, tokenizer_config.json and onnx/model_quantized.onnx. The subprocess verifies their pinned SHA-256 hashes before loading. Remote model access is disabled; startup never downloads files and passages never go to an external inference service. Startup is bounded to 60 seconds; each inference is bounded to five seconds and kills the subprocess on timeout. One request can be in flight; there is no unbounded queue or automatic process restart. Restart is necessary after a subprocess failure.

Rollback: set `RUNBOOK_RETRIEVAL_METHOD=keyword` (or unset it) and restart the service. Model loading and the Node subprocess are then bypassed. No database migration is required.

## Verification

From the repository root:

```powershell
rtk proxy bun apps/ai_agent/evaluation/retrieval-integration/verify-dev.mjs
```

The script uses the existing ignored `.tmp-turbo-user/r2-models` cache by default; an alternate cache path can be passed as the first positional argument. It reads only the frozen intent-v3 development inputs, benchmark and scores, verifies their provenance, and refuses non-development questions. It checks the runtime against all 28 saved baseline queries using the original experimental corpus, then measures keyword versus MiniLM using the production loader. No LLM calls, service/database calls, fresh questions or held-out query rows are used. Output `runs/dev-v2/report.json` is exclusive-create; do not overwrite an existing run.

Final Bun-runtime results: frozen ranking/returned-score parity **28/28**; production positive Recall@3 **100% for both methods** (24 questions); no-match abstention **1/4 keyword versus 3/4 MiniLM**; MiniLM mean inference **1,080.88 ms**, model startup **522.47 ms**. Concurrent repository checks ran during this measurement, so latency is illustrative rather than a controlled comparison. The earlier Node run is in excluded `dev-v1`, with 491.76 ms mean; it is not the final provenance-verified run.

Reducing the corpus from 60 to 54 sections changes padded q8 batches. Maximum returned-score drift versus saved scores restricted to the smaller corpus was .03543, although all 28 top-three rankings were unchanged. Exact score parity is asserted only on the original corpus. These repeated synthetic questions do not prove performance on actual incident-derived queries or independent scenarios. The earlier downstream experiment remains the diagnosis-safety evidence; it found one unsafe noisy-context replay recommendation rejected by the graph. This integration does not rerun or improve that result.

Independent production-path retrieval/diagnosis validation is still needed before enabling MiniLM as the default. Access to the fresh set requires separate authorization. See HANDOFF.md for the exact integration-only Git scope and the prerequisite artifact/dependency limitations.
