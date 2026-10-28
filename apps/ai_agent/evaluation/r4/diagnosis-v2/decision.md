# R4.5 diagnosis validation — r4.5-20261026-v2

**Decision: `blocked`.**

Semantic acceptance is **not** yet decided. This record stays `blocked` until the blinded human review is complete and applied.

## Gate

| Gate | Value | Threshold | Result |
| --- | --- | --- | --- |
| reviewCoverage | 0.00% | 40 | **FAIL** |
| semanticAcceptancePoint | 0.00% | 80.00% | **FAIL** |
| semanticAcceptanceWilsonLower | 0.00% | 62.00% | **FAIL** |
| safetyViolations | 0 | 0 | pass |
| cohenKappa | n/a | 0.70 | **FAIL** |
| unresolvedDisagreements | 0 | 0 | pass |

Blocked reasons: `human_review_outstanding`, `review_coverage_incomplete`.

Failing checks: `reviewCoverage`, `semanticAcceptancePoint`, `semanticAcceptanceWilsonLower`, `cohenKappa`.

## Schedule and schema

| Item | Value |
| --- | --- |
| Scheduled | 40 |
| Completed | 40 |
| Failed | 0 |
| Generation calls | 45 |
| Schema accepted | 40/40 |
| First attempt schema-valid | 40/40 |
| Rejected after one repair | 0 |

Schema acceptance is reported separately. It is not semantic acceptance.

## Safety

| Item | Value |
| --- | --- |
| Final safety violations | 0 |
| Unsafe model attempts (repaired or rejected) | 5 |

Only final outputs and reviewer safety flags enter the gate. Unsafe attempts are reported as an observation.

## Usage and cost

| Item | Value |
| --- | --- |
| Tier | free |
| Input tokens | 136025 |
| Output tokens | 18494 |
| Total tokens | 154519 |
| Standard-rate estimate | $0.0870 (information only) |
| Monetary ceiling | $0 |
| Paid fallback | disabled |
| Latency p50 / p95 | 12102 ms / 24270 ms |

## Per family

| Family | Cases | Completed | Schema accepted |
| --- | --- | --- | --- |
| F01 | 3 | 3 | 3 |
| F02 | 3 | 3 | 3 |
| F03 | 3 | 3 | 3 |
| F04 | 3 | 3 | 3 |
| F05 | 3 | 3 | 3 |
| F06 | 3 | 3 | 3 |
| F07 | 3 | 3 | 3 |
| F08 | 3 | 3 | 3 |
| F09 | 3 | 3 | 3 |
| F10 | 3 | 3 | 3 |
| no_match | 10 | 10 | 10 |

## Review

| Item | Value |
| --- | --- |
| Primary reviewed | 0/40 |
| Double-labeled pairs | 0/8 |
| Cohen's kappa | n/a |
| Semantic accepted | 0/40 |
| Unresolved disagreements | 0 |

## Frozen inputs

| Item | Value |
| --- | --- |
| Protocol hash | `91857ea69bac30431685cbf27f7359e35f8a912ee9045bfe2118ae8a9efd7a9e` |
| Diagnosis subset hash | `02a26f320afe95d02ab13eecceb6536bf220756680ae5aaba220529360659e40` |
| Retrieval config hash | `a56ae39c3053f954aebbb7318034fc39408f72f85198e8cc13e5620f78ec2805` |
| Review packet hash | `4d4e26c88d1e640fc02248b519de0721c878aa2fe75f9a2ba9a177ec1ee8da8e` |

## Stop rule

If diagnosis acceptance fails, do not change retrieval to chase the diagnosis score. Open a separate diagnosis scope.

Promotion requires both `retrieval_accepted` and `diagnosis_accepted`. Do not promote on retrieval alone.
