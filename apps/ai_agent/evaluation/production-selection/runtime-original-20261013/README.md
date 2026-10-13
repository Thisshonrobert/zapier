# Original MiniLM runtime selection

Authorized by the user on 13 October 2026: select original MiniLM provisionally as the current retriever, change the production code default, and enable the local frontend diagnosis flow for an operator-recorded demo. The user will start the application and record it themselves. This explicit scope supersedes the historical offline-only/default-keyword restriction for this change; it does not declare the old acceptance gates passed or authorize live replay.

The default in `src/tools/runbook-retriever.ts` is now `minilm-original`. It preserves the incident query, the six deployed runbooks / 54 sections, provider/taxonomy filters, pinned q8 cross-encoder, batch eight, 512-token limit, .001 cutoff and top-three citations. The rejected procedure prefix is absent. Transformers 3.8.1 moved from development to runtime dependencies with its version and package resolution unchanged.

## Evidence and limits

On the 54-section corpus, original MiniLM achieved 79.33% eligible recall on reused held-out questions versus 41.33% keyword, with 12/12 negative abstentions versus 0/12. On fresh historical questions, eligible recall was 50.69% versus 53.47% keyword, with 7/8 negative abstentions versus 0/8. These are separate authored-question cohorts with 11 and 12 corpus-ineligible positives respectively, not independent production-incident acceptance. The selection is an explicit user choice under mixed evidence, not a universal quality certification. Earlier reports are preserved unchanged.

`local-readiness.json` records real default-scorer loading and two local queries, configuration checks, operator permission, database readiness and current limits. It contains no credentials. No model API calls, service startup or external deployment were performed. A full live frontend diagnosis remains for the user's demo.

## Local demo configuration

The ignored `apps/ai_agent/.env` and `apps/primary_backend/.env` now set `INVESTIGATION_ENABLED=true`. The agent explicitly selects original MiniLM, points to the existing absolute local model cache, and supplies the required conservative pricing reservation rates. Existing service secrets, database URLs and Gemini model/key were preserved. The selected account already had support-operator permission; no account permission update was needed.

Start the existing frontend, primary backend and agent, sign in with the selected account, open `/triage`, select the existing case and start an investigation. For a focused local start from the repository root:

```powershell
bun run dev --filter=frontend --filter=primary_backend --filter=ai_agent
```

The existing local PostgreSQL database and schema are ready. Requests still use the durable queue, owner/operator budgets, scoped evidence reads and audit writes. Current default limits reserve 64,000 tokens per attempt against 256,000 owner/operator tokens per rolling day: at most four attempts per day before other reservations. No budget restrictions or replay safeguards were removed. Operator authentication and case ownership remain required; this does not enable diagnosis for arbitrary signed-in users.

## Deployment and rollback

Runtime installations must include Node on PATH and an absolute `RUNBOOK_MINILM_CACHE_DIR` containing the existing pinned files. The cache contains `Xenova/ms-marco-MiniLM-L-6-v2/a09144355adeed5f58c8ed011d209bf8ee5a1fec/{config.json,tokenizer.json,tokenizer_config.json,onnx/model_quantized.onnx}`. The runtime verifies SHA-256 hashes, never downloads weights, and fails closed if files/scoring are unavailable. Model binaries and `.env` secrets are not staged.

Rollback now requires **explicitly** setting `RUNBOOK_RETRIEVAL_METHOD=keyword` and restarting the agent. Unsetting the variable selects MiniLM; older integration notes describe the historical default. Set `INVESTIGATION_ENABLED=false` on both services and restart to stop new investigations.

Verification: the new default test failed on the prior keyword implementation and passed after the switch; 24 focused retrieval/operator/investigation API tests passed. Root type checks/build, frozen Bun lockfile validation and scoped whitespace check passed. Frontend build output was cached. Lint failed in unchanged frontend files with nine errors and 22 warnings. Graphify required: no for this bounded existing-runtime switch. No Git integration was performed.
