Continue D1 (diagnosis improvement) from Task 3. Execute natively, following karpathy-guidelines and TDD.

Read only these, in order:
1. apps/ai_agent/evaluation/d1/README.md — status table, frozen subsets, regression baseline
2. docs/superpowers/plans/2026-10-26-d1-diagnosis-improvement.md — Global Constraints, Review Focus, Tasks 3–6 (Tasks 0–2 are checked off; don't re-read their code)
3. For Task 3 only: apps/ai_agent/src/evaluation/diagnosis-r4.ts (ProtocolSchema at lines ~60–150, runDiagnosisR4 at ~700–800, CLI at the end), the loaders loadDevelopmentContext/loadHoldoutContext in apps/ai_agent/src/evaluation/retrieval-r4.ts, and apps/ai_agent/tests/diagnosis-r4.test.ts.

Do not read or modify: src/tools/*, runbooks, the corpus, any r4/ run directory, r4/diagnosis*/ artifacts, generated Prisma, or graphify-out. Do not open evaluation/d1/acceptance-subset-v1.json contents before Task 5.

State at handoff (2026-10-28):
- Done: Task 0 (P1–P4 adjudicated real; dev and acceptance subsets frozen, tests/d1-subsets.test.ts). Task 1 (issueForOutput option strictOutcomeUnknown → "unsupported_outcome_unknown"). Task 2 (prompt "phase-11a-v4" in src/prompts.ts with DiagnosisPromptVersion and repairGuidanceV4; DiagnosisOptions.promptVersion in src/graph.ts wires the strict guard; contracts enum accepts v4; serving default is still phase-11a-v3).
- Verification at handoff: prompts 6/6 and diagnosis-graph 21/21 pass; check-types passes; the full-suite failures are identical to the 18 pre-D1 failures in evaluation/d1/baseline-test-failures.txt.
- Nothing is committed. Follow docs/manualgit_handoff.md; no automatic commit or push.

Task 3 goal: diagnosis-r4.ts accepts diagnosis.prompt.version "phase-11a-v3" | "phase-11a-v4" and subset.split "development" | "holdout" (default "holdout", so the existing r4/diagnosis-v2/protocol.json still parses). The development split uses loadDevelopmentContext and r4/runs/dev-20261021-v2 scores/report for the retrieval parity check. promptVersion is passed into buildDiagnosisService options. Write failing tests first (plan Task 3 Step 1), then implement. Re-run the README regression diff afterwards; it must print IDENTICAL.

Then Task 4 (dev screening). Before generating, freeze both arm protocols and write the selection rule into evaluation/d1/dev-decision.md. Arms: v4 × gemini-3.5-flash-lite and v4 × gemini-3.8-flash on evaluation/d1/dev-subset-v1.json. Before running Task 4, ask me for the API keys; pass them only through the environment. Run one arm per session if tokens are tight. Free tier only; stop on a quota halt and resume with --resume.

Stop and report on any conflict with the plan. Report changed files, verification results, limitations and next steps concisely.
