# R4.4 — holdout decision

**Decision: `retrieval_accepted`.**

The single pre-registered sealed-holdout run completed on 2026-10-21 in
[`runs/holdout-20261021-v1/`](runs/holdout-20261021-v1/). The candidate was frozen
in [`selected-retrieval-config.json`](selected-retrieval-config.json) (sha256
`a56ae39c3053f954aebbb7318034fc39408f72f85198e8cc13e5620f78ec2805`) before the
holdout was opened. Every acceptance gate passed. No gate, threshold, label,
corpus, route, facet, packer, support, or prompt was changed before or after the
run.

| Item | Value |
| --- | --- |
| Run | `runs/holdout-20261021-v1/` |
| Candidate config hash | `a56ae39c…c2805` |
| Holdout seal hash | `8d6cb47c…c886` |
| Result | 120/120 hit@3; 40/40 no-match abstention; 0/120 false abstention |
| Decision | `retrieval_accepted` |
| Failing gates | none |
| Blocked reasons | none |

**Run integrity note.** A first invocation stopped during harness input
validation: the holdout evidence file omits the optional `artifact` field that
the development evidence file carries. No case was ranked, no inference or score
was produced, and no run directory was created. The parser was corrected to make
that field optional (a harness-only change; no candidate, corpus, label, route,
facet, or threshold changed), and the single scoring run above followed. The
holdout has exactly one score.

The pre-run review below is retained as the authorizing record. It is not
evidence for acceptance; the accepted decision comes only from the one run.

## Holdout review (pre-run, 2026-10-21)

| Item | Record |
| --- | --- |
| Reviewer | Thisshon Robert (attestation in `reviewer-signoff-v1.json`) |
| Audit | AI-assisted, read-only, reproducible: `bun run apps/ai_agent/evaluation/r4/authoring/audit-holdout-reviewer.ts` |
| Verdict on holdout content | accepted, 0 label defects requiring reseal |
| Holdout opened for scoring | no at review time; opened once, after the R4.4 freeze |

### Seal verification

| Check | Result |
| --- | --- |
| Sealed files hashed vs `seal.json` | 8/8 match, byte lengths match |
| `seal.json` sha256 vs `protocol.holdoutSeal.hash` | `8d6cb47c…c886` both |
| Corpus sections hash vs `protocol.corpus.corpusHash` | `45e85c35…d440` both |
| Raw corpus file sha256 | `496f3e7f…e6d0` (expected to differ; see note) |

`seal.corpus.hash` is the canonical **sections** hash, not the raw file hash.
`seal.hashMethod` says "sha256 of raw file bytes", which describes only
`seal.files` entries and is misleading for `seal.corpus`. Documentation defect,
not an integrity defect.

### Content checks

| Check | Value |
| --- | --- |
| Cases | 160 = 120 answerable + 40 no-match |
| Answerable distribution | 12 each across F01–F10 |
| No-match buckets | 10 each: missing guidance, missing runtime fact, out-of-scope, adversarial |
| Required-facet blocks resolving to corpus sections | 360/360 |
| Supporting citations resolving to corpus sections | 548/548 |
| Answerable cases with one confident family hint | 120/120 |
| Answerable cases with every accepted citation in route | 120/120 |
| Answerable cases with every required facet requested | 120/120 |
| No-match cases with a confident route | 0/40 |
| No-match cases with a rationale | 40/40 |
| Exact fingerprint duplicates across development + holdout | 0 |

## Measurement limitations (mandatory in the R4.4 report)

These are binding on how the Step 5 report may be worded. They are properties of
the sealed holdout, and none of them is fixable without a new holdout.

1. **Labels are clustered, so case-level Wilson bounds are anti-conservative.**
   120 answerable cases reduce to 10 distinct required-facet and accepted-citation
   signatures and 22 distinct accepted citations, 12 cases per family. Effective
   independent units are approximately 10, not 120. `wilsonLower95` at n = 120
   must not be presented as evidence about independent cases.
2. **Report per-family results next to the pooled numbers.** The acceptance gates
   `sufficientGuidanceHitAt3WilsonLower >= 0.82` and
   `macroSectionRecallAt3WilsonLower >= 0.82` are pooled over 120 clustered cases.
   A pooled pass with a family near the 0.70 floor is a weak acceptance.
3. **No-match abstention is structural, not discriminating.** All 40 no-match
   observations carry zero route hints and zero observed anchors, so
   `decideSupport` abstains by construction under `minAnchorHits: 1`
   (`retrieval-support.ts`). `noMatchAbstention` and its Wilson lower bound
   confirm policy wiring. They do not demonstrate near-miss discrimination, and
   the holdout contains no case where a family routes and guidance looks plausible
   but the observed facts are insufficient.
4. **F04 accepts a less specific sibling.** All 12 F04 cases accept
   `RB-F03-F04` alongside `RB-F04-F06` for every required facet, including the
   template-path cases whose guidance exists only in `RB-F04-F06`. F04 hit@3 and
   recall are therefore lenient by up to 10% of the answerable set.
5. **`missing-runtime-fact` is really corpus coverage.** Those 10 rationales say
   the provider limit is not recorded in the corpus. They are missing-guidance
   cases under a different name. Abstention is correct either way, but the bucket
   does not test guidance-present/fact-absent behaviour.
6. **The weakest development cohort is not held out.** The development cohort
   contains a three-case `S` cohort (`s02`, `s03`, `s05`) that scored 66.7% hit@3,
   the only cohort below the 0.70 per-family floor. Protocol allocates the holdout
   as 12 answerable cases per family F01–F10, so `S` is dev-only and the
   per-family floor is evaluated only on F01–F10. Acceptance of F01–F10 says
   nothing about the `S` behaviour that development already showed to be weak.
7. **Some scenarios recur across splits.** Three holdout/development pairs are
   near-identical (derived-query Jaccard 0.857–0.938) in F06 and F07, and
   `f04-email-numeric-recipient-field` and `f04-email-cc-array-type` share an
   identical derived query. Combined effect is 2.5% of the holdout, below the 10%
   defect threshold, and no exact fingerprint duplicates exist.

## Acceptance gates (filled by the single run)

Thresholds are `protocol.gates.acceptance`. Values are from
`runs/holdout-20261021-v1/report.json`; every row carries its numerator and
denominator.

| Gate | Threshold | Value | Numerator/denominator | Result |
| --- | --- | --- | --- | --- |
| sufficientGuidanceHitAt3 (point) | >= 90.00% | 100.00% | 120/120 | pass |
| sufficientGuidanceHitAt3 (Wilson lower) | >= 82.00% | 96.90% | 120/120 | pass |
| macroSectionRecallAt3 (point) | >= 90.00% | 95.00% | 360/396 (macro) | pass |
| macroSectionRecallAt3 (Wilson lower) | >= 82.00% | 87.67% | 360/396 | pass |
| noMatchAbstention (point) | >= 90.00% | 100.00% | 40/40 | pass |
| noMatchAbstention (Wilson lower) | >= 75.00% | 91.24% | 40/40 | pass |
| falseAbstention | <= 5.00% | 0.00% | 0/120 | pass |
| directPrecisionAt3 | >= keyword control (18.06%) | 100.00% | 360/360 | pass |
| perFamilyHitAt3 (each of F01–F10) | >= 70.00% | 100.00% each | 12/12 each | pass |
| routeCoverage | 100.00% | 100.00% | all eligible accepted citations | pass |
| reliability | >= 95.00% | 100.00% | 160/160 | pass |
| p95LatencyMs | <= 3000 ms | 1910.1 ms | n/a | pass |
| safetyViolations | 0 | 0 | n/a | pass |

## Decision

**Decision value: `retrieval_accepted`.** No gate failed and no blocked reason
was recorded. The failure ledger is empty: zero answerable misses, zero no-match
false positives, zero corpus-gap cases.

The paired keyword comparison on the same 120 answerable cases was 120
candidate-only hits, 0 keyword-only hits, 0 both, 0 neither (exact McNemar
two-sided p ≈ 1.5e-36; bootstrap difference 100.00% to 100.00%). This is decision
support for the candidate over the keyword control, not proof of a five-point
superiority over another near-equal arm.

**Required reading of this result.** The holdout is a decision instrument, not a
certification. The 120 answerable cases cluster into 10 family-level label
signatures, so the case-level Wilson bounds are anti-conservative. No-match
abstention is structurally guaranteed by zero route hints and zero anchors in all
40 cases. F04 accepts a less specific sibling in all 12 cases, so its hit@3 and
recall are lenient by up to 10% of the answerable set. The development `S` cohort
(2/3) is not represented in the holdout. These limitations are binding on any
claim made from this result.

Because retrieval is accepted, R4.5 diagnosis validation may proceed against the
pre-registered 40-case subset. Promotion remains conditional on
`diagnosis_accepted`; do not promote on retrieval alone.

If a later label defect is discovered, this holdout is consumed. A further
attempt requires a new protocol, a new candidate freeze, and a new sealed holdout
under a new holdout id (repeat R4.1). No re-scoring of this holdout is allowed.

## Governance

- Every sealed file under `holdout/` is immutable. `holdout/review-v1.json` stays
  sealed with `humanIndependentReview: outstanding`; the human attestation lives
  in `reviewer-signoff-v1.json`, which is outside the seal. Any post-seal edit to a
  sealed file requires a new holdout id, a new seal, and a new protocol.
- One run only. No re-scoring, no threshold edit after the run, no candidate change
  between freeze and report.
- `selected-retrieval-config.json` must be written, with every `*Hash` field, before
  the holdout is opened. `holdoutSealHash` must equal `8d6cb47c…c886`.
- Run directories are immutable. A changed input means a new directory.
