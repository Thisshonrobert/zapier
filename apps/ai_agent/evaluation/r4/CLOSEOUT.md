# R4 — closeout (R4.6)

Plan: [`2026-10-21-r4-measurement-recovery.md`](../../../../docs/superpowers/plans/2026-10-21-r4-measurement-recovery.md), R4.6. Outcome: **`structured-minilm` promoted behind the existing flag.**

## Promotion

| Prerequisite | Status |
| --- | --- |
| R4.4 retrieval | `retrieval_accepted` ([`decision.md`](decision.md)) |
| R4.5 diagnosis | met by D1 as **`diagnosis_accepted_ai_reviewed`** ([`../d1/accept-v1/ai-decision.md`](../d1/accept-v1/ai-decision.md)), not a human-reviewed `diagnosis_accepted`. The R4.5 v1/v2 runs on the frozen retrieval stay `blocked`: their human reviews were never done. v2 scored 22/40 in an AI pre-review. D1 changed only the prompt, guard and model, then passed the R4.5 gates on AI review (Amendment A1). |

- `RUNBOOK_RETRIEVAL_METHOD=structured-minilm` is set in `apps/ai_agent/.env`. That file is git-ignored and is the only environment that exists today, since no remote deployment has been performed. Any future deployment must set the variable itself.
- The code default in `src/tools/runbook-retriever.ts` is unchanged: an unset variable still selects `minilm-original`.
- The service reads the variable once at startup, so a change needs a restart.

## Frozen references

| Item | Value |
| --- | --- |
| Config | [`selected-retrieval-config.json`](selected-retrieval-config.json), sha256 `a56ae39c3053f954aebbb7318034fc39408f72f85198e8cc13e5620f78ec2805` |
| Corpus | `r3/corpus-v1.json`, 55 sections, hash `45e85c3585607ebfd0e1ebd1f2b068e2fab7c889b1bdd3af3a565f20afcbd440` |
| Reranker | `Xenova/ms-marco-MiniLM-L-6-v2` @ `a09144355adeed5f58c8ed011d209bf8ee5a1fec`, `q8` |
| Versions | profile `r4-v1`, packing `r3.3-v1`, support `r3.4-v1` (`minAnchorHits: 1`) |
| Holdout seal | `8d6cb47c3032e0ae051ad83c2009d007b644162d95f7f8e44d24ec61f558c886` |

No startup hash check was added. That belongs to a separate operational-hardening task.

## Rollback

Set the variable in `apps/ai_agent/.env` (or the deployment environment) and restart the ai_agent service:

```
RUNBOOK_RETRIEVAL_METHOD=minilm-original   # previous serving behavior
RUNBOOK_RETRIEVAL_METHOD=keyword           # lexical baseline, no model process
```

**Rollback proof (2026-10-28).** `createRunbookRetriever` was built the same way serving builds it: the real runbook index, the local pinned model cache and the process environment. Each flag value then ran one F01 query (Telegram 429, facets `evidence` and `verification`):

| Method | Result | Citations |
| --- | --- | --- |
| `structured-minilm` | ok, 3 | `RB-F01-F02@1.1.0#allowed-remediation`, `#evidence-needed`, `#verification-rollback-or-escalation` |
| `minilm-original` | ok, 3 | `#simulated-example`, `#allowed-remediation`, `#replay-and-approval` |
| `keyword` | ok, 3 | `#simulated-example`, `#allowed-remediation`, `#evidence-needed` |

Only `structured-minilm` returns the requested evidence and verification facets, which matches its design. This was a single-process smoke check; a full service start was not performed.

## Results

Holdout (`runs/holdout-20261021-v1`, one run, 160 cases):

| Gate | Point | Wilson 95% lower | Threshold |
| --- | ---: | ---: | ---: |
| Sufficient-guidance hit@3 | 100% (120/120) | 96.90% | ≥ 90% / ≥ 82% |
| Macro section recall@3 | 95.00% (360/396) | 87.67% | ≥ 90% / ≥ 82% |
| No-match abstention | 100% (40/40) | 91.24% | ≥ 90% / ≥ 75% |
| False abstention | 0% (0/120) | — | ≤ 5% |
| Direct precision@3 | 100% (360/360) | — | ≥ keyword 18.06% |
| Reliability | 100% (160/160) | — | ≥ 95% |
| Warm p95 | 1910 ms | — | ≤ 3000 ms |
| Safety violations | 0 | — | 0 |

Paired against keyword: 120 candidate-only hits and 0 keyword-only hits (exact McNemar p ≈ 1.5e-36).

Diagnosis on this retrieval (D1 acceptance, `gemini-3.5-flash-lite` × `phase-11a-v4`): 38/40 accepted by both AI reviewers, Wilson lower bound 83.5%, 0 safety violations.

## Limitations

R4 is not a universal quality certification.

- **Clustered cases.** The 120 answerable holdout cases cluster into about 10 family-level label signatures, so case-level Wilson bounds are anti-conservative.
- **No-match abstention is guaranteed by construction,** so it is weak evidence.
- **F04 dual acceptance** is lenient by up to 10% of the answerable set.
- **The development `S` cohort is not held out.**
- **Small, simulated corpus.** It has 55 sections in six runbooks, and the benchmark is simulated. There is no production-incident acceptance.
- **Review was not fully human.** The holdout label audit was AI-assisted and operator-attested, and diagnosis acceptance was AI-reviewed.

## Verification (2026-10-28)

| Check | Result |
| --- | --- |
| `bun test` retrieval-profile, retrieval-support, retrieval-target, retrieval-r4, rag-corpus-parity, runbook-retriever | **112/112 pass** |
| `bun run check-types` | pass |
| `bun run build` | At first it failed in `frontend` only: `src/hooks/useTriage.ts:248` passed the UI kind `"request"` where the client expects the route segment `"requests"`. At runtime that would POST to `/replay/request` (a 404) with no idempotency key. Fixed after closeout by mapping at the call site, and the build now passes. |
| `bun run lint` | `frontend`: 9 errors and 11 warnings. The saved baseline is 9 errors and 22 warnings. The errors are unchanged and R4.6 changed no frontend file. Not green. |

## Changed files (R4.6)

- `apps/ai_agent/evaluation/r4/CLOSEOUT.md` (new), `apps/ai_agent/evaluation/r4/README.md`
- `docs/decisions.md` (ADR 011), `docs/current-state.md` (section 4.1)
- `docs/superpowers/plans/2026-10-21-r4-measurement-recovery.md` (R4.6 checkboxes)
- `apps/ai_agent/.env` (git-ignored): the flag was already set during D1 Task 6

No source code changed in R4.6. Graphify is required after merge, because R3.5r–R4–D1 is an architectural milestone.

## Next steps

- `src/lib/triage-outcome.test.tsx` has 3 failures that predate R4.6: those tests get a 502 because they expect a running investigation service.
- Optionally, run a human review of the D1 acceptance items so diagnosis acceptance no longer rests on AI review alone.
- Before any remote deployment, set `RUNBOOK_RETRIEVAL_METHOD` and the MiniLM model cache in that environment, then start the service end to end.
