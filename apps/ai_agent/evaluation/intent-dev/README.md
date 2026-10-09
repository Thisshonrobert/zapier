# Targeted operational-intent development experiment

Retain the frozen `minilm-original` baseline. Intent-conditioned queries reduced heading-based mismatch flags but made no-match abstention worse. This is an offline diagnostic result, not production acceptance.

## Scope and frozen inputs

`benchmark.json` contains 28 synthetic development queries: six positives and one no-match control for each of `EVIDENCE_GATHERING`, `REMEDIATION`, `CONSTRAINTS` and `ROOT_CAUSE`. The six incident groups span transient failures, credentials, templates, uncertain delivery, stale investigations and evidence gaps. Root-cause questions ask for evidence-based distinctions, not unsupported definitive causes. Gold sections must directly answer all requested facts; support quotes are checked against the frozen corpus. Partial context is excluded. Labels were authored for this experiment, not independently human-adjudicated.

The new recall target is **80%**. Historical captures and baseline targets remain unchanged. The experiment never opens the fresh scenario dataset, its scores or its report. It verifies the existing method freeze, its source hashes and corpus hash before inference.

Both variants use the frozen 60-section corpus, exhaustive metadata-eligible candidate pool, versioned citations, MiniLM revision `a09144355adeed5f58c8ed011d209bf8ee5a1fec`, q8 CPU inference, 512-token limit, batch size eight, fixed probability cutoff `.001`, and at most three returns. No dependency, production search, corpus, reranker, threshold or label changes are part of the intervention.

The single intervention is a natural-language task prefix derived from explicit query wording. It receives no benchmark intent or gold label. Ambiguous wording stays unchanged. All 28 explicit benchmark tasks classify correctly, but this does not establish accuracy on ambiguous natural queries.

## Development failure audit

The audit covers all 48 development queries from `r25/runs/exhaustive-v2`, using audited labels and the fixed `.001` control. See `runs/intent-v3/development-audit.json` for every query, returned section, missing gold and flagged extra.

The baseline's audited development Recall@3 is 99.07% across 36 positives, with 12/12 no-match abstentions. Its one missed gold citation is `RB-F03-F04@1.0.0#replay-and-approval` for `r21-recipient-validation-3`: a broad forbidden-actions section occupies a slot where the specific credential/destination replay constraints were expected. Three gold sections were requested and two returned, so this is a partial recall miss, not a total failure.

Observed extra-result patterns include:

- Evidence versus remediation: `r21-bot-removal-1` asks for captured information but also returns `RB-F03-F04@1.0.0#allowed-remediation`.
- Evidence versus procedural checks: cooldown timestamp questions also return remediation, replay rules or simulated examples.
- Incident-boundary confusion: recipient-rejection and reconciliation questions also return lost-acknowledgement or email-rejection sections from the other incident type.
- Generic procedural overlap: duplicate investigation questions return generic read-only procedures from other runbooks.
- Mixed sections: the synthetic `RB-R2-*` sections combine evidence, repairs and restrictions under an evidence heading. Heading alone cannot reliably determine passage intent.

These extra returns are diagnostic candidates, not automatically false positives: existing gold labels may be incomplete, supporting material can be useful, and the heading classifier cannot semantically adjudicate mixed passages. No prior labels were changed. Local headings are already included in MiniLM passages; adding the same heading again would not test a new intervention. Full parent-document breadcrumbs are absent, but were not changed in this experiment.

## Frozen comparison

Final artifacts are in `runs/intent-v3/`. `benchmark.json` and `inference-inputs.json` were written before model execution; source, dataset, freeze, input and score hashes bind the run. Earlier `intent-v1` is preparation only; `intent-v2` predates a TypeScript reporting-metadata correction and is excluded from the handoff. Neither was used to tune the benchmark, model or prefix.

| Metric | MiniLM baseline | Intent-conditioned |
| --- | ---: | ---: |
| Recall@3, 24 answerable queries | 100% | 100% |
| MRR | 1.00 | 1.00 |
| Mean precision among returned sections | 33.33% | 34.03% |
| No-match abstention, four controls | 3/4 (75%) | 1/4 (25%) |
| Heading-based wrong-intent flags | 13 | 9 |
| Mean reranking latency | 909 ms | 1,118 ms |
| P95 reranking latency | 2,092 ms | 2,708 ms |

Both variants meet the 80% recall target. Conditioning introduces two additional false-match controls, so the recommendation is **do not adopt**. Precision measures direct labeled relevance, not semantic usefulness of every extra passage. Flags count non-gold returns with an identifiable heading intent different from the requested task; mixed/unknown headings are excluded. Latency comes from an interleaved CPU run during verification and is not a performance claim. External API cost is $0.

All four category recall scores and MRR are perfect on this explicit, author-labeled set. This ceiling shows that the benchmark probes extra-result contamination and abstention more strongly than hard positive ranking. Small samples, narrow wording and no independent adjudication prevent release or generalization claims. The fresh set remains untouched and no second intervention was tried.

## Reproduction and verification

From the repository root, use a new output directory:

```powershell
rtk proxy node --experimental-transform-types apps/ai_agent/src/evaluation/retrieval-intent.ts --output .tmp-turbo-user/intent-reproduction
```

Local model weights must already exist in `.tmp-turbo-user/r2-models`; remote model downloads are disabled by the reused runner. To verify frozen captures without inference:

```powershell
rtk proxy node --experimental-transform-types apps/ai_agent/src/evaluation/retrieval-intent.ts --output .tmp-turbo-user/intent-replay --scores apps/ai_agent/evaluation/intent-dev/runs/intent-v3/scores.json
```

Focused checks: nine tests passed across `retrieval-intent.test.ts`, `retrieval-r25.test.ts` and `r25-freeze.test.ts`. Required root type check and build passed; Turbo runs only declared package scripts and the frontend build was cached. The build replayed existing frontend package-manager/SWC warnings. Root lint failed in unchanged frontend files with nine errors and 22 warnings; it is not a passing gate. No frontend lint repairs were included.

Graphify required: no. This bounded offline experiment adds no major architecture or production subsystem. Git integration remains manual. If further evaluation is authorized, use Sol with medium reasoning.
