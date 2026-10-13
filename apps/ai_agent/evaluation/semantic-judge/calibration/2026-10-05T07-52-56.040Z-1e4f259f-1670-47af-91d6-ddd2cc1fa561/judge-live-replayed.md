# Offline semantic judge

Model: gemini-3.5-flash-lite; rubric: semantic-judge-v1; authority: advisory only.

Human-labelled pairs: 0; conclusive: 0; agreements: 0; agreement rate: unmeasured.

| Case | Split | Result | Winner | Reason |
|---|---|---|---|---|
| q1 | development | inconclusive | — | equal_quality |
| q2 | development | inconclusive | — | invalid_output |
| q3 | development | conclusive | q3-left | agreed |
| q4 | development | conclusive | q4-left | agreed |

- Human agreement is a small-sample diagnostic, not a release or authorization gate.
- Human labels are supplied separately and their provenance is not independently verified.
- No human calibration is claimed without labels; no usefulness threshold is inferred.
- Two-pass agreement detects order sensitivity but does not eliminate systematic judge bias.
- Synthetic sanitized pairs only; no production effects or changes to deterministic safety checks.
- Held-out pairs require explicit selection and must never be used for tuning.
- Unknown provider cost and missing token usage remain null.
