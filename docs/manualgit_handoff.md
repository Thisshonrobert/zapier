# Manual Git and Handoff

## Explicit Automatic Workflow

For phases with a `scripts/phases/<phase>.json` manifest using `manualPullRequest: true`, the implementation agent runs `scripts/finish-phase.mjs Start <phase>` after preparing the exact file scope. Luna low generates scoped documentation; the script verifies, stages exact phase files and selected learning comments, commits and pushes. The user creates and merges the phase PR. A Codex heartbeat then runs `Resume`, verifies the exact pushed head was merged, switches to main and pulls, regenerates Graphify in a clean worktree based on merged main, commits only the named outputs and pushes directly to main. Notify the user on completion or a blocker. The user creates the next branch. These explicitly invoked operations are authorized exceptions to the manual defaults below; no extra staging handoff, Graphify PR or automatic next branch is required. Preserve unrelated edits and never force push. Known lint baselines may be accepted only when the exact diagnostics match and their source files are unchanged; report this accurately.

## Manual Workflow

- The user performs staging, committing, pushing, merging, branch switching and pulling manually unless they explicitly request one of those actions.
- Default to two commits for a major phase, not separate implementation, learning-comment and documentation commits:
  1. **Phase bundle:** implementation, tests, approved learning comments and milestone documentation.
  2. **Graphify:** regenerated Graphify artifacts after the phase bundle is merged and available on the updated default branch.
- Before the phase-bundle handoff, inspect all uncommitted diffs and report exact paths under these headings: `Phase implementation`, `Learning comments`, `Documentation`, and `Excluded or uncertain`. Do not rely on the user remembering where comments were added.
- A file containing both implementation and learning comments is listed once under `Phase implementation`, with the learning comments noted. Comment-only files may be listed under `Learning comments`. Do not silently include unrelated changes.
- Provide an exact `git add -- <path>...` command and suggested commit subject for the user to run. Never recommend `git add .`, broad globs, or staging an entire dirty directory.
- After the first handoff, stop. The user stages, commits, pushes and merges the phase bundle, then switches to the default branch, pulls the merged result and explicitly confirms that this step is complete.
- State `Graphify required: yes` or `Graphify required: no` using the milestone policy in `docs/graphify.md`. Small edits and comment-only changes do not require a Graphify refresh.
- When Graphify is required, run it only after the user's confirmation and only from a clean, up-to-date default branch or a clean worktree based on it. Stop if unrelated working-tree changes could enter the graph.
- After regeneration, report only the exact newly generated Graphify paths, provide an exact staging command and suggest a separate Graphify commit subject. Then stop so the user can perform the second commit, push and merge manually.
- Never stage pre-existing Graphify cache, query-memory or unrelated generated changes unless they were produced by the confirmed milestone refresh and are explicitly listed.
