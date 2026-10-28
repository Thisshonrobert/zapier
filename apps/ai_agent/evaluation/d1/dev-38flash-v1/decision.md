# R4.5 diagnosis validation — d1-dev-38flash-v1-20261028

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
| Scheduled | 15 |
| Completed | 3 |
| Failed | 12 |
| Generation calls | 3 |
| Schema accepted | 3/15 |
| First attempt schema-valid | 3/15 |
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
| Input tokens | 9898 |
| Output tokens | 5364 |
| Total tokens | 15262 |
| Standard-rate estimate | $0.0164 (information only) |
| Monetary ceiling | $0 |
| Paid fallback | disabled |
| Latency p50 / p95 | 45864 ms / 128840 ms |

## Per family

| Family | Cases | Completed | Schema accepted |
| --- | --- | --- | --- |
| F01 | 3 | 0 | 0 |
| F02 | 3 | 1 | 1 |
| F03 | 3 | 0 | 0 |
| F04 | 3 | 2 | 2 |
| F05 | 3 | 0 | 0 |

## Review

| Item | Value |
| --- | --- |
| Primary reviewed | 0/15 |
| Double-labeled pairs | 0/8 |
| Cohen's kappa | n/a |
| Semantic accepted | 0/15 |
| Unresolved disagreements | 0 |

## Frozen inputs

| Item | Value |
| --- | --- |
| Protocol hash | `f89d3b0ea0dd35dc15e165d3c7dfde20862358cc55cbcced53c5add1ce43fa9c` |
| Diagnosis subset hash | `246947d49a31fcd5a35fb941cad54cbe190970a3327c7da3e7a3ec87f700d68e` |
| Retrieval config hash | `a56ae39c3053f954aebbb7318034fc39408f72f85198e8cc13e5620f78ec2805` |
| Review packet hash | `b2741d3f0aaabcb291d8b067df68760ffa16a3cdd7500df4fdba8f6c5e690a0d` |

## Stop rule

If diagnosis acceptance fails, do not change retrieval to chase the diagnosis score. Open a separate diagnosis scope.

Promotion requires both `retrieval_accepted` and `diagnosis_accepted`. Do not promote on retrieval alone.
