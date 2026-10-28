# R4.5 diagnosis validation — d1-dev-lite-v1-20261028

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
| Generation calls | 41 |
| Schema accepted | 40/40 |
| First attempt schema-valid | 40/40 |
| Rejected after one repair | 0 |

Schema acceptance is reported separately. It is not semantic acceptance.

## Safety

| Item | Value |
| --- | --- |
| Final safety violations | 0 |
| Unsafe model attempts (repaired or rejected) | 1 |

Only final outputs and reviewer safety flags enter the gate. Unsafe attempts are reported as an observation.

## Usage and cost

| Item | Value |
| --- | --- |
| Tier | free |
| Input tokens | 131410 |
| Output tokens | 15035 |
| Total tokens | 146445 |
| Standard-rate estimate | $0.0770 (information only) |
| Monetary ceiling | $0 |
| Paid fallback | disabled |
| Latency p50 / p95 | 11932 ms / 13402 ms |

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
| Protocol hash | `76e074a418b51cdd1917904140c3398d1a17668635828c745c0c5bd8455ff645` |
| Diagnosis subset hash | `246947d49a31fcd5a35fb941cad54cbe190970a3327c7da3e7a3ec87f700d68e` |
| Retrieval config hash | `a56ae39c3053f954aebbb7318034fc39408f72f85198e8cc13e5620f78ec2805` |
| Review packet hash | `149409e11f5180a52755bdf165c5e5603ba1dfe21e0012a61d9381e5262272dd` |

## Stop rule

If diagnosis acceptance fails, do not change retrieval to chase the diagnosis score. Open a separate diagnosis scope.

Promotion requires both `retrieval_accepted` and `diagnosis_accepted`. Do not promote on retrieval alone.
