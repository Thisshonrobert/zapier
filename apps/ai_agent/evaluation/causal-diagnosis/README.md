# Experimental causal diagnosis — 13 October 2026

Status: offline regressions pass; [four-request live comparison](runs/free-causal-pilot-20261013-v1/report.md) is **inconclusive**. Three generations succeeded and the candidate confirmed-defect control returned HTTP 503. Candidate advice improved on the ambiguous case but incorrectly used `outcome_unknown` for known rejection. No production adoption or verified quality improvement claim.

## Trace

The earlier free oracle pilot found that both retrieval variants prescribed destination correction for `f03-permission-ambiguous`. Relevant retrieval reduced certainty but did not prevent the unsupported cause. This motivates testing diagnosis instructions while holding retrieval fixed; it does not prove which individual sentence caused the output.

- `src/prompts.ts`: “Only observed customer-controlled credentials, destination configuration, or template/input mappings justify” repair can be read as configuration presence establishing a configuration defect. “Missing template paths and invalid destination format support” repair does not explicitly distinguish an actual validation finding from error wording. The candidate replaces these clauses with a requirement for an evidenced defect.
- The same prompt already says errors support bounded hypotheses and runbooks are not incident facts. Its unsupported-specific-cause instruction, however, couples `unknown` to `insufficient_evidence`; the candidate separates uncertain specific cause from supported fault-family classification and targeted escalation. Unknown delivery still overrides routing.
- `docs/AI/failure-taxonomy.md`: F03 explicitly says generic username resolution can mask the cause and must remain ambiguous. F04 asks investigators to distinguish permissions from nonexistent destinations. Its example and correction procedure are conditional on evidence, not confirmation from error text.
- `docs/AI/runbooks/credentials-and-destinations.md`: symptoms acknowledge different causes, but Allowed remediation says to correct invalid configuration and the simulated example combines uncertainty with operator repair. This may reinforce premature correction. The candidate explicitly makes retrieved correction procedures conditional; the corpus is unchanged.
- `src/graph.ts`: evidence-reference membership, citation membership and missing-evidence disclosure are checked. These checks do not establish free-text entailment or confirm a configuration defect.

“The resolver reported Invalid channel username” is an observation. Invalid format, nonexistent destination, inaccessible chat, credential failure and missing permissions are hypotheses until distinguishing evidence exists. A cited independent format-validation finding confirms only a format defect, not the intended replacement or execution-time configuration.

## Candidate and offline coverage

`src/evaluation/causal-diagnosis.ts` wraps the unchanged production prompt with experimental instructions. It preserves the exact input string, schemas, evidence, passages, citations and delivery/replay restrictions. Production imports and the default prompt remain unchanged. Observation, hypothesis and confirmed cause use the existing summary and alternate-explanations fields; no new response contract is introduced.

A narrow experimental `repairEvidenceIssue` check flags manual correction without a cited explicit defect finding. It never rewrites an output, determines a taxonomy, or forces abstention. It is an advisory check for these destination/template fixtures, **not** a complete credential/permission policy or free-text truth evaluator. It is applied to both comparison variants identically, after preserving raw generated output.

Regression cases distinguish generic resolver wording from `destination_format_invalid`, require citing the evidence carrying the defect, accept deterministic invalid-input findings, reject blocked validation as proof, and permit completed targeted escalation with a supported taxonomy. The confirmed control uses the existing development capture's separately observed `destination_format_invalid` finding, not its expected taxonomy/policy label or its final error. It is confirmed within a controlled synthetic fixture; no live destination validity has been established. Removing that independent finding makes repair unsupported.

Initial broad verification: 40 passed, 1 PostgreSQL test skipped, 1 existing frozen V4 artifact-hash failure across five files. The V4 cases file is unchanged; normalizing CRLF to LF exactly matches its saved manifest hash. After the explicitly authorized saved-access reuse, 17 focused tests passed; after adding continuation of untouched slots, all 10 candidate tests passed. Root type check/build passed; frontend build was cached and replayed existing warnings. Root lint failed with 9 errors/22 warnings in unchanged frontend files. No AI-agent lint task exists. Frozen files were not rewritten.

## Comparison protocol

Two development cases, one initial generation per variant: ambiguous current → candidate, confirmed defect candidate → current. Production weighted-keyword retrieval is reconstructed and checked against V6 captures. Within each case, evidence, retrieval query, passage order/text/hash, schema and Gemini settings are identical; only instructions change. No planner, judge, repair, retry, model fallback, expected-answer leakage or held-out tuning. Four-generation audit limit; 10-second generation start spacing; 15-second call/120-second run deadlines; 64,000 total and 4,096 output tokens per generation. Token counting is separately audited. A provider failure stops remaining calls; unknown usage stays unknown. Output hashes, settings and source-capture/corpus hashes are frozen in the plan and per-attempt records.

The model remains `gemini-3.5-flash-lite` on the existing project/key. The saved confirmation binds that key to project `gen-lang-client-0124525712`, free tier and free generation. The user explicitly authorized checking availability with the first planned generation, without a smoke-test generation. `--reuse-confirmed-free-tier` permits reuse of that saved confirmation while still checking the exact project, key, model and free access; it does not forge a new verification timestamp. A successful response confirms momentary availability, not billing tier. The free-tier assertion comes from the saved account evidence. All four requests used this same key/model.

From repository root (prefix with `rtk proxy` in this workspace):

```powershell
bun test apps/ai_agent/tests/causal-diagnosis.test.ts apps/ai_agent/tests/prompts.test.ts apps/ai_agent/tests/oracle-pilot.test.ts apps/ai_agent/tests/diagnosis-graph.test.ts apps/ai_agent/tests/advisory-regression.test.ts
bun apps/ai_agent/src/evaluation/causal-pilot.ts --output apps/ai_agent/evaluation/causal-diagnosis/runs/<new-id>
# Using confirmed free-tier access; explicit reuse is only for authorized saved evidence:
bun --env-file=apps/ai_agent/.env apps/ai_agent/src/evaluation/causal-pilot.ts --output apps/ai_agent/evaluation/causal-diagnosis/runs/<new-id> --execute --confirmation <local-confirmation.json>
```

Review all four initial outputs manually for observed vs asserted causes, hypotheses, targeted procedure, supported classification and justified repair. Schema/service acceptance and the narrow repair gate are separate from semantic correctness. One sample per case/variant cannot establish reliability or justify production adoption.

The runner initially stopped at the HTTP 503. After inspecting the audit, explicit continuation ran only the untouched fourth slot via `executeCausalPilot(..., {resume: true})`. Every started slot, including a failed one, is skipped; the original partial report remains intact. Continuation refuses a recorded 429, unknown transport result or unfinished request. Four requests were issued in total, with no repair, retry, smoke test or replacement generation. The runner source gained this continuation guard after the third request; the frozen candidate instructions, evidence, retrieval and Gemini settings stayed identical. Do not rerun this completed request allocation.

Master-plan check: the explicit request is a deliberate bounded development experiment within Phase 11A's read-only evidence/measurement boundaries. No conflict found; no additional architecture or production adoption was introduced. Graphify CLI query was unavailable due to its uv trampoline; source files were used directly. Graphify required: no. No dependencies, workflow sends, replay, Git integration or unrelated edits.
