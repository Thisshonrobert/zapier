# Offline bounded agentic retrieval experiment

This experiment leaves production retrieval, diagnosis prompts, runbooks, dependencies and replay policy unchanged. The original checked-in control uses deterministic stubs. Live development runs were separately authorized on 2026-10-12; their artifacts are preserved separately under `runs/live-dev-20261012-v1/` and `runs/live-dev-20261012-v2/`. Keep production retrieval until completed live observations and independent validation justify adoption.

## Inputs and isolation

The paired comparison reuses all 18 development cases and sanitized evidence from `phase-11a-baseline-v6`, including two deterministic rejection controls. It validates the capture manifest hashes, reconstructs the fixture evidence and exact production retrieval, and rejects incomplete or mismatched captures. It never loads captured baseline diagnoses. Both variants run fresh diagnosis calls through `buildDiagnosisService` with identical evidence, corpus, prompt, adapter settings and one bounded repair. The baseline search is unchanged.

The existing 28-question operational-intent benchmark supplies 24 section-labeled positives and four no-match controls. Separate retrieval-only probes project the literal question into controlled fixture error evidence, with its recorded provider (or explicit `unknown` where none was supplied), unknown execution and no delivery claim. They use the literal question for initial retrieval and derive follow-up provider filters from that frozen evidence. These projections differ from the earlier multi-query experiment's direct metadata filters, so cross-experiment baseline numbers are not comparable. Probe labels, intent annotations, support rationales and expected taxonomy never enter model inputs. These probes do not measure downstream diagnosis.

All existing cases and labels have already been inspected; these are synthetic development measurements, not independent validation. The new probe evidence projections, reused labels, method, limits and corpus are frozen into `freeze.json` **before** the first model call. No fresh held-out scenarios, labels, scores or reports are read. There is no held-out CLI option or arbitrary input-file option.

## Orchestration and fixed selection

The production graph collects its same three read-only evidence bundles. Variant A returns the existing production top three. Variant B passes a separate retrieval planner only those bundles and the initial excerpts, marked untrusted. The strict planner contract contains `decision`, `evidence_ids`, `gap`, and nullable `query`. Search requires one or more actual evidence IDs, a nonempty bounded gap and one sanitized query. Unknown fields, fabricated IDs, URLs, instruction/command-shaped queries, empty or oversized queries, malformed outputs and invalid usage fall back to the initial context. No diagnosis taxonomy filter is accepted. Provider/access eligibility comes exclusively from the observed evidence and allowlisted corpus.

There is one planner invocation and at most one extra search; no recursive tools or external actions exist. The unchanged Gemini adapter handles token preflight, transport, structured parsing and usage. An evaluation-only fetch wrapper substitutes the planner response schema; production adapter code and diagnosis schema remain untouched. The planner has no diagnosis/replay tools or authorization authority.

The fixed merge rule deduplicates versioned citations, keeps initial order and the first two initial results, and admits at most one novel follow-up passage. That passage must contain at least two distinct informative gap terms and strictly more gap-term coverage than **every** initial passage. Pick by coverage, then follow-up score, then lexical citation order. Append into a vacant slot or replace only slot three; never return more than three. SHA-256 content/heading hashes, citation identity, provider eligibility and canonical search output are checked. Original content, hashes and untrusted-guidance markers are preserved. Stale documents remain excluded by the existing parser. Lexical coverage is a heuristic, not semantic proof that the stated gap was filled.

## Bounds and fallback

- Concurrency: one case at a time. Run deadline: 600 seconds, shared across paired diagnosis and section probes.
- Invocation cap: 96 model generations for the entire run, including repairs and probes. Token budget: 2,000,000, conservatively reserving input/schema UTF-8 bytes plus the capped output before each call. Unknown failed-call usage retains its reservation.
- Call deadline: 15 seconds; planner prompt: at most 32,000 characters. Planner provider preflight: 4,000 total tokens and 512 output tokens. Diagnosis provider preflight: 64,000 total tokens and 4,096 output tokens, with the existing graph's 48,000-character prompt bound and at most one repair.
- Live runs now space all generation starts five seconds apart, across planner, diagnosis, repairs and probes. Stub runs have no pacing delay. Pacing happens before call deadlines and contributes to end-to-end latency. The shared 600-second deadline still applies.
- Safe provider error categories and HTTP status codes are captured per call. HTTP 401/403/404/429 stops subsequent provider invocations across the run; remaining cases retain explicit failures/fallbacks. There is no automatic retry. Failed calls keep unknown usage null; known usage is also reported separately as a lower bound.
- Planner failures, malformed output, timeouts or exhausted budgets retain initial retrieval and record a sanitized fallback. An exhausted shared budget can also prevent diagnosis; such cases remain explicit failures in quality denominators. No provider retry or model fallback occurs.
- Generation counts and token-count HTTP requests are recorded separately. Provider defaults are used identically for both diagnosis variants. Live cost stays null because no pricing rate/source is assumed. Stub usage is synthetic zero, and external spend is zero.

Only sanitized error categories, structured results, prompt hashes and measured usage are recorded. Invalid planner/provider bodies and hidden reasoning are not persisted. Diagnosis free text is redacted before artifact storage. Frozen input integrity must pass before execution; an unexpected corpus/capture mismatch stops the run.

## Reproduce

From the repository root, choose a new directory:

```powershell
rtk proxy bun run apps/ai_agent/src/evaluation/agentic-experiment.ts --output .tmp-turbo-user/agentic-reproduction
rtk proxy bun run apps/ai_agent/src/evaluation/agentic-experiment.ts --replay .tmp-turbo-user/agentic-reproduction
```

Default execution uses fixed stub planner/diagnosis models, requires no credentials, and makes no paid calls. The stub planner deliberately always searches for `verification rollback escalation`; it tests plumbing and exposes abstention regressions rather than simulating an intelligent planner. The diagnosis stub returns conservative `unknown` abstention from supplied evidence only. Stub acceptance/grounding numbers are regression checks, not model quality evidence.

Only after a separate explicit request, configure `GEMINI_API_KEY` and `GEMINI_MODEL` and run:

```powershell
rtk proxy bun run apps/ai_agent/src/evaluation/agentic-experiment.ts --live --output apps/ai_agent/evaluation/agentic/runs/live-dev-unique
```

When credentials are in `apps/ai_agent/.env` and execution starts at repository root, use `bun run --env-file=apps/ai_agent/.env` before the script path. The runner never writes credential values to artifacts.

The first authorized live attempt completed baseline diagnoses but failed all paired agentic diagnoses with provider errors; its original implementation did not retain HTTP status codes. Its apparent 0/16 agentic acceptance is an incomplete-run result, not proof that changed retrieval harms diagnosis. The paced second attempt adds diagnostics and stops on blocking provider responses. Interpret `pairedDiagnosesComplete`, per-call outcomes and fallback counts before comparing quality. No frozen run is overwritten.

Outputs are restricted to new directories under `.tmp-turbo-user/` or `evaluation/agentic/runs/`; previous runs are never overwritten. `freeze.json`, `report.json`, `report.md` and `manifest.json` capture the inputs, settings, corpus, actual contexts/results, per-call roles, token/cost unknowns, timings, source/input/output hashes, revision and dirty state. Offline replay verifies hashes and recomputes both paired evaluator reports and section metrics against the frozen corpus without model calls. Fresh live generations need not reproduce identical results.

## Checked-in stub results

See `runs/stub-dev-v2/report.md` and its JSON/manifest/freeze. Section recall: 66.67% for both variants; precision among returned sections: 22.22% for both. No-match abstention **regresses from 1/4 to 0/4**. Coarse incident-family coverage stays 16/16; deterministic diagnosis acceptance stays 2/16, below the existing 80% target. Reference grounding checks pass 16/16 and evaluated safety violations are zero for both; these do not verify natural-language truth. The two rejection controls invoke no models.

The paired B variant searches on 16/16 eligible cases with zero planner fallbacks in this stub run, and doubles generation invocations from 16 to 32. The separate section probes add 28 planner generations: 76 total stub invocations, zero provider requests, synthetic zero tokens and $0 external spend. Per-case local end-to-end latency is recorded, but a single stub CPU run cannot establish live performance. Empty diagnosis citation lists are structurally valid and do not demonstrate useful citation grounding.

Do not adopt based on recall. A separately requested live run must demonstrate enough grounded diagnosis improvement to outweigh regressions, calls, tokens, cost and latency; independently validate any promising result. Human review and generalization remain unmeasured. This experiment makes no production adoption decision.

Graphify required: no. This is an isolated offline experiment, with no production architecture change.

## Completed live development run

See [LIVE-RESULTS.md](LIVE-RESULTS.md) for the separately authorized Gemini results and limitations. The completed second run made 76 successful generations, with no planner fallbacks and no follow-up searches. Retrieval recall, precision and no-match abstention were unchanged. Paired tokens increased 48.1%, and paired generation calls doubled. The acceptance difference (15/16 versus 16/16) occurred with identical retrieval contexts and cannot be attributed to retrieval improvement. Dollar cost and independent semantic quality remain unmeasured. Both live attempts and the stub control are preserved separately.
