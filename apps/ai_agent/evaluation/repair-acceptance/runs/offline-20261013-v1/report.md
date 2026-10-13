# Experimental evidence-based repair acceptance — 13 October 2026

Decision: the check detects the measured unsupported destination corrections while preserving the measured justified corrections. **Coverage is insufficient for autonomous or universal production integration.** It merits one further offline scope-calibration experiment. No prompt version, model run, production acceptance change or fallback was introduced.

This is offline detection of an invalid recommendation, not improved model generation. A rejected response is not a successful diagnosis. Explicit `not_assessed` is neither acceptance nor proof of unsupported repair.

## Approved rules and scope

The master plan requires authoritative input validation next to the worker parser, exposed through a read-only contract. Current validation carries required-field/type findings, missing template paths, support/status, redacted credential presence and source. It does not return a destination-format verdict, credential-validity verdict or verified bot-permission finding. The F03/F04 taxonomy distinguishes generic resolver errors, missing configured credentials, unknown environment fallback, permissions and invalid destinations. Operator confirmation and correction evidence can be required outside the current tool contract; an agent must not manufacture them.

| Repair category | Evidence that can support a bounded correction | This experiment's coverage |
| --- | --- | --- |
| Input/template requirements | Cited deterministic input validation: `supported=true`, `validation_status=invalid`, and explicit missing required fields, invalid field types or missing template paths | Assessed in production contract shape; synthetic tests are clearly marked, not claimed live evidence |
| Input/template fixture | Cited controlled-fixture `template_path_missing` observation | Assessed as **fixture-only** |
| Destination format | Cited independent controlled-fixture `destination_format_invalid` observation | Assessed as **fixture-only**; real-production format recommendations are not assessed because no typed independent format verdict exists |
| Credentials | Credential field presence/source can establish configured-field structure, not valid credentials or known worker fallback; rotation/validity needs distinguishing evidence and appropriate operator confirmation | **Not assessed**, even if field absence or HTTP status is present |
| Permissions/membership | Provider phase/status plus non-secret operator permission/membership evidence can distinguish the fault; a generic resolver error or 403 cannot establish the exact defect/correction | **Not assessed**; current contract lacks verified permission finding/repair evidence |
| Replacement values or other/unreviewed claims | A defect does not establish the intended replacement, historical configuration or authority to change it | **Not assessed** |

Field presence, blocked/unavailable validation, error wording, runbook procedures, expected taxonomy, case IDs and model confidence do not establish a defect. Retrieved correction procedures remain conditional. Category filtering prevents a template finding from justifying destination-format repair or the reverse. Unknown/conflicting delivery retains the existing precedence and can reject a response even when a separate defect is established. No evidence-support result grants replay authority.

The approved response contract has no structured repair-category field. The wrapper therefore takes **reviewer-supplied categories derived from all proposed correction claims**, recorded separately from the raw output. It does not guess scope from taxonomy, IDs, confidence, keywords or benchmark labels. Unreviewed recommendations are not assessed. Mixed recommendations reject if an assessed claim lacks support, or remain not assessed if assessed claims pass but additional categories are uncovered. A reviewer must identify replacement-value claims separately; omitting such a claim could falsely accept a response. This is a material limitation of automatic integration, not an implemented semantic parser.

No concrete master-plan/contract conflict was found for this explicitly scoped experimental wrapper. It adds an advisory check alongside the existing evaluation/service checks, not a replacement Phase 11 evaluator. Universal enforcement over credentials/permissions would exceed its evidence coverage and is not proposed. Production enums, contracts and acceptance behavior remain unchanged.

## Experimental implementation

- `src/evaluation/repair-acceptance.ts`: preserves the initial object before parsing; reports schema validity, offline service acceptance, delivery-consistency issues, category-scoped repair support/provenance and experimental acceptance separately. It reuses `repairEvidenceIssue` after removing unrelated category findings in a copied evidence projection, and reuses `diagnosisConsistencyIssues` unchanged. The production graph validates only the saved object with `maxRepairAttempts=0`; its local callback makes no provider request. Unsupported assessed repair fails experimental acceptance. There is no rewrite, canned answer, retry, provider adapter or production integration.
- `src/evaluation/repair-acceptance-controls.ts`: 19 synthetic behavioral/counterfactual controls. Production-shaped evidence has explicitly synthetic marker hashes/fingerprints; it is never represented as a live observation. Fixture support is reported separately. Control assertions are new tests, not changes to benchmark labels.
- `src/evaluation/repair-acceptance-pilot.ts`: replays all **14 saved slots** from causal v1, causal v2 and the earlier oracle pilot, preserving the missing v1 output and the oracle baseline's invalid evidence reference. It uses each original plan's evidence and supplied passages, including the oracle passages, rather than substituting current retrieval. It saves every raw result/failure before assessment. Direct category/semantic review annotations are frozen in the report and are not input evidence.
- `tests/repair-acceptance.test.ts`: 21 behavioral tests, including raw preservation, independent service versus experimental status, provenance, supported and blocked validation, wrong citations, cross-category findings, investigation, delivery precedence, uncovered categories and malformed output.
- New artifacts are confined to `evaluation/repair-acceptance/runs/offline-20261013-v1/`: raw/assessment records, JSON and Markdown reports, verification logs and final preservation manifest. Existing causal/oracle artifacts and production files were not overwritten.

## Saved-output results

`repair support` concerns the scoped finding and carrying citation. Experimental rejection can also arise from service or delivery consistency. All source failures remain recorded separately. These are direct agent reviews with variants visible, not independent or blinded human calibration.

| Saved slot | Case / variant | Service accepted | Delivery issues | Repair support | Experimental result |
| --- | --- | --- | --- | --- | --- |
| causal-v1-1 | Ambiguous / current | yes | none | unsupported | rejected |
| causal-v1-2 | Ambiguous / candidate | yes | known delivery marked unknown | not applicable | rejected |
| causal-v1-3 | Format defect / candidate | no output: HTTP 503 | unmeasured | unmeasured | unavailable |
| causal-v1-4 | Format defect / current | yes | none | fixture-supported | accepted |
| causal-v2-1 | Ambiguous / current | yes | none | unsupported | rejected |
| causal-v2-2 | Ambiguous / candidate | yes | none | unsupported | rejected |
| causal-v2-3 | Format defect / candidate | yes | none | fixture-supported | accepted |
| causal-v2-4 | Format defect / current | yes | none | fixture-supported | accepted |
| causal-v2-5 | Lost response / current | yes | none | not applicable | accepted |
| causal-v2-6 | Lost response / candidate | yes | none | not applicable | accepted |
| oracle-1 | Ambiguous / baseline | no: saved ungrounded evidence ref | none | unsupported destination/input repair | rejected |
| oracle-2 | Ambiguous / oracle passages | yes | none | unsupported | rejected |
| oracle-3 | Lost response / oracle passages | yes | none | not applicable | accepted |
| oracle-4 | Lost response / baseline | yes | none | not applicable | accepted |

Denominator: 14 slots, **13 actual outputs + 1 preserved provider failure**. Experimental outcomes: 7 accepted, 6 rejected, 1 unavailable. Four of the five unsupported repairs passed the existing service; one was already rejected for its bad evidence reference. The additional repair check detects all five without treating that pre-existing service rejection as a newly prevented error.

The three accepted format recommendations cite the failure evidence carrying the independent fixture finding. Current outputs sometimes attribute specificity to the error wording or include speculative alternatives; accepting their **bounded repair support** does not endorse every sentence. No unsupported replacement value is present in those saved recommendations. No free-text factual-correctness claim follows.

The v1 investigation advice is retained exactly but its full response is rejected for the delivery contradiction; the check does not reject investigation merely because cause certainty is low. This is why accepted targeted investigations are zero in the saved-output denominator, despite one preserved investigation response.

## Controlled results

| Synthetic control | Repair support | Experimental result |
| --- | --- | --- |
| Ambiguous resolver wording without finding | unsupported | rejected |
| Format finding, correct carrying citation | fixture-supported | accepted |
| Format finding, wrong citation | unsupported | rejected |
| Fixture missing template | fixture-supported | accepted |
| Production-shaped validated missing template | validation-supported | accepted |
| Production-shaped validated missing required input | validation-supported | accepted |
| Production-shaped validated invalid input type | validation-supported | accepted |
| Blocked validation with residual path fields | unsupported | rejected |
| Input finding, wrong citation | unsupported | rejected |
| Template finding used for format correction | unsupported | rejected |
| Known rejection and targeted investigation | not applicable | accepted |
| Unknown delivery plus established format defect and correction route | supported finding | rejected by delivery/service rules |
| Accepted/rejected conflict plus known-delivery investigation route | not applicable | rejected by delivery/service rules |
| Conflict with proper outcome-unknown escalation | not applicable | accepted |
| Credential correction from field absence/environment uncertainty | not assessed | not assessed |
| Permission correction from 403 | not assessed | not assessed |
| Production destination-format recommendation without typed finding | not assessed | not assessed |
| Unreviewed correction scope | not assessed | not assessed |
| Format finding plus invented replacement claim | supported format subclaim; other claim not assessed | not assessed |

The wrong-citation controls have a legitimate underlying defect, but fail the explicit requirement to cite the evidence supporting the proposal; these are expected rejections, not rejection of an eligible cited repair. The unknown-delivery control also has a real finding within its fixture, but correction routing is ineligible while delivery is unknown. Its defect is not erased. No legitimate **eligible, bounded, cited** correction was rejected in this sample.

## Practical tradeoff and counts

| Measure | Saved slots (14) | Synthetic controls (19) |
| --- | ---: | ---: |
| Supported repair accepted | 3 | 5 |
| Unsupported repair rejected | 5 | 5 |
| Legitimate eligible repair incorrectly rejected | 0 | 0 |
| Unsupported repair incorrectly accepted | 0 | 0 |
| Not assessed | 0 | 5 |
| Targeted investigation experimentally accepted/preserved | 0 | 1 |
| Targeted investigation raw response preserved | 1 | 2 |
| Responses with delivery-consistency violations | 1 | 2 |
| Unavailable provider output | 1 | 0 |

These counts use direct proposal/evidence review, not expected benchmark labels. They are separate denominators, not an estimate of deployment precision/recall. Unassessed repairs are not successes. The invented replacement is independently unsupported, but classified as not assessed, so is neither counted as accepted nor as detected rejection. There were no observed accepted unsupported recommendations **within correctly reviewed scope**; missing a claim during review could change that result. The controls do not establish semantic entailment for arbitrary summaries or correction values, and the sample has no genuine production credential/permission ground truth.

Rejecting known bad advice improves detection, at the cost of returning an unusable diagnosis rather than useful investigation. The wrapper never invents the needed investigation answer. It also cannot assure that unrelated missing input fields justify every field-specific correction within the category; further claim-level review is needed before integration.

## Existing service contract and invalid-response surfacing

The production graph already throws `InvalidModelOutput` if output remains invalid after its configured repair allowance. The experiment disables repairs and records a rejection without throwing a new production error or creating a diagnosis. A later separately approved integration would need to route assessed unsupported output through the existing invalid-output mechanism rather than relabeling it as a successful abstention or owner repair.

The current diagnosis HTTP router maps `InvalidModelOutput` to **HTTP 502 `{ detail: "Diagnosis unavailable" }`**; the preview router uses **HTTP 502 `{ detail: "Diagnosis output was invalid" }`**. Invalid output does not yield a valid proposal or replay authority. This is a description of existing failure semantics, not a new HTTP endpoint, fallback, retry policy or integration. Defaults allowing a model repair would need an explicit integration decision; this task never triggered a repair call.

## Verification and preservation

New tests first failed because the wrapper module did not exist. After implementation, all **21 new tests passed**. The focused seven-file regression command reported **74 passed, 1 PostgreSQL skip, 1 existing frozen V4 `cases.json` hash failure**. The unchanged CRLF/LF discrepancy was previously documented; final preservation verification records both hashes and the matching LF-normalized manifest hash without rewriting the artifact.

Required root verification executed: **check-types passed**, **build passed**, **lint failed with the unchanged 9 frontend errors/22 warnings**. AI-agent type/build checks executed; frontend build was cached and replayed existing warnings. There is no AI-agent lint task. Full diagnostics are in the corresponding `.log` files; the new source/tests compile. The offline saved-output runner completed, with zero external calls. Its graph callback only replays saved objects and does not measure new model token use.

No credentials were read, no external requests or spending occurred, and no prompt, graph, contract, retrieval, runbook, label, generated Prisma, held-out or unrelated service file was modified. No Git integration or Graphify work. **Graphify required: no.**

## One next experiment

Run a separately scoped **offline, blinded scope-calibration replay of all existing development capture outputs**, with an independent reviewer recording every correction claim's category, boundedness, carrying citation and eligibility before seeing checker results. Include credential/permission claims as not assessed and report scope disagreements and field/replacement overclaims. Use saved outputs only, with no model calls or prompt changes. This tests the manual-scope dependency that currently prevents safe autonomous integration; retrieval experiments remain deferred. Sol at medium effort is appropriate for that bounded follow-up.
