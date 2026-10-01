# Graph Report - zapier-graphify-refresh-20260930  (2026-09-30)

## Corpus Check
- 293 files · ~182,590 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 19 file(s) not represented in the graph (top: (none) 7, .toml 2, .css 2)

## Summary
- 3430 nodes · 4791 edges · 182 communities (128 shown, 48 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9eb68d6d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- prismaNamespace.ts
- Zap.ts
- Action.ts
- ZapRunExecution.ts
- Trigger.ts
- ZapRun.ts
- ZapRunExecutionAttempt.ts
- User.ts
- ZapRunRetry.ts
- AvailableAction.ts
- AvailableTriggerType.ts
- ZapRunOutbox.ts
- TestTriggerBuffer.ts
- graph.ts
- history/page.tsx
- route/triage.ts
- create/page.tsx
- cn
- backend.ts
- eslint-config/package.json
- commonInputTypes.ts
- search-runbooks.ts
- dependencies
- dlq-publisher.ts
- 6. Phases, dependencies and implementation increments
- frontend/package.json
- Appbar.tsx
- worker/index.ts
- ui/package.json
- http.ts
- gemini-model.ts
- login/page.tsx
- prismaNamespaceBrowser.ts
- contracts.ts
- execution-store.ts
- replay-policy-facts.ts
- seed-f01-case.ts
- runner.ts
- primary_backend/index.ts
- PrismaClient
- checks.ts
- components.json
- useTriage.ts
- triage-operator.ts
- compilerOptions
- compilerOptions
- compilerOptions
- actions/telegram.ts
- compilerOptions
- dialog.tsx
- compilerOptions
- worker/replay.ts
- triage-evidence.ts
- ActionDelegate
- AvailableActionDelegate
- AvailableTriggerTypeDelegate
- TestTriggerBufferDelegate
- TriggerDelegate
- UserDelegate
- ZapDelegate
- ZapRunDelegate
- ZapRunExecutionDelegate
- ZapRunExecutionAttemptDelegate
- ZapRunOutboxDelegate
- ZapRunRetryDelegate
- compilerOptions
- webhook/package.json
- worker/package.json
- actions/email.ts
- compilerOptions
- investigation-authority.ts
- user.ts
- primary_backend/package.json
- services/replay.ts
- processor/package.json
- Architectural Decision Records (ADRs)
- package.json
- browser.ts
- tasks
- DLQ failure taxonomy and investigation requirements
- client.ts
- diagnosis-graph.test.ts
- dependencies
- ai-dlq-master-plan.md
- Phase 3A Provider Outcomes Design
- 🗺️ Documentation Map
- Kafka Zap Events Topic
- compilerOptions
- ai_agent/package.json
- layout.tsx
- AGENTS.md
- Credentials and destinations
- Evidence gaps and progression failures
- Replay and stale cases
- Template, registry, and stage validation
- Transient provider failure
- Uncertain external delivery
- Graphify Knowledge Graph Guidance
- Phase 3B Durable Failures Design
- durable-failures-schema.test.ts
- observability.ts
- 🚀 Applications (`apps/`)
- File Map
- Phase 3C Durable DLQ Publication Design
- Prisma__ZapClient
- ZapTable.tsx
- ✅ Implemented Capabilities
- replay-policy-facts.test.ts
- Global Constraints
- Global Constraints
- scripts
- typescript-config/package.json
- ui/tsconfig.json
- Action Registry & Extensibility
- Global Constraints
- README.md
- Mission: Production-style AI systems
- Prisma__ActionClient
- Prisma__TriggerClient
- Prisma__ZapRunClient
- Prisma__ZapRunExecutionClient
- react-library.json
- dependencies
- Global Constraints
- Q: Where should Phase 3 provider outcomes and durable failure evidence integrate in the worker?
- Q: Start Phase 3C durable DLQ publication and reconciliation
- Q: oh but my idea for this prj dlq system was like instead of a support team sitting in the backend and seeing and debugging the error , sending it to developing and testing , the AI agent checks that , then finds the error and suggests remedy to the support team /in my case it will be me , then after approval the error is replayed for fix or other option . But now it is like the owner of the zap checks this .? what canthe owner do in the case of humman approval .? now i was learnign the phase 4 and i got to know this but the phase 5 was also completed now .
- devDependencies
- class.ts
- Prisma__AvailableActionClient
- Prisma__AvailableTriggerTypeClient
- Prisma__UserClient
- Prisma__ZapRunExecutionAttemptClient
- Prisma__ZapRunOutboxClient
- Prisma__ZapRunRetryClient
- kafkajs-bun-fix.js
- Production AI Service Resources
- Manual Offset Commit Protocol
- Prisma__TestTriggerBufferClient
- src/button.tsx
- frontend/eslint.config.mjs
- postcss.config.mjs
- proxy.ts
- Retry and DLQ Design
- 0001-existing-python-fastapi-pydantic-foundation.md
- 0002-typescript-first-ai-learning.md
- NOTES.md
- File Icon
- Globe Icon
- Window Icon
- Template Variable Interpolation
- Linear Workflow Limitation
- Backend Three Features Plan
- Turbo ESLint Configuration
- Email Verification Gap
- devDependencies
- dlq-publisher-index.ts
- 🪜 Step-by-Step Lifecycle Breakdown
- Idempotency & Deduplication
- Kafka Messaging Architecture
- Background Worker
- replay-dispatcher.ts
- dlq-publisher.test.ts
- dlq-reconciler.ts
- System Architecture
- R1 retrieval experiment
- dlq-reconciler.test.ts
- frontend/README.md
- devDependencies
- Repository Documentation
- primary_backend/README.md
- processor/README.md
- webhook/README.md
- worker/README.md
- eslint-config/README.md
- Monorepo Layout

## God Nodes (most connected - your core abstractions)
1. `cn()` - 61 edges
2. `buildDiagnosisService()` - 30 edges
3. `lucide-react` - 22 edges
4. `PrismaClient` - 22 edges
5. `compilerOptions` - 19 edges
6. `compilerOptions` - 19 edges
7. `compilerOptions` - 19 edges
8. `compilerOptions` - 19 edges
9. `verifyServiceScope()` - 19 edges
10. `Architectural Decision Records (ADRs)` - 19 edges

## Surprising Connections (you probably didn't know these)
- `Zapier Brand Logo` --conceptually_related_to--> `Project overview`  [INFERRED]
  apps/frontend/public/Zapier-logo.png → README.md
- `Delivery and State Invariants` --semantically_similar_to--> `Defense-in-Depth Idempotency`  [INFERRED] [semantically similar]
  AGENTS.MD → docs/idempotency.md
- `scope()` --calls--> `createServiceScope()`  [EXTRACTED]
  apps/ai_agent/tests/diagnosis-http.test.ts → packages/triage-contracts/index.ts
- `createDiagnosisRouter()` --calls--> `verifyServiceScope()`  [EXTRACTED]
  apps/ai_agent/src/diagnosis-http.ts → packages/triage-contracts/index.ts
- `createPrivateToolsRouter()` --calls--> `verifyServiceScope()`  [EXTRACTED]
  apps/ai_agent/src/private-http.ts → packages/triage-contracts/index.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Zap Execution Event Flow** — readme_transactional_outbox, readme_kafka_zap_events, readme_worker_action_execution [EXTRACTED 1.00]
- **Idempotency Defense Layers** — docs_architecture_transactional_outbox, docs_worker_execution_lease, docs_kafka_manual_offset_commits [INFERRED 0.95]

## Communities (182 total, 48 thin omitted)

### Community 0 - "prismaNamespace.ts"
Cohesion: 0.02
Nodes (130): ActionScalarFieldEnum, AnyNull, Args, At, AtLeast, AtLoose, AtStrict, AvailableActionScalarFieldEnum (+122 more)

### Community 1 - "Zap.ts"
Cohesion: 0.02
Nodes (116): AggregateZap, DateTimeFieldUpdateOperationsInput, GetZapAggregateType, GetZapGroupByPayload, Zap$actionsArgs, Zap$triggerArgs, Zap$zapRunArgs, ZapAggregateArgs (+108 more)

### Community 2 - "Action.ts"
Cohesion: 0.02
Nodes (94): ActionAggregateArgs, ActionAvgAggregateInputType, ActionAvgAggregateOutputType, ActionAvgOrderByAggregateInput, ActionCountAggregateInputType, ActionCountAggregateOutputType, ActionCountArgs, ActionCountOrderByAggregateInput (+86 more)

### Community 3 - "ZapRunExecution.ts"
Cohesion: 0.02
Nodes (88): AggregateZapRunExecution, GetZapRunExecutionAggregateType, GetZapRunExecutionGroupByPayload, ZapRunExecution$attemptsArgs, ZapRunExecution$failureArgs, ZapRunExecutionAggregateArgs, ZapRunExecutionAvgAggregateInputType, ZapRunExecutionAvgAggregateOutputType (+80 more)

### Community 4 - "Trigger.ts"
Cohesion: 0.02
Nodes (85): AggregateTrigger, GetTriggerAggregateType, GetTriggerGroupByPayload, TriggerAggregateArgs, TriggerCountAggregateInputType, TriggerCountAggregateOutputType, TriggerCountArgs, TriggerCountOrderByAggregateInput (+77 more)

### Community 5 - "ZapRun.ts"
Cohesion: 0.02
Nodes (84): AggregateZapRun, GetZapRunAggregateType, GetZapRunGroupByPayload, ZapRun$zapRunOutboxArgs, ZapRunAggregateArgs, ZapRunCountAggregateInputType, ZapRunCountAggregateOutputType, ZapRunCountArgs (+76 more)

### Community 6 - "ZapRunExecutionAttempt.ts"
Cohesion: 0.02
Nodes (80): AggregateZapRunExecutionAttempt, GetZapRunExecutionAttemptAggregateType, GetZapRunExecutionAttemptGroupByPayload, ZapRunExecutionAttemptAggregateArgs, ZapRunExecutionAttemptAvgAggregateInputType, ZapRunExecutionAttemptAvgAggregateOutputType, ZapRunExecutionAttemptAvgOrderByAggregateInput, ZapRunExecutionAttemptCountAggregateInputType (+72 more)

### Community 7 - "User.ts"
Cohesion: 0.03
Nodes (79): AggregateUser, GetUserAggregateType, GetUserGroupByPayload, IntFieldUpdateOperationsInput, NullableStringFieldUpdateOperationsInput, StringFieldUpdateOperationsInput, User$zapArgs, UserAggregateArgs (+71 more)

### Community 8 - "ZapRunRetry.ts"
Cohesion: 0.03
Nodes (77): AggregateZapRunRetry, BoolFieldUpdateOperationsInput, GetZapRunRetryAggregateType, GetZapRunRetryGroupByPayload, NullableDateTimeFieldUpdateOperationsInput, NullableIntFieldUpdateOperationsInput, ZapRunRetry$executionArgs, ZapRunRetryAggregateArgs (+69 more)

### Community 9 - "AvailableAction.ts"
Cohesion: 0.03
Nodes (70): AggregateAvailableAction, AvailableAction$actionArgs, AvailableActionAggregateArgs, AvailableActionCountAggregateInputType, AvailableActionCountAggregateOutputType, AvailableActionCountArgs, AvailableActionCountOrderByAggregateInput, AvailableActionCountOutputType (+62 more)

### Community 10 - "AvailableTriggerType.ts"
Cohesion: 0.03
Nodes (70): AggregateAvailableTriggerType, AvailableTriggerType$triggerArgs, AvailableTriggerTypeAggregateArgs, AvailableTriggerTypeCountAggregateInputType, AvailableTriggerTypeCountAggregateOutputType, AvailableTriggerTypeCountArgs, AvailableTriggerTypeCountOrderByAggregateInput, AvailableTriggerTypeCountOutputType (+62 more)

### Community 11 - "ZapRunOutbox.ts"
Cohesion: 0.03
Nodes (67): AggregateZapRunOutbox, GetZapRunOutboxAggregateType, GetZapRunOutboxGroupByPayload, ZapRunOutboxAggregateArgs, ZapRunOutboxCountAggregateInputType, ZapRunOutboxCountAggregateOutputType, ZapRunOutboxCountArgs, ZapRunOutboxCountOrderByAggregateInput (+59 more)

### Community 12 - "TestTriggerBuffer.ts"
Cohesion: 0.03
Nodes (58): AggregateTestTriggerBuffer, GetTestTriggerBufferAggregateType, GetTestTriggerBufferGroupByPayload, TestTriggerBufferAggregateArgs, TestTriggerBufferAvgAggregateInputType, TestTriggerBufferAvgAggregateOutputType, TestTriggerBufferAvgOrderByAggregateInput, TestTriggerBufferCountAggregateInputType (+50 more)

### Community 13 - "graph.ts"
Cohesion: 0.09
Nodes (34): FailureContextEvidence, PreviewResult, bearer(), EmptyDiagnosisRequestSchema, requiredOperations, assertSameCanonicalSource(), buildDiagnosisService(), buildPreviewService() (+26 more)

### Community 14 - "history/page.tsx"
Cohesion: 0.09
Nodes (33): Connection, ConnectionsPage(), formatDate(), toConnections(), DashboardPage(), SCRATCH_CARDS, FILTER_CHIPS, HistoryPage() (+25 more)

### Community 15 - "route/triage.ts"
Cohesion: 0.11
Nodes (27): InvestigationDecision, bearer(), createInvestigationRouter(), startSchema, start(), token(), bearer(), createTriageRouter() (+19 more)

### Community 16 - "create/page.tsx"
Cohesion: 0.10
Nodes (36): metadata, action, TriggerTestResult, useZapStore, zapData, Email(), Telegram(), ActionNode (+28 more)

### Community 17 - "cn"
Cohesion: 0.10
Nodes (29): Badge(), badgeVariants, Button(), buttonVariants, Card(), CardAction(), CardContent(), CardDescription() (+21 more)

### Community 18 - "backend.ts"
Cohesion: 0.13
Nodes (16): BackendClient, BackendClientOptions, BackendReadTimeout, BackendResponseError, ExecutionEvidence, createDiagnosisRouter(), bearer(), createPrivateToolsRouter() (+8 more)

### Community 19 - "eslint-config/package.json"
Cohesion: 0.08
Nodes (34): config, nextJsConfig, devDependencies, eslint, eslint-config-prettier, @eslint/js, eslint-plugin-only-warn, eslint-plugin-react (+26 more)

### Community 20 - "commonInputTypes.ts"
Cohesion: 0.05
Nodes (37): BoolFilter, BoolWithAggregatesFilter, DateTimeFilter, DateTimeNullableFilter, DateTimeNullableWithAggregatesFilter, DateTimeWithAggregatesFilter, IntFilter, IntNullableFilter (+29 more)

### Community 21 - "search-runbooks.ts"
Cohesion: 0.09
Nodes (29): bm25(), ignoredTerms, Metrics, RetrievalExperimentCase, retrievalExperimentCases, RetrievalExperimentResult, runRetrievalExperiment(), Split (+21 more)

### Community 22 - "dependencies"
Cohesion: 0.08
Nodes (25): dependencies, axios, class-variance-authority, @clerk/nextjs, clsx, jwt-decode, lucide-react, motion (+17 more)

### Community 23 - "dlq-publisher.ts"
Cohesion: 0.25
Nodes (7): createDlqPublisher(), dueWhere(), DurableFailureEvent, evidenceSources, FailureRow, providerOutcomes, Sink

### Community 24 - "6. Phases, dependencies and implementation increments"
Cohesion: 0.06
Nodes (36): 1. Current AI-relevant architecture, 2. Release scope and workflow, 3. Boundaries, state and initial contracts, 4. Failure taxonomy and the minimum RAG corpus, 5. Deterministic replay design and release gate, 6. Phases, dependencies and implementation increments, 7. Verification and handoff, 8. Risks and deliberately deferred complexity (+28 more)

### Community 25 - "frontend/package.json"
Cohesion: 0.07
Nodes (27): @clerk/nextjs, eslint, react, react-dom, @types/node, @types/react, @types/react-dom, typescript (+19 more)

### Community 26 - "Appbar.tsx"
Cohesion: 0.14
Nodes (20): Avatar(), AvatarFallback(), AvatarImage(), DropdownMenu(), DropdownMenuContent(), DropdownMenuGroup(), DropdownMenuItem(), DropdownMenuLabel() (+12 more)

### Community 27 - "worker/index.ts"
Cohesion: 0.11
Nodes (25): getActionHandler(), ExecutionDb, accepted, acceptedRun, Call, dbFailure, harness(), rejected (+17 more)

### Community 28 - "ui/package.json"
Cohesion: 0.07
Nodes (28): dependencies, react, react-dom, devDependencies, eslint, @repo/eslint-config, @repo/typescript-config, @types/node (+20 more)

### Community 29 - "http.ts"
Cohesion: 0.09
Nodes (25): DiagnosisModel, Evidence, EvidenceSchema, PreviewRequestSchema, DiagnosisRouterOptions, FixtureDiagnosisModel, PreviewOptions, createHttpServer() (+17 more)

### Community 30 - "gemini-model.ts"
Cohesion: 0.13
Nodes (13): DiagnosisPrompt, IntegratedDiagnosisModel, ModelGeneration, boundedString, evidenceReference, FetchLike, GEMINI_DIAGNOSIS_SCHEMA, GeminiDiagnosisModel (+5 more)

### Community 31 - "login/page.tsx"
Cohesion: 0.13
Nodes (10): LoginResponse, BACKEND_URL, HOOKS_URL, Appbar(), PrimaryButton(), CheckFeature(), Hero(), HeroVideo() (+2 more)

### Community 32 - "prismaNamespaceBrowser.ts"
Cohesion: 0.08
Nodes (24): ActionScalarFieldEnum, AnyNull, AvailableActionScalarFieldEnum, AvailableTriggerTypeScalarFieldEnum, DbNull, Decimal, JsonNull, JsonNullValueFilter (+16 more)

### Community 33 - "contracts.ts"
Cohesion: 0.08
Nodes (23): ActionInputValidationEvidence, ActionInputValidationEvidenceSchema, boundedError, boundedName, boundedSummary, DiagnosisSchema, evidenceRef, FailureContextEvidenceSchema (+15 more)

### Community 34 - "execution-store.ts"
Cohesion: 0.09
Nodes (29): AttemptOwner, canonicalJson(), ClaimDecision, createExecutionStore(), Delegate, ExecutionKey, FinalizeDecision, fingerprint() (+21 more)

### Community 35 - "replay-policy-facts.ts"
Cohesion: 0.13
Nodes (20): Database, evaluateSnapshotPolicy(), InvestigationProposals, PolicyRecord, Submission, evaluateReplayPolicy(), buildReplayPolicyFacts(), ConfigurationRow (+12 more)

### Community 36 - "seed-f01-case.ts"
Cohesion: 0.21
Nodes (10): defaultRunbookDirectory(), assertLocalDatabase(), F01_CASE_ID, failedCompletedAt, failedStartedAt, predecessorCompletedAt, predecessorMetadata, runMetadata (+2 more)

### Community 37 - "runner.ts"
Cohesion: 0.12
Nodes (12): DiagnosisOptions, poll(), InvestigationBinding, InvestigationStore, JobRow, project(), StartInvestigation, ClaimedJob (+4 more)

### Community 38 - "primary_backend/index.ts"
Cohesion: 0.13
Nodes (13): agent, app, notifications, actionRouter, router, router, triggerRouter, AgentReadTimeout (+5 more)

### Community 40 - "checks.ts"
Cohesion: 0.15
Nodes (15): IntegratedDiagnosisResult, IntegratedDiagnosisResultSchema, boundedCode, checkDiagnosisEvaluation(), checkEvaluationDataset(), diagnosisIds, EvaluationCase, EvaluationCaseSchema (+7 more)

### Community 41 - "components.json"
Cohesion: 0.10
Nodes (19): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+11 more)

### Community 42 - "useTriage.ts"
Cohesion: 0.17
Nodes (12): TriagePage(), TriageResults(), ApiError, errorState(), operatorRequest(), useTriage(), FetchLike, requestTriage() (+4 more)

### Community 43 - "triage-operator.ts"
Cohesion: 0.18
Nodes (10): AccessAction, CaseRow, OperatorDb, project(), TriageOperatorCaseNotFound, TriageOperatorDenied, TriageOperatorService, caseId (+2 more)

### Community 44 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, jsx, lib, module, moduleDetection, moduleResolution (+11 more)

### Community 45 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, jsx, lib, module, moduleDetection, moduleResolution (+11 more)

### Community 46 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, jsx, lib, module, moduleDetection, moduleResolution (+11 more)

### Community 47 - "actions/telegram.ts"
Cohesion: 0.21
Nodes (15): boundedPositiveInteger(), FetchTransport, readJson(), resolutionError(), resolveChatId(), retryAfter(), safeIdentifier(), sendError() (+7 more)

### Community 48 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, jsx, lib, module, moduleDetection, moduleResolution (+11 more)

### Community 49 - "dialog.tsx"
Cohesion: 0.18
Nodes (12): Dialog(), DialogClose(), DialogContent(), DialogDescription(), DialogFooter(), DialogHeader(), DialogOverlay(), DialogTitle() (+4 more)

### Community 50 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 51 - "worker/replay.ts"
Cohesion: 0.16
Nodes (18): replayStore(), DurableFailureEvidence, Fingerprints, MessageResolution, parse(), Claim, Claimed, createReplayStore() (+10 more)

### Community 52 - "triage-evidence.ts"
Cohesion: 0.09
Nodes (25): ExecutionEvidenceSchema, ActionOrderRow, canonical(), ExecutionAttemptRow, hash(), OwnedCaseRow, PredecessorRow, sourceKind() (+17 more)

### Community 65 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, lib, module, moduleDetection, moduleResolution, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 66 - "webhook/package.json"
Cohesion: 0.13
Nodes (14): express, prisma, @prisma/client, @prisma/extension-accelerate, @types/express, typescript, module, name (+6 more)

### Community 67 - "worker/package.json"
Cohesion: 0.11
Nodes (18): @types/bun, dependencies, resend, devDependencies, @types/bun, @types/bun, typescript, module (+10 more)

### Community 68 - "actions/email.ts"
Cohesion: 0.11
Nodes (24): emailAction, EmailTransport, resend, resendErrorNames, safeEmailCode(), safeReceipt(), sendEmail(), captureFailure() (+16 more)

### Community 69 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, declaration, declarationMap, esModuleInterop, incremental, isolatedModules, lib, module (+8 more)

### Community 70 - "investigation-authority.ts"
Cohesion: 0.16
Nodes (9): Decision, DecisionRow, InvestigationAuthority, InvestigationDecisionDenied, ProposalRow, TransactionDb, authority(), input (+1 more)

### Community 71 - "user.ts"
Cohesion: 0.15
Nodes (15): authMiddleware(), DecodedToken, Express, Request, clerk, router, userRouter, router (+7 more)

### Community 72 - "primary_backend/package.json"
Cohesion: 0.12
Nodes (15): @clerk/nextjs, express, @types/express, zod, module, name, private, scripts (+7 more)

### Community 73 - "services/replay.ts"
Cohesion: 0.18
Nodes (10): SqlClient, Approval, Binding, Database, ReplayDenied, ReplayInput, ReplayService, Request (+2 more)

### Community 74 - "processor/package.json"
Cohesion: 0.13
Nodes (14): dependencies, kafkajs, devDependencies, @types/bun, @types/bun, typescript, module, name (+6 more)

### Community 75 - "Architectural Decision Records (ADRs)"
Cohesion: 0.11
Nodes (19): ADR 001: Transactional Outbox Pattern for Webhook Ingestion, ADR 002: Linear Sorting Order for Workflow Step Sequencing, ADR 003: Fenced Single-Shot Execution via PostgreSQL, ADR 004: Durable Failure Record and Separate DLQ Publication, ADR 005: Hybrid Authentication with Clerk Token Exchange, ADR 006: Self-Contained Action Registry Pattern, ADR 007: Manual Kafka Offset Commit After Durable Resolution, ADR 008: No Automatic Provider Retry in Execution (+11 more)

### Community 76 - "package.json"
Cohesion: 0.13
Nodes (14): dependencies, @prisma/client, @prisma/extension-accelerate, engines, node, prisma, @prisma/client, @prisma/extension-accelerate (+6 more)

### Community 77 - "browser.ts"
Cohesion: 0.13
Nodes (13): Action, AvailableAction, AvailableTriggerType, $Enums, TestTriggerBuffer, Trigger, User, Zap (+5 more)

### Community 78 - "tasks"
Cohesion: 0.13
Nodes (14): dependsOn, inputs, outputs, dependsOn, cache, persistent, dependsOn, $schema (+6 more)

### Community 79 - "DLQ failure taxonomy and investigation requirements"
Cohesion: 0.14
Nodes (14): Cross-cutting evaluation cases, DLQ failure taxonomy and investigation requirements, Evidence that actually exists, F01 — Telegram rate limit, F02 — Provider outage or transport failure, F03 — Telegram credential or permission failure, F04 — Invalid destination or missing template input, F05 — Unsupported action type (+6 more)

### Community 80 - "client.ts"
Cohesion: 0.10
Nodes (18): InvestigationNotifications, PendingDecision, setup(), pending, setOperator(), Action, AvailableAction, AvailableTriggerType (+10 more)

### Community 81 - "diagnosis-graph.test.ts"
Cohesion: 0.18
Nodes (14): agentDatabaseUrl(), createCheckpoint(), migrateAgent(), pool, evidenceRefs, executionEvidence(), failureContext(), inputValidation() (+6 more)

### Community 82 - "dependencies"
Cohesion: 0.15
Nodes (13): dependencies, bcrypt, @clerk/backend, @clerk/nextjs, cors, dotenv, express, jsonwebtoken (+5 more)

### Community 84 - "Phase 3A Provider Outcomes Design"
Cohesion: 0.15
Nodes (12): Compatibility and Rollout, Contracts, Email Flow, Error Handling and Redaction, Non-Goals, Outcome Vocabulary, Phase 3A Provider Outcomes Design, Purpose (+4 more)

### Community 85 - "🗺️ Documentation Map"
Cohesion: 0.18
Nodes (12): Delivery and State Invariants, Action Handler Contract, Action Registry, Event-Driven System Topology, Transactional Outbox Communication Boundary, ADR Transactional Outbox, Distributed Lease Claim, Workflow Execution Lifecycle (+4 more)

### Community 86 - "Kafka Zap Events Topic"
Cohesion: 0.20
Nodes (11): Processor Bun Service, Webhook Bun Service, Worker Bun Service, Kafka KRaft Service, PostgreSQL Service, Local Infrastructure Stack Configuration, Kafka Zap Events Topic, Prisma PostgreSQL Persistence (+3 more)

### Community 87 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, allowJs, jsx, module, moduleResolution, noEmit, plugins, extends (+2 more)

### Community 88 - "ai_agent/package.json"
Cohesion: 0.06
Nodes (31): dependencies, express, @langchain/langgraph, @langchain/langgraph-checkpoint-postgres, pg, zod, devDependencies, @types/bun (+23 more)

### Community 89 - "layout.tsx"
Cohesion: 0.22
Nodes (6): nextConfig, geistMono, geistSans, inter, Toaster(), next

### Community 90 - "AGENTS.md"
Cohesion: 0.11
Nodes (17): 1. Architecture & Master Plan: Astra (ChatGPT), 2. Implementation: Codex (GPT-6 Sol / Terra), 3. Documentation & Ops: Antigravity (Gemini), AGENTS.md, Core Architectural Invariants, Documentation, Engineering Guide, Graphify (+9 more)

### Community 91 - "Credentials and destinations"
Cohesion: 0.20
Nodes (10): Allowed remediation, Credentials and destinations, Evidence needed, Forbidden actions, Read-only investigation, Replay and approval, Simulated example, Sources (+2 more)

### Community 92 - "Evidence gaps and progression failures"
Cohesion: 0.20
Nodes (10): Allowed remediation, Evidence gaps and progression failures, Evidence needed, Forbidden actions, Read-only investigation, Replay and approval, Simulated example, Sources (+2 more)

### Community 93 - "Replay and stale cases"
Cohesion: 0.20
Nodes (10): Allowed remediation, Evidence needed, Forbidden actions, Read-only investigation, Replay and approval, Replay and stale cases, Simulated example, Sources (+2 more)

### Community 94 - "Template, registry, and stage validation"
Cohesion: 0.18
Nodes (10): Allowed remediation, Evidence needed, Forbidden actions, Read-only investigation, Replay and approval, Simulated example, Sources, Symptoms (+2 more)

### Community 95 - "Transient provider failure"
Cohesion: 0.20
Nodes (10): Allowed remediation, Evidence needed, Forbidden actions, Read-only investigation, Replay and approval, Simulated example, Sources, Symptoms (+2 more)

### Community 96 - "Uncertain external delivery"
Cohesion: 0.20
Nodes (10): Allowed remediation, Evidence needed, Forbidden actions, Read-only investigation, Replay and approval, Simulated example, Sources, Symptoms (+2 more)

### Community 97 - "Graphify Knowledge Graph Guidance"
Cohesion: 0.33
Nodes (5): Graphify Knowledge Graph Guidance, ⏱️ Update Policy & Workflow, 🔄 Updating Graphify, 🗺️ What is Graphify?, 🔍 When to Consult Graphify

### Community 98 - "Phase 3B Durable Failures Design"
Cohesion: 0.18
Nodes (10): Evidence and security rules, Non-goals, Phase 3B Durable Failures Design, Phase 3C boundary, Proposed schema and interfaces, Purpose, Scope, State transitions (+2 more)

### Community 99 - "durable-failures-schema.test.ts"
Cohesion: 0.24
Nodes (9): assertField(), attempt, attemptFields, dlqMigrationPath, field(), generatedClient, migrationPath, model() (+1 more)

### Community 100 - "observability.ts"
Cohesion: 0.16
Nodes (11): ModelUsage, createLangfuseExporter(), errorType(), FetchLike, InvestigationTrace, InvestigationTracer, safeIdentifier, safeModelUsage() (+3 more)

### Community 101 - "🚀 Applications (`apps/`)"
Cohesion: 0.13
Nodes (15): 1. `db` ([`packages/db`](../packages/db)), 1. `primary_backend` ([`apps/primary_backend`](../apps/primary_backend)), 2. `ui` ([`packages/ui`](../packages/ui)), 2. `webhook` ([`apps/webhook`](../apps/webhook)), 3. `processor` ([`apps/processor`](../apps/processor)), 3. `typescript-config` & `eslint-config`, 4. `worker` ([`apps/worker`](../apps/worker)), 5. `frontend` ([`apps/frontend`](../apps/frontend)) (+7 more)

### Community 102 - "File Map"
Cohesion: 0.25
Nodes (7): File Map, Global Constraints, Phase 3A Provider Outcomes Implementation Plan, Task 1: Worker Outcome Contract and Generic Retry, Task 2: Normalize Resend Outcomes, Task 3: Normalize Telegram Resolution and Send Outcomes, Task 4: Wire and Verify the Phase 3A Boundary

### Community 103 - "Phase 3C Durable DLQ Publication Design"
Cohesion: 0.25
Nodes (7): Data model, Goal, Phase 3C Durable DLQ Publication Design, Publication boundary, Reconciliation, Runtime, Verification

### Community 105 - "ZapTable.tsx"
Cohesion: 0.24
Nodes (11): Empty(), EmptyContent(), EmptyDescription(), EmptyHeader(), EmptyMedia(), emptyMediaVariants, EmptyTitle(), formatDate() (+3 more)

### Community 106 - "✅ Implemented Capabilities"
Cohesion: 0.15
Nodes (13): 1. Ingestion & Outbox Reliability, 2. Execution Engine & Worker Subsystem, 3. API & Management, 4.1 Phase 5 simulated runbooks and retrieval, 4.2 Phase 6 bounded transient diagnosis graph, 4. AI Triage Evidence, 5. Frontend Dashboard & Builder, Current State & Technical Debt (+5 more)

### Community 107 - "replay-policy-facts.test.ts"
Cohesion: 0.33
Nodes (5): config, current, hash, saved, source

### Community 108 - "Global Constraints"
Cohesion: 0.29
Nodes (6): Global Constraints, Phase 2 Evaluation Fixtures Implementation Plan, Task 1: Strict evaluation-case contract and JSONL parser, Task 2: Dataset-wide deterministic rubric, Task 3: Versioned 26-case dataset and held-out loader, Task 4: Privacy mutation checks and full verification

### Community 109 - "Global Constraints"
Cohesion: 0.29
Nodes (6): Global Constraints, Phase 3B Durable Failures Implementation Plan, Self-Review and Known Boundary, Task 1: Add the Durable Execution, Attempt, and Failure Schema, Task 2: Implement the Fenced Persistence State Machine, Task 3: Integrate Single-Shot Execution, ACK Gating, and Architecture Docs

### Community 110 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, check-types, dev, format, lint, postinstall

### Community 111 - "typescript-config/package.json"
Cohesion: 0.29
Nodes (6): license, name, private, publishConfig, access, version

### Community 112 - "ui/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, exclude, extends, include, @repo/typescript-config/react-library.json

### Community 113 - "Action Registry & Extensibility"
Cohesion: 0.17
Nodes (12): 1. Email Action (`email`), 2. Telegram Action (`telegram`), 🏛️ Action Registry Architecture, Action Registry & Extensibility, 🗂️ Action Registry & Resolution, `ActionContext`, `ActionHandler`, ➕ Adding a New Action Integration (+4 more)

### Community 114 - "Global Constraints"
Cohesion: 0.17
Nodes (11): Deferred, Global Constraints, Task 1: Extract and test `withRetry`, Task 2: Retry table migration, Task 3: Dead-letter failed events, Task 4: Zap detail endpoint returns run history, Task 5: Read-only Zap detail page, Task 6: Clerk token exchange endpoint (+3 more)

### Community 115 - "README.md"
Cohesion: 0.05
Nodes (42): Next.js Logo, Vercel Logo, Zapier Brand Logo, Next.js Frontend Application, Primary Backend Bun Service, Actions, API Endpoints, `apps/frontend/.env.local` (+34 more)

### Community 116 - "Mission: Production-style AI systems"
Cohesion: 0.33
Nodes (5): Constraints, Mission: Production-style AI systems, Out of scope, Success looks like, Why

### Community 121 - "react-library.json"
Cohesion: 0.33
Nodes (5): compilerOptions, jsx, extends, ./base.json, $schema

### Community 122 - "dependencies"
Cohesion: 0.40
Nodes (5): dependencies, express, @prisma/client, @prisma/extension-accelerate, @types/express

### Community 123 - "Global Constraints"
Cohesion: 0.40
Nodes (4): Global Constraints, Phase 3C Durable DLQ Publication Implementation Plan, Task 1: Phase 3C-A — Fenced Durable Failure Publisher, Task 2: Phase 3C-B — Reconciliation and Separate Runtime

### Community 124 - "Q: Where should Phase 3 provider outcomes and durable failure evidence integrate in the worker?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Where should Phase 3 provider outcomes and durable failure evidence integrate in the worker?, Source Nodes

### Community 125 - "Q: Start Phase 3C durable DLQ publication and reconciliation"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Start Phase 3C durable DLQ publication and reconciliation, Source Nodes

### Community 126 - "Q: oh but my idea for this prj dlq system was like instead of a support team sitting in the backend and seeing and debugging the error , sending it to developing and testing , the AI agent checks that , then finds the error and suggests remedy to the support team /in my case it will be me , then after approval the error is replayed for fix or other option . But now it is like the owner of the zap checks this .? what canthe owner do in the case of humman approval .? now i was learnign the phase 4 and i got to know this but the phase 5 was also completed now ."
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: oh but my idea for this prj dlq system was like instead of a support team sitting in the backend and seeing and debugging the error , sending it to developing and testing , the AI agent checks that , then finds the error and suggests remedy to the support team /in my case it will be me , then after approval the error is replayed for fix or other option . But now it is like the owner of the zap checks this .? what canthe owner do in the case of humman approval .? now i was learnign the phase 4 and i got to know this but the phase 5 was also completed now ., Source Nodes

### Community 127 - "devDependencies"
Cohesion: 0.40
Nodes (5): devDependencies, prettier, prisma, turbo, typescript

### Community 128 - "class.ts"
Cohesion: 0.40
Nodes (3): config, LogOptions, PrismaClientConstructor

### Community 135 - "kafkajs-bun-fix.js"
Cohesion: 0.40
Nodes (4): content, fs, path, possiblePaths

### Community 136 - "Production AI Service Resources"
Cohesion: 0.40
Nodes (4): Gaps, Knowledge, Production AI Service Resources, Wisdom (Communities)

### Community 137 - "Manual Offset Commit Protocol"
Cohesion: 0.50
Nodes (4): ADR Two-Phase Execution Lease, At-Least-Once Delivery Semantics, Manual Offset Commit Protocol, PostgreSQL Execution Lease

### Community 160 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, tw-animate-css, @types/node, @types/react (+2 more)

### Community 161 - "dlq-publisher-index.ts"
Cohesion: 0.27
Nodes (7): DlqPublisherDb, main(), ProcessDependencies, runDlqProcess(), calls, createDlqReconciler(), kafkajs

### Community 162 - "🪜 Step-by-Step Lifecycle Breakdown"
Cohesion: 0.20
Nodes (10): 🔁 End-to-End Sequence Diagram, Phase 1: Webhook Ingestion & Transactional Outbox, Phase 2: Outbox Processing & Kafka Production, Phase 3: Worker Consumption & Distributed Lease Claim, Phase 4: Single-Shot Action Execution, Phase 5: Stage Advancement & Dead-Letter Routing, Phase 6: Additive Replay Generation (Phase 9A/9B; gated), 🪜 Step-by-Step Lifecycle Breakdown (+2 more)

### Community 163 - "Idempotency & Deduplication"
Cohesion: 0.20
Nodes (10): 1. Ingestion: Transactional Outbox ([`apps/webhook/index.ts`](../apps/webhook/index.ts)), 2. Event Dispatch: ACK-Before-Delete ([`apps/processor/index.ts`](../apps/processor/index.ts)), 3. Worker Execution: Fenced Single-Shot Claim ([`apps/worker/orchestration.ts`](../apps/worker/orchestration.ts)), 4. External Provider Side Effects, Idempotency & Deduplication, 🔑 Idempotency Key Specification, Key Formulation, 🛡️ Multi-Layered Idempotency Architecture (+2 more)

### Community 164 - "Kafka Messaging Architecture"
Cohesion: 0.22
Nodes (9): 1. `zap-events` Message Schema, 2. `zap-events-dlq` Message Schema, Consumers, Kafka Messaging Architecture, 📡 Kafka Topics Overview, 📨 Message Schemas, 🔒 Offset Commit & Delivery Semantics, ⚙️ Producer & Consumer Topology (+1 more)

### Community 165 - "Background Worker"
Cohesion: 0.22
Nodes (9): 🛠️ Action Dispatch & Execution, Background Worker, Database Model, 🔒 Distributed Lease Management (`ZapRunExecution`), 🪦 Durable Failure Recording, 📐 Invariants Summary, Lease Rules & State Transitions, Replay generation (Phase 9A/9B; release disabled) (+1 more)

### Community 166 - "replay-dispatcher.ts"
Cohesion: 0.39
Nodes (6): main(), createReplayDispatcher(), DispatchRow, liveReplayEnabled(), REPLAY_RELEASE_READY, Sink

### Community 167 - "dlq-publisher.test.ts"
Cohesion: 0.47
Nodes (5): base, createdAt, fakeDb(), matches(), Row

### Community 168 - "dlq-reconciler.ts"
Cohesion: 0.33
Nodes (4): ExecutionRow, ReconcilerDb, ReconcilerTx, STALE

### Community 169 - "System Architecture"
Cohesion: 0.33
Nodes (6): AI Triage Boundary (Phase 4A-4C), 🔄 Component Communication Mechanisms, 🔌 External Dependencies, 🏗️ High-Level Topology, 📦 Major Applications & Packages, System Architecture

### Community 170 - "R1 retrieval experiment"
Cohesion: 0.40
Nodes (4): Method, R1 retrieval experiment, Recommendation, Results

### Community 171 - "dlq-reconciler.test.ts"
Cohesion: 0.40
Nodes (3): execution, now, Row

### Community 172 - "frontend/README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 173 - "devDependencies"
Cohesion: 0.67
Nodes (3): devDependencies, prisma, @types/bun

### Community 174 - "Repository Documentation"
Cohesion: 0.67
Nodes (3): 📚 Core Documentation Index, 🧭 Navigation Guidelines for Agents & Developers, Repository Documentation

## Knowledge Gaps
- **2145 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+2140 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 2543 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **48 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `zod` connect `services/replay.ts` to `contracts.ts`, `replay-policy-facts.ts`, `user.ts`, `checks.ts`, `graph.ts`, `route/triage.ts`, `ai_agent/package.json`, `gemini-model.ts`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `pg` connect `diagnosis-graph.test.ts` to `ai_agent/package.json`, `runner.ts`, `http.ts`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `ZapRunOutboxDelegate` connect `ZapRunOutboxDelegate` to `ZapRunOutbox.ts`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _2145 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `prismaNamespace.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.015267175572519083 - nodes in this community are weakly interconnected._
- **Should `Zap.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.017094017094017096 - nodes in this community are weakly interconnected._
- **Should `Action.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.021052631578947368 - nodes in this community are weakly interconnected._