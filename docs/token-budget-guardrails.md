# Token Budget Guardrails

- Default to one agent for ordered work that edits shared files. Use parallel agents only for genuinely independent tasks.
- An approved design or implementation plan is executable authority. Do not create another plan or architecture review unless implementation exposes a concrete conflict or ambiguity.
- Per phase, default to at most two subagent dispatches: one implementer and one final reviewer. Skip per-task reviewers unless the user explicitly requests them or the risk justifies the added cost.
- Use Sol at medium reasoning for architecture, transactions, security, and difficult implementation. Use Terra for bounded mechanical work. Use high reasoning only when explicitly requested or medium reasoning reports a blocker.
- Spawn agents with no inherited conversation history and point them to narrow file-based briefs. Agents must return a short status and write detailed reports to an ignored workspace file.
- Never redispatch interrupted work blindly. First inspect the previous agent status, report, Git diff, and uncommitted files; continue partial work instead of restarting it.
- Keep only one implementation agent active at a time. Do not start duplicate reviewers, planners, or documentation agents for the same phase.
- Do not paste large diagnostics, diffs, generated files, or audit JSON into chat. Save them to files and summarize only decisions, failures, and verification results.
- Prefer one focused verification pass after implementation. Re-run only checks affected by a fix, then run the required repository verification once before completion.
- If planning or coordination consumes substantial usage before production work starts, stop delegation, report the burn, and switch to direct single-agent execution.
- After completing the requested task, run focused verification, summarize changed files and results, then stop; do not begin unrequested follow-up work.
