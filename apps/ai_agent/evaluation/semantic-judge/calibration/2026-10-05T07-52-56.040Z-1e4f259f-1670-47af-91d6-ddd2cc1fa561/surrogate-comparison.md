# Phase 12 real-model pilot and surrogate comparison

Model: gemini-3.5-flash-lite. Eight approved calls completed on four synthetic development pairs. No human labels are present. The reviewer was an independent agent, not a human.

| Pair | Judge | Reason | Agent review |
|---|---|---|---|
| Q1 | inconclusive | equal_quality | right |
| Q2 | inconclusive | invalid_output | inconclusive |
| Q3 | left | agreed | left |
| Q4 | left | agreed | inconclusive |

Conclusive coverage: 2/4 (50%). Agreement on conclusive surrogate-labelled comparisons: 1/2 (50%). Human agreement remains unmeasured. One pair contains invalid output, so the live command exited 1.

Offline replay reproduced verdicts, reasons, invocation counts, votes and token usage; callback latency is newly measured and excluded. Replay also exited 1 because the captured failure was preserved.

Reported usage: 11480 input + 1400 output = 12880 total tokens. Cost is unpriced/null.

- Four preselected development pairs are not a representative sample.
- Two authored perturbations are probes, not naturally occurring model outputs.
- Same-family generator and judge may share systematic bias.
- One invalid-output pair prevents claiming a clean real-model run.
- Only 1 of 2 conclusive judgments agrees with surrogate review; this is not human calibration or useful-signal proof.
- Two-pass consistency does not establish correctness; q4 consistently prefers concise text where surrogate review rated semantic quality equal.
- No additional paid calls, repairs, prompt tuning or held-out evaluation were performed.

Implementation and bounded pilot are verified. Phase 12's calibrated-human usefulness criterion is pending; no replay authority or release claim follows.
