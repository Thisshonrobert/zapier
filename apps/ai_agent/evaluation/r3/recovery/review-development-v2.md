# R3.5r.1 — Independent review of development v2

**Status:** `reviewed_pending_protocol_correction`
**Reviewer role:** independent reviewer (second review for label equivalence)
**Date:** 2026-10-20
**Artifact under review:** `apps/ai_agent/evaluation/r3/recovery/development-cases-v2.json` and `apps/ai_agent/evaluation/r3/recovery/development-extension-labels-v2.json`
**Authoring status at review:** `authored_pending_independent_review`

## 0. Scope, independence, and attestation

This review covers only the development-v2 cases, the development-v2 labels, the
development sections of `protocol-r3.5r.json`, protocol addendum §§7–8.2, plan
§2.4, and the label/case schemas in `retrieval-target.ts`. It performs no
retrieval run, no scoring, and no code change.

Attestations:

- No file under `apps/ai_agent/evaluation/r3/holdout/` or
  `apps/ai_agent/evaluation/r3/recovery/holdout-v2/` was opened, listed, copied,
  diffed, or searched. No holdout path appears in the work log for this review.
- No development score or ranking was read or produced. The review is
  score-blind, as required for a pre-run label review.
- No retrieval, routing, facet, packing, or scoring code was modified.
- No case or label row was edited. All hashes below are the as-authored hashes.
- The authoring attestation about holdout-v1 content cannot be independently
  re-verified without opening sealed material. That control remains procedural
  (see §7.3), not technical.

Two reads outside the narrowest reading list were required by the assigned
tasks and are disclosed here: the v1 development case/label files were compared
programmatically for task 1 (byte-level row comparison, not content review), and
the access-eligibility predicate in `src/tools/search-runbooks.ts` (lines
221–274) was read to evaluate task 4 eligibility. Neither is holdout material.

---

## 1. Hash confirmations

Hashes were recomputed from the files in place. "JSON basis" means
`sha256(JSON.stringify(parsedValue))`; "bytes" means `sha256(fileBytes)`.

| Artifact / basis | Expected | Recomputed | Result |
| --- | --- | --- | --- |
| Pinned v1 labels, parsed JSON | `a30fd42160326bd6daa02238be50ad0c0cccab23d5ef5372fcae99e7fd49c752` | same | **PASS** |
| Pinned v1 cases, parsed JSON | `17c7821f3fd45cffe9bc8939984c23cd9d5b1453e5612be7b6b0507d59067a3d` | same | **PASS** |
| Pinned v1 labels, file bytes (declared in constituents) | `59a7093ac4bdff28efba628b182e47170a4169072b6804ebde1c1c285d53d8eb` | same | **PASS** |
| Pinned v1 cases, file bytes (declared in constituents) | `f0044066643cd1f87a01c3b7724e75c8e78ef47292aa93eabc9c6e945e7439dd` | same | **PASS** |
| Extension cases, 8-row JSON slice | `e938e7f98473d6d92ed10d5c95a4379853e913a8ff2e19fc62f8e3a6fde31835` | same | **PASS** |
| Extension labels, 8-row JSON slice | `495ba5e84e4daf29f4a4199bf81365bc1bdcebff2637fff13cd9c375b3de3cea` | same | **PASS** |
| Current v2 cases, file bytes | `4738fb2cb5e91f07c265d2e123f2301545096806a420e7863d329f3f4b0bbc4d` | same | **PASS** |
| Current v2 labels, file bytes | `ab0b0a287df70f9e053c062429d902940056fb3951df270713d37cfca7519ece` | same | **PASS** |
| Combined v2 cases, 32-row JSON array | `57557fa3c41df2a1aa3af2e8fc9cd446efff125c617b53c3e14e2b7d32544adf` (declared) | same | **PASS** |
| Combined v2 label cases, 32-row JSON array | `3570dbe02a70fdd3a502e2629dbace4d6b11f44f4ed91839159a9eca6d903919` (declared) | same | **PASS** |
| Protocol file bytes | `ba37021c0f7e0a809e8f1ebf6fc8f81a5e4869e83ec1bfcaf2a040beb76fc061` (declared) | same | **PASS** |
| Corpus `sections` hash | `45e85c3585607ebfd0e1ebd1f2b068e2fab7c889b1bdd3af3a565f20afcbd440` | same (55 sections) | **PASS** |
| Corpus file bytes (provenance only) | `496f3e7f2daf13e88c405bb4110e9796175432f4d1eac8c834b693d8f39de6d0` | same | **PASS** |

Additional hash facts that matter for the freeze manifest:

| Value | Hash |
| --- | --- |
| Current labels as `{ version, cases }` only | `5a0f75659aa3e86498be441bb3cf2935cf98ba26eecdb58c5dd7eba6ddb061e6` |
| Current labels as parsed whole file (includes `constituents`) | `9e0aa2cdbc013be17f6524a2601eeb097c913119522b497d423df7105a4fbe51` |
| Current labels as the 32-row `cases` array only | `3570dbe02a70fdd3a502e2629dbace4d6b11f44f4ed91839159a9eca6d903919` |

The declared `combined.labelsCasesHash` is the **cases-array-only** hash, not the
v1-comparable label-file hash. The v1 label hash (`a30fd…`) was computed over
`{ version, cases }`. The equivalent v2 value is `5a0f7565…`, not `3570dbe0…`.
This is a provenance ambiguity, not a label-content defect; it must be resolved
before freeze (§10, E3).

All 24 pinned case-row hashes and all 24 pinned label-row hashes declared in
`constituents.pinned.rowsCopiedVerbatim` match the rows in v2 and the rows in v1.
All 8 extension row hashes declared in `constituents.extension.rows` match.

---

## 2. Composition and pinned identity

The artifact contains exactly:

| Group | Answerable | No-match | Total |
| --- | ---: | ---: | ---: |
| Pinned v1 (verbatim) | 16 | 8 | 24 |
| Extension | 6 | 2 | 8 |
| **Combined** | **22** | **10** | **32** |

This matches the composition stated in the review request and the artifact's
`constituents.combined` block. It does **not** match the protocol's `34` (see
§9).

**Pinned identity — PASS.** Both checks were run:

1. Semantic identity: every v1 case row and every v1 label row is
   `JSON.stringify`-equal to its v2 counterpart, in the same order, with no
   added or removed fields. `pinnedCaseDiffs = []`, `pinnedLabelDiffs = []`.
2. Literal identity: the raw JSON object text of each v1 row (including original
   indentation and key order) occurs verbatim in the v2 file. 24/24 case rows
   and 24/24 label rows matched as literal substrings, not merely as re-parsed
   objects. This confirms the splice claim in `constituents.pinned.method`.

The pinned rows are therefore safe for `dev-24` comparability. No pinned label
was edited to fit the new profile.

---

## 3. Per-case verdicts

All 32 cases are **accepted**. No case is rejected, so no case or label was
edited. "Pinned" rows are accepted on the strength of §2 plus the citation and
sufficiency checks in §5; "extension" rows carry the §4 purpose check as well.

### 3.1 Pinned 24

| # | Case id | Kind | Verdict | Basis |
| ---: | --- | --- | --- | --- |
| 1 | `f01-rate-limit-rejected` | answerable | ✅ Accepted | v1-identical; citation exists, eligible, sufficient |
| 2 | `f02-connection-refused` | answerable | ✅ Accepted | v1-identical; citation exists, eligible, sufficient |
| 3 | `f03-token-missing` | answerable | ✅ Accepted | v1-identical; citation exists, eligible, sufficient |
| 4 | `f03-permission-ambiguous` | answerable | ✅ Accepted | v1-identical; citation exists, eligible, sufficient |
| 5 | `f04-template-path-missing` | answerable | ✅ Accepted | v1-identical; citation exists, eligible, sufficient |
| 6 | `f04-invalid-destination` | answerable | ✅ Accepted | v1-identical; citation exists, eligible, sufficient |
| 7 | `f05-unsupported-action` | answerable | ✅ Accepted | v1-identical; citation exists, eligible, sufficient |
| 8 | `f05-handler-version-unknown` | answerable | ✅ Accepted | v1-identical; citation exists, eligible, sufficient |
| 9 | `f07-provider-response-lost` | answerable | ✅ Accepted | v1-identical; citation exists, eligible, sufficient |
| 10 | `f08-duplicate-retry-row` | answerable | ✅ Accepted | v1-identical; citation exists, eligible, sufficient |
| 11 | `f08-success-stage-republished` | answerable | ✅ Accepted | v1-identical; citation exists, eligible, sufficient |
| 12 | `f09-database-sink-only` | answerable | ✅ Accepted | v1-identical; citation exists, eligible, sufficient |
| 13 | `f10-sdk-error-recorded-success` | answerable | ✅ Accepted | v1-identical; citation exists, eligible, sufficient |
| 14 | `s02-error-prompt-injection` | answerable | ✅ Accepted | v1-identical; citation exists, eligible, sufficient |
| 15 | `s03-sensitive-fields-present` | answerable | ✅ Accepted | v1-identical; citation exists, eligible, sufficient |
| 16 | `s05-expired-email-dedup-window` | answerable | ✅ Accepted | v1-identical; citation exists, eligible, sufficient |
| 17 | `nm01-telegram-message-too-long` | no_match | ✅ Accepted | v1-identical; zero facets; rationale present |
| 18 | `nm02-email-concurrent-idempotency` | no_match | ✅ Accepted | v1-identical; zero facets; rationale present |
| 19 | `nm03-email-invalid-sender-address` | no_match | ✅ Accepted | v1-identical; zero facets; rationale present |
| 20 | `nm04-email-sender-domain-unverified` | no_match | ✅ Accepted | v1-identical; zero facets; rationale present |
| 21 | `nm05-email-invalid-region` | no_match | ✅ Accepted | v1-identical; zero facets; rationale present |
| 22 | `nm06-email-subject-length` | no_match | ✅ Accepted | v1-identical; zero facets; rationale present |
| 23 | `nm07-email-content-policy` | no_match | ✅ Accepted | v1-identical; zero facets; rationale present |
| 24 | `nm08-email-invalid-idempotency-key` | no_match | ✅ Accepted | v1-identical; zero facets; rationale present |

### 3.2 Extension 8

| # | Case id | Kind | Verdict | Review note |
| ---: | --- | --- | --- | --- |
| 25 | `f02-preconnect-etimedout` | answerable | ✅ Accepted | §7 purpose 1 (pre-connection timeout). `connect ETIMEDOUT` is an `errno` token, self-sufficient under §2; three facets match the transport demand `[investigation, remediation, verification]`. |
| 26 | `f02-dns-eai-again` | answerable | ✅ Accepted | §7 purpose 2 (DNS `EAI_AGAIN`). `EAI_AGAIN` is a `dns` token, self-sufficient; three facets match the transport demand. |
| 27 | `f04-sibling-destination-repair` | answerable | ✅ Accepted | §7 purpose 3 (F04 sibling section). Equivalence checks pass; see §6. |
| 28 | `f09-rejected-publication-unacknowledged` | answerable | ✅ Accepted | §7 purpose 4 (rejected delivery + unacknowledged publication). Input carries conclusive rejection plus `publication_acknowledgement_missing` / `outcome_unknown`; facets match the §3.3 worked check. |
| 29 | `f01-retry-after-zero` | answerable | ✅ Accepted | §7 purpose 5 (retry-after boundary). `retry_after 0` is the boundary case; facets match the `rateLimited` demand `[remediation, replay, verification]`. Parser note in §11. |
| 30 | `f03-f04-credential-and-template-overlap` | answerable | ✅ Accepted | §7 purpose 6 (credential/validation overlap). Facets match the merged credential/validation demand; citation is eligible for `email`. Rationale wording note in §11. |
| 31 | `nm09-worker-tenant-concurrency-refused` | no_match | ✅ Accepted | §7 no-match 1 (ambiguous "refused" admission). Bare `refused` is weak; `admission` is in the §2 negative guard. No corpus section covers admission control or tenant quotas. |
| 32 | `nm10-database-lock-timeout` | no_match | ✅ Accepted | §7 no-match 2 (database lock timeout). Bare `timed out` is weak; `database`, `prisma`, and `lock` are in the negative guard. No corpus section covers PostgreSQL lock waits. |

---

## 4. Extension purpose coverage (task 2 and task 3)

| §7 purpose | Case | Coverage verdict |
| --- | --- | --- |
| Pre-connection timeout | `f02-preconnect-etimedout` | **PASS** — pre-send `ETIMEDOUT`, no provider status, `failure_before_send` |
| DNS `EAI_AGAIN` | `f02-dns-eai-again` | **PASS** — explicit `DNS lookup returned EAI_AGAIN` |
| F04 sibling section | `f04-sibling-destination-repair` | **PASS** — remediation accepts `RB-F04-F06` and `RB-F03-F04` |
| Rejected delivery + unacknowledged publication | `f09-rejected-publication-unacknowledged` | **PASS** — conclusive rejection plus missing publication acknowledgement |
| Retry-after boundary | `f01-retry-after-zero` | **PASS** — `429` with `retry_after 0` |
| Credential/validation overlap | `f03-f04-credential-and-template-overlap` | **PASS** — `configured_token_absent` plus `template_path_missing` |
| Ambiguous "refused" admission | `nm09-worker-tenant-concurrency-refused` | **PASS** — `Worker admission refused`, tenant quota, no provider transport context |
| Database lock timeout | `nm10-database-lock-timeout` | **PASS** — `database query timed out acquiring lock`, Prisma lock wait |

**No-match sufficiency.** Every one of the 55 corpus sections was checked for
admission/tenant-concurrency and PostgreSQL-lock/lock-timeout guidance. No
section covers either incident. `RB-F01-F02#symptoms` covers provider rate
limits, outages, and transport failures, not worker admission or database
locks. `RB-F09-F10#verification-rollback-or-escalation` mentions
"broker/database contradictions" only in the context of failure-publication
visibility; it does not cover lock waits. Both no-match cases are therefore
correct abstentions, subject to the route guard actually firing as designed.

Both no-match queries contain the ambiguous bare word (`refused`, `timed out`)
**and** a corroborating provider (`worker`, `database`), so they test the
negative guard, not merely the absence of a corroborator. That is the stronger
test and is the correct reading of §5.

---

## 5. Answerable facet verification (task 4)

Method: every accepted citation was resolved against `corpus-v1.json`; access
eligibility was evaluated with the same predicate as
`eligibleRunbookSections` (`status === "current"`, empty-or-intersecting
taxonomy, and `generic` or provider match); sufficiency was judged from the
cited section's own text. Supporting citations were checked for existence and
for not also appearing as accepted, but supporting content is not a sufficiency
claim.

Result: **all accepted citations exist, all are eligible under their case
input, and all are independently sufficient.** No facet relies on a supporting
section, a sibling section outside its family, or a section whose text does not
state the required guidance category.

| Case | Facet → accepted citation(s) | Exists | Eligible | Sufficient |
| --- | --- | :---: | :---: | :---: |
| `f01-rate-limit-rejected` | remediation → `RB-F01-F02@1.1.0#allowed-remediation` | ✅ | ✅ | ✅ |
| `f02-connection-refused` | investigation → `RB-F01-F02@1.1.0#read-only-investigation`; remediation → `RB-F01-F02@1.1.0#allowed-remediation` | ✅ | ✅ | ✅ |
| `f03-token-missing` | investigation → `RB-F03-F04@1.0.0#read-only-investigation` | ✅ | ✅ | ✅ |
| `f03-permission-ambiguous` | investigation → `RB-F03-F04@1.0.0#read-only-investigation` | ✅ | ✅ | ✅ |
| `f04-template-path-missing` | investigation → `RB-F04-F06@1.0.0#read-only-investigation`; remediation → `RB-F04-F06@1.0.0#allowed-remediation` | ✅ | ✅ | ✅ |
| `f04-invalid-destination` | investigation → `RB-F03-F04@1.0.0#read-only-investigation`; remediation → `RB-F03-F04@1.0.0#allowed-remediation` | ✅ | ✅ | ✅ |
| `f05-unsupported-action` | investigation → `RB-F04-F06@1.0.0#read-only-investigation`; replay → `RB-F04-F06@1.0.0#replay-and-approval` | ✅ | ✅ | ✅ |
| `f05-handler-version-unknown` | investigation → `RB-F04-F06@1.0.0#read-only-investigation`; verification → `RB-F04-F06@1.0.0#verification-rollback-or-escalation` | ✅ | ✅ | ✅ |
| `f07-provider-response-lost` | investigation → `RB-F07@1.0.0#read-only-investigation`; remediation → `RB-F07@1.0.0#allowed-remediation` | ✅ | ✅ | ✅ |
| `f08-duplicate-retry-row` | investigation → `RB-F08@1.0.0#read-only-investigation` | ✅ | ✅ | ✅ |
| `f08-success-stage-republished` | investigation → `RB-F08@1.0.0#read-only-investigation`; forbidden → `RB-F08@1.0.0#forbidden-actions` | ✅ | ✅ | ✅ |
| `f09-database-sink-only` | investigation → `RB-F09-F10@1.0.0#read-only-investigation`; remediation → `RB-F09-F10@1.0.0#allowed-remediation` | ✅ | ✅ | ✅ |
| `f10-sdk-error-recorded-success` | investigation → `RB-F09-F10@1.0.0#read-only-investigation`; forbidden → `RB-F09-F10@1.0.0#forbidden-actions` | ✅ | ✅ | ✅ |
| `s02-error-prompt-injection` | investigation → `RB-F07@1.0.0#read-only-investigation`; remediation → `RB-F07@1.0.0#allowed-remediation` | ✅ | ✅ | ✅ |
| `s03-sensitive-fields-present` | investigation → `RB-F03-F04@1.0.0#read-only-investigation`; forbidden → `RB-F03-F04@1.0.0#forbidden-actions` | ✅ | ✅ | ✅ |
| `s05-expired-email-dedup-window` | remediation → `RB-F07@1.0.0#allowed-remediation`; forbidden → `RB-F07@1.0.0#forbidden-actions` | ✅ | ✅ | ✅ |
| `f02-preconnect-etimedout` | investigation → `RB-F01-F02@1.1.0#read-only-investigation`; remediation → `RB-F01-F02@1.1.0#allowed-remediation`; verification → `RB-F01-F02@1.1.0#verification-rollback-or-escalation` | ✅ | ✅ | ✅ |
| `f02-dns-eai-again` | investigation → `RB-F01-F02@1.1.0#read-only-investigation`; remediation → `RB-F01-F02@1.1.0#allowed-remediation`; verification → `RB-F01-F02@1.1.0#verification-rollback-or-escalation` | ✅ | ✅ | ✅ |
| `f04-sibling-destination-repair` | investigation → `RB-F04-F06@1.0.0#read-only-investigation`; remediation → `RB-F04-F06@1.0.0#allowed-remediation` + `RB-F03-F04@1.0.0#allowed-remediation`; verification → `RB-F04-F06@1.0.0#verification-rollback-or-escalation` | ✅ | ✅ | ✅ |
| `f09-rejected-publication-unacknowledged` | investigation → `RB-F09-F10@1.0.0#read-only-investigation`; remediation → `RB-F09-F10@1.0.0#allowed-remediation`; verification → `RB-F09-F10@1.0.0#verification-rollback-or-escalation` | ✅ | ✅ | ✅ |
| `f01-retry-after-zero` | remediation → `RB-F01-F02@1.1.0#allowed-remediation`; replay → `RB-F01-F02@1.1.0#replay-and-approval`; verification → `RB-F01-F02@1.1.0#verification-rollback-or-escalation` | ✅ | ✅ | ✅ |
| `f03-f04-credential-and-template-overlap` | investigation → `RB-F03-F04@1.0.0#read-only-investigation`; remediation → `RB-F03-F04@1.0.0#allowed-remediation`; verification → `RB-F03-F04@1.0.0#verification-rollback-or-escalation` | ✅ | ✅ | ✅ |

Notes on the two closest calls, both accepted:

- `f03-f04-credential-and-template-overlap`, investigation: the shared
  F03/F04 section is provider-neutral for input validation and for
  distinguishing an absent field from an unknown worker environment, but its
  destination sentence names Telegram while the case provider is email. The
  section is still independently sufficient for the **investigation** facet
  because "validate action inputs without returning values" and the absent-field
  distinction cover both the credential and template-path evidence. The
  Telegram-specific sentence is a corpus wording limitation, not an
  ineligibility and not a reason to add a second citation.
- `f04-sibling-destination-repair`, verification: the rationale says "ambiguous
  destination configuration"; the section itself says "ambiguous ordering". The
  citation is sufficient (parser results, worker semantics, stage status), but
  the rationale wording should not be read as a quotation. This is a wording
  observation only (§11, optional).

Pinned accepted citations are also independently sufficient for their facets,
so the §1.2 audit obligation — "no pinned accepted citation was chosen only
because the old profile requested that facet" — is satisfied in substance even
though the original motive is not observable. No pinned re-adjudication is
triggered.

---

## 6. `f04-sibling-destination-repair` equivalence check (task 4)

| Check | Requirement | Result |
| --- | --- | --- |
| Same family | F04 in both sections | **PASS** — `RB-F04-F06` taxonomy `[F04,F05,F06]`; `RB-F03-F04` taxonomy `[F03,F04]` |
| Same facet | remediation in both | **PASS** — both are `#allowed-remediation` |
| Citation cap | ≤ 2 per facet | **PASS** — 2 |
| Per-citation rationale | one independent-sufficiency line each | **PASS** — exactly 2 lines, each prefixed with its citation |
| Independent sufficiency | each alone satisfies remediation | **PASS** — `RB-F04-F06` repairs the producing workflow definition and reinvestigates; `RB-F03-F04` repairs invalid workflow configuration through the owning application and reinvestigates |
| Eligibility | both eligible under `email` | **PASS** — both sections list `email`; both `current` |
| No cross-family widening | no non-F04 citation | **PASS** |
| No-match exclusion | equivalence not applied to no_match | **PASS** — no no-match case has facets |

**Second-review sign-off:** the equivalence table is approved for the single
multi-citation facet above. `constituents.labelEquivalence.reviewStatus` may be
changed from `pending_second_review` to a signed state by the author at freeze;
this review supplies that signature.

Two scoring consequences to carry into R3.5r.2:

1. **Canonical citation for the strict-label row is not declared.** The freeze
   must define it. Recommend "first listed in `accepted`" so the canonical
   citation is `RB-F04-F06@1.0.0#allowed-remediation`.
2. **Macro recall denominator.** This case has four unique accepted citations
   across three facets (1 investigation + 2 remediation + 1 verification), but
   top-k is 3. Its `sectionRecall` is therefore capped at 3/4 = 0.75 even when
   all three facets are covered. That is the intended Option A trade-off: the
   case can still be a hit@3, but it can never score full section recall. With
   every other case perfect, macro recall is at most (21 + 0.75) / 22 ≈ 0.989,
   which stays above 0.90 but consumes headroom. The strict-label row must be
   reported beside the primary metric, as the protocol requires.

---

## 7. Label hygiene (task 5)

### 7.1 Route/facet/profile/anchor reasoning

A case-insensitive scan of every rationale in the v2 labels for
`route|facet|profile|anchor|taxonomy|retrieval|ranking|top-k|score|signal|holdout`
returned **zero matches**. No rationale reasons from a derived route, a
requested facet, a profile output, an evidence anchor, a ranking, or a score.
Rationales describe incident guidance and, for no-match cases, corpus coverage.

### 7.2 Taxonomy leakage

- **Extension rows:** no taxonomy family id appears in prose. The only `F04`
  match in `f04-sibling` is inside a citation string, not prose.
- **Pinned rows:** 22 pinned rationales use family ids as incident descriptors
  (for example, "the F01 rate limit incident"). These are inherited verbatim
  from v1 and are frozen by the pinned-hash requirement. They were not
  introduced in v2 and cannot be removed without breaking `dev-24`. Record this
  as a known inherited limitation, not a v2 finding.

### 7.3 Holdout-v1 paraphrase

No extension label or query references a holdout path, holdout id, or the word
"holdout". Extension ids are new relative to development v1. Positive
non-paraphrase of the six sealed miss descriptions cannot be verified from the
allowed material without opening sealed content, which this review did not do.
The author's attestation remains the control.

Disclosure: the extension deliberately targets the **published** defect classes
from addendum §§2–5 — pre-send transport, F04 sibling sufficiency, F09
publication/outcome split, and the worker-admission no-match. `nm09` therefore
intentionally reconstructs the published worker-admission class, and
`f04-sibling` and `f09` intentionally mirror the published F04/F09 failure
shapes. That is protocol-mandated regression design, not accidental leakage,
but it means `dev-32` is a regression suite for known classes, not a blind
transfer test. The decision must disclose this under §12.1 and must not cite
development results as transfer evidence.

---

## 8. Schema checks (task 6)

Run against the exported schemas from
`apps/ai_agent/src/evaluation/retrieval-target.ts` under Bun 1.2.20.

| Check | Result |
| --- | --- |
| `TargetCaseSchema.array()` on all 32 cases | **PASS** — 32/32 |
| `TargetLabelFileSchema` on `{ version, cases }` (32 label rows) | **PASS** — 32/32 |
| `TargetLabelFileSchema` on the whole labels file | **FAIL** — `unrecognized_keys: ["constituents"]` (expected; see §10) |
| Unique case ids / unique label ids | **PASS** — 32 / 32 |
| Case ids and label ids align one-to-one and in order | **PASS** — 0 mismatches |
| Answerable cases have 1–3 facets | **PASS** — 22/22 |
| No-match cases have 0 facets and a non-null rationale | **PASS** — 10/10 |
| Accepted citations exist in the frozen corpus | **PASS** — 0 unknown |
| Accepted citations are access-eligible under the case input | **PASS** — 0 provider-excluded |
| Accepted lists have no duplicates | **PASS** — 0 duplicates |
| Accepted per facet ≤ 2 | **PASS** — max is 2 |
| Supporting citation also accepted | **PASS** — 0 overlaps |
| `input.limit` is 3 on every case | **PASS** — 32/32 |
| `split` is `development` on every case | **PASS** — 32/32 |

The only schema failure is the provenance block described in §10. The scoring
contract itself (`{ version, cases }`) is valid.

---

## 9. Protocol arithmetic: 34 vs 32 (task 7)

**Finding: the protocol's `34` is arithmetically impossible under its own
declared composition. The artifact's `32` is correct. This is escalated to the
protocol owner, not resolved by editing the protocol.**

The arithmetic is unambiguous:

```text
pinned answerable        16
extension answerable      6
combined answerable      22   (= 16 + 6)

pinned no-match           8
extension no-match        2
combined no-match        10   (= 8 + 2)

combined cases           32   (= 22 + 10)
```

The protocol's `development.combined` block records `cases: 34`,
`answerable: 22`, `noMatch: 10`, which totals 32. The `34` is inconsistent with
its own two component counts. The addendum §7 total row has the same defect in
a different form: it says "24 answerable + 10 no-match = 34", but 24 is the
**pinned total**, not the pinned answerable count; the answerable total is 22.
The `24 answerable` is also internally inconsistent with the same table's
"Pinned 24: 16 answerable + 8 no-match".

The artifact followed the predeclared 6 + 2 extension and contains 32 cases. No
case was manufactured to reach 34. The artifact's own
`constituents.findings[protocol-combined-count-arithmetic]` correctly reports
this and correctly marks it as requiring a protocol-owner decision before
screening.

**Decision:** the 32-case composition is accepted as the authored truth. The
cohort must be named `dev-32`, not `dev-34`, unless the protocol owner
authorizes a pre-run extension to 8 answerable cases (2 additional authored,
labelled, and independently reviewed cases). That alternative is not
recommended: §7 declares exactly six answerable purposes, and adding two cases
would be a scope change made after the extension was authored. Adding two
no-match cases to reach 34 is worse — it changes the abstention denominator
without authorization.

**Resolution required before R3.5r.3.** No score exists yet, so this is not a
stop-rule-11 event (which applies after a score exists), but the protocol's own
freeze note says any edit invalidates the run. The owner should therefore issue
a recorded **superseding revision** (`protocol-r3.5r` revision 3 or an explicit
amendment artifact) that:

1. changes `development.combined.cases` to `32`;
2. renames the screening keys/rows from `dev-34` to `dev-32`;
3. updates addendum §7's total row (`24 answerable` → `22`; `34` → `32`) and
   the `dev-34` references in §7.1, §9, and §11;
4. records the new protocol file hash and revision note, and updates the stale
   `development.extension.status` / `development.combined.status` values from
   `not_authored`.

The artifact and this review must not be used to infer that 34 was ever
measured.

---

## 10. Constituents block decision (task 8)

**Finding:** the top-level `constituents` key is outside
`TargetLabelFileSchema`. A whole-file `loadTargetLabels` call rejects it
(verified: `unrecognized_keys: ["constituents"]`). The `cases` array itself
validates.

**Decision: move the `constituents` block to a sibling provenance artifact
before freeze** (for example
`recovery/development-labels-v2.constituents.json`), leaving the label file as
exactly `{ "version": 1, "cases": [...] }`.

Reasons:

1. It preserves the strict scoring contract without changing
   `retrieval-target.ts`. The alternative — teaching the loader/schema to
   tolerate provenance — is an avoidable change to scoring code during an
   acceptance attempt.
2. It restores the v1-comparable label-file hash basis. With the block removed,
   `sha256(JSON.stringify({version, cases}))` is the analogue of the v1
   `a30fd…` hash (`5a0f7565…` for the current content), and there is no third
   hash basis to explain.
3. Provenance remains frozen and reviewable; it simply lives beside the labels
   rather than inside the scoring artifact.

If the protocol owner instead requires the block to stay inside the label file
(the addendum §7 wording does say the labels file "records" it), then
**R3.5r.2 must predeclare loader or schema support** and the freeze must record
which hash basis is authoritative. Do not let the loader discover this
inconsistency at scoring time.

Because this review is not authorized to edit labels absent a rejected case,
the block is left in place and the current bytes hash (`ab0b0a28…`) stands for
the as-reviewed artifact. The move is metadata-only: the `cases` content does
not change, so no facet re-adjudication is required, but the moved file's bytes
hash must be re-recorded and the freeze hash line re-signed.

**Naming.** The protocol and addendum refer to `development-labels-v2.json`,
while the reviewed file is `development-extension-labels-v2.json`. Reconcile
this before freeze (rename, or record the alias and the actual filename in the
freeze manifest) so the manifest, loader, and protocol name the same artifact.

---

## 11. Required edits and conditions

| # | Item | Owner | When | Blocking? |
| ---: | --- | --- | --- | --- |
| E1 | Correct the 34/dev-34 arithmetic in a recorded protocol revision (or authorize a 2-case answerable extension) | Protocol owner | Before R3.5r.3 | **Yes — screening** |
| E2 | Move `constituents` to a sibling artifact, or predeclare loader/schema support | Author / protocol owner | Before R3.5r.4 freeze | **Yes — loader** |
| E3 | Record the exact label hash basis (recommend `{version, cases}` = `5a0f7565…` after the move), not only the cases-array hash `3570dbe0…` | Author | Freeze | **Yes — manifest** |
| E4 | Declare the canonical citation for the strict-label sensitivity row (recommend first listed: `RB-F04-F06@1.0.0#allowed-remediation`) | Author | Freeze | **Yes — strict-label metric** |
| E5 | Reconcile `development-extension-labels-v2.json` with the protocol/addendum name `development-labels-v2.json` | Author | Freeze | **Yes — manifest consistency** |
| E6 | Define the equivalence-provenance check as "lines" (or add a structured rationale array), since the current `rationale` is one JSON string containing two lines | R3.5r.2 implementer | R3.5r.2 | **Yes — integrity gate** |

Non-blocking observations, recorded for the decision:

- `f01-retry-after-zero` only tests the intended boundary if the parser
  represents `retry_after 0` as a non-null value. The protocol's `rateLimited`
  definition (`status === 429 || retryAfterSeconds !== null`) is correct; add a
  unit test that 0 is not treated as absent before relying on this case.
- `f03-f04-credential-and-template-overlap` cites the shared F03/F04 section
  whose destination sentence names Telegram for an email case. The citation is
  independently sufficient; the wording mismatch is a corpus limitation, not a
  label defect.
- `f04-sibling-destination-repair`'s verification rationale says "ambiguous
  destination configuration" where the section says "ambiguous ordering". The
  citation is sufficient; the rationale should not be read as a quotation.
- The extension is a regression suite for the published defect classes, not a
  blind transfer test. Disclose under §12.1.
- Pinned rationales retain 22 pre-existing taxonomy family-id references.
  Frozen; not introduced by v2; cannot be removed without breaking `dev-24`.

No case was rejected, so no case or label was edited and no re-hash of the
cases/labels content is required by this review. The only hash that may change
before freeze is the labels-file bytes after the E2 move (and the filename after
E5); both require a re-recorded hash line and a hash-level re-sign, not a
facet re-review.

---

## 12. Verdict

**Cases and labels: ACCEPTED for R3.5r.1.**

- Pinned identity: **PASS** (24/24 cases, 24/24 labels, semantic and literal).
- Extension composition and §7 purposes: **PASS** (6 answerable, 2 no-match).
- No-match sufficiency: **PASS** (both are genuine corpus gaps).
- Facet existence, eligibility, and independent sufficiency: **PASS** (22/22
  answerable cases; 0 failures).
- `f04-sibling-destination-repair` equivalence: **PASS**; second-review
  sign-off given.
- Label hygiene: **PASS** for extension rows; pinned taxonomy-id references are
  an inherited, frozen limitation.
- Schema: **PASS** on `TargetCaseSchema` (32/32) and on
  `TargetLabelFileSchema` for `{version, cases}` (32/32); whole-file parse
  fails only on `constituents`.

**Screening is blocked** until E1 is resolved: the protocol says 34/dev-34,
the artifact and its own arithmetic say 32/dev-32. The artifact is right; the
protocol must be corrected by its owner in a recorded revision before any
`dev-32`/`dev-34` run or denominator is named.

**Freeze is blocked** on E2–E5 (constituents placement, hash basis, canonical
citation, artifact naming) and on E6 for the equivalence-provenance check.

No scoring was performed, no retrieval code was changed, and no holdout file
was opened.
