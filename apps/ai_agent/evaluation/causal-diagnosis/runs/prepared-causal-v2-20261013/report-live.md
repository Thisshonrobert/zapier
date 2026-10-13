# Six-generation causal v2 comparison — 13 October 2026

Decision: **comparison complete; semantic gate failed; do not freeze v2 for retrieval experiments or adopt it in production.** All six planned generations returned HTTP 200. There was no provider failure, so the ambiguous-case result is an observed diagnosis failure rather than an incomplete provider control.

This report records the authorized execution after the retained preparation report (`report.md`). The exact pre-run plan, preparation snapshots and v1 run remain unchanged.

| Case | Current output | Candidate v2 output | Candidate requirement |
| --- | --- | --- | --- |
| `f03-permission-ambiguous` | Unsupported owner correction; known rejection | Unsupported owner correction; known rejection preserved | **Fails**: needs investigation without asserting a defect |
| `f04-invalid-destination` | Bounded owner correction, though its reason attributes format specificity to error wording | Bounded owner correction explicitly citing the separate `destination_format_invalid` fixture finding | Passes in this sample |
| `f07-provider-response-lost` | `abstained + outcome_unknown + escalate` | `abstained + outcome_unknown + escalate`; no replay proposal or inferred non-delivery | Passes in this sample |

## Specific semantic failure

The candidate ambiguous output says the observed error is `Invalid channel username` and keeps rejected delivery. Its alternate explanation treats configuration validity as uncertain. Despite that uncertainty and unavailable destination validity/bot permissions/provider status, the proposal is `owner_action_required + request_manual_fix` and asks to “Review and correct the recipient channel username or destination configuration.” Its reason asserts that destination configuration “requires manual owner correction.”

The cited failure evidence carries rejection and the reported resolver error; it contains no independent destination-format defect finding. The fixture input-validation evidence is blocked, not a supported invalid-input finding. Retrieved remediation is a conditional procedure, not incident proof. The narrow repair-evidence check correctly reports `unsupported_owner_repair` for both ambiguous outputs. Both nevertheless pass the unchanged service validator.

V2 avoids the previous known-rejection-to-unknown-delivery error **in this one sample**, but reintroduces the unsupported correction v1 avoided in its one prior sample. This cannot establish comparative reliability or isolate a responsible prompt sentence. The observed remaining failure is error-to-defect conflation in action selection, not a demonstrated retrieval vocabulary or navigation gap.

The next diagnosis change should target exactly that decision: correction must have a cited independent defect finding; otherwise retain the known rejection, keep only supported family/hypotheses and request targeted investigation. Preserve the successful format-defect behavior, including provenance, and the successful unknown-delivery route. The existing repair check already detects the failure; adding another delivery patch would not address it. Do not silently rewrite outputs, introduce production gating, expand retrieval or issue more generations under this allocation. No v3 prompt or production change was made during this execution.

## Control review

The candidate format-control reason explicitly attributes the defect to a controlled fixture observation of `destination_format_invalid`. Its proposal cites `fixture:failure:f04-invalid-destination`, which carries that finding. It requests bounded format verification/correction, invents no replacement value or historical configuration and proposes no replay. The speculative upstream-mapping alternative is phrased as a possibility; it is not established incident evidence. The defect remains synthetic, not a verified live configuration problem.

The candidate response-lost output explicitly retains unknown delivery and follows the required abstention/escalation route. It does not infer non-delivery or recommend replay. Its receipt-timeout alternate explanation is hypothetical, not an observed provider fact. Empty preconditions do not grant replay authority; unchanged application restrictions remain in force.

All six objects pass schema and service acceptance and have no delivery-consistency violations. That does **not** establish semantic correctness. Repair support, delivery consistency, service acceptance and this direct semantic review remain separate signals. The review was performed by the agent with variant names visible, not a blinded or independent human review.

## Measured execution and preservation

- Model/account: same `gemini-3.5-flash-lite`, `generate-content`, existing project `gen-lang-client-0124525712` and unchanged key. The user's request authorized reuse of the saved free-tier confirmation; project/key/model/free-access checks succeeded. Original confirmation timestamp was retained, not refreshed. Successful responses establish availability at call time; account billing tier was not independently reverified.
- Exactly **6 initial generation requests + 6 separately audited token preflights = 12 provider HTTP requests**. Every request returned HTTP 200. No repairs, retries, planners, judges, fallback, smoke tests, replacement generations or continuation.
- Sequential actual generation-start gaps: **12,389; 10,240; 10,012; 10,004; 10,009 ms**. Minimum exceeds 10 seconds. Provider allocation elapsed time: **56,866 ms**.
- Measured generation usage: **19,748 input + 2,136 output = 21,884 total tokens**. All calls stayed under the prepared 64,000-total/4,096-output ceilings and per-call/run deadlines. Token-count operations are counted separately; they are not additional generations.
- Generation cost is estimated as **$0 under the reused confirmed free-tier terms**. Invoice/billed cost was not independently observed and remains null.
- Within each pair, evidence/input, retrieval query/passages/order/citations/hashes, schema, model and generation settings match the prepared plan; only instructions differ. Pair order was current→candidate, candidate→current, current→candidate. Source hashes match the prepared final review.
- `started-1.json` through `started-6.json` record the slots. `attempt-1.json` through `attempt-6.json` preserve initial sanitized outputs before evaluation; `result-1.json` through `result-6.json` preserve final measurements. Offline auditing verified that evaluations did not change those outputs. `requests.jsonl` records actual operations/status/timing; `report.json` contains the complete runner result.
- `execution-authorization.json` records authorized saved-access reuse. `execution-manifest.json` contains token totals, timing, exact artifact/source hashes, pair parity and semantic decision. Offline auditing verified every frozen v1 artifact hash still matches the pre-execution snapshot.

No production source or experimental prompt/runner source was changed during this execution. Only new authorization/audit helpers and run artifacts were added. The prior verified source therefore retains its offline verification record: 26 focused passes, type check/build passes, unchanged frontend lint baseline, and the disclosed V4 CRLF hash failure/PostgreSQL skip. The new offline audit executed successfully and verified request allocation, source/plan parity, token limits, spacing and preserved responses. No extra repository build/test pass was needed for captured-result-only work.

## Retrieval decision

Do not freeze v2 as an eligible diagnosis candidate and do not start the local reranker, HyDE or PageIndex experiment. Address unsupported owner correction first. After that diagnosis gate has been measured and satisfied in a separately authorized allocation, start a bounded comparison using the existing local reranker on eligible sections. Reserve HyDE for demonstrated vocabulary gaps and PageIndex for demonstrated structural-navigation gaps; neither gap is demonstrated by this comparison.

The six-slot allocation is exhausted. No additional calls were made. No Git integration, Graphify operation, held-out access, dependency addition, production adoption or unrelated edit. Concrete master-plan conflict: none found. **Graphify required: no.**
