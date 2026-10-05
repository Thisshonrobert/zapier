# Graph Report - zapier  (2026-10-02)

## Corpus Check
- 330 files · ~205,501 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 19 file(s) not represented in the graph (top: (none) 7, .toml 2, .css 2)

## Summary
- 3554 nodes · 5075 edges · 190 communities (132 shown, 50 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 40 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6e428f7a`
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
- create/page.tsx
- history/page.tsx
- triage-contracts/index.ts
- cn
- README.md
- eslint-config/package.json
- commonInputTypes.ts
- triage-evidence.ts
- replay-db.integration.test.ts
- dlq-publisher-index.ts
- diagnosis-graph.test.ts
- 6. Phases, dependencies and implementation increments
- ai_agent/package.json
- idempotency.test.ts
- Appbar.tsx
- ui/package.json
- frontend/package.json
- primary_backend/index.ts
- diagnosis-http.test.ts
- safety-probes.ts
- login/page.tsx
- replay-policy-facts.ts
- prismaNamespaceBrowser.ts
- contracts.ts
- dependencies
- client.ts
- ReleaseRunner
- route/triage.ts
- ai-dlq-master-plan.md
- useTriage.ts
- worker/index.ts
- search-runbooks.ts
- replay-recovery.integration.test.ts
- actions/telegram.ts
- worker/replay.ts
- PrismaClient
- components.json
- compilerOptions
- compilerOptions
- compilerOptions
- compilerOptions
- compilerOptions
- experiment.ts
- investigation-http.ts
- investigation-store.ts
- dialog.tsx
- worker/package.json
- Architectural Decision Records (ADRs)
- AGENTS.md
- gemini-model.ts
- services/replay.ts
- actions/email.ts
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
- observability.ts
- checks.ts
- compilerOptions
- compilerOptions
- execution-store.test.ts
- retrieval-experiment.ts
- processor/package.json
- webhook/package.json
- 🚀 Applications (`apps/`)
- package.json
- browser.ts
- tasks
- primary_backend/package.json
- DLQ failure taxonomy and investigation requirements
- ✅ Implemented Capabilities
- dependencies
- Phase 3A Provider Outcomes Design
- 🗺️ Documentation Map
- prompts.ts
- useInvestigationStream.ts
- createReplayStore
- Action Registry & Extensibility
- Global Constraints
- Kafka Zap Events Topic
- Template, registry, and stage validation
- Phase 3B Durable Failures Design
- compilerOptions
- layout.tsx
- devDependencies
- triage-outcome.test.tsx
- user.ts
- Credentials and destinations
- Evidence gaps and progression failures
- Replay and stale cases
- Transient provider failure
- Uncertain external delivery
- 🪜 Step-by-Step Lifecycle Breakdown
- Idempotency & Deduplication
- Kafka Messaging Architecture
- Background Worker
- route/zap.ts
- File Map
- Phase 3C Durable DLQ Publication Design
- scripts
- Prisma__ZapClient
- investigation-notifications.ts
- System Architecture
- Global Constraints
- Global Constraints
- typescript-config/package.json
- ui/tsconfig.json
- Graphify Knowledge Graph Guidance
- Mission: Production-style AI systems
- Prisma__ActionClient
- Prisma__TriggerClient
- Prisma__ZapRunClient
- Prisma__ZapRunExecutionClient
- react-library.json
- R1 retrieval experiment
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
- frontend/README.md
- triage-operator-http.test.ts
- Manual Offset Commit Protocol
- Prisma__TestTriggerBufferClient
- scripts
- devDependencies
- Repository Documentation
- src/button.tsx
- frontend/eslint.config.mjs
- postcss.config.mjs
- proxy.ts
- primary_backend/README.md
- processor/README.md
- webhook/README.md
- worker/README.md
- Retry and DLQ Design
- 0001-existing-python-fastapi-pydantic-foundation.md
- 0002-typescript-first-ai-learning.md
- NOTES.md
- eslint-config/README.md
- scripts/README.md
- File Icon
- Globe Icon
- Window Icon
- Template Variable Interpolation
- Linear Workflow Limitation
- Monorepo Layout
- Backend Three Features Plan
- Turbo ESLint Configuration
- Email Verification Gap

## God Nodes (most connected - your core abstractions)
1. `cn()` - 49 edges
2. `buildDiagnosisService()` - 28 edges
3. `PrismaClient` - 22 edges
4. `lucide-react` - 22 edges
5. `compilerOptions` - 19 edges
6. `compilerOptions` - 19 edges
7. `compilerOptions` - 19 edges
8. `compilerOptions` - 19 edges
9. `Architectural Decision Records (ADRs)` - 19 edges
10. `UserDelegate` - 18 edges

## Surprising Connections (you probably didn't know these)
- `Zapier Brand Logo` --conceptually_related_to--> `Project overview`  [INFERRED]
  apps/frontend/public/Zapier-logo.png → README.md
- `Delivery and State Invariants` --semantically_similar_to--> `Defense-in-Depth Idempotency`  [INFERRED] [semantically similar]
  AGENTS.MD → docs/idempotency.md
- `Phase 11 deterministic evaluation and reporting` --verified_by--> `runSafetyProbes()`  [EXTRACTED]
  docs/ai-dlq-master-plan.md → apps/ai_agent/src/evaluation/safety-probes.ts
- `scope()` --calls--> `createServiceScope()`  [EXTRACTED]
  apps/ai_agent/tests/diagnosis-http.test.ts → packages/triage-contracts/index.ts
- `token()` --calls--> `createServiceScope()`  [EXTRACTED]
  apps/primary_backend/tests/triage-auth.test.ts → packages/triage-contracts/index.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Zap Execution Event Flow** — readme_transactional_outbox, readme_kafka_zap_events, readme_worker_action_execution [EXTRACTED 1.00]
- **Idempotency Defense Layers** — docs_architecture_transactional_outbox, docs_worker_execution_lease, docs_kafka_manual_offset_commits [INFERRED 0.95]

## Communities (190 total, 50 thin omitted)

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
Cohesion: 0.07
Nodes (43): EvidenceSchema, IntegratedDiagnosisResultSchema, IntegratedModelOutput, IntegratedModelOutputSchema, PreviewRequestSchema, bearer(), DiagnosisRouterOptions, EmptyDiagnosisRequestSchema (+35 more)

### Community 14 - "create/page.tsx"
Cohesion: 0.09
Nodes (39): metadata, action, TriggerTestResult, useZapStore, zapData, Email(), Telegram(), ActionNode (+31 more)

### Community 15 - "history/page.tsx"
Cohesion: 0.09
Nodes (33): Connection, ConnectionsPage(), formatDate(), toConnections(), SCRATCH_CARDS, FILTER_CHIPS, HistoryPage(), preview() (+25 more)

### Community 16 - "triage-contracts/index.ts"
Cohesion: 0.10
Nodes (27): BackendClient, BackendClientOptions, BackendReadTimeout, BackendResponseError, ActionInputValidationEvidence, FailureContextEvidence, createDiagnosisRouter(), bearer() (+19 more)

### Community 17 - "cn"
Cohesion: 0.09
Nodes (35): Button(), buttonVariants, Card(), CardAction(), CardContent(), CardDescription(), CardFooter(), CardHeader() (+27 more)

### Community 18 - "README.md"
Cohesion: 0.05
Nodes (42): Next.js Logo, Vercel Logo, Zapier Brand Logo, Next.js Frontend Application, Primary Backend Bun Service, Actions, API Endpoints, `apps/frontend/.env.local` (+34 more)

### Community 19 - "eslint-config/package.json"
Cohesion: 0.08
Nodes (34): config, nextJsConfig, devDependencies, eslint, eslint-config-prettier, @eslint/js, eslint-plugin-only-warn, eslint-plugin-react (+26 more)

### Community 20 - "commonInputTypes.ts"
Cohesion: 0.05
Nodes (37): BoolFilter, BoolWithAggregatesFilter, DateTimeFilter, DateTimeNullableFilter, DateTimeNullableWithAggregatesFilter, DateTimeWithAggregatesFilter, IntFilter, IntNullableFilter (+29 more)

### Community 21 - "triage-evidence.ts"
Cohesion: 0.10
Nodes (23): ActionOrderRow, canonical(), ExecutionAttemptRow, hash(), OwnedCaseRow, PredecessorRow, sourceKind(), TriageCaseNotFound (+15 more)

### Community 22 - "replay-db.integration.test.ts"
Cohesion: 0.12
Nodes (21): allowedDecisions(), Decision, DecisionRow, InvestigationAuthority, InvestigationDecisionDenied, TransactionDb, evaluateSnapshotPolicy(), InvestigationProposals (+13 more)

### Community 23 - "dlq-publisher-index.ts"
Cohesion: 0.08
Nodes (25): createDlqPublisher(), DlqPublisherDb, dueWhere(), DurableFailureEvent, evidenceSources, FailureRow, main(), ProcessDependencies (+17 more)

### Community 24 - "diagnosis-graph.test.ts"
Cohesion: 0.11
Nodes (21): agentDatabaseUrl(), createCheckpoint(), migrateAgent(), IntegratedDiagnosisModel, DiagnosisOptions, poll(), port, pool (+13 more)

### Community 25 - "6. Phases, dependencies and implementation increments"
Cohesion: 0.06
Nodes (34): 1. Current AI-relevant architecture, 2. Release scope and workflow, 3. Boundaries, state and initial contracts, 4. Failure taxonomy and the minimum RAG corpus, 5. Deterministic replay design and release gate, 6. Phases, dependencies and implementation increments, 7. Verification and handoff, 8. Risks and deliberately deferred complexity (+26 more)

### Community 26 - "ai_agent/package.json"
Cohesion: 0.06
Nodes (31): dependencies, express, @langchain/langgraph, @langchain/langgraph-checkpoint-postgres, pg, zod, devDependencies, @types/bun (+23 more)

### Community 27 - "idempotency.test.ts"
Cohesion: 0.10
Nodes (25): actionRegistry, getActionHandler(), accepted, acceptedRun, Call, dbFailure, rejected, rejectedRun (+17 more)

### Community 28 - "Appbar.tsx"
Cohesion: 0.13
Nodes (19): Avatar(), AvatarFallback(), AvatarImage(), DropdownMenu(), DropdownMenuContent(), DropdownMenuGroup(), DropdownMenuItem(), DropdownMenuLabel() (+11 more)

### Community 29 - "ui/package.json"
Cohesion: 0.07
Nodes (28): dependencies, react, react-dom, devDependencies, eslint, @repo/eslint-config, @repo/typescript-config, @types/node (+20 more)

### Community 30 - "frontend/package.json"
Cohesion: 0.07
Nodes (26): @clerk/nextjs, @types/node, typescript, name, private, scripts, build, dev (+18 more)

### Community 31 - "primary_backend/index.ts"
Cohesion: 0.12
Nodes (18): agent, app, actionRouter, router, router, triggerRouter, assertLocalDatabase(), F01_CASE_ID (+10 more)

### Community 32 - "diagnosis-http.test.ts"
Cohesion: 0.15
Nodes (14): DiagnosisModel, Evidence, FixtureDiagnosisModel, createHttpServer(), RunningHttpServer, defaultFixtureDirectory(), defaultRunbookDirectory(), backend() (+6 more)

### Community 33 - "safety-probes.ts"
Cohesion: 0.14
Nodes (15): eligibleReplayFacts, now, Query, runSafetyProbes(), SafetyProbe, AccessAction, CaseRow, OperatorDb (+7 more)

### Community 34 - "login/page.tsx"
Cohesion: 0.13
Nodes (10): LoginResponse, BACKEND_URL, HOOKS_URL, Appbar(), PrimaryButton(), CheckFeature(), Hero(), HeroVideo() (+2 more)

### Community 35 - "replay-policy-facts.ts"
Cohesion: 0.11
Nodes (17): Database, PolicyRecord, Submission, evaluateReplayPolicy(), buildReplayPolicyFacts(), ConfigurationRow, CurrentConfiguration, PolicyEvidence (+9 more)

### Community 36 - "prismaNamespaceBrowser.ts"
Cohesion: 0.08
Nodes (24): ActionScalarFieldEnum, AnyNull, AvailableActionScalarFieldEnum, AvailableTriggerTypeScalarFieldEnum, DbNull, Decimal, JsonNull, JsonNullValueFilter (+16 more)

### Community 37 - "contracts.ts"
Cohesion: 0.09
Nodes (22): ActionInputValidationEvidenceSchema, boundedError, boundedName, boundedSummary, DiagnosisSchema, evidenceRef, ExecutionEvidenceSchema, FailureContextEvidenceSchema (+14 more)

### Community 38 - "dependencies"
Cohesion: 0.08
Nodes (25): dependencies, axios, class-variance-authority, @clerk/nextjs, clsx, jwt-decode, lucide-react, motion (+17 more)

### Community 39 - "client.ts"
Cohesion: 0.09
Nodes (23): Action, AvailableAction, AvailableTriggerType, $Enums, PrismaClient, TestTriggerBuffer, Trigger, User (+15 more)

### Community 40 - "ReleaseRunner"
Cohesion: 0.23
Nodes (6): lintErrors(), ReleaseRunner, unexpectedLintFailure(), validateFile(), mergedPhase(), fixture()

### Community 41 - "route/triage.ts"
Cohesion: 0.13
Nodes (15): notifications, bearer(), createTriageRouter(), runnerBinding, TriageRouterOptions, uuid, AgentReadTimeout, TriageAgentClient (+7 more)

### Community 43 - "useTriage.ts"
Cohesion: 0.17
Nodes (14): TriagePage(), decisionLabels, SavedInvestigationControls(), saved, TriageResults(), ApiError, errorState(), operatorRequest() (+6 more)

### Community 44 - "worker/index.ts"
Cohesion: 0.17
Nodes (17): deliver(), ExecutionDb, harness(), consumer, kafka, loadStageExecution(), main(), processMessage() (+9 more)

### Community 45 - "search-runbooks.ts"
Cohesion: 0.15
Nodes (18): allowedFiles, commaSeparated(), ignoredTerms, IndexedSection, intersects(), loadRunbooks(), normalizedFilters(), parseMetadata() (+10 more)

### Community 46 - "replay-recovery.integration.test.ts"
Cohesion: 0.14
Nodes (11): main(), createReplayDispatcher(), DispatchRow, liveReplayEnabled(), REPLAY_RELEASE_READY, Sink, createKafkaFixture(), accepted (+3 more)

### Community 47 - "actions/telegram.ts"
Cohesion: 0.21
Nodes (15): boundedPositiveInteger(), FetchTransport, readJson(), resolutionError(), resolveChatId(), retryAfter(), safeIdentifier(), sendError() (+7 more)

### Community 48 - "worker/replay.ts"
Cohesion: 0.13
Nodes (19): canonicalJson(), ClaimDecision, createExecutionStore(), Delegate, DurableFailureEvidence, ExecutionKey, FinalizeDecision, fingerprint() (+11 more)

### Community 50 - "components.json"
Cohesion: 0.10
Nodes (19): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+11 more)

### Community 51 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib (+11 more)

### Community 52 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, jsx, lib, module, moduleDetection, moduleResolution (+11 more)

### Community 53 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, jsx, lib, module, moduleDetection, moduleResolution (+11 more)

### Community 54 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, jsx, lib, module, moduleDetection, moduleResolution (+11 more)

### Community 55 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, jsx, lib, module, moduleDetection, moduleResolution (+11 more)

### Community 56 - "experiment.ts"
Cohesion: 0.16
Nodes (16): checkDiagnosisEvaluation(), checkEvaluationObservation(), evaluationEvidenceRef(), EvaluationObservation, EvaluationObservationSchema, fixtureObservation(), metric(), renderEvaluationReport() (+8 more)

### Community 57 - "investigation-http.ts"
Cohesion: 0.20
Nodes (10): streamInvestigationEvents(), writeEvent(), bearer(), createInvestigationRouter(), startSchema, start(), start(), encodeInvestigationEvent() (+2 more)

### Community 58 - "investigation-store.ts"
Cohesion: 0.16
Nodes (9): InvestigationBinding, InvestigationStore, JobRow, project(), StartInvestigation, query(), sql(), store (+1 more)

### Community 59 - "dialog.tsx"
Cohesion: 0.18
Nodes (12): Dialog(), DialogClose(), DialogContent(), DialogDescription(), DialogFooter(), DialogHeader(), DialogOverlay(), DialogTitle() (+4 more)

### Community 60 - "worker/package.json"
Cohesion: 0.11
Nodes (18): @types/bun, dependencies, resend, devDependencies, @types/bun, @types/bun, typescript, module (+10 more)

### Community 61 - "Architectural Decision Records (ADRs)"
Cohesion: 0.11
Nodes (19): ADR 001: Transactional Outbox Pattern for Webhook Ingestion, ADR 002: Linear Sorting Order for Workflow Step Sequencing, ADR 003: Fenced Single-Shot Execution via PostgreSQL, ADR 004: Durable Failure Record and Separate DLQ Publication, ADR 005: Hybrid Authentication with Clerk Token Exchange, ADR 006: Self-Contained Action Registry Pattern, ADR 007: Manual Kafka Offset Commit After Durable Resolution, ADR 008: No Automatic Provider Retry in Execution (+11 more)

### Community 62 - "AGENTS.md"
Cohesion: 0.11
Nodes (17): 1. Architecture & Master Plan: Astra (ChatGPT), 2. Implementation: Codex (GPT-6 Sol / Terra), 3. Documentation & Ops: Antigravity (Gemini), AGENTS.md, Core Architectural Invariants, Documentation, Engineering Guide, Graphify (+9 more)

### Community 63 - "gemini-model.ts"
Cohesion: 0.14
Nodes (12): DiagnosisPrompt, ModelGeneration, boundedString, evidenceReference, FetchLike, GEMINI_DIAGNOSIS_SCHEMA, GeminiDiagnosisModel, GeminiDiagnosisModelOptions (+4 more)

### Community 64 - "services/replay.ts"
Cohesion: 0.16
Nodes (10): ProposalRow, SqlClient, Approval, Binding, Database, ReplayDenied, ReplayInput, ReplayService (+2 more)

### Community 65 - "actions/email.ts"
Cohesion: 0.18
Nodes (13): emailAction, EmailTransport, resend, resendErrorNames, safeEmailCode(), safeReceipt(), sendEmail(), captureFailure() (+5 more)

### Community 78 - "observability.ts"
Cohesion: 0.16
Nodes (11): ModelUsage, createLangfuseExporter(), errorType(), FetchLike, InvestigationTrace, InvestigationTracer, safeIdentifier, safeModelUsage() (+3 more)

### Community 79 - "checks.ts"
Cohesion: 0.17
Nodes (12): boundedCode, checkEvaluationDataset(), diagnosisIds, EvaluationCase, EvaluationCaseSchema, expectedCaseMetadata, loadEvaluationCases(), parseEvaluationCases() (+4 more)

### Community 80 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, lib, module, moduleDetection, moduleResolution, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 81 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, declaration, declarationMap, esModuleInterop, incremental, isolatedModules, lib, module (+8 more)

### Community 82 - "execution-store.test.ts"
Cohesion: 0.14
Nodes (15): AttemptOwner, { db, state }, failedOwner, fakeDb(), fingerprints, invalid, matches(), normalized (+7 more)

### Community 83 - "retrieval-experiment.ts"
Cohesion: 0.18
Nodes (12): bm25(), ignoredTerms, Metrics, RetrievalExperimentCase, retrievalExperimentCases, RetrievalExperimentResult, runRetrievalExperiment(), Split (+4 more)

### Community 84 - "processor/package.json"
Cohesion: 0.13
Nodes (14): dependencies, kafkajs, devDependencies, @types/bun, @types/bun, typescript, module, name (+6 more)

### Community 85 - "webhook/package.json"
Cohesion: 0.13
Nodes (14): express, prisma, @prisma/client, @prisma/extension-accelerate, @types/express, typescript, module, name (+6 more)

### Community 86 - "🚀 Applications (`apps/`)"
Cohesion: 0.13
Nodes (15): 1. `db` ([`packages/db`](../packages/db)), 1. `primary_backend` ([`apps/primary_backend`](../apps/primary_backend)), 2. `ui` ([`packages/ui`](../packages/ui)), 2. `webhook` ([`apps/webhook`](../apps/webhook)), 3. `processor` ([`apps/processor`](../apps/processor)), 3. `typescript-config` & `eslint-config`, 4. `worker` ([`apps/worker`](../apps/worker)), 5. `frontend` ([`apps/frontend`](../apps/frontend)) (+7 more)

### Community 87 - "package.json"
Cohesion: 0.13
Nodes (14): dependencies, @prisma/client, @prisma/extension-accelerate, engines, node, name, packageManager, private (+6 more)

### Community 88 - "browser.ts"
Cohesion: 0.13
Nodes (13): Action, AvailableAction, AvailableTriggerType, $Enums, TestTriggerBuffer, Trigger, User, Zap (+5 more)

### Community 89 - "tasks"
Cohesion: 0.13
Nodes (14): dependsOn, inputs, outputs, dependsOn, cache, persistent, dependsOn, $schema (+6 more)

### Community 90 - "primary_backend/package.json"
Cohesion: 0.14
Nodes (13): @clerk/nextjs, express, @types/express, zod, module, name, private, type (+5 more)

### Community 91 - "DLQ failure taxonomy and investigation requirements"
Cohesion: 0.14
Nodes (14): Cross-cutting evaluation cases, DLQ failure taxonomy and investigation requirements, Evidence that actually exists, F01 — Telegram rate limit, F02 — Provider outage or transport failure, F03 — Telegram credential or permission failure, F04 — Invalid destination or missing template input, F05 — Unsupported action type (+6 more)

### Community 92 - "✅ Implemented Capabilities"
Cohesion: 0.14
Nodes (14): 1. Ingestion & Outbox Reliability, 2. Execution Engine & Worker Subsystem, 3. API & Management, 4.1 Phase 5 simulated runbooks and retrieval, 4.2 Phase 6 bounded transient diagnosis graph, 4.3 Phase 10B/10C saved investigations and progress streaming, 4. AI Triage Evidence, 5. Frontend Dashboard & Builder (+6 more)

### Community 93 - "dependencies"
Cohesion: 0.15
Nodes (13): dependencies, bcrypt, @clerk/backend, @clerk/nextjs, cors, dotenv, express, jsonwebtoken (+5 more)

### Community 94 - "Phase 3A Provider Outcomes Design"
Cohesion: 0.15
Nodes (12): Compatibility and Rollout, Contracts, Email Flow, Error Handling and Redaction, Non-Goals, Outcome Vocabulary, Phase 3A Provider Outcomes Design, Purpose (+4 more)

### Community 95 - "🗺️ Documentation Map"
Cohesion: 0.18
Nodes (12): Delivery and State Invariants, Action Handler Contract, Action Registry, Event-Driven System Topology, Transactional Outbox Communication Boundary, ADR Transactional Outbox, Distributed Lease Claim, Workflow Execution Lifecycle (+4 more)

### Community 96 - "prompts.ts"
Cohesion: 0.18
Nodes (6): ExecutionEvidence, buildDiagnosisPrompt(), DIAGNOSIS_PROMPT_VERSION, BackendExecutionEvidenceTool, ExecutionEvidenceBackend, RunbookMatch

### Community 97 - "useInvestigationStream.ts"
Cohesion: 0.26
Nodes (8): useInvestigationStream(), pause(), StreamOptions, encoder, event(), start(), watchInvestigation(), sanitizeInvestigationEvent()

### Community 98 - "createReplayStore"
Cohesion: 0.30
Nodes (11): replayStore(), execute(), store(), createReplayStore(), claim(), complete(), deny(), record() (+3 more)

### Community 99 - "Action Registry & Extensibility"
Cohesion: 0.17
Nodes (12): 1. Email Action (`email`), 2. Telegram Action (`telegram`), 🏛️ Action Registry Architecture, Action Registry & Extensibility, 🗂️ Action Registry & Resolution, `ActionContext`, `ActionHandler`, ➕ Adding a New Action Integration (+4 more)

### Community 100 - "Global Constraints"
Cohesion: 0.17
Nodes (11): Deferred, Global Constraints, Task 1: Extract and test `withRetry`, Task 2: Retry table migration, Task 3: Dead-letter failed events, Task 4: Zap detail endpoint returns run history, Task 5: Read-only Zap detail page, Task 6: Clerk token exchange endpoint (+3 more)

### Community 101 - "Kafka Zap Events Topic"
Cohesion: 0.20
Nodes (11): Processor Bun Service, Webhook Bun Service, Worker Bun Service, Kafka KRaft Service, PostgreSQL Service, Local Infrastructure Stack Configuration, Kafka Zap Events Topic, Prisma PostgreSQL Persistence (+3 more)

### Community 102 - "Template, registry, and stage validation"
Cohesion: 0.18
Nodes (10): Allowed remediation, Evidence needed, Forbidden actions, Read-only investigation, Replay and approval, Simulated example, Sources, Symptoms (+2 more)

### Community 103 - "Phase 3B Durable Failures Design"
Cohesion: 0.18
Nodes (10): Evidence and security rules, Non-goals, Phase 3B Durable Failures Design, Phase 3C boundary, Proposed schema and interfaces, Purpose, Scope, State transitions (+2 more)

### Community 104 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, allowJs, jsx, module, moduleResolution, noEmit, plugins, extends (+2 more)

### Community 105 - "layout.tsx"
Cohesion: 0.22
Nodes (6): nextConfig, geistMono, geistSans, inter, Toaster(), next

### Community 106 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, tw-animate-css, @types/node, @types/react (+2 more)

### Community 107 - "triage-outcome.test.tsx"
Cohesion: 0.33
Nodes (7): FetchLike, pollInvestigation(), requestTriage(), TriageRequestOptions, fixture(), servers, token()

### Community 108 - "user.ts"
Cohesion: 0.24
Nodes (8): clerk, router, userRouter, SigninSchema, SignupSchema, ZapScehema, bcrypt, @clerk/backend

### Community 109 - "Credentials and destinations"
Cohesion: 0.20
Nodes (10): Allowed remediation, Credentials and destinations, Evidence needed, Forbidden actions, Read-only investigation, Replay and approval, Simulated example, Sources (+2 more)

### Community 110 - "Evidence gaps and progression failures"
Cohesion: 0.20
Nodes (10): Allowed remediation, Evidence gaps and progression failures, Evidence needed, Forbidden actions, Read-only investigation, Replay and approval, Simulated example, Sources (+2 more)

### Community 111 - "Replay and stale cases"
Cohesion: 0.20
Nodes (10): Allowed remediation, Evidence needed, Forbidden actions, Read-only investigation, Replay and approval, Replay and stale cases, Simulated example, Sources (+2 more)

### Community 112 - "Transient provider failure"
Cohesion: 0.20
Nodes (10): Allowed remediation, Evidence needed, Forbidden actions, Read-only investigation, Replay and approval, Simulated example, Sources, Symptoms (+2 more)

### Community 113 - "Uncertain external delivery"
Cohesion: 0.20
Nodes (10): Allowed remediation, Evidence needed, Forbidden actions, Read-only investigation, Replay and approval, Simulated example, Sources, Symptoms (+2 more)

### Community 114 - "🪜 Step-by-Step Lifecycle Breakdown"
Cohesion: 0.20
Nodes (10): 🔁 End-to-End Sequence Diagram, Phase 1: Webhook Ingestion & Transactional Outbox, Phase 2: Outbox Processing & Kafka Production, Phase 3: Worker Consumption & Distributed Lease Claim, Phase 4: Single-Shot Action Execution, Phase 5: Stage Advancement & Dead-Letter Routing, Phase 6: Additive Replay Generation (Phase 9A/9B; gated), 🪜 Step-by-Step Lifecycle Breakdown (+2 more)

### Community 115 - "Idempotency & Deduplication"
Cohesion: 0.20
Nodes (10): 1. Ingestion: Transactional Outbox ([`apps/webhook/index.ts`](../apps/webhook/index.ts)), 2. Event Dispatch: ACK-Before-Delete ([`apps/processor/index.ts`](../apps/processor/index.ts)), 3. Worker Execution: Fenced Single-Shot Claim ([`apps/worker/orchestration.ts`](../apps/worker/orchestration.ts)), 4. External Provider Side Effects, Idempotency & Deduplication, 🔑 Idempotency Key Specification, Key Formulation, 🛡️ Multi-Layered Idempotency Architecture (+2 more)

### Community 116 - "Kafka Messaging Architecture"
Cohesion: 0.22
Nodes (9): 1. `zap-events` Message Schema, 2. `zap-events-dlq` Message Schema, Consumers, Kafka Messaging Architecture, 📡 Kafka Topics Overview, 📨 Message Schemas, 🔒 Offset Commit & Delivery Semantics, ⚙️ Producer & Consumer Topology (+1 more)

### Community 117 - "Background Worker"
Cohesion: 0.22
Nodes (9): 🛠️ Action Dispatch & Execution, Background Worker, Database Model, 🔒 Distributed Lease Management (`ZapRunExecution`), 🪦 Durable Failure Recording, 📐 Invariants Summary, Lease Rules & State Transitions, Replay generation (Phase 9A/9B; release disabled) (+1 more)

### Community 118 - "route/zap.ts"
Cohesion: 0.29
Nodes (6): authMiddleware(), DecodedToken, Express, Request, router, zapRouter

### Community 119 - "File Map"
Cohesion: 0.25
Nodes (7): File Map, Global Constraints, Phase 3A Provider Outcomes Implementation Plan, Task 1: Worker Outcome Contract and Generic Retry, Task 2: Normalize Resend Outcomes, Task 3: Normalize Telegram Resolution and Send Outcomes, Task 4: Wire and Verify the Phase 3A Boundary

### Community 120 - "Phase 3C Durable DLQ Publication Design"
Cohesion: 0.25
Nodes (7): Data model, Goal, Phase 3C Durable DLQ Publication Design, Publication boundary, Reconciliation, Runtime, Verification

### Community 121 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, check-types, dev, format, lint, postinstall, test:replay-recovery

### Community 123 - "investigation-notifications.ts"
Cohesion: 0.38
Nodes (3): InvestigationNotifications, PendingDecision, pending

### Community 124 - "System Architecture"
Cohesion: 0.29
Nodes (7): AI Triage Boundary (Phase 4A-4C), 🔄 Component Communication Mechanisms, 🔌 External Dependencies, 🏗️ High-Level Topology, Investigation progress transport (Phase 10C), 📦 Major Applications & Packages, System Architecture

### Community 125 - "Global Constraints"
Cohesion: 0.29
Nodes (6): Global Constraints, Phase 2 Evaluation Fixtures Implementation Plan, Task 1: Strict evaluation-case contract and JSONL parser, Task 2: Dataset-wide deterministic rubric, Task 3: Versioned 26-case dataset and held-out loader, Task 4: Privacy mutation checks and full verification

### Community 126 - "Global Constraints"
Cohesion: 0.29
Nodes (6): Global Constraints, Phase 3B Durable Failures Implementation Plan, Self-Review and Known Boundary, Task 1: Add the Durable Execution, Attempt, and Failure Schema, Task 2: Implement the Fenced Persistence State Machine, Task 3: Integrate Single-Shot Execution, ACK Gating, and Architecture Docs

### Community 127 - "typescript-config/package.json"
Cohesion: 0.29
Nodes (6): license, name, private, publishConfig, access, version

### Community 128 - "ui/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, exclude, extends, include, @repo/typescript-config/react-library.json

### Community 129 - "Graphify Knowledge Graph Guidance"
Cohesion: 0.33
Nodes (5): Graphify Knowledge Graph Guidance, ⏱️ Update Policy & Workflow, 🔄 Updating Graphify, 🗺️ What is Graphify?, 🔍 When to Consult Graphify

### Community 130 - "Mission: Production-style AI systems"
Cohesion: 0.33
Nodes (5): Constraints, Mission: Production-style AI systems, Out of scope, Success looks like, Why

### Community 135 - "react-library.json"
Cohesion: 0.33
Nodes (5): compilerOptions, jsx, extends, ./base.json, $schema

### Community 136 - "R1 retrieval experiment"
Cohesion: 0.40
Nodes (4): Method, R1 retrieval experiment, Recommendation, Results

### Community 137 - "dependencies"
Cohesion: 0.40
Nodes (5): dependencies, express, @prisma/client, @prisma/extension-accelerate, @types/express

### Community 138 - "Global Constraints"
Cohesion: 0.40
Nodes (4): Global Constraints, Phase 3C Durable DLQ Publication Implementation Plan, Task 1: Phase 3C-A — Fenced Durable Failure Publisher, Task 2: Phase 3C-B — Reconciliation and Separate Runtime

### Community 139 - "Q: Where should Phase 3 provider outcomes and durable failure evidence integrate in the worker?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Where should Phase 3 provider outcomes and durable failure evidence integrate in the worker?, Source Nodes

### Community 140 - "Q: Start Phase 3C durable DLQ publication and reconciliation"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Start Phase 3C durable DLQ publication and reconciliation, Source Nodes

### Community 141 - "Q: oh but my idea for this prj dlq system was like instead of a support team sitting in the backend and seeing and debugging the error , sending it to developing and testing , the AI agent checks that , then finds the error and suggests remedy to the support team /in my case it will be me , then after approval the error is replayed for fix or other option . But now it is like the owner of the zap checks this .? what canthe owner do in the case of humman approval .? now i was learnign the phase 4 and i got to know this but the phase 5 was also completed now ."
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: oh but my idea for this prj dlq system was like instead of a support team sitting in the backend and seeing and debugging the error , sending it to developing and testing , the AI agent checks that , then finds the error and suggests remedy to the support team /in my case it will be me , then after approval the error is replayed for fix or other option . But now it is like the owner of the zap checks this .? what canthe owner do in the case of humman approval .? now i was learnign the phase 4 and i got to know this but the phase 5 was also completed now ., Source Nodes

### Community 142 - "devDependencies"
Cohesion: 0.40
Nodes (5): devDependencies, prettier, prisma, turbo, typescript

### Community 143 - "class.ts"
Cohesion: 0.40
Nodes (3): config, LogOptions, PrismaClientConstructor

### Community 150 - "kafkajs-bun-fix.js"
Cohesion: 0.40
Nodes (4): content, fs, path, possiblePaths

### Community 151 - "Production AI Service Resources"
Cohesion: 0.40
Nodes (4): Gaps, Knowledge, Production AI Service Resources, Wisdom (Communities)

### Community 152 - "frontend/README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 154 - "Manual Offset Commit Protocol"
Cohesion: 0.50
Nodes (4): ADR Two-Phase Execution Lease, At-Least-Once Delivery Semantics, Manual Offset Commit Protocol, PostgreSQL Execution Lease

### Community 156 - "scripts"
Cohesion: 0.67
Nodes (3): scripts, dev, dev:replay

### Community 157 - "devDependencies"
Cohesion: 0.67
Nodes (3): devDependencies, prisma, @types/bun

### Community 158 - "Repository Documentation"
Cohesion: 0.67
Nodes (3): 📚 Core Documentation Index, 🧭 Navigation Guidelines for Agents & Developers, Repository Documentation

## Knowledge Gaps
- **2168 isolated node(s):** `ActionScalarFieldEnum`, `Args`, `At`, `AtLeast`, `AtLoose` (+2163 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 2590 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **50 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `lucide-react` connect `create/page.tsx` to `layout.tsx`, `useTriage.ts`, `history/page.tsx`, `cn`, `dialog.tsx`, `Appbar.tsx`, `frontend/package.json`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `react` connect `create/page.tsx` to `useInvestigationStream.ts`, `useTriage.ts`, `history/page.tsx`, `cn`, `dialog.tsx`, `Appbar.tsx`, `frontend/package.json`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `resend` connect `worker/package.json` to `actions/email.ts`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `ActionScalarFieldEnum`, `Args`, `At` to the rest of the system?**
  _2168 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `prismaNamespace.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.015267175572519083 - nodes in this community are weakly interconnected._
- **Should `Zap.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.017094017094017096 - nodes in this community are weakly interconnected._
- **Should `Action.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.021052631578947368 - nodes in this community are weakly interconnected._
## Refresh coverage and limitations

- Structural extraction covers all successfully extracted changed code and Markdown. Sol added grounded Phase 11 semantic annotations; no broad provider-generated semantic reinterpretation was run.
- 19 SQL sources require the missing tree_sitter_sql dependency and remain queued. Their existing nodes are retained.
- 12 unresolved source references predate this refresh. No new unresolved source references were introduced.
- Community labels are deterministic hub labels. Fresh model token usage/cost is unavailable from this session; extraction made no external model API calls.
