# R3.5-recovery — protocol addendum (PROPOSAL)

**Status: `proposal`.** Nothing here is authorized for implementation or for a run.
No code, corpus, label, config, or run directory has been changed. The runtime
default remains `minilm-original` and `RUNBOOK_RETRIEVAL_METHOD` is untouched.

Date: 2026-10-20
Supersedes (for the recovery attempt only): none. `apps/ai_agent/evaluation/r3/protocol.json`
and `r3/decision.md` stay immutable. This addendum introduces a *new* protocol and a
*new* acceptance event with its own artifacts and hashes.

Companion document: [`holdout-v2-authoring-plan.md`](./holdout-v2-authoring-plan.md).

**Revision log**

| Rev | Date | Change |
| --- | --- | --- |
| 1 | 2026-10-20 | Proposal as submitted. |
| 2 | 2026-10-20 | Approved. R3.5r.0 splits artifact freezing: `protocol-r3.5r.json` now, `selected-retrieval-config-r3.5r.json` at R3.5r.4 (it must record the dev label hash and dev run hashes, which do not exist yet). Corpus hash verified against `sections`, not file bytes (§1.2). |
| 3 | 2026-10-20 | Corrected the §7 arithmetic from 34/`dev-34` to 32/`dev-32` (22 answerable + 10 no-match), matching the pinned 24 + predeclared 6+2 extension and independent review `review-development-v2.md` §9/E1. No case was added. |

---

## 0. Authority, seal, and invariants

1. **The R3.5 holdout is consumed and permanently sealed.** No file under
   `apps/ai_agent/evaluation/r3/holdout/` — cases, labels, evidence, review,
   attestation, or run — may be opened, copied, diffed, paraphrased, re-scored,
   or used to author, select, or validate anything in this phase. Only the
   hashes and the aggregate failure ledger already published in
   `r3/decision.md` may be cited.
2. **No gate is lowered.** Every threshold in §8 is byte-equal to
   `selected-retrieval-config.json.releaseGate`, `protocol.json`, and plan §2.3.
   Integrity gates in §8.2 are additions, never substitutions.
3. **No tuning after a result exists.** The candidate is frozen (§10, R3.5r.3)
   before holdout-v2 is authored, and holdout-v2 is frozen before the single run.
4. **No case-identity keying.** No rule may consult case id, family name,
   scenario name, expected diagnosis, or a gold citation. Signals are derived
   from observed evidence fields only.
5. **Three changes are runtime; one is measurement.** Changes 1, 2, 4 alter
   retrieval behavior. Change 3 alters labelling/scoring only and must not
   change retrieval output for any input.
6. **Stop on conflict.** A finding that contradicts this addendum is reported,
   not silently resolved.

### 0.1 Why this is a new protocol and not a re-run

R3.5 ended `rejected` with six answerable misses and one no-match false
positive. The four post-hoc notes in `decision.md` §7 are the authorized
candidate scope. Because the fix is motivated by holdout-v1 outcomes, the
recovery attempt must be validated on holdout data that the *author of the fix*
never saw, and the fixture that demonstrated the defect (holdout-v1) must never
appear in the loop again. That is the entire justification for the second
holdout; it is not an opportunity to re-draw the yardstick.

---

## 1. Artifact disposition

Corpus hash rule: a runbook edit is a **stop**, not an edit. If a runbook must
change, the phase restarts at R3.0 with `corpus-v2.json`, a new parity test, a
new protocol, and re-adjudicated labels. Under the recommended corpus option
(§5, Option A) no runbook changes, so the frozen corpus hash is retained.

| Artifact | Current hash (R3.5) | Recovery disposition |
| --- | --- | --- |
| `corpus-v1.json` | `45e85c35…f20afcbd440` | **Unchanged.** Hash carried forward verbatim into the recovery config. |
| `protocol.json` | `e6a491cc…2290c3ed` | **Immutable.** Recovery uses `protocol-r3.5r.json` (new file, new hash). |
| `development-labels-v1.json` | `a30fd421…7fd49c752` | **Retained, hash unchanged.** Cases frozen inside v2 byte-identically; v1 file untouched. |
| `development-cases-v1.json` | not recorded in `decision.md` | **Retained, untouched.** Carried verbatim into v2. |
| `selected-retrieval-config.json` | `ab30434a…05ec68` | **Immutable.** Recovery uses `selected-retrieval-config-r3.5r.json`. |
| `holdout/*-v1.json` | `7fa54e7a…`, `2ed46c55…`, `55994aa6…`, `1e433af9…`, `7e472fc0…` | **Sealed.** Read-prohibited. Not copied, not referenced by content. |
| Development labels v2 | — | **New.** Pinned 24 verbatim + extension (`development-labels-v2.json`). |
| Holdout v2 artifacts | — | **New.** `recovery/holdout-v2/*`, authored per companion plan. |

### 1.1 Hash basis (verified at R3.5r.0)

`corpusHash` is `sha256(JSON.stringify(sections))`, not the SHA-256 of the file
bytes. Verified: `sectionsHash = 45e85c3585607ebfd0e1ebd1f2b068e2fab7c889b1bdd3af3a565f20afcbd440`
(55 sections), matching the declared `corpusHash`; the file-byte hash is
`496f3e7f2daf13e88c405bb4110e9796175432f4d1eac8c834b693d8f39de6d0` and is
recorded for provenance only. Parity tests must compare the `sections` hash.

### 1.2 Does the profile change invalidate the pinned development set?

**No — not the label content, and therefore not the pinned label hash.**

`requiredFacets` and `accepted` citations are judgements about the incident and
the frozen corpus. They describe what guidance a competent responder needs, not
what the old profile happened to request. A change to `routeEvidence`,
`requestedGuidanceFacets`, or `evidenceAnchors` therefore cannot make a gold
citation wrong. Re-hashing labels merely because the profile moved would
destroy the only fixed point the programme has.

Two consequences follow, and both are binding:

- **Do not edit any pinned label to fit the new profile output.** If a pinned
  case's derived facets no longer match its labels, that is a *screening
  finding*, reported as such. Editing the label to match the code converts the
  benchmark into a mirror of the implementation.
- **Re-screen, don't re-freeze.** The pinned 24 are re-scored under the new
  profile and reported as `dev-24`, in a new run directory. This preserves
  comparability with every earlier R3 development number.

The pinned set does need an **extension**, for an unrelated reason: it passed
80% while the candidate failed the holdout, which means the 24 cases do not
exercise the signal classes that broke. §7 adds 8 cases and produces
`development-labels-v2.json`. That is a superset, not a re-adjudication: the
original 24 rows are byte-identical, so `dev-24` remains computable.

The one audit obligation: during v2 authoring, confirm that no pinned accepted
citation was originally chosen *because* the old profile requested that facet
(rather than because the section is independently sufficient). If such a case
is found, it is re-adjudicated **only in v2**, with the reason recorded, and v1
stays untouched. No such finding is assumed.

---

## 2. Change 1 — R2 transport vocabulary as an F02 route signal

**Defect (v1).** `finalError` of `"timed out"` or `"DNS lookup returned
EAI_AGAIN"` produced no route hint at all. With no route, `decideSupport`
abstained on `no_observed_anchor`, and the requested facets defaulted to
`[investigation, evidence, remediation]` — no verification. Two holdout-v1 F02
cases were lost to this single gap.

**Design.** Replace the flat token regex
(`/\b(?:timeout|network|connection|refused)\b/`) with a closed, typed
vocabulary. A token's *class* decides whether it is sufficient on its own.

| Class | Tokens (closed set, case-insensitive) | Sufficient alone? |
| --- | --- | --- |
| `errno` | `ECONNREFUSED`, `ECONNRESET`, `ECONNABORTED`, `EPIPE`, `ETIMEDOUT`, `EHOSTUNREACH`, `ENETUNREACH` | yes |
| `dns` | `ENOTFOUND`, `EAI_AGAIN`, `EAI_NONAME`, `EAI_FAIL`, `getaddrinfo`, `name resolution`, `DNS lookup` | yes |
| `phrase` | `connection refused`, `connect refused`, `connection reset`, `socket hang up`, `TLS handshake`, `network unreachable`, `host unreachable` | yes |
| `weak` | `timed out`, `timeout`, `network`, `refused`, `reset` | **no** — needs a corroborator |

**Corroborators for `weak`** (any one): an observed `provider` or attempt
provider; an attempt `phase` in `{pre_send, connect, dns, resolve}`; a fixture
fact `failure_before_send` or `all_attempts_not_delivered`; `status !== null`.

**Negative guard.** A `weak` token never routes when the same error text names a
non-provider subsystem: `database|postgres|prisma|advisory|lock|queue
capacity|admission|scheduler|heap|out of memory`. This is the precision fix for
the worker-admission case, generalised beyond the word "refused".

**Reason strings stay bounded and typed**, never raw text:

```
final_error_transport:errno:econnrefused
final_error_transport:dns:eai_again
final_error_transport:phrase:connection refused
final_error_transport:weak:timed out+phase:pre_send
provider_status:503
fixture_fact:failure_before_send
```

**Not changed.** `status >= 500` routing and the existing fixture facts stay as
they are. Transport tokens are **not** added to `evidenceAnchors`: the support
gate already relaxes on route confidence, and widening anchors would be a
second, unmeasured change. One change, one effect.

**Tests (predeclared, written before implementation):**

| Test | Expectation |
| --- | --- |
| `"connect ETIMEDOUT"`, no status | route `F02`, reason `…:errno:etimedout` |
| `"timed out"`, provider `smtp`, phase `pre_send` | route `F02` |
| `"DNS lookup returned EAI_AGAIN"` | route `F02`, reason `…:dns:eai_again` |
| `"connect ECONNREFUSED 10.0.0.4:25"` | route `F02` |
| `"worker admission refused: local queue capacity"` | **no route** |
| `"database query timed out acquiring lock"` | **no route** |
| `"request refused"`, no provider, no phase, no status | **no route** |

---

## 3. Change 2 — per-signal facet derivation

Two distinct bugs are folded here; they must be fixed together or the F09 class
stays broken.

**Bug A — global short-circuit.** `requestedGuidanceFacets` returns early on the
first matching condition. One signal therefore deletes every facet another
signal asked for.

**Bug B — over-broad `deliveryUnknown`.** `deliveryUnknown` is true when *any*
observed outcome is `"unknown"`, including a retry-bookkeeping value. A rejected
delivery whose *publication* was unacknowledged is thus classified as
"delivery unknown", which returns `[investigation, remediation, forbidden]` and
drops verification — the exact holdout-v1 F09 loss.

### 3.1 Signal derivation (single source of truth)

Introduce `deriveSignals(evidence)` returning typed flags, consumed by **both**
`routeEvidence` and `requestedGuidanceFacets` so the two can never disagree:

| Flag | Definition |
| --- | --- |
| `deliveryUnknown` | provider-boundary unknown **and** no conclusive terminal outcome. Sources: attempt/execution `provider_outcome === "unknown"`, `executionStatus ∈ {UNKNOWN, PENDING}`, fixture `request_transmitted`/`response_missing`. Conclusive outcomes: `rejected`, `failed`, `delivered`, `accepted`. |
| `outcomeUnknown` | bookkeeping-only unknown: an isolated retry-level `"unknown"` while a conclusive outcome exists elsewhere. Carries **no** `forbidden` demand. |
| `rateLimited` | `status === 429` or `retryAfterSeconds !== null` (unchanged) |
| `transport` | Change 1 classification |
| `credential`, `validation`, `handler`, `ordering`, `duplicate`, `sdk`, `publication` | unchanged signal sources from `observedFacts` |

`deliveryUnknown` remains the F07 route signal; `outcomeUnknown` deliberately
does **not** route to F07. Otherwise the F09 case would still be labelled a
delivery-unknown incident.

### 3.2 Facet demands per signal

Each signal contributes a full demand list. All fault demands include
`verification`, which is what makes the invariant in §3.3 hold structurally
rather than by a special case.

| Signal | Demand |
| --- | --- |
| `deliveryUnknown` | investigation, forbidden, verification |
| `rateLimited` (F01) | remediation, replay, verification |
| `handler` (F05) | investigation, replay, verification |
| `ordering` / `duplicate` / `sdk` (F06/F08/F10) | investigation, forbidden, verification |
| `transport` / `credential` / `validation` / `publication` (F02/F03/F04/F09) | investigation, remediation, verification |
| `outcomeUnknown` only | verification, evidence |
| no signal | investigation, evidence, remediation (default, unchanged) |

**Merge rule:** union in the fixed signal order above (most specific first),
preserving first occurrence, then truncate to three. No early returns. No
per-facet suppression.

### 3.3 Invariant

> If any fault signal is present, `verification ∈ requestedFacets`, and
> `requestedFacets.length === 3`.

This is enforced by a property test over all 2⁸ signal subsets, not by example
tests. A subset containing at least one fault signal but no verification is a
test failure, not a model-quality finding.

Worked check of the F09 class: `publication` + `outcomeUnknown`, no genuine
`deliveryUnknown` → demand `publication = [investigation, remediation,
verification]`, plus `outcomeUnknown = [verification, evidence]` → union
`[investigation, remediation, verification, evidence]` → truncate →
`[investigation, remediation, verification]`. Verification survives, and
`forbidden` is correctly absent because delivery was conclusively rejected.

### 3.4 Ordering consequence

Packing consumes facets in order, so order decides which section wins the first
slot. The order above is chosen so that the case-primary facet
(`investigation` for faults, `remediation` for rate limits) leads, and
`verification` is never truncated away. Any future reordering of this table is
a behavior change requiring a new profile version and a new dev run.

---

## 4. Change 3 — citation equivalence (**decision: Option A**, label-side)

**Defect (v1).** Three F04 holdout cases returned the `RB-F03-F04` F04 section,
which is independently sufficient, but only the `RB-F04-F06` F04 section was in
`accepted`. The metric scored a correct answer as a miss.

### Option A — accept any independently sufficient sibling section (recommended)

`accepted` for a facet may list citations from more than one runbook, subject to
all of:

1. same taxonomy family, same facet — never across families;
2. each listed citation carries a reviewer-written one-line rationale asserting
   independent sufficiency (it alone satisfies the facet, not merely "related");
3. decided during blind labelling against corpus text only, before the run;
4. second reviewer signs the equivalence table; no additions after freeze.

**Trade-off.** Fixes the measurement without touching serving content: corpus
hash, parity test, runbooks, and every frozen comparison survive. Scoring stays
deterministic (facet covered iff any accepted citation is in the top three).
Costs: reviewer discretion can widen accepted sets and inflate recall, and the
equivalence table itself needs review. Mitigation: generic rule declared before
authoring, per-citation rationale, second review, and a reported **strict-label
sensitivity row** (single canonical citation) so the effect is always visible.

### Option B — deduplicate the corpus overlap

Remove the duplicated F04 sections from one runbook so one canonical section
remains.

**Trade-off.** Gives the cleanest possible scoring — one right answer, no
discretion — but it is a **content change disguised as a measurement fix**. It
forces `corpus-v2`, a new corpus hash, a new parity test, a new protocol, and
re-freezing of labels; it invalidates the corpus under which every R3 number was
produced; and it can delete the only section that fits one provider's failure
shape. It also changes what the product serves, during an acceptance attempt.

### Decision

**Adopt Option A for R3.5-recovery.** B is a legitimate follow-up content
cleanup with its own review and its own parity evidence, explicitly out of scope
here. Option A is preferred because the defect is in the label, not in the
retrieval target, and because a corpus change would silently restate the
yardstick — precisely the failure mode R3 was created to end.

### Guardrails against equivalence inflation

- Equivalence is granted per `(family, facet)`; there must be textual evidence
  that both sections contain the required guidance category, not a similar title.
- Every `accepted` list is capped at two citations per facet.
- A multi-citation facet carries one rationale line per citation, each line
  prefixed with its citation; the R3.5r.2 schema enforces this as lines.
- The strict-label number is reported beside the primary; its canonical citation
  is the first citation listed in `accepted` (after access-eligibility
  filtering). A large gap (primary − strict > 0.10) is flagged in the decision as
  a labelling risk.
- Equivalence never applies to `no_match` cases: those stay abstentions.

---

## 5. Change 4 — no-match route precision

**Defect (v1).** The worker-admission no-match case routed to F02 because the
error text contained the bare word "refused". `decideSupport` then saw
`route.confident === true` and accepted, defeating abstention.

**Rule.** A hint may fire only on a *typed* signal. Free-text matching is
allowed only for unambiguous multiword phrases (§2 `phrase` class) or with a
corroborator (§2). Consequently:

- `refused`, `reset`, `timeout`, `timed out`, `network` alone → never route;
- `connection refused`, `ECONNREFUSED`, `EAI_AGAIN`, `ETIMEDOUT` → route F02;
- a non-provider subsystem named in the same error → suppress the weak token.

**Applies to all hints, not just F02.** F03's `permissions?` and F09's `dlq`
already work; the audit in §8.2 requires every fired hint on every scheduled
case to carry a typed reason string (the reasons are logged at confidence
granularity, never raw text). A hint with no typed reason is a bug.

**Precision harness.** The dev extension (§7) includes two no-match cases whose
errors contain "refused" and "timed out" without provider context. In addition,
report a per-hint audit for all 40 scheduled cases: hint fired, signal class,
and whether the case was answerable. This is a diagnostic, not a gate, and it
must not be used to prune hints mid-phase.

---

## 6. What stays fixed on purpose

| Item | Value | Why |
| --- | --- | --- |
| Model | `Xenova/ms-marco-MiniLM-L-6-v2` @ `a0914435…fec`, q8, CPU, 512, batch 8 | A model change is a method search, not a recovery. |
| Prompt | `diagnosis` `phase-11a-v3` @ `aa4a038a…a9f` | Retrieval-only phase. |
| Packing | `r3.3-v1` | Change 2 alters *demand*, not the packer. |
| Support | `r3.4-v1`, `minAnchorHits: 1` | A second abstention knob would confound the route fix. |
| Corpus | `corpus-v1.json` `45e85c35…440` | Option A. |
| Top-k | 3 | Gate is defined at 3. |

Support `minAnchorHits` was tied between 1 and 2 on every dev criterion. It is
**not** re-selected in this phase: re-selection after seeing holdout-v1 is
tuning on consumed data, and it would add a second moving part to a run whose
margin is already thin (§9).

---

## 7. Development set v2 (new labels file, pinned rows preserved)

| Group | Cases | Purpose |
| --- | --- | --- |
| Pinned 24 (verbatim) | 16 answerable + 8 no-match | `dev-24` comparability with every prior R3 number |
| Extension — answerable | 6 | one each: pre-connection timeout; DNS `EAI_AGAIN`; F04 sibling section; rejected delivery + unacknowledged publication; retry-after boundary; credential/validation overlap |
| Extension — no-match | 2 | ambiguous "refused" admission error; database lock timeout |
| **Total** | **22 answerable + 10 no-match = 32** | |

Rules:

- Extension cases are authored from the frozen corpus and the taxonomy, blind to
  holdout-v1 and holdout-v2, and must not paraphrase any of the six miss ids
  published in `decision.md` §4. Those ids are the exclusion list; the author is
  not given their text, only told which incident descriptions are off-limits.
- Extension labels are authored score-blind and second-reviewed, exactly like
  v1.
- `development-labels-v2.constituents.json` records provenance in a sibling
  artifact: the v1 hash, the list of file-level rows copied verbatim, and the
  hash of each new row block. `development-labels-v2.json` stays exactly
  `{version, cases}` so the strict scoring loader does not learn to tolerate
  provenance (review §10).
- Screening report must show **dev-24** and **dev-32** separately.

### 7.1 Development screening gate (must pass before freeze)

| Check | Threshold |
| --- | --- |
| `dev-24` hit@3 | ≥ 0.80 (no regression below the R3 development result) |
| `dev-24` macro recall | ≥ 0.80 |
| `dev-32` hit@3 | ≥ 0.80 |
| `dev-32` macro recall | ≥ 0.80 |
| `dev-32` no-match abstention | ≥ 0.90 |
| `dev-32` false abstention | ≤ 0.05 |
| Direct precision | not below the same-corpus keyword control |
| Mechanism invariants (§3.3, §5) | 100%, zero exceptions |

Development is exposed; these are screening values and must never be reported as
release acceptance.

---

## 8. Release gates, restated exactly (unchanged thresholds)

Holdout-v2 composition assumed: 40 scheduled = 30 eligible answerable + 10
no-match. All values are read from the frozen release gate; none is re-derived
from holdout-v2.

### 8.1 Acceptance gates

| Gate | Threshold | Absolute requirement | Failure example |
| --- | --- | --- | --- |
| Sufficient-guidance hit@3 | ≥ 0.90 | ≥ 27 / 30 | 26/30 = 0.8667 fails |
| Macro section recall@3 | ≥ 0.90 | ≥ 27 / 30 cases | 26/30 fails |
| No-match abstention | ≥ 0.90 | ≥ 9 / 10 | 8/10 fails |
| False abstention | ≤ 0.05 | ≤ 1 / 30 (0.0333) | 2/30 = 0.0667 fails |
| Direct precision@3 | ≥ keyword control on the same holdout | per-case regressions explained | — |
| Route coverage | = 1.00 | 30 / 30 cases; every accepted citation route-eligible | 29/30 fails |
| Reliability | ≥ 0.95 | ≥ 38 / 40 | 37/40 fails |
| Warm retrieval p95 | ≤ 3 s | ≤ 3000 ms, offline batch | — |
| Safety violations | = 0 | no unknown/ineligible citation, no fabricated repair, no replay text | any occurrence fails |
| Diagnosis acceptance | 80% | **R3.6 only**, not part of this decision | — |

Restated verbatim from the frozen gate: `sufficientGuidanceHitAt3: 0.90`,
`macroSectionRecallAt3: 0.90`, `noMatchAbstention: 0.90`,
`falseAbstentionMax: 0.05`, `directPrecisionNotBelow: "frozen baseline"`,
`reliability: 0.95`, `p95LatencyMs: 3000`, `safetyViolationsMax: 0`.

Denominator rules (unchanged): an accepted citation that is access-ineligible
under the case input moves the case to `providerExcluded`; it never counts as a
retrieval miss and never as a hit. An unavailable output never earns abstention
credit. `corpus_gap` cases never enter the recall denominator and are reported
separately.

### 8.2 Integrity gates (additions — deterministic, not performance)

| Gate | Requirement | Rationale |
| --- | --- | --- |
| Facet invariant | 100% of cases with a fault signal request `verification` | Change 2 |
| Typed-route audit | 100% of fired hints carry a typed signal class | Change 4 |
| Equivalence provenance | every multi-citation `accepted` facet has two reviewer rationale lines | Change 3 |
| Freeze integrity | config, corpus, labels, and holdout hashes in the manifest equal the values written at freeze | anti-tamper |
| No-consumed-data | attested; no `r3/holdout/**` path appears in the recovery work log or diffs | seal |

An integrity-gate failure blocks the decision; it is never averaged into a
performance metric.

---

## 9. Margin reality check (read before approving)

Holdout-v1 produced 24/30 hits; the gate needs 27/30. The four changes target
six known misses, but the fixes cannot be credited until they run on data
nobody tuned on. Therefore the recovery must fix **at least three of the four
classes and introduce no new miss**, on 30 cases where each single case is worth
3.3 percentage points. With 10 no-match cases, one false positive is 10
percentage points of abstention.

This is not a reason to soften anything. It is the reason for the dev extension
(§7): the phase must not arrive at holdout-v2 with the same blind spots that
produced 0.80.

---

## 10. Sequence (each step gated; no step may be skipped)

| Step | Work | Exit gate |
| --- | --- | --- |
| R3.5r.0 | Seal + write `protocol-r3.5r.json`; verify and record the corpus `sections` hash unchanged | Protocol exists **before** any dev run; no score exists yet |
| R3.5r.1 | Author dev extension + `development-labels-v2.json`; second review | labels validate; v1 rows byte-identical; new hashes recorded |
| R3.5r.2 | Implement Changes 1, 2, 4 + the Change 3 label/scoring support; unit + property tests | §3.3 invariant 100%; all §2 test rows pass |
| R3.5r.3 | Dev screening (`dev-24`, `dev-32`) in a **new** run directory | §7.1 all pass, else stop |
| R3.5r.4 | Freeze candidate: profile `r3.5r-v1`, route table `r3.5r-v1`, packing `r3.3-v1`, support `r3.4-v1`, corpus hash, dev label hash, dev run hashes, model, prompt | Config written and hashed; holdout-v2 does not yet exist |
| R3.5r.5 | Commission and freeze holdout-v2 | Companion plan §6–§8 complete |
| R3.5r.6 | Single run: candidate + keyword control | 40/40 scheduled cases recorded |
| R3.5r.7 | `recovery/decision.md` | accepted / rejected / blocked with every gate value |

Estimated effort: 3–5 h implementation, 3–4 h dev authoring, 6–10 h holdout
authoring, 2–3 h independent review, 2 h run + report. Roughly 16–24 h, excluding
any content cleanup (Option B), which is out of scope.

---

## 11. Stop rules, restated (all apply before any run)

Stop and report — do not work around — when any of these occurs:

1. Corpus parity fails and cannot be repaired without editing runbooks.
2. A label cannot be re-adjudicated against the frozen corpus without inventing
   a citation.
3. Route coverage falls below 100% and cannot be repaired without a gold filter
   or a case-identity rule.
4. `dev-32` hit@3 stays below 80% after the one predeclared implementation.
5. Abstention cannot reach 90% on development without false abstention above 5%.
6. Any release gate fails on holdout-v2.
7. Diagnosis credentials or budget are unavailable (R3.6 only).
8. The work would require a new dependency, model, vector store, or open-ended
   method search.
9. Any part of holdout-v1 would need to be opened to proceed. This includes
   "just to check for duplicates" and "just to confirm the ledger".
10. The holdout-v2 author has seen holdout-v1 cases, labels, scores, or failure
    detail beyond the published ledger ids, or has seen development scores or
    rankings.
11. A gate, threshold, denominator, or exclusion rule is changed after any
    recovery score exists.
12. A candidate is edited after R3.5r.4 freeze — including "small" route or
    facet adjustments suggested by a dev result that arrives later.
13. A fired hint cannot be expressed as a typed signal without a case-identity
    rule.
14. **This phase already ends `rejected`.** A second independent rejection
    closes the `structured-minilm` line; a third attempt would require a new
    method scope approved on its own merits, not another recovery of this one.

Each stop produces a written record with the failing gate, absolute
denominators, per-family results, and per-stratum results.

---

## 12. Known risks and disclosures to carry into the decision

1. **Motivation contamination.** The four changes are derived from holdout-v1
   observations. Holdout-v2 validates transfer, not discovery. The decision must
   say so explicitly; it must not claim the fix was independent of the consumed
   data.
2. **Single-point abstention.** Support still trusts `route.confident`. Change 4
   narrows the route vocabulary; it does not add a second confirmation. Residual
   false-positive risk remains and belongs in the limitations section.
3. **Three-slot ceiling.** Five-signal combinations cannot be fully packed. The
   invariant guarantees verification but not completeness; per-case missing
   facets must be reported, never hidden by shrinking labels.
4. **Equivalence discretion.** Option A moves judgement into labelling. The
   strict-label sensitivity row exists so this cannot be invisible.
5. **Thin margin.** §9. Any regression consumes the entire failure budget.
6. **Consumed-data hygiene is procedural.** No technical control can prove
   holdout-v1 was never opened; the attestation and the work-log check in §8.2
   are the controls, and they must be stated as such in the decision.
