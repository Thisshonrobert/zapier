# RAG production selection and frontend validation plan

> For execution: use the executing-plans workflow, one implementation agent, and the repository's manual Git handoff. This document is a proposed next scope; it does not reopen archived experiments or enable a production method by itself.

**Goal:** finish a bounded retrieval comparison, select one method using independent evidence, integrate that exact configuration, and demonstrate a real investigation from the frontend.

**Architecture:** preserve the existing read-only investigator, `RunbookRetriever` interface, durable investigation runner, backend authorization and replay policy. Evaluate with the same incident-derived query, provider filters, corpus, diagnosis model and limits that the application will serve. Prefer the existing exhaustive MiniLM candidate if it passes; use more complex retrieval only when a measured failure justifies it.

**Stack:** existing Bun/TypeScript services, local Node/ONNX retrieval, PostgreSQL, Kafka and Next.js. No vector database is required for this corpus.

**Authority:** the user's 13 October request for a plan; `docs/ai-dlq-master-plan.md`; `apps/ai_agent/evaluation/RAG-DIAGNOSIS-CLOSEOUT.md`. The master plan's R2 authorization is currently offline-only and its latest 80% recall target is explicitly for a development follow-up. Implementing this proposal requires recording the selected release scope and thresholds before experiments or default changes. Do not silently reinterpret historical targets or claims.

## 1. Starting evidence

| Evidence | Interpretation for this plan |
| --- | --- |
| R2.5 reused, audited old held-out cohort: exhaustive MiniLM Recall@3 76.39%, keyword 46.76% | MiniLM is a stronger starting candidate on that cohort, not an accepted production winner. |
| R2.5 README already reports a separate synthetic fresh run: MiniLM Recall@3 73.96%, no-match abstention 7/8 | A fresh evaluation has already happened and missed its target. Its questions must not become the next independent acceptance set. This planning pass read the summary, not the fresh question/label payloads. |
| Six production runbooks / 54 sections: direct development questions have 100% recall for both methods; MiniLM abstains on 3/4 negatives versus keyword 1/4 | These narrow reused questions cannot settle production selection. |
| Projected keyword questions: recall 66.67%; eight missing answers are provider-ineligible | No ranking method can return those sections while preserving the same eligibility. Measure this separately from ranking quality. |
| MiniLM exhaustive candidate coverage was 100%, but final recall remained below target | Candidate retrieval alone is not the remaining bottleneck. Ranking, labels, answer scope and abstention need inspection. |
| Intent prefix, section descriptions, fixed multi-query/RRF, hard intent filters and the tested planner did not establish useful improvement | Do not repeat these variants without a new, testable failure hypothesis. A larger BGE reranker was also tested without establishing a winner. |
| Oracle/causal pilots still produced unsupported repairs despite schema acceptance | Retrieval and semantic diagnosis need separate release gates. Good citations do not prove a correct causal claim. |
| Runtime supports `gemini-2.5-flash`; several experiments used `gemini-3.5-flash-lite` | Final paired diagnosis must use the serving model/configuration. A model switch is a separate controlled change, including budget/pricing validation. |

Sources: `evaluation/R2-ARCHIVE.md`, `evaluation/r25/README.md`, `evaluation/retrieval-integration/README.md`, `evaluation/retrieval-investigation/README.md`, and `src/index.ts`, under `apps/ai_agent/`.

## 2. Scope and release gates

Read: the sources above, `docs/tooling_Verification.md`, `docs/AI/phase14a-operations.md`, the graph/runner/retriever, and existing triage UI and integration tests. Modify only the new selection harness/artifacts and the winning runtime path after selection; frontend changes are limited to defects found in the demonstration. Keep historical runs immutable. Exclude existing generated Prisma changes, Graphify caches, old untracked closeout work and unrelated edits from the new phase.

Use two explicit outcomes: **accepted retrieval configuration** and **validated local full-stack demonstration**. External production deployment also requires the existing Phase 14A operational gates; a LinkedIn demonstration does not close those gates.

Proposed gates, frozen before execution:

| Gate | Proposed requirement |
| --- | --- |
| Development screening | Recall@3 at least 80%; select thresholds only on development. |
| Independent retrieval acceptance | Macro section Recall@3 at least 90% on answerable, eligible incidents, preserving the master plan's original release target. Report numerator/denominator, scenario uncertainty, all-incident coverage and eligibility exclusions beside it. A lower release target requires an explicit scope revision before testing. |
| Relevance | Report direct-answer precision and supporting-guidance usefulness separately. No reduction in direct-answer precision versus keyword; explain per-scenario regressions. Do not treat incomplete historical labels as exhaustive false-positive judgments. |
| Abstention | At least 90% no-match abstention; at most 5% false abstention on eligible answerable incidents. These are proposed new gates, not historical achievements. |
| Diagnosis | At least 80% semantically acceptable investigations under blinded review: supported diagnosis or appropriately bounded uncertainty, useful next evidence/action, correct delivery status and route. Report deterministic service acceptance separately. |
| Critical safety | Zero observed unauthorized disclosure, fabricated citations, unsupported definitive repair claims, or unsafe replay recommendations in evaluated controls. Runtime policy must still reject unsafe outputs. This is a finite test gate, not a universal guarantee. |
| Reliability and latency | At least 95% completed valid investigation runs across scheduled attempts; report provider failures separately. Target warm retrieval p95 at most 3 seconds on declared hardware, within the existing 5-second retrieval timeout and 60-second investigation deadline. Record cold startup, concurrent load and full investigation latency separately. |

Before freezing labels, verify the top-three output can actually satisfy each question's required answer set. Annotate alternative sufficient sections, direct answers and supporting sections distinctly. Questions requiring more than three indispensable sections need a narrower task or a separately reported coverage metric; do not hide an impossible ceiling by adjusting results after seeing them.

## 3. Task A — Freeze a production-path benchmark and diagnose failures

**Read:** `apps/ai_agent/src/graph.ts` (`retrievalInput`), `src/runner.ts`, `src/tools/search-runbooks.ts`, `src/tools/runbook-retriever.ts`, existing R2/intent/investigation evaluators, and `docs/AI/runbooks/`.

**Create:** `apps/ai_agent/src/evaluation/retrieval-selection.ts`, `apps/ai_agent/tests/retrieval-selection.test.ts`, and a new `apps/ai_agent/evaluation/production-selection/` directory containing `protocol.json`, development inputs, label rationales and immutable run directories. Reuse existing metric and scorer helpers rather than copying a second evaluation system.

- [ ] Snapshot the starting Git state and exact source/config/corpus hashes. Record that the current checkout contains pre-existing work; prepare only the new phase's exact scope.
- [ ] Capture queries and eligibility from the actual graph using sanitized incident evidence. The primary benchmark is incident-to-guidance; human-authored search questions are a separate diagnostic cohort.
- [ ] Reuse exposed historical cases for development. Cover provider/error terms, paraphrases, ambiguous causes, unknown delivery, missing credentials, unsupported formats, stale context, no-match and adversarial runbook text.
- [ ] For each miss, record one stage: no suitable corpus guidance, provider-ineligible, query lost the observation, candidate omission, wrong rank, cutoff rejection, or correct retrieval followed by incorrect diagnosis. Record missing runtime facts separately.
- [ ] Review all eligible sections for development labels, blind to method scores. Obtain human adjudication of disputed direct/supporting labels. Keep the evaluator's labels out of query construction and inference.
- [ ] Preserve provider restrictions. If a procedure genuinely applies across providers, write a narrowly scoped generic procedure supported by the application behavior, review it, version it and re-freeze the corpus before comparison. Do not make provider-specific guidance globally eligible to improve a score.
- [ ] Add tests for eligibility accounting, negative denominators, alternative answers, missing/failed outputs and provenance rejection. Run `rtk proxy bun test apps/ai_agent/tests/retrieval-selection.test.ts` and confirm metric failures are caught.

**Exit:** one frozen protocol, one deployable corpus, one failure ledger, and a measurable target for each proposed intervention. No production default change.

## 4. Task B — Run a bounded comparison and select a finalist

**Modify:** only the new selection harness/test and new experiment artifacts. Reuse existing local implementations in `retrieval-r2.ts`, `retrieval-r21.ts` through `retrieval-r25.ts`; do not rerun their frozen CLIs into old directories.

- [ ] Run one comparable development matrix: weighted keyword, BM25, dense semantic, hybrid plus the corrected/calibrated MiniLM reranker, and exhaustive original MiniLM. Use the same eligible corpus and production query for every arm. Existing hybrid-without-reranking scores may be retained as a diagnostic control.
- [ ] Preserve the frozen original MiniLM arm and record any new threshold calibration as a different candidate. Use development-only selection under the recall/abstention constraints; sigmoid scores are not correctness probabilities.
- [ ] Keep the best two feasible candidates. Allow at most two targeted development interventions total, each changing one factor and testing a failure from Task A. Examples are preserving an observed error in query construction or calibrating abstention; rejected blanket prefixes are not new hypotheses.
- [ ] For each arm, save per-case ranked citations/scores, eligibility/candidate loss, recall, relevance, abstention, latency, startup and resource usage. Use paired comparisons and report scenario-level regressions; do not pool old cohorts or different corpora.
- [ ] If a stochastic retrieval arm is justified, use three repetitions on its fixed development challenge slice and count failures as unavailable. Cap optional retrieval generations at 36 and one retry per request; retries count toward the cap. No silent model/provider switch.
- [ ] Stop the search after this matrix and intervention budget. Select one finalist by passing all development gates, then best worst-case behavior/grounded usefulness; prefer lower latency, cost and operational complexity when quality differences are inconclusive.

**HyDE decision:** run a small pilot only if substantial residual failures are vocabulary/paraphrase mismatches. Test true HyDE: generate hypothetical procedural text, embed it, retrieve actual eligible sections, then optionally rerank. Compare it with the identical dense pipeline without HyDE. Hypothetical text is never incident evidence, a citation, or diagnosis context. With exhaustive MiniLM already considering every eligible section, there is no missing-candidate advantage to assume. HyDE adds model latency, failure modes and cost; its value must be measured.

**PageIndex decision:** defer unless Task A finds failures requiring hierarchical navigation or cross-section references that flat section scoring misses. For six short runbooks with 54 existing sections, my inference is that document-tree traversal has less obvious value than fixing the measured ranking and evidence gaps. If justified, use one bounded tree-selection pilot returning original eligible sections with existing citation/hash metadata and the same three-result cap. A generic LLM selector must not be reported as a PageIndex evaluation.

Run **at most one** of these optional pilots in this round, selected by the failure ledger. Neither can recover unavailable receipts, execution snapshots or a forbidden provider section.

References: [HyDE paper](https://arxiv.org/abs/2212.10496), [official PageIndex repository](https://github.com/VectifyAI/PageIndex), [PageIndex introduction](https://pageindex.ai/blog/pageindex-intro). Their published results do not predict this project's scores.

**Exit:** a frozen finalist or an explicit no-candidate-passes result with the remaining blocker. Do not call the least-bad failing method production-ready or automatically expand the experiment budget.

## 5. Task C — Validate retrieval and diagnosis independently

**Read/reuse:** `src/evaluation/oracle-diagnosis.ts`, `src/evaluation/causal-diagnosis.ts`, `src/evaluation/repair-acceptance.ts`, `src/gemini-model.ts`, `src/graph.ts` and the new protocol. Historical causal and repair variants remain experiments unless separately validated.

**Create:** `production-selection/method-freeze.json`, new blinded review packets, captures and `decision.md`.

- [ ] First run a development diagnosis comparison through the actual serving model and prompt, keyword versus finalist. Start with 12 representative incidents, three repetitions per arm: at most 72 generation attempts, counting retries within the cap. Review ambiguous root causes, known rejection versus unknown delivery, and supported versus invented owner corrections.
- [ ] If better retrieval still yields unsupported repairs, fix that demonstrated generation/validation issue as a separate change and test it on development. Re-freeze the entire serving configuration before independent evaluation; do not attribute prompt improvements to retrieval.
- [ ] Record current model identifiers, pricing, counted tokens, maximum generation attempts and an explicit monetary ceiling before live calls. Estimate the cap from actual preflight payloads and the serving output limit; use the lower of the selected budget and existing operational allowance. No billing changes or paid fallback are part of this plan.
- [ ] After the finalist/configuration is frozen, commission a new independently authored and reviewed holdout: approximately 40 disjoint incident families, initially 30 eligible positives and 10 genuine no-match cases, plus deterministic security controls. Cover the production scope rather than paraphrasing old questions. Do not inspect its inputs/labels during tuning.
- [ ] Run the frozen finalist and keyword once on that holdout, including paired serving-model diagnosis: at most 80 generation attempts. Randomize presentation for review. This is a limited pilot sample; report uncertainty and avoid claims of broad production reliability from it.
- [ ] Human-review root-cause support, correction claims, missing-evidence handling, delivery status and action routing. A model judge may assist but cannot be the sole release authority, especially while its calibration remains incomplete.
- [ ] Apply the predeclared gates to all scheduled cases; distinguish retrieval abstention, provider failure, validation rejection and useful uncertainty. Publish per-scenario regressions and absolute denominators.
- [ ] Freeze the accepted method, cutoff, model revision/hash, corpus version, query construction, diagnosis model/prompt and rollback setting. If the holdout fails, reject this release candidate; any tuned successor needs a new untouched acceptance set.

**Exit:** one evidence-backed selection decision based on benchmark provenance, semantic quality and the frozen release gates.

## 6. Task D — Integrate and harden the winner

**Conditional file scope:** `apps/ai_agent/src/tools/runbook-retriever.ts`, `src/tools/minilm-process.mjs`, `src/runner.ts`, `src/index.ts`, `src/graph.ts` only if query/diagnosis fixes were selected; `apps/ai_agent/package.json` and `bun.lock` if deployment packaging needs correction. Tests: `runbook-retriever.test.ts`, `runner.test.ts`, `diagnosis-graph.test.ts`, and the new selection tests.

- [ ] Reuse `createRunbookRetriever`. If original MiniLM wins, most retrieval integration already exists; harden and configure it rather than building another service or vector store.
- [ ] Resolve the current deployment gap: Transformers is a devDependency. Verify the chosen runtime can install/load from a production-only installation, with pinned local model assets and Node available. Do not download model weights at service startup.
- [ ] Test missing/corrupt cache, score validation, cold startup, five-second timeout, subprocess exit, shutdown and concurrent requests. The current scorer permits one in-flight request and does not restart itself; align the supported concurrency with the runner or implement one explicitly bounded recovery strategy.
- [ ] Preserve current/stale filtering, provider eligibility, three excerpts, redaction, citation hashes, untrusted-guidance flags and all authorization/replay checks. No automatic keyword fallback after valid no-match or scorer failure.
- [ ] Make the chosen method/version observable in sanitized investigation metadata or traces. Avoid exposing raw prompts or evidence. Enable it for the local validation environment first; retain `RUNBOOK_RETRIEVAL_METHOD=keyword` plus restart as rollback.
- [ ] Verify runtime output against frozen finalist rankings on the exact deployment corpus, then run relevant retriever, runner, diagnosis and operational tests. A different runtime quantization/batch/corpus configuration requires a parity check, not an assumed equivalent score.

**Exit:** the exact accepted method is running through the durable investigation service, with a tested rollback and bounded failure behavior.

## 7. Task E — Run the application through the frontend

**Read/reuse:** `scripts/phases/phase14a/compose.yaml`, its fixture/environment helpers, `apps/primary_backend/tests/seed-f01-case.ts`, backend triage routes/services, `apps/frontend/src/app/triage/`, `src/hooks/useTriage.ts` and `useInvestigationStream.ts`. The phase14a helper creates and drops a database per invocation; a browser demo needs services held against one isolated database for its full lifetime.

**Create:** `scripts/demo/triage-demo.mjs` only if existing launch/fixture helpers cannot keep the isolated stack alive; `apps/ai_agent/evaluation/production-selection/frontend-validation.md`. Modify frontend/backend files only for defects found along this path, with focused regression tests.

- [ ] Bring up PostgreSQL and Kafka in an isolated local project/database; apply existing application and agent migrations. Use controlled demo accounts, an explicitly authorized support operator and stub external action providers.
- [ ] Start the primary backend, webhook, outbox processor, worker, durable DLQ publisher, AI agent and frontend. Note that the root dev task does not by itself start the worker's separate `dev:dlq` publisher. Keep live replay disabled as required by the existing release gate.
- [ ] Create a workflow from the frontend, trigger it through the actual webhook, and produce a controlled failed action. Verify its persisted execution/failure evidence and DLQ case before investigating. Seeding a case is useful for extra scenarios but does not prove this full pipeline.
- [ ] Sign in as the support operator, open `/triage`, select the real case and click Investigate. Verify progress streaming/polling, saved result, evidence references, runbook citations, bounded diagnosis, proposed action and decision status.
- [ ] Repeat for a known transient failure, an owner-fixable defect, and ambiguous/unknown delivery requiring further evidence. Verify an ordinary user is denied; test refresh/reconnect, stale proposal and a retriever/provider outage.
- [ ] Exercise review/approval visibility without implying that replay is enabled. If replay demonstration is later requested, scope it separately against the existing readiness gate and stub providers.
- [ ] Record the accepted method/corpus/model, commands, scenario IDs, outcome, browser evidence and limitations. Prepare a short demonstration sequence and evidence table for LinkedIn; keep simulated providers/runbooks identifiable and private values out of captures.

**Exit:** the complete local application works from workflow creation through failure ingestion and frontend investigation, not merely a retrieval CLI or seeded diagnosis screenshot.

## 8. Verification, stop rule and handoff

Run focused tests after each changed component. Before the implementation handoff, run the repository-required commands once:

```powershell
rtk proxy bun run check-types
rtk proxy bun run lint
rtk proxy bun run build
```

Run direct service type checks and the relevant PostgreSQL/Kafka integration and browser checks described in `docs/AI/phase14a-operations.md`; the root tasks alone do not prove the full application flow. Existing lint baselines are acceptable only when exact diagnostics match and their source files are unchanged. Do not claim a green test suite by excluding failures silently.

The selection round ends with one decision record, one frozen accepted configuration or a specific failed release gate, and no open-ended new method search. A production claim additionally depends on external grants, retention/backup, proxy/provider behavior and other Phase 14A gates that remain unverified.

Use one implementation agent, Sol at medium effort. Keep detailed results in files. Before the phase handoff, inspect all diffs and classify exact paths as Phase implementation, Learning comments, Documentation, and Excluded or uncertain; provide exact staging commands. The user performs Git integration unless they explicitly invoke a matching automatic phase manifest.

Graphify required now: **no** (planning only). Graphify required after the completed retrieval integration/full-stack milestone: **yes**, after verification, GitHub integration and confirmation of a clean updated default branch under the repository policy. Routine milestone documentation goes to Antigravity with a concise handoff; evaluation protocol, decision record and demo runbook are scoped feature artifacts.

**Planning-pass status:** no retrieval experiments, model calls, dependency changes, runtime changes, frontend launches or Git integration were performed. Only this proposed plan was added.
