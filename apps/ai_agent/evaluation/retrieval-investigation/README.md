# Development retrieval investigation

Production retrieval stays unchanged. The final offline snapshot is `runs/offline-v4/`; `offline-v1`, `offline-v2` and `offline-v3` preserve intermediate investigations and are excluded from the suggested handoff. No paid call, new dependency, runbook edit, prompt edit, label change, fresh held-out read, Git integration, or Graphify refresh occurred.

## Confirmed causes

1. **Candidate generation:** the original multi-query arm requires positive original-query overlap and returns early on an empty baseline. Procedural prefixes cannot recover a zero-overlap paraphrase. A synthetic `throttling` → `rate limit` regression demonstrates this independently of development labels.
2. **Filtering:** `classifyIntent()` prioritizes evidence wording over constraints. The `intent-gaps-3` answer exists and is an original lexical candidate, but hard heading filtering removes `RB-F09-F10@1.0.0#forbidden-actions`. Soft intent retains all eligible candidates and adds a 0.5 ranking bonus rather than an exclusion. It recovers the answer lost by the old metadata arm without changing baseline development recall.
3. **Ranking/context displacement:** old fixed prefixes increased generic procedural terms in RRF. The old multi-query incident arm lost family coverage for duplicate retries, hidden SDK errors, and the sensitive-fields control; combined additionally lost missing-token coverage. The final JSON records the old question queries/filter losses and the new per-section path through eligibility, candidate generation, ranking, abstention and context.
4. **Provider eligibility explains the baseline mismatch:** direct questions use recorded provider arrays (including empty arrays); projected questions use provider eligibility derived from frozen observed evidence, including `unknown`. All eight missing gold sections in the projected baseline are in the credentials/destinations and uncertain-delivery documents, neither of which admits generic providers. They disappear before candidate generation. This is an input-contract difference, not evidence of worse ranking. Provider constraints are preserved; `unknown` is never replaced with unrestricted eligibility.
5. **Weak abstention:** production accepts any positive weighted overlap. Generic task words such as repair/allowed/forbidden match unrelated procedures, producing three false matches among four no-match controls. Requiring two informative literal terms rejects all four controls, but creates false abstention under constrained access. It remains an experimental cutoff.
6. **Planner observation:** all 44 successful historical live decisions have empty gaps and choose `use_current_context`; searches/fallbacks are zero, and paired contexts are identical. The merge rule did not run and cannot explain that outcome. Its controlled mechanical inspection changes one of two contexts: receipt/reconciliation guidance is admitted; worker-fallback guidance is not admitted because existing passages already cover the same gap terms.

The planner's conservative wording and difficulty distinguishing missing runtime facts from missing procedure are **hypotheses**, not confirmed causes. Four original-prompt control inputs contrast empty context with reviewed procedural context, using the same missing-token and lost-response evidence. Expected decisions stay outside planner input. No live control decision is claimed.

## Comparable offline measurements

Parity was checked before interventions against both frozen question baselines (28 each), all 16 captured incident retrieval contexts, historical input/source hashes and the unchanged 54-section corpus. Within each cohort, queries, evidence, provider eligibility, labels and result limits are identical. Questions and incidents remain separate.

| Question cohort / arm | Section recall | Precision among returns | No-match abstention | Answerable abstention |
| --- | ---: | ---: | ---: | ---: |
| Direct / baseline | 100% | 33.33% | 1/4 | 0/24 |
| Direct / soft intent | 100% | 33.33% | 1/4 | 0/24 |
| Direct / focused query | 100% | 33.33% | 1/4 | 0/24 |
| Direct / relevance | 100% | 33.33% | 4/4 | 0/24 |
| Projected / baseline | 66.67% | 22.22% | 1/4 | 0/24 |
| Projected / soft intent | 66.67% | 22.22% | 1/4 | 0/24 |
| Projected / focused query | 66.67% | 22.22% | 1/4 | 0/24 |
| Projected / relevance | 66.67% | 22.22% | 4/4 | 3/24 |
| Projected / focused + relevance | 66.67% | 22.22% | 4/4 | 2/24 |

The constrained false-abstention IDs are `intent-credentials-1`, `intent-credentials-2`, and `intent-credentials-4`; the combined arm retains a match on the first. The benchmark labels call them answerable, but their reviewed answers are provider-ineligible here. Among the 16 access-eligible positives, false abstention is zero. Keeping these denominators separate prevents claiming that an unrelated returned passage is an answer. Precision does not improve merely because no-match controls abstain: this precision metric is defined on positive questions.

Focused queries normalize observed underscores, remove generic task words and add five narrow vocabulary equivalences licensed by existing wording. They preserve the first two original passages and replace/fill only the last slot. They do not use expected taxonomy, labels, case IDs, or oracle annotations. They recover a synthetic zero-overlap paraphrase, but recover no additional labeled development question. Literal relevance gating still cannot recognize a wholly paraphrased observation; the two mechanisms are not a general semantic solution.

For the incidents, three procedure sections per case were manually reviewed by the implementation agent against the existing corpus and observed facts: evidence needed, read-only investigation and forbidden actions. These are **non-exhaustive procedural annotations**, not the existing question labels or a complete semantic relevance standard. Baseline coverage/precision on these targets is 10/48 (20.83%); focused-query is 11/48 (22.92%). It gains forbidden-actions passages for `f08-duplicate-retry-row` and `f10-sdk-error-recorded-success`, but loses evidence-needed for `f05-handler-version-unknown`. None of the new arms abstains on an incident. Of 38 baseline omissions, 37 occur at ranking and one at lexical candidate generation. This modest net improvement with a regression does not justify adoption.

## Oracle and diagnosis boundary

The JSON contains reviewed oracle contexts and exact baseline/oracle prompts for all 16 eligible incidents. Oracle retrieval refuses missing, duplicate, oversized or provider-ineligible citations. Oracle annotations are supplied through a separate interface and never enter normal queries, planners or diagnosis prompts as labels. Incident evidence, diagnosis instructions/version, limits and repair settings are unchanged; the two rejection controls remain model-free.

Every incident fixture has unavailable runtime evidence. The per-case artifact separates scenario missing facts from tool-level unavailable facts. Runbooks contain relevant procedural guidance, but cannot supply lost SDK results or receipts, worker environment credentials, historical handler versions, or execution snapshots. Those gaps may block a definitive cause or delivery claim; they do not automatically invalidate an evidence-supported bounded diagnosis. The four no-match questions have no reviewed corpus answer. No supporting passage is fabricated.

The bounded oracle diagnosis helper alternates paired order across repetitions, uses the unchanged diagnosis service and at most one repair, caps calls/tokens, retains conservative failed-call token reservations, and records output, schema validity, citation membership, usage and latency separately from semantic review. It exposes no live CLI or credentials. Offline plumbing completed **32 deterministic stub generations, 32 schema-valid outputs, $0 external spend**. Empty stub citation lists provide no evidence of semantic grounding. Semantic diagnosis quality remains unmeasured for changed contexts.

A targeted qualitative audit of the old paid outputs reveals why deterministic acceptance cannot stand in for semantic quality. Both variants causally attribute the missing-token failure to configuration while worker fallback is unknown. Both interpret the ambiguous resolver error as a configuration/format defect, despite `resolver_error_generic`, unavailable destination validity and validation blocked only by `fixture_inputs_unavailable`. The needed credentials procedure was absent from that final context. This is a plausible retrieval-limited case, not a proven oracle improvement. These observations are not a blinded or exhaustive semantic score.

The old paid run used 16 baseline versus 32 agentic paired generations and 55,897 versus 82,804 paired tokens (+48.1%). Mean incident latency was 4.324s versus 8.915s (including rejection controls and orchestration). All 76 run generations, including question planners, used 184,553 tokens. Dollar cost is unknown. The deterministic acceptance change from 15/16 to 16/16 occurred with identical contexts and cannot be attributed to retrieval; repeated paired outputs are needed to separate sampling variation.

## Prepared paid comparison — approval required

Exact proposed model: `gemini-3.5-flash-lite`, existing Gemini adapter and provider defaults. Cases: `f03-token-missing`, `f03-permission-ambiguous`, `f07-provider-response-lost`, `f08-duplicate-retry-row`, `f10-sdk-error-recorded-success`. Three paired baseline/oracle repetitions give 30 initial diagnosis generations, at most 60 with one repair each; four planner controls give an **aggregate maximum of 64 generations and 2,000,000 tokens**, including reserved unknown failed usage. Diagnosis caps: 64,000 total / 4,096 output tokens per call. Planner caps: 4,000 total / 512 output tokens. Call timeout 15s, total timeout 600s, starts at least 5s apart. Stop on blocking provider status; no retry/fallback model.

**Dollar cost is explicitly uncertain because pricing is not known; the token cap does not establish a dollar ceiling. No paid run has begun.** Review paired outputs blinded for supported claims, correct uncertainty, useful procedure and citation entailment; report schema validity/membership separately, per-repeat regressions, calls, usage, latency and cost unknowns. Partial runs remain explicit failures, never silently removed.

## Reproduction and verification

From the repository root, choose a new output path:

```powershell
rtk proxy bun run apps/ai_agent/src/evaluation/investigate-retrieval.ts --output apps/ai_agent/evaluation/retrieval-investigation/runs/offline-unique
```

Existing output directories are refused. Full JSON and manifest capture per-case results, stage traces, oracle prompts, controls, source/input hashes and proposal bounds. No network or paid model is used. This task's verification and exact manual staging scope are recorded in `HANDOFF.md`.

A later PageIndex/section-selector comparison is **conditionally justified** by the eligible ranking misses and limited precision, after the approved oracle comparison establishes that better procedures improve semantic diagnosis. It cannot repair provider exclusion or missing runtime facts. No implementation, dependency or production adoption is authorized by this conclusion. Development results do not establish generalization.

Graphify required: no. Suggested next investigation model: Sol at medium effort; no additional agents.
