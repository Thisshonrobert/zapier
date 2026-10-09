# Downstream evaluation handoff

## Phase implementation

- `apps/ai_agent/src/evaluation/downstream-noise.ts` — paired downstream runner, frozen ranking/prompt provenance, bounded Gemini calls, raw-output assessment and graph validation.
- `apps/ai_agent/tests/downstream-noise.test.ts` — wrong-taxonomy/reference/disclosure failures, no-match citation hallucination and paired regression counting.
- `apps/ai_agent/evaluation/downstream-noise/summarize.mjs` — regenerates the impact summary and verifies offline capture replay, qualitative provenance and absence of the configured API key in artifacts.
- `apps/ai_agent/evaluation/downstream-noise/runs/live-v1/manifest.json` — final 30-job packet, written before live inference.
- `apps/ai_agent/evaluation/downstream-noise/runs/live-v1/progress.jsonl` — incremental raw outputs, graph results and assessments.
- `apps/ai_agent/evaluation/downstream-noise/runs/live-v1/report.json` — immutable complete capture, counters and paired comparison.
- `apps/ai_agent/evaluation/downstream-noise/runs/live-v1/impact-summary.json` — per-arm and case counts, no-match behavior and original capture hash.
- `apps/ai_agent/evaluation/downstream-noise/runs/live-v1/verification.json` — identical capture replay with zero external calls and matching qualitative-review provenance.

## Learning comments

None added.

## Documentation

- `apps/ai_agent/evaluation/intent-dev/rejection-ledger.md` — already committed as `754419f`; the commit contains only this file.
- `apps/ai_agent/evaluation/downstream-noise/README.md` — experiment results, design, scoring limits, bounds and reproduction commands.
- `apps/ai_agent/evaluation/downstream-noise/runs/live-v1/qualitative-review.json` — authored review of all 30 outputs, with specific semantic and safety findings; not independent human adjudication.
- `apps/ai_agent/evaluation/downstream-noise/HANDOFF.md` — this scope and integration record.

## Excluded or uncertain

- `apps/ai_agent/evaluation/downstream-noise/runs/prepare-v1/manifest.json` — obsolete preparation before fixture/type corrections.
- `apps/ai_agent/evaluation/downstream-noise/runs/prepared-v2/manifest.json` — preparation before the additional frozen-ranking guard.
- `apps/ai_agent/evaluation/downstream-noise/runs/prepared-v3/manifest.json` — duplicate final preparation packet; the same hash is preserved in live-v1.
- `apps/ai_agent/evaluation/downstream-noise/runs/replay-v1/manifest.json` — offline verification copy.
- `apps/ai_agent/evaluation/downstream-noise/runs/replay-v1/progress.jsonl` — offline verification outputs.
- `apps/ai_agent/evaluation/downstream-noise/runs/replay-v1/report.json` — offline verification copy; concise verification evidence is included from live-v1 instead.
- All pre-existing R2–R2.5 and intent-v3 implementation, tests, model dependency and artifacts remain outside this task's staging scope. The runner depends on those untracked baseline files, so this staging command is the exact new contribution, not a standalone baseline integration. Reconcile older work separately before creating a portable PR.
- All pre-existing production, lockfile, master-plan, Prisma and Graphify changes are preserved and excluded. No new edits outside `apps/ai_agent` were made.

## Results and verification

33 focused offline tests passed, one optional PostgreSQL test skipped, zero failed. Scoped ai_agent TypeScript verification passed. The ai_agent build script is also `tsc --noEmit`; no separate emitted build or lint script exists for this package. Root frontend checks were not rerun for this strictly ai_agent-scoped task.

After explicit user approval of the external synthetic payload, 30 Gemini diagnosis calls completed with 95,835 reported tokens. Clean outputs matched expected taxonomy in 12/12 cases and action route in 10/12; baseline outputs matched taxonomy in 12/12 and route in 11/12. Nine pairs passed in both arms, one only in clean and two only in baseline. One noisy-only simulated-evidence replay proposal was rejected by existing graph validation. Six no-match outputs remained unknown/abstained with empty citations, but five used outcome_unknown instead of insufficient_evidence; strict control success is 1/6. All 30 outputs were qualitatively reviewed, with unsupported prose concerns recorded separately.

Offline capture replay reproduced all generations, assessments and graph outcomes with zero external calls. Original captures, runner source, retrieval baseline and production retrieval remain unchanged. No fresh held-out scenario dataset was opened. Initial automatic approval rejection was resolved by explicit user authorization; there is no remaining execution blocker. Results are a small synthetic, stochastic diagnostic experiment, not proof of production reliability or noise causality.

## Exact manual staging after review

The rejection ledger is committed. The remaining runner, packet and documentation are uncommitted:

```powershell
git add -- "apps/ai_agent/src/evaluation/downstream-noise.ts" "apps/ai_agent/tests/downstream-noise.test.ts" "apps/ai_agent/evaluation/downstream-noise/summarize.mjs" "apps/ai_agent/evaluation/downstream-noise/runs/live-v1/manifest.json" "apps/ai_agent/evaluation/downstream-noise/runs/live-v1/progress.jsonl" "apps/ai_agent/evaluation/downstream-noise/runs/live-v1/report.json" "apps/ai_agent/evaluation/downstream-noise/runs/live-v1/impact-summary.json" "apps/ai_agent/evaluation/downstream-noise/runs/live-v1/qualitative-review.json" "apps/ai_agent/evaluation/downstream-noise/runs/live-v1/verification.json" "apps/ai_agent/evaluation/downstream-noise/README.md" "apps/ai_agent/evaluation/downstream-noise/HANDOFF.md"
```

Suggested subject: `test(ai-agent): evaluate downstream passage-noise impact`

Graphify required: no. No push or branch switch was performed. Further bounded evaluation, if separately authorized: Sol, medium reasoning. No additional retrieval intervention or fresh held-out evaluation was started.
