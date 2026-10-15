# AI-assisted DLQ support workspaces and persistent lab

Date: 2026-10-13. Status: proposed design and phased delivery plan; implementation has not started.

Parent authority: [master plan](../ai-dlq-master-plan.md), particularly Section 5. This is the current product-scope revision for that plan, not a replacement for completed reliability work. The user requested planning first; the pasted lab prompt is reference material, not authorization to start implementing its execution instructions.

## 1. Product purpose and scope

The resolver assists support engineers with grounded diagnosis and suggested remediation. Application code owns permissions, routing, repair validation, approvals and execution. The AI has read-only case-scoped tools and cannot grant itself authority, edit Zaps, assign users, send messages or publish replay events.

Deliver three workspaces inside the existing Next.js application:

| Audience | Route | Job and permitted scope |
| --- | --- | --- |
| Owner | `/failures` | Understand failures in their own Zaps; see customer-safe context and published suggestions; open the relevant Zap editor; submit repair completion for support review. |
| Support operator | `/triage` | Discover failures across owners, investigate, review evidence, publish owner repair requests, escalate to engineering, and approve/request narrowly eligible replay. |
| Engineer | `/engineering` | See cases explicitly routed to engineering, inspect authorized evidence, record findings, and return them to support or resolve with an explanation. |

Owner repair will link to the Zap editor rather than edit fields on the failure page; the user selected this on 2026-10-13. The editor must support saving the requested repair, including action fields such as email subject. An owner completion acknowledgement does not certify that the issue is fixed.

In the local lab, seed the existing support identity `triage-demo@example.invalid` and an engineer identity `thisshonrobert0205@gmail.com`. Seed at least three ordinary owners. Preserve local-demo support sign-in compatibility; credentials belong in ignored local configuration/output, not new tracked fixtures. The engineer address is an account identifier, not permission inferred at sign-in and not a destination for an automatic email. No account roles are changed by this planning task.

Outside the lab, grant privileges to a verified existing account through an explicit administrative operation. Never make an arbitrary person an engineer merely because a submitted email matches this address. A new role does not confer support privileges or replay authority.

## 2. Findings and feasibility of the pasted lab prompt

The persistent lab is feasible using the existing PostgreSQL, Kafka, Bun and worker pipeline. Keep the disposable demo as a clean verification option and add a persistent lab alongside it.

| Prompt requirement or assumption | Decision after repository inspection |
| --- | --- |
| Reuse multiple users and Zaps; exercise the actual pipeline | Retain. Stable seed definitions; each deliberate scenario execution creates a new correlated run. No synthetic failures presented as pipeline proof. |
| Persistent dedicated database | Retain with a strict local lab allowlist, ownership marker, tracked migrations and explicit destructive cleanup. Stopping services preserves data. |
| All phases are implemented | Do not assume completion from the prompt. Existing code includes diagnosis/decisions/replay machinery; routing and accurate interactive replay are incomplete, and external release gates remain open. |
| Never enable replay | Superseded by the user's new requirement. The lab supports explicit operator-approved replay with simulated action providers. No automatic approval and no production release bypass. |
| Replace global fetch to simulate both providers | Insufficient as a transport guarantee. Telegram has injectable fetch functions; email already has `EmailTransport` at `sendEmail`, but its exported handler binds the default SDK transport. Inject at the handler/registry boundary and prove interception of actual worker calls. |
| Email missing required input | The dry-run validator detects missing `to`, `subject`, and `body`; do not assume the execution handler enforces that same contract before transmission. Specify and test the outcome observed in the real execution path. If alignment changes behavior, isolate it as an explicit compatibility fix. |
| Webhook ownership mismatch | Confirmed gap: the ingestion route checks user and Zap existence independently. Bind Zap to the supplied owner before creating any run/outbox row. Also use Express responses for rejected authentication rather than returning an unattached Fetch `Response`. |
| A frontend link is enough for owner repairs | Not currently true: the inspected Zap router has create/read routes but no update route. Add a bounded owner-authorized save flow before advertising repair capability. |
| Buttons route cases to people | Currently decisions are persisted/audited and synchronized to the agent. No engineering queue or owner repair workflow exists. Add durable routing in application state. |
| Replay demo proves interactive replay | The current sixth case seeds approval/request and completes replay at startup. Keep it labelled a fixture demonstration; add a genuine investigate -> approve -> request -> worker journey separately. |

Existing gaps also explain the observed escalation: the retrieved F01 runbook still says Phase 5 replay is unavailable and refers to owner approval. The frontend prints a fixed disabled message, and the authority snapshot reports `replayEnabled: false`. The new investigation is separate from the startup seeded proposal, so its current view can say no replay request despite a different proposal having executed one.

## 3. Permissions and application boundaries

- Preserve `isSupportOperator`; introduce an independent engineering capability using the existing server-side permission pattern. Ordinary owners have neither capability. Role provisioning cannot be performed by public registration, an owner edit, a JWT claim supplied by the browser, or the model.
- Owner endpoints always derive the subject owner from authenticated identity. Cross-owner reads and writes fail, including guessed case IDs, Zap IDs, action IDs and investigation IDs.
- Support operators retain cross-owner case discovery and audited case-scoped evidence. All failures remain available in the support queue, including cases awaiting an owner or engineer; queue filters do not remove visibility.
- Engineering endpoints require current engineering permission and an active/escalated case binding. Engineers see the escalation queue, not unrestricted tenant discovery or support replay APIs. Revocation takes effect on subsequent reads/writes.
- Separate authentication of a person from authorization to a role and subject-owner access. Agent service scopes remain bounded to one case regardless of who initiated the investigation.
- Reuse owner evidence endpoints where sufficient, and add an owner-safe projection for Zap identity, step label, published repair instructions and workflow status. Do not expose internal support notes, arbitrary raw payloads, credentials, traces, or unsanitized model output through that projection.

Proposed API additions use the existing backend/router pattern: owner repair acknowledgement under `/api/v1/triage/cases/:caseId/...`; restricted engineer list/detail/action endpoints under `/api/v1/triage/engineering/...`; and operator routing operations under the existing `/operator/cases/:caseId/...` namespace. Exact schemas are versioned, bounded and shared with the frontend. Keep internal AI decision synchronization distinct from human notifications.

## 4. Durable case workflow and handoff

Add minimal application-owned case workflow state keyed uniquely to the original failure, plus append-only human workflow events. Keep it separate from immutable proposal/approval/replay authority and from LangGraph checkpoints.

The workflow record binds case, subject owner, current responsible queue, optional assigned engineer, current published proposal/investigation, and an optimistic version. Events bind actor, subject owner, case, action, prior/new workflow state, timestamp and bounded redacted notes. Derive execution truth from execution/replay ledgers rather than copying SUCCESS into a mutable ticket field.

| Human action | Durable result | Visible destination |
| --- | --- | --- |
| Failure discovered | Case appears as needing support; lazily create workflow state once if needed | Support queue and its owner's failure page |
| Operator requests owner repair | Persist reviewed customer-safe instructions and transition to awaiting owner | Owner page, with in-app action indicator; support retains visibility |
| Owner opens repair | Navigate to the correct Zap and action step | Owner-authorized Zap editor |
| Owner saves and submits repair completion | Persist acknowledgement and transition to awaiting support review | Support queue; owner sees submitted status |
| Operator escalates | Persist escalation reason, evidence links, and engineering queue/assignment | Engineering tab; support retains visibility |
| Engineer returns findings | Persist findings and return responsibility to support | Support queue with a new activity event |
| Authorized human resolves | Persist resolution reason and actor | Both authorized views show resolution; original failure evidence remains |

Use idempotency keys, row locking/version checks and authorization rechecks so repeated clicks or concurrent operators do not create duplicate handoffs. A decision and its routing effect commit atomically, or a durable application outbox reconciles the effect; a successful response must not leave an untracked routing gap. Existing `TriageDecisionNotification` delivery continues to synchronize the agent after the durable decision.

Published owner instructions are operator-reviewed projections of diagnosis/validation, with bounded missing-field identifiers and safe editor destinations generated by application code. Owner pages can immediately show deterministic failure/validation context before diagnosis exists, explicitly labelled; they must not invent an AI suggestion or automatically make paid model calls.

Editing a Zap changes future configuration. It does not rewrite the original run, attempt, failure, fingerprints or replay authority. Changed inputs cannot replay the original case under the existing policy. Support can revalidate the repair and observe an explicitly labelled new test/future run; a new run is not an evasion of replay deduplication and must not be represented as the original replay. Unknown external delivery remains unresolved until appropriate human investigation.

Initial human delivery is in-app. Email, Slack, Linear/Jira tickets, paging and SLA automation are separate future integrations, not implied by an escalation button or the engineer email address.

## 5. Interactive replay and diagnosis alignment

Implement the user's operator replay requirement through the existing policy, approval, `ReplayRequest`, dispatcher and worker path. Preserve the initial allowlist: captured Telegram send-stage 429 rejection, numeric destination, explicit fingerprinted bot token, unchanged inputs/handler, valid cooldown/order, known rejection, and at most one replay. Email, unknown outcomes, changed inputs, environment-only credentials, usernames and bulk replay remain blocked.

1. Update versioned F01 runbook/prompt guidance to current operator approval terminology. Explain that historical raw snapshots may be unavailable while captured attempt fingerprints and current comparison still support the existing policy; do not fabricate snapshots or erase missing-evidence disclosures.
2. Always collect required case-scoped failure, execution and input-validation evidence before producing a replay advisory. Expose an application-computed eligibility/capability summary as evidence, never as model authority. Check whether current contracts already carry enough facts before adding a bounded versioned extension.
3. The AI may propose replay candidacy when grounded evidence supports it. Confidence and diagnosis F01 alone do not make a case eligible. Application policy may deny an AI candidate. It must also expose observed eligibility separately if the AI conservatively recommends escalation; support can request a fresh reviewed candidate through the same policy/approval service, with provenance explicitly recorded, rather than impersonating the model or silently rewriting its proposal.
4. Show separate diagnosis advice, current policy eligibility/reasons, approval decision, request publication and worker execution. List request history for the case across investigations, while identifying which proposal authorized each request. A fresh investigation must not conceal the completed startup replay or allow a second replay.
5. Provide an eligible proposal's operator **Approve replay** action, then an explicit **Request replay** action after a fresh dry run. Persist both using existing endpoints and idempotency. An approval alone remains distinguishable from dispatch. No automatic approval, implicit model action or direct Kafka republish.
6. Replace the fixed disabled paragraph and constant snapshot flag with server-reported capabilities for investigation, replay-intent recording and replay execution, including release readiness and reasons. Reject unauthorized or disabled API calls even if someone constructs the request manually.
7. Workers revalidate at claim time and preserve original history. A replay failure or UNKNOWN outcome stops the allowance. Support/owner/engineer views display provider acceptance as the recorded outcome, without claiming final end-user delivery.

The lab explicitly enables the same dispatcher/worker code against simulated providers and marked local resources. Scope any local override to a verified lab/demo environment; `REPLAY_RELEASE_READY=true` by itself must not bypass production readiness. Outside the lab, production activation is a separate release task after Section 5 provider rejection semantics, target-environment grants/operational verification, and current release checks pass. Do not infer those results from stubbed success.

Display simulated-provider mode throughout the lab and record it in the run manifest/capability projection. Lab pipeline evidence is observed from the actual local execution ledger; it is not a direct fabricated evidence fixture. Preserve the existing prohibition on replay candidacy from artificial/incomplete evidence contracts. If current contracts cannot distinguish these concepts, resolve that explicitly in 16F with a bounded lab profile and compatibility tests; never falsify provenance or globally relax production evidence rules to obtain an Approve button.

## 6. Persistent DLQ lab design

Use `scripts/dev/triage-lab.ts` as the orchestration entry point, with small supporting scenario, transport, environment/ownership and verification modules only where responsibilities require them. Preserve the existing disposable `scripts/demo/*` flow. No new execution pipeline, broker, AI framework or service.

### Lifecycle and persistence

- Dedicated allowlisted local database, proposed name `triage_lab`; application and agent schema share the intended lab connection but retain separate permissions. Reject production environment, remote DB hosts and unmarked/ordinary development databases.
- Create resources only after validation. Use tracked Prisma migration deployment, not rerunning every SQL file on every seed. Apply agent/checkpoint migrations once under controlled locking. A durable lab ID/schema version and ownership manifest identify resources; never adopt unrelated users/Zaps by coincidental names.
- Stable owner/scenario keys identify seed definitions. Seeding is transactional/idempotent and preserves owner repairs; an explicit fixture-reset command can restore known scenario definitions. Repeated runs generate distinct batch/run correlations and retain history intentionally.
- Reserve lab ports independently, proposed frontend/backend/webhook/agent ports `3200/3201/3202/3204`. Isolate Kafka topics and consumer groups by persistent lab ID. Before reusing running services verify a lab identity handshake with matching database/resource fingerprint; an open port alone is not proof. Refuse collisions with ordinary services.
- `start` owns only child services it launched and leaves database/topics on stop. An orchestrated `run` may start/reuse that verified stack. Explicit shutdown and bounded cleanup await process exits; no killing unrelated stacks.
- Strict local ownership guards precede cleanup. Default cleanup targets selected lab batches/owned artifacts; a separate explicit `reset --yes` may drop/recreate the entire marked allowlisted lab database/topics. Remove records in foreign-key order and respect immutable authority triggers; if safe selective deletion is unsupported, use isolated full reset rather than disabling production immutability.

### Proposed command contract

Implementation will add root Bun scripts so commands are short and consistent:

```text
rtk proxy bun run lab:seed
rtk proxy bun run lab:start
rtk proxy bun run lab:run --scenario all
rtk proxy bun run lab:run --scenario telegram-rate-limit
rtk proxy bun run lab:status
rtk proxy bun run lab:verify --batch <batch-id>
rtk proxy bun run lab:stop
rtk proxy bun run lab:cleanup --batch <batch-id> --yes
rtk proxy bun run lab:reset --yes
```

These are planned commands, not commands available today. `seed` and scenario runs make no paid model calls. Investigations are manually initiated in the operator UI; any future batch diagnosis requires an explicit flag, configured budget and separate output label.

### Scenario matrix and provider isolation

| Scenario | Expected boundary/outcome | Replay treatment |
| --- | --- | --- |
| Telegram 429, valid retry delay, numeric chat ID and explicit fake token | Real send-stage rejection; `telegram_http_429` | Eligible after cooldown and policy/operator approval; replay stub accepts same inputs |
| Telegram 403 | Real send-stage rejection; `telegram_http_403` | Owner/config investigation or engineering as observed; no replay allowance |
| Telegram destination lookup rejection | Resolution failure before send; `not_attempted` | Owner repair, no original changed-input replay |
| Telegram transport throw after send starts | Send uncertainty; `unknown` | Engineering investigation, replay denied |
| Missing Telegram credentials | No external transport; actual pre-send safe code | Owner repair, replay denied |
| Email controlled 4xx error with valid SDK error shape | Send-stage rejection; chosen allowlisted Resend safe code | Diagnosis/repair only; email replay deferred |
| Email transport throw | `email_transport_error`, `unknown` | Engineering investigation, replay denied |
| Missing email subject/template input | Dry-run invalid; execution behavior verified against handler/parser | Owner repair; no invented pre-send evidence |
| Successful control and multi-stage failure | Ordered predecessor success, targeted later failure | Prove displayed step and policy ordering; no new replay category |

Freeze exact phase/code/status/retry expectations only after real handler tests establish them. Distinguish a simulated provider response from a seeded failure row: lab pipeline rows come from real worker execution even though provider responses are simulated.

Select provider outcomes deterministically by lab scenario/run/attempt identity, not process-local counters or mutable action edits between rejection and replay. Original and replay attempts share the fingerprinted request inputs. Persist any simulator state needed across worker restart; one run cannot consume another run's simulated outcome. Lab transports may consult the lab-owned execution context, but that does not widen the AI tool scope.

Reuse `EmailTransport` and Telegram transport functions through minimal injectable action-handler construction/registry selection at worker startup. Keep parser, handler error normalization and execution-store logic shared with production. No separate fake handler that merely throws preconstructed failure records. Unrecognized URLs, SDK calls, scenario identities and credentials fail closed. Initialize only fake lab provider credentials and prove SDK interception plus absence of outbound provider requests; global fetch replacement alone is not acceptance evidence.

Each run triggers the authenticated local webhook for each selected owner/Zap, then waits with deadlines for run/outbox creation, processor publication, worker execution/attempt/failure, durable DLQ broker ACK stamping and a matching DLQ event. Correlate by batch/scenario/run metadata and captured identifiers, never newest global failure. Verify provider outcome/code/phase/stage/owner/execution linkage exactly, and reject duplicate or unexpected matches. Return nonzero on timeout/mismatch/unpublished failure. A partial rerun must reconcile already-correlated runs, not blindly trigger them again.

## 7. UI brief

Reference: [Ecomiq customer-support ticketing by Bagus Fikri / Fikri Studio](https://dribbble.com/shots/26211530-Ecomiq-SaaS-E-commerce-Customer-Support-Ticketing). The published description emphasizes a structured ticket view and an integrated knowledge base. Use that composition and the user's requested three-column organization as inspiration; do not claim pixel fidelity without inspecting the actual reference image during UI implementation.

Visitor mode: Operate. Primary goal: rapidly determine what failed, which evidence supports the diagnosis, who is responsible next, and which actions are currently permitted.

- Left: compact searchable ticket list with Zap name, owner for privileged roles, step/provider, readable failure summary, responsibility/status and age. UUIDs are secondary copyable details. Selection and filters survive refresh; no stale investigation ID carries over to another case.
- Middle: selected Zap/step context, diagnosis, missing evidence and uncertainty, published proposal, responsibility, and the relevant human actions. Activity/history follows beneath. This is a diagnosis workspace, not a chatbot or decorative KPI dashboard.
- Right: evidence and knowledge-base tabs with observed facts, input validation, attempt/replay ledger, provenance/completeness and cited versioned runbook excerpts. Customer-safe equivalent for owners; internal traces remain privileged.
- Owner view emphasizes “Your Zap X failed at step N,” exact missing-field labels and **Open Zap editor** / **Submit repair for review**. Engineer view emphasizes escalation reason, assigned responsibility and **Return findings to support**. Support view exposes only actions allowed by server policy and current role.
- Required UI states: no failures, no diagnosis yet, investigating, missing evidence, provider uncertainty, awaiting owner, awaiting engineering, repair review pending, eligible replay, cooldown, denied/stale approval, queued/published/running replay, accepted/failed/unknown outcome, revoked access, expired proposal and service outage. Fixed “replay disabled” text is removed.
- Restrained neutral surfaces, sharp typography hierarchy, subtle dividers, compact status marks and the established Zapier accent for primary actions. Avoid ornamental gradients, giant cards, excessive badges, fake charts, repeated UUID headings and generic AI-summary tiles. Preserve accessible contrast, visible keyboard focus and readable density.
- Desktop shows three panes; narrower screens use list/detail navigation and evidence tabs/drawer without squeezing all columns. No mandatory animation beyond useful transition/loading feedback; respect reduced motion.

During UI implementation use Impeccable and frontend-design, capture PRODUCT.md and the scoped design/surface brief from this approved product truth, inspect the actual Dribbble image, and reuse existing components/tokens where suitable. Do one batched desktop/mobile inspection and at most one correction confirmation. The reference page was inspected during planning; its full showcase images could not be fetched, so exact visual reproduction has not been assessed.

## 8. Ordered delivery phases

Each phase is a separately verified increment. Use a single implementation agent by default, preserve unrelated dirty files, and stop at its handoff. All paths below are proposed edit/read boundaries, not instructions to stage whole directories. Add one focused implementation plan for the selected phase at execution time; do not generate duplicate architecture plans.

| Phase | Deliverable and concrete scope | Required proof |
| --- | --- | --- |
| 16A: lab lifecycle and ingestion guard | Create `scripts/dev/triage-lab.ts` and focused env/ownership/seeding helpers; root `package.json` commands; extend `apps/webhook/index.ts` and focused webhook tests; reuse Prisma/agent migration tooling. Stable owner/operator/engineer definitions, marked DB/topics, start/stop/status/reset guards. | Idempotent/concurrent seeding; mismatched webhook owner creates no rows; invalid auth actually returns an HTTP rejection; ordinary resources and occupied unrelated ports refused; stop retains data. |
| 16B: real pipeline scenario matrix | Lab scenarios/transports/verification under `scripts/dev/`; minimal injection edits in `apps/worker/actions/email.ts`, `telegram.ts`, `actions/index.ts` and `apps/worker/index.ts`; reuse execution/publisher services and disposable tests. | All selected Telegram/email scenarios traverse webhook/outbox/Kafka/worker/DLQ; exact correlation/outcomes; restart-safe simulation; no provider egress; repeat runs reuse seeds; failures/timeouts exit nonzero. |
| 16C: role and durable routing foundation | Additive Prisma migration/schema and generated client; `apps/primary_backend/services/investigation-authority.ts`, new workflow/engineering services and `route/triage.ts`; bounded shared contracts; existing decision notifications; local role provisioning. | Ordinary owners denied privileged APIs; engineer restricted to routed cases; atomic/idempotent handoffs, concurrency, revocation, actor/owner audit and synchronization recovery. |
| 16D: owner failure and repair journey | New `/failures` route and owner components/client contracts; extend owner projections in `triage-evidence.ts`/router; bounded owner-authorized action update in `route/zap.ts` plus schema validation; update `apps/frontend/src/app/zap/[id]/page.tsx` for real editor/save. | Only own failures/fields; correct Zap/step links; missing subject fixed/saved; redaction; repair acknowledgement returns to support; stale edit rejected; original ledger untouched and changed-input replay denied. |
| 16E: engineering workspace | New `/engineering` route and engineering components/client; routing findings/return/resolve endpoints from 16C; role-aware navigation. | Designated engineer sees persisted escalations after reload/restart; unauthorized reads/writes denied; findings return to support with full history; no engineer replay authority. |
| 16F: interactive replay and guidance | Version/hash update of F01 runbook and relevant prompt/contract fixtures; current eligibility/capabilities in authority/route and shared frontend contracts; `TriageResults.tsx` and operator client controls; explicitly reviewed support candidate path if needed; lab-gated dispatcher configuration. | Real lab failure -> grounded candidate -> operator approval -> explicit request -> dispatched -> accepted replay; duplicate clicks/restart no extra sends; historical replay visible across investigations; stale/unknown/changed-input/second replay denied; production env override fails closed. |
| 16G: unified three-pane UI | Refactor `CommandCenter.tsx`, `TriageResults.tsx`, role workspace components/navigation and narrowly scoped styles; PRODUCT/design briefs; retain existing streaming/polling fallback. | Accessible desktop/mobile role journeys, long evidence/empty/error states, no fake actions or state labels, keyboard operation, correct live capabilities and reusable visual system. |
| 16H: full acceptance and handoff | Cross-role integration/E2E fixtures and reproducible lab smoke command; lab runbook; scoped status/ADR/index updates through Antigravity handoff. | Automated full journey below, restart persistence, exact test/check results, honest external-release limits; Graphify only after merged/pushed major milestone. |

16A seeds the engineer account identity and desired role definition only; the independent engineering permission is provisioned when 16C introduces and tests it. Do not grant that account support permission as a temporary substitute.

All phases preserve LangGraph, retriever, original delivery semantics and deterministic policy. Ignore unrelated AI model experiments, Graphify cache/memory, generated artifacts not required by a migration, evaluation datasets and other dirty changes unless explicitly named in that phase. This plan does not authorize staging, commits, pushes, branch switches, merges or production role grants.

Suggested model/effort: GPT-6 Sol medium for 16A-16F security, transactions, replay and integration; Terra medium for bounded 16G presentation tasks after contracts are fixed; Sol medium for 16H acceptance and final review. Do not use high effort or delegate by default. The next increment is 16A, using Sol medium.

## 9. Acceptance journey and verification

1. Seed/start the lab, run the matrix with one command, and confirm exact durable failures plus DLQ events across at least three owners and both providers.
2. Sign in as an ordinary owner: see only their failures, understand missing email subject at a named Zap/step, save via the editor and submit repair completion. Another owner's IDs and privileged APIs are denied.
3. Sign in as support: inspect all owners' cases, investigate and publish a safe repair request or engineering escalation. Reload/restart; routing and activity remain correct.
4. Sign in as the configured engineer: see that escalation, inspect allowed evidence and return findings. The owner sees only the published customer-safe status.
5. On a new captured eligible Telegram 429 case, investigate and approve/request replay interactively. Observe request publication and worker outcome separately; verify exactly one additional simulated provider attempt and unchanged original history.
6. On missing credentials, unknown delivery, changed configuration, existing completed replay, role revocation and stale approval, verify replay denial with concrete reasons; UI advice never grants authority.
7. Stop/start without losing definitions/history, run a new correlated batch without duplicating owners/Zaps, and verify cleanup/reset refuse ordinary databases/topics.

Run phase-focused tests, real isolated PostgreSQL/Kafka integration where needed, then the repository-required `rtk proxy bun run check-types`, `rtk proxy bun run lint`, and `rtk proxy bun run build`. Type-check coverage currently depends on package scripts; new scripts must receive a focused check rather than assuming root check-types covers them. Record unexecuted infrastructure tests as blocked. Existing frontend lint failures are not a passing result and can only be treated as a baseline after exact diagnostics and unchanged source are confirmed.

No implementation/tests were executed for this document revision. Previous disposable-demo success establishes only that its seeded/stubbed workflow ran; it does not satisfy these acceptance criteria.

## 10. Handoff and remaining limits

Deliver the approved phases incrementally. Use the repository's manual phase-bundle/Graphify workflow unless a selected phase manifest explicitly authorizes the automatic finish workflow. Provide exact changed paths and staging commands at each implementation handoff; do not include unrelated current edits. Antigravity owns routine milestone/status reconciliation, while scoped runbooks, API contracts and evaluation fixtures remain implementation work.

Graphify required for this plan-only revision: no. Graphify required after the routing/schema/lab architecture milestone is implemented, verified, merged and pushed: yes, subject to the clean-main confirmation policy.

Explicitly deferred: autonomous resolution, arbitrary changed-input replay, email replay, bulk replay, general DAG execution, external engineering-ticket/email delivery, role-management UI, automatic paid batch investigation, provider probes, vector infrastructure and production activation without release evidence. In-app owner and engineering handoffs and interactive simulated lab replay are required, not deferred.
