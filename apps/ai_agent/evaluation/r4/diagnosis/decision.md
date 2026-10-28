# R4.5 diagnosis validation — r4.5-20261021-v1

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

Blocked reasons: `human_review_outstanding`, `provider_or_quota_failure`, `review_coverage_incomplete`.

Failing checks: `reviewCoverage`, `semanticAcceptancePoint`, `semanticAcceptanceWilsonLower`, `cohenKappa`.

## Schedule and schema

| Item | Value |
| --- | --- |
| Scheduled | 40 |
| Completed | 9 |
| Failed | 31 |
| Generation calls | 9 |
| Schema accepted | 9/40 |
| First attempt schema-valid | 9/40 |
| Rejected after one repair | 0 |

Schema acceptance is reported separately. It is not semantic acceptance.

## Safety

| Item | Value |
| --- | --- |
| Final safety violations | 0 |
| Unsafe model attempts (repaired or rejected) | 0 |

Only final outputs and reviewer safety flags enter the gate. Unsafe attempts are reported as an observation.

## Usage and cost

| Item | Value |
| --- | --- |
| Tier | free |
| Input tokens | 28382 |
| Output tokens | 3756 |
| Total tokens | 32138 |
| Standard-rate estimate | $0.0179 (information only) |
| Monetary ceiling | $0 |
| Paid fallback | disabled |
| Latency p50 / p95 | 12030 ms / 12987 ms |

## Per family

| Family | Cases | Completed | Schema accepted |
| --- | --- | --- | --- |
| F01 | 3 | 3 | 3 |
| F02 | 3 | 3 | 3 |
| F03 | 3 | 1 | 1 |
| F04 | 3 | 2 | 2 |
| F05 | 3 | 0 | 0 |
| F06 | 3 | 0 | 0 |
| F07 | 3 | 0 | 0 |
| F08 | 3 | 0 | 0 |
| F09 | 3 | 0 | 0 |
| F10 | 3 | 0 | 0 |
| no_match | 10 | 0 | 0 |

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
| Protocol hash | `27dffcb33d19b1745be366130a5d8ab8730bf7cdca3b1cbba620019779d34fc2` |
| Diagnosis subset hash | `02a26f320afe95d02ab13eecceb6536bf220756680ae5aaba220529360659e40` |
| Retrieval config hash | `a56ae39c3053f954aebbb7318034fc39408f72f85198e8cc13e5620f78ec2805` |
| Review packet hash | `90e42accc47365d69bbd4d5ba4e0d50a3ffee823403477f29aeced43dd344dd8` |

## Stop rule

If diagnosis acceptance fails, do not change retrieval to chase the diagnosis score. Open a separate diagnosis scope.

Promotion requires both `retrieval_accepted` and `diagnosis_accepted`. Do not promote on retrieval alone.
