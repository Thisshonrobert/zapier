# R4.5 v2 — AI advisory pre-review

**Status: advisory only, not a gate input.** Two blinded AI agents reviewed the 40-item v2 packet. The protocol requires an operator and an independent human reviewer. `review-v1.json` and `decision.md` are untouched, and `diagnosis_accepted` cannot be claimed from this record. Per-item scores and notes are in [`ai-prereview-v1.json`](ai-prereview-v1.json).

Blinding: each agent read only a copy of the review packet, with fixture slugs redacted from the evidence ids. Agent A reviewed in packet order and agent B in reverse order. Neither saw labels, case ids, retrieval metrics, or the other agent's output.

| Item | Value |
| --- | --- |
| Accepted, agent A | 24/40 |
| Accepted, agent B | 25/40 |
| Accepted by both | 22/40 (55%; Wilson 95% 39.8–69.3%) |
| Gate (if human) | ≥ 32/40, Wilson lower ≥ 62% → **would fail** |
| Raw agreement / κ (all 40) | 87.5% / 0.74 |
| κ on the 8 pre-registered double-label items | 1.00 |
| Safety flags | 0 / 0 |

## Per family (accepted by both)

F02, F03, F04, F07, F08: 3/3 each. F10 2/3. F05 1/3. F06 1/3. F09 1/3. **F01 0/3.** No-match 2/10.

## Failure patterns

1. **F01 throttling (0/3).** The first attempt in all three proposed an unsafe replay. After the safety repair, the model escalated to engineering instead of recording the `retry_after` cooldown deadline the cited runbook prescribes. The repair removed the unsafe action but over-corrected.
2. **No-match: explicit rejection called "unknown" (6 of 8 misses).** The evidence records a 400/422 provider rejection, but the diagnosis says the delivery outcome is unverified. The diagnoses also give no preconditions or concrete next evidence.
3. **Invented causes or citations (F06 ×2, F09 ×2, F05).** Examples: "platform configuration fault", "missing retry link", "blocked fixture inputs", "registry defect", plus "repair guidance" citations that appear in neither the evidence nor the passages. Both F06 misses were the cases that needed a safety repair.
4. **F10 reinterpreted SUCCESS (1).** The diagnosis says the stage "incorrectly" recorded SUCCESS. The runbook says to keep a recorded SUCCESS unless independent evidence proves otherwise.

The prompt-injection no-match case was not obeyed. Agent B accepted it; agent A rejected it for lacking next evidence.

## Reading

The retrieval in these cases is accepted (R4.4). The misses are diagnosis-generation failures with `gemini-3.5-flash-lite` and prompt `phase-11a-v3`: the model misreads the delivery status, invents causes, and over-corrects after safety repairs. Under the R4.5 stop rule, do not change retrieval to chase this score. Open a separate diagnosis scope.
