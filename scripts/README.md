# Automatic phase handoff

The agent runs the workflow after completing implementation. You only create and merge the phase PR in GitHub, then create the next phase branch after completion.

1. Start: Luna low updates only named docs in an isolated worktree. The runner verifies, stages the exact phase implementation, docs and explicitly selected learning comments, commits and pushes the phase branch. It returns a GitHub compare link. No GitHub CLI is required.
2. You create and merge the PR in GitHub.
3. A Codex heartbeat runs Resume, checks GitHub for the exact pushed commit's merged PR, switches the original checkout to main and pulls with fast-forward only. It updates Graphify from clean merged main in an isolated worktree, commits only named generated outputs and pushes that commit directly to main. Then it pulls the original checkout and reports completed.
4. You create the next branch. The runner creates no next-phase branch and no second Graphify PR in this workflow.

The heartbeat needs the Codex app and computer available. It stays quiet while waiting, notifies only for completion or required action, and stops after completion. Heartbeat turns consume some model usage; the GitHub check and Graphify structural extraction use native commands. Public-repository merge checks use the read-only GitHub API without a token. Private repositories require GH_TOKEN or GITHUB_TOKEN in the environment. Credentials are never printed. Git uses your existing credential helper for pushes.

```powershell
# Agent commands; the user does not need to stage or commit:
rtk proxy node scripts/finish-phase.mjs Start 10c
rtk proxy node scripts/finish-phase.mjs Resume 10c
# Existing docs already completed? Verify then Publish avoids another model call.
rtk proxy node scripts/finish-phase.mjs Verify 10c
rtk proxy node scripts/finish-phase.mjs Publish 10c
```

Plan is read-only. Docs updates docs only; Prepare performs Docs and Verify. The PowerShell wrapper has the same modes. If Windows blocks script files, use the Node entry point. Required tools are Node, RTK, Bun, Codex, Git and Graphify; no new package dependencies are installed.

Optional learning comments are trailing exact paths, supplied consistently to Start or Docs/Verify/Publish. The runner does not determine whether edits are comment-only: the agent inspects the diff and classifies them. Omit paths when no comments were added. A file containing implementation and comments belongs to the implementation list. Unrelated staged files block publication; selected files already staged are accepted and restaged to their verified working-tree contents. Unrelated working-tree files remain local.

Verification hashes selected content, HEAD and the manifest. Edits invalidate publication. The initial release commit must start exactly at fetched origin/main, preventing earlier unpublished commits from entering the PR. Phase 10C records nine pre-existing lint diagnostics explicitly: only that exact diagnostic set with every affected source file unchanged from HEAD is accepted. The result records baselineUnchanged, never claims root lint has no errors, and blocks any new error or changed baseline source. Tests, type checks and build must still pass.

Ignored .agents/progress/releases/<phase>/ contains atomic resume state, logs, verification results and a per-phase lock. Publication retries reuse recorded commits. Inspect Git after a crash between commit and state recording; do not delete active state or remove a lock whose process is still running. A failed main push is not forced: inspect branch-protection or concurrent-update errors. Completion is reported only after push and local pull succeed.

Graphify uses graphify update ., reusing existing semantic extraction. This is a structural refresh, not a fresh semantic interpretation of all documents. Only explicit manifest graph outputs are committed; cache and query-memory changes never enter the commit. Unexpected outputs stop for inspection. The original dirty checkout is never used for extraction, so unrelated files and old cache edits cannot contaminate the graph. No stash or reset is used.

Future phases need a scripts/phases manifest listing exact files and checks, created by the implementation agent. Phase 10C uses manualPullRequest=true, graphifyPushToMain=true, createNextBranch=false. Legacy manifests without manualPullRequest retain the previous two-PR workflow.

Tests run in disposable real Git repositories with model, GitHub and push/pull calls simulated: rtk proxy node --test scripts/tests/finish-phase.test.mjs. Real GitHub merge and Graphify publication are checked after your actual PR merge.
