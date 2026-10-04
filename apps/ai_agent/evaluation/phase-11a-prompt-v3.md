# Phase 11A evidence-first prompt and explicit re-scoring

Implemented on 2026-10-04. Prompt version: `phase-11a-v3`. No real model calls were
made during implementation. The separately requested [V6 development capture](phase-11a-baseline-v6/README.md)
then passed the complete advisory gate at **16/16 accepted**, with 16/16 retrieval,
zero safety violations and 30/30 probes. The same V6 outputs score **12/16** under
the original frozen contract, which still fails on four routing mismatches. V5
remains unchanged at 10/16 frozen and 14/16 advisory acceptance.

## Prompt change

The current prompt prioritizes structured provider, phase, status/outcome, attempt
history, validation and missing evidence. It treats ordinary error descriptions
as bounded hypotheses and runbooks as procedural guidance. Instruction-like error
or payload text cannot supply incident facts or override observed evidence.

It distinguishes credentials/authentication/permissions from connection refusal,
timeouts and transport faults. Sensitive-field markers require redaction and do
not establish a root cause. An SDK-result handling defect requires evidence that
an SDK failure was mishandled or recorded as success. The generic F10 example in
the old instructions is removed from the active prompt.

When no particular cause is supported, the prompt asks for `unknown`, low
confidence, explicit missing distinctions, and insufficient-evidence abstention.
Unknown or contradictory delivery still takes precedence with the existing
`outcome_unknown/abstained/escalate` route. A supported fault family remains
separate from delivery uncertainty. All seven existing proposal mappings are
restated; simulated evidence cannot support replay.

These are general instructions, with no security scenario IDs, fixture IDs or
specific expected fault labels in the active instruction text. Captured evidence
and retrieved runbook metadata remain data, including their existing taxonomy
metadata; no expected diagnosis or evaluation label is added.

For the injected-error failure pattern, instruction text no longer supplies a
supposed SDK incident, and an unsupported classification should become uncertainty.
For the credential failure pattern, rejected credentials support a bounded
authentication hypothesis; unknown delivery or redaction markers do not justify
an invented transport failure. The subsequent V6 capture returned low-confidence
`unknown` for S02 and low-confidence F03 for S03, both with safe unknown-delivery
abstention. One small development capture does not establish prompt causality or
reliability on unseen cases.

## Compatibility and evaluator change

`prompts.ts` retains both historical instruction variants byte-for-byte when
explicitly building `phase-6-v1` or `phase-11a-v2` prompts. Adding the V3 tag to the
result and capture-manifest version enums is the only supporting contract change;
the output fields, proposal mappings and deterministic guardrails are unchanged.
Every one of the 20 V4 and 16 V5 invocation prompt hashes still reconstructs.

The existing separately authorized advisory-v2 rules already accept supported
F01/F02 engineering escalation and F04 owner configuration repair. No new label
exceptions or policy changes were needed. `evaluateExperiment` now accepts an
optional scoring contract, and the offline CLI honors its already parsed
`--acceptance-contract` option. Without an override, evaluation uses the recorded
contract, falling back to frozen-v1 for historical manifests without a contract.
Loading always validates and reproduces the recorded report first.

With an explicit override, the console output identifies the recorded and selected
contracts and shows **both** assessments of the same outputs. Optional output files
use exclusive creation; the recorded manifest, observations and reports are not
replaced. The console's `reproduced: true` means the recorded capture validated;
an override is a separate assessment, not a change to the captured result.

```powershell
bun run apps/ai_agent/src/evaluation/model-experiment.ts evaluate --experiment <validated-LF-copy-of-V5> --acceptance-contract advisory-v2 --output apps/ai_agent/evaluation/local/advisory-rescore
```

Windows Git checkout has changed the original artifacts' line endings to CRLF.
The prior audit created ignored LF copies which validate all seven original hashes.
This verification used `apps/ai_agent/evaluation/local/v5-audit-icpFnO`; its original
manifest and report are unchanged. The direct checked-in baseline still correctly
fails original-byte validation until evaluated through a separate LF copy.
No artifact hash or stored JSON value was edited to bypass validation.

## Verification

- Relevant nine-file regression run: **99 passed, one PostgreSQL integration skip,
  one existing failure**, 484 assertions. The only failure remains `V4 frozen
  artifacts still reproduce under their original prompt and acceptance contract`,
  with `Artifact hash mismatch: cases.json`, caused by the CRLF checkout. This suite
  is not reported as passing.
- Final prompt-wording check: all three focused prompt tests passed. Tests cover
  general evidence/cause instructions, malicious values retained only in input
  data, missing disclosures, required unknown-delivery routing, proposal mappings,
  absence of case-specific fault labels, and all V4/V5 captured prompt hashes.
- Evaluator tests verify explicit contract overrides produce the existing F01/F02/F04
  acceptance differences without mutating the experiment. CLI tests check both
  scores, the historical frozen fallback, invalid-contract rejection, and unchanged
  manifest/report bytes after re-scoring.
- Actual offline V5 re-scoring reproduced frozen **10/16** and advisory **14/16**,
  both complete with zero safety violations. No V3 model output was substituted.
- Final root `bun run check-types` and `bun run build`: passed. Frontend build was
  cached; existing build warnings remain.
- Root `bun run lint`: failed with the exact documented **9 frontend errors and
  22 warnings**. All 31 normalized diagnostic rows match `phase-11a-handoff.md`;
  frontend source has no diff. This is a baseline failure, not a lint pass.
- Dataset, frozen V5 artifacts, original evaluator checks, graph safety and replay
  policy have no changes. The prior 54-file audit inventory differs only at the
  three deliberately modified source paths below; all remaining bytes are unchanged.

Bun verification required approved execution outside the sandbox because it could
not read the working directory inside it. Tests and evaluation remained offline.
The old audit's strict source-freeze check is intentionally expected to reject this
new source version; its frozen record remains historical and was not updated.

## Phase implementation

- `apps/ai_agent/src/prompts.ts` — new general prompt; preserves historical variants.
- `apps/ai_agent/src/contracts.ts` — accepts the V3 prompt-version tag.
- `apps/ai_agent/src/evaluation/model-experiment.ts` — V3 manifest tag and explicit
  offline contract selection, with both scores visible.
- `apps/ai_agent/tests/prompts.test.ts` — new focused prompt and historical-hash tests.
- `apps/ai_agent/tests/advisory-regression.test.ts` — explicit override/nonmutation check.
- `apps/ai_agent/tests/model-experiment.test.ts` — offline CLI re-scoring regression.

## Learning comments

None. The new prompt comment explains historical reproduction, not a learning lesson.

## Documentation

- `apps/ai_agent/evaluation/phase-11a-prompt-v3.md` — this verification and handoff.

## Excluded or uncertain

Pre-existing uncommitted paths remain excluded:

- `apps/ai_agent/evaluation/phase-11a-v5-audit/` — previous turn's six-file audit.
- `graphify-out/cache/last_query_stamp`
- `graphify-out/cache/semantic/pa567fc138e3a/42b6bf915e3861637d640aedc363be01f9372def65db989bfc60112b2f241977.json` — pre-existing deletion.
- `graphify-out/cache/stat-index.json`
- `graphify-out/2026-09-30/`
- `graphify-out/memory/query_20260923_064129_82e4530f_start_phase_3c_durable_dlq_publication_and_reconci.md`
- `graphify-out/memory/query_20260927_180846_f1f93e82_oh_but_my_idea_for_this_prj_dlq_system_was_like_in.md`
- `rtk/`

Ignored local LF copies, offline re-score reports, scripts and verification logs
also stay excluded. No credentials or real model output from a new run were created.

```powershell
git add -- "apps/ai_agent/src/prompts.ts" "apps/ai_agent/src/contracts.ts" "apps/ai_agent/src/evaluation/model-experiment.ts" "apps/ai_agent/tests/prompts.test.ts" "apps/ai_agent/tests/advisory-regression.test.ts" "apps/ai_agent/tests/model-experiment.test.ts" "apps/ai_agent/evaluation/phase-11a-prompt-v3.md"
```

Suggested commit subject: `fix(ai-agent): prioritize diagnosis evidence and expose advisory re-scoring`.
Graphify required: **no**, for this bounded prompt/evaluator change. No staging,
commit, push, branch switch or Graphify regeneration was performed.
Next separately requested implementation or measurement: Sol at medium effort;
real-model measurement still requires explicit authorization.
