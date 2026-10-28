# R3.5-recovery — holdout-v2 authoring plan (PROPOSAL)

**Status: `proposal`.** No case, label, or score exists. Nothing here is
authorized until the addendum is approved and R3.5r.4 (candidate freeze) is
recorded.

Companion: [`protocol-addendum.md`](./protocol-addendum.md).

Target directory: `apps/ai_agent/evaluation/r3/recovery/holdout-v2/`

---

## 1. Purpose and the non-derivation rule

Holdout-v2 answers one question: does the recovery profile generalize to
incidents nobody involved in the fix has seen?

It is **not** a replacement for holdout-v1 and **not** a second attempt at the
same yardstick. Every rule below exists to keep it independent.

**Non-derivation rule.** Holdout-v2 must never be produced from, seeded by,
paraphrased from, or checked against holdout-v1. Concretely:

- No file under `apps/ai_agent/evaluation/r3/holdout/` may be opened by anyone
  in this phase. The seal is absolute, including duplicate-detection.
- The author receives no case ids, queries, evidence, labels, scores, or
  per-case failure text from holdout-v1.
- The only holdout-v1 material permitted anywhere in this phase is what is
  already published in `decision.md`: the aggregate gate table, the six
  answerable miss ids with one-line causes, and the single no-match miss id.
- The six published miss ids are an **exclusion list**: the author is told which
  incident descriptions are off-limits and must invent different incidents. The
  author is not shown their evidence, wording, or expected guidance.
- Development cases, dev labels, dev rankings, and dev scores are equally
  off-limits to the author. Development is exposed material for *tuning*; it is
  not reference material for *acceptance*.

If any of this cannot be guaranteed for want of an independent author, the phase
is **`blocked`**. Self-authored acceptance is not an acceptable fallback, and
"the author promises not to look" without the separation in §2 does not count.

---

## 2. Independence and the blind wall

| Role | Who | Sees | Must not see |
| --- | --- | --- | --- |
| Author (A) | not the implementer of Changes 1/2/4, not the R3.5 runner | `corpus-v1.json` section text, taxonomy definitions, target schema, the six-id exclusion list, this plan | dev cases/labels/scores, holdout-v1 anything, the recovery code diff, retrieval rankings |
| Reviewer (B) | third party, ≠ A, ≠ implementer | A's cases + labels + rationales, corpus text, this plan | retrieval outputs, scores, implementer commentary |
| Implementer | changes code and runs dev screening | development material | holdout-v2 until freeze; holdout-v1 entirely |
| Runner | executes the single holdout run | frozen inputs only | labels, until outputs are sealed |

Practical mechanics:

1. A writes into a directory the implementer cannot read until freeze
   (separate working copy or custodian-held archive). The custodian computes the
   hashes at freeze.
2. A is briefed from this plan and the addendum only — not from `decision.md`,
   not from a chat transcript describing the failures.
3. B reviews before freeze; the verdict file is authored by B, alone.
4. After freeze, the runner receives `cases-v2.json` **inputs only**. Labels are
   opened by the scorer after outputs are written and sealed (§8).

**Self-review is not review.** If B == A, or B == implementer, the phase is
`blocked`.

---

## 3. Composition

40 scheduled cases, identical shape to the frozen protocol:

| Stratum | Count | Rule |
| --- | --- | --- |
| Answerable | 30 | exactly 3 per taxonomy family F01–F10 |
| No-match | 10 | genuine absence of sufficient guidance in `corpus-v1` |
| Corpus gap | 0 scheduled | if discovered during authoring, the case is replaced before freeze and the replacement is re-reviewed |

Provider mix (eligibility, not labels): every family's three cases must be
eligible under the case's declared provider input, and **at least 6 answerable
cases overall must be eligible only under `worker`/`database`** so that
route-exclusion and generic-runbook behavior are exercised. No family may have
all three cases on the same provider+action type.

Scenario distinctness: no two answerable cases may share the same
`(provider, actionType, final-error class)` triple, and every query text must be
distinct. Three provider-diverse variants of one incident is one case, not three.

### 3.1 Signal strata (defined from the observable vocabulary, not from v1 cases)

These are minimums inside the 30/10 totals. They exist because a holdout that
never exhibits a signal cannot test a change that depends on it.

| Stratum | Requirement | Why |
| --- | --- | --- |
| S1 pre-connection transport, no provider status | ≥ 4 answerable, ≥ 2 families, ≥ 2 providers | Change 1 |
| S2 conclusive rejected delivery + unacknowledged publication/outcome | ≥ 3 answerable | Change 2 (both bugs) |
| S3 F04 facet with two independently sufficient sibling sections | all 3 F04 cases, where sufficiency genuinely holds | Change 3 |
| S4 no-match containing "refused"/"timed out"/"network" with no provider corroboration | ≥ 3 of 10 | Change 4 |
| S5 no-match with a confident provider signal but no sufficient guidance | ≥ 3 of 10 | abstention under a true route |
| S6 no-match with no route and no anchor | ≥ 2 of 10 | abstention without a route |
| Free no-match | remaining ≤ 2 | — |

S3 is a labelling precondition, not a quota to manufacture: if a case's F04
facet genuinely has only one sufficient section, the case keeps one accepted
citation and the shortfall is reported. Never add a second citation to hit a
number.

---

## 4. Case rules

Schema is the frozen `TargetCase` shape: `id`, `split: "holdout"`,
`kind: "answerable" | "no_match"`, `input`, `requiredFacets` (answerable only,
≤ 3), `supporting`, `missingRuntimeFacts`. `input` carries only
`query`/`taxonomy`/`providers`/`limit`. Route hints, requested facets, anchors,
and expected answers are **never** stored in `input`.

Evidence: each case ships the evidence bundle needed to derive observed facts
through the production path (`failureContext`, `executionEvidence`,
`inputValidation`, attempts, ordering, credential presence, and — where
simulated — `fixture_observation` with `observed_facts`). Evidence must be
plausible production data, not a hand-built minimal object that exists only to
trigger a rule. A case whose evidence omits a field the production system always
populates is an invalid case, not a hard case.

`kind: "no_match"` means: a real incident, with enough evidence to diagnose the
*shape* of the failure, whose resolution is not sufficiently covered by any
section of `corpus-v1` under the case input. It is not:

- an incident made unanswerable by removing evidence;
- an incident about a provider or subsystem the corpus never covers by design
  (that is a `corpus_gap`, reported separately);
- a question about a topic rather than an incident with observable evidence.

Each no-match case records a `nearMiss` citation — the closest section and why
it is insufficient. That is a label for precision analysis; it is never passed
to retrieval and never scored as an accepted citation.

---

## 5. Labelling rules

1. **Score-blind.** Labels are written from the incident, the evidence, and
   corpus text. The author never sees a ranking, a score, or a retriever output
   — not before writing, not after.
2. **One to three facets**, each with at least one `accepted` citation that
   exists in `corpus-v1.json` and is access-eligible under the case input.
3. **Sufficiency, not similarity.** `accepted` means "a competent responder
   following only this section would perform that facet correctly". A section
   that mentions the topic is not accepted.
4. **Equivalence** (addendum §4, Option A): a facet may accept two citations
   from sibling runbooks only when each is independently sufficient, with a
   one-line rationale per citation, same family and same facet, capped at two,
   approved by B. No equivalence for `no_match`.
5. **Rationale per facet**: why this guidance is required for this incident, in
   one sentence, without referencing the retriever, the profile, or any
   expected route.
6. **No route-aware labelling.** The author must not reason about what the route
   "would" do. If a rationale mentions `route`, `facet request`, `profile`,
   `anchor`, or `support`, it is rejected at review.
7. **`supporting` / `missingRuntimeFacts`** describe the incident, unchanged in
   meaning from the frozen schema.

---

## 6. Review gate (before freeze, no exceptions)

Reviewer B checks all 40 and writes `review-final-v2.json` with `verdict:
"accepted"` only when every item passes:

| Check | Failure action |
| --- | --- |
| every `accepted` citation exists and is eligible | case rejected → re-authored → re-reviewed |
| each facet independently sufficient (rationale survives scrutiny) | case rejected |
| equivalence rationales present and genuinely independent | equivalence removed |
| no-match genuinely unanswerable; `nearMiss` stated and insufficient | case rejected |
| no paraphrase/derivation from holdout-v1 (ids, wording, evidence shape) | case rejected and author replaced if repeated |
| evidence plausibility (no field removed to manufacture a defect) | case rejected |
| distinctness (query text, provider+action+error triple) | case replaced |
| labels contain no route/facet/profile reasoning | label rewritten |
| 30/10 counts and family quotas intact | block freeze |
| strata minimums S1–S6 met | block freeze (do not proceed with a holdout that cannot test the changes) |

B does not see the candidate, the dev results, or any score. B's verdict is
frozen as an artifact with its own hash.

---

## 7. Freeze procedure

Produce in `recovery/holdout-v2/`:

| File | Contents |
| --- | --- |
| `cases-v2.json` | 40 cases, inputs + evidence pointers, no labels |
| `evidence-v2.json` | full evidence bundles keyed by case id |
| `labels-v2.json` | facets, accepted citations, rationales, `nearMiss` for no-match |
| `review-final-v2.json` | B's per-case verdicts + `accepted` summary |
| `authoring-attestation-v2.json` | A's declarations (§10) |
| `strata-v2.json` | case → stratum mapping (S1–S6, family), counts |
| `manifest.json` | SHA-256 of every file above, author/reviewer role ids (not names if policy forbids), UTC timestamps, and the candidate config hash from R3.5r.4 |

Rules:

- Hashes are computed **after** B's verdict, and the manifest is written once.
- Holdout-v2 hashes are recorded in the freeze manifest and later in the run
  manifest. They are **not** written into
  `selected-retrieval-config-r3.5r.json`, which is frozen before holdout-v2
  exists; embedding them there would break the freeze ordering.
- Any edit after the manifest invalidates the holdout. There is no "v2.1 patch".
- The strata file is frozen with the cases: moving a case between strata after
  results exist is tuning.

---

## 8. Run once

1. Implementer hands the frozen runner only `cases-v2.json` inputs (query,
   taxonomy, providers, limit) plus the pinned config.
2. Run the candidate (`structured-minilm`, `routeEnabled: true`,
   `support.minAnchorHits: 1`, profile `r3.5r-v1`) and the in-process keyword
   control. One batch scoring pass; no rerank, no second scoring pass, no
   per-case retry with a different configuration.
3. Write `outputs-v2.json` (all 40, including any unavailable output) and
   `scores-original.json`; hash both; seal the outputs before labels are opened.
4. Open `labels-v2.json`, score, and write `report-v2.json`.
5. Record in the run manifest: input hash, output hash, config hash, corpus
   hash, label hash, cases/evidence/review/attestation hashes, and the counts
   (scheduled, eligible answerable, no-match, reliable, hits, abstentions, false
   abstentions).

A harness failure (crash, scorer error, timeout of the harness itself) is
recorded as an unavailable output and reported. It is not a reason to re-run,
and it never earns abstention credit.

---

## 9. Reporting and decision

`recovery/report-v2.json` and `recovery/decision.md` must contain:

- the full gate table from addendum §8.1 with absolute counts, including each
  failing gate named explicitly;
- per-family rows (F01–F10, NM) with answerable count, hit@3, macro recall,
  direct precision, abstention, false abstention;
- per-stratum rows (S1–S6) with counts and outcomes — descriptive, not
  pass/fail;
- per-hint audit (hint, typed signal class, fired count, answerable vs
  no-match) — descriptive;
- the strict-label sensitivity row beside the primary hit@3 and recall;
- a failure ledger with the existing buckets plus the four recovery buckets:
  `transport_signal_missed`, `facet_derivation`, `label_equivalence`,
  `route_false_positive`;
- absolute denominators: 40 scheduled, 30 eligible answerable, 10 no-match,
  reliable outputs, hits, abstentions, false abstentions;
- the integrity-gate results from addendum §8.2;
- an explicit limitations paragraph: motivation contamination, single-point
  abstention, three-slot ceiling, equivalence discretion, margin.

`decision.md` states `accepted`, `rejected`, or `blocked`. On `rejected`:

- no arm is promoted, no gate is lowered, no case is re-scored;
- holdout-v2 is consumed and sealed exactly like v1;
- per stop rule 14, a second independent rejection closes the
  `structured-minilm` line — no third holdout, no "one more fix";
- R3.6 does not start; R3.7 does not run; runtime stays `minilm-original`.

`blocked` applies when the author/reviewer separation, budget, or freeze
integrity cannot be established. `blocked` is not a soft reject and must not be
reported as a near-pass.

---

## 10. Authoring attestation (declaration text)

`authoring-attestation-v2.json` records, as explicit booleans with a signed
statement:

1. I did not open, list, or copy any file under
   `apps/ai_agent/evaluation/r3/holdout/`.
2. I did not see any case, query, evidence bundle, label, score, ranking, or
   per-case failure text from holdout-v1.
3. I did not see any development case, label, score, or ranking.
4. I did not see the recovery implementation diff or any retriever output.
5. I did not author any case by paraphrasing a published holdout-v1 miss id, and
   I treated the six published ids as exclusions.
6. Every accepted citation was chosen for independent sufficiency from corpus
   text, without reference to what any route or facet rule would request.
7. Every no-match case is a plausible incident whose resolution is genuinely
   absent from `corpus-v1`, not an incident stripped of evidence.
8. I did not discuss the cases with the implementer, the runner, or the R3.5
   operator.
9. All strata minimums in §3.1 were met honestly, without manufacturing a case
   to fill a quota.

Reviewer B signs a separate statement that the review was conducted without
access to scores or outputs.

---

## 11. Cost and sequencing

| Step | Effort |
| --- | --- |
| Brief A from this plan (no v1 material) | 0.5 h |
| Author 40 cases + 30 label sets + 10 no-match justifications | 6–10 h |
| Independent review, two passes | 2–3 h |
| Freeze + manifest | 0.5 h |
| Single run + report | 2 h |
| Decision write-up | 1 h |
| **Total** | **12–17 h**, excluding implementation |

Sequence: addendum approval → R3.5r.0 protocol freeze → R3.5r.1 dev labels →
R3.5r.2 implementation → R3.5r.3 dev screening → R3.5r.4 candidate freeze →
**then** holdout-v2 authoring → review → freeze → single run. Authoring never
starts before the candidate is frozen, so no result can influence the cases.
