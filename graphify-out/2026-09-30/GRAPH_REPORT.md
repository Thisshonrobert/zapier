# Graph Report - zapier  (2026-09-30)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 3163 nodes · 4359 edges · 156 communities (109 shown, 42 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 41 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `26573454`
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
- graph.ts
- TestTriggerBuffer.ts
- ZapTable.tsx
- create/page.tsx
- cn
- primary_backend/index.ts
- diagnosis-http.test.ts
- eslint-config/package.json
- route/triage.ts
- commonInputTypes.ts
- private-http.ts
- dlq-publisher.ts
- src/index.ts
- 6. Phases, dependencies and implementation increments
- contracts.ts
- frontend/package.json
- Appbar.tsx
- idempotency.test.ts
- ui/package.json
- prismaNamespaceBrowser.ts
- dependencies
- replay-policy-facts.ts
- client.ts
- triage-evidence.ts
- execution-store.ts
- dialog.tsx
- PrismaClient
- gemini-model.ts
- checks.ts
- search-runbooks.ts
- components.json
- login/page.tsx
- useTriage.ts
- triage-operator.ts
- compilerOptions
- compilerOptions
- compilerOptions
- actions/telegram.ts
- compilerOptions
- compilerOptions
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
- compilerOptions
- webhook/package.json
- worker/package.json
- actions/email.ts
- compilerOptions
- primary_backend/package.json
- investigation-authority.ts
- investigation-notifications.ts
- retrieval-experiment.ts
- processor/package.json
- execution-store.test.ts
- package.json
- browser.ts
- tasks
- DLQ failure taxonomy and investigation requirements
- dependencies
- seed-f01-case.ts
- validation.ts
- ai-dlq-master-plan.md
- Phase 3A Provider Outcomes Design
- Documentation Map
- Kafka Zap Events Topic
- compilerOptions
- ai_agent/package.json
- layout.tsx
- devDependencies
- Credentials and destinations
- Evidence gaps and progression failures
- Replay and stale cases
- Template, registry, and stage validation
- Transient provider failure
- Uncertain external delivery
- documentation.md
- Phase 3B Durable Failures Design
- triage-db.integration.test.ts
- File Map
- Phase 3C Durable DLQ Publication Design
- Prisma__ZapClient
- scripts
- Global Constraints
- Global Constraints
- scripts
- typescript-config/package.json
- ui/tsconfig.json
- dependencies
- devDependencies
- Next.js Frontend Application
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

## God Nodes (most connected - your core abstractions)
1. `cn()` - 61 edges
2. `buildDiagnosisService()` - 30 edges
3. `PrismaClient` - 22 edges
4. `lucide-react` - 22 edges
5. `verifyServiceScope()` - 19 edges
6. `compilerOptions` - 19 edges
7. `compilerOptions` - 19 edges
8. `compilerOptions` - 19 edges
9. `compilerOptions` - 19 edges
10. `ActionDelegate` - 18 edges

## Surprising Connections (you probably didn't know these)
- `Zapier Brand Logo` --conceptually_related_to--> `Zapier Clone Project Overview`  [INFERRED]
  apps/frontend/public/Zapier-logo.png → README.md
- `Delivery and State Invariants` --semantically_similar_to--> `Defense-in-Depth Idempotency`  [INFERRED] [semantically similar]
  AGENTS.MD → docs/idempotency.md
- `scope()` --calls--> `createServiceScope()`  [EXTRACTED]
  apps/ai_agent/tests/diagnosis-http.test.ts → packages/triage-contracts/index.ts
- `token()` --calls--> `createServiceScope()`  [EXTRACTED]
  apps/ai_agent/tests/investigation-http.test.ts → packages/triage-contracts/index.ts
- `token()` --calls--> `createServiceScope()`  [EXTRACTED]
  apps/primary_backend/tests/triage-auth.test.ts → packages/triage-contracts/index.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Zap Execution Event Flow** — readme_transactional_outbox, readme_kafka_zap_events, readme_worker_action_execution [EXTRACTED 1.00]
- **Idempotency Defense Layers** — docs_architecture_transactional_outbox, docs_worker_execution_lease, docs_kafka_manual_offset_commits [INFERRED 0.95]

## Communities (156 total, 42 thin omitted)

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

### Community 12 - "graph.ts"
Cohesion: 0.07
Nodes (44): FailureContextEvidence, IntegratedModelOutputSchema, PreviewRequestSchema, PreviewResult, bearer(), DiagnosisRouterOptions, EmptyDiagnosisRequestSchema, requiredOperations (+36 more)

### Community 13 - "TestTriggerBuffer.ts"
Cohesion: 0.03
Nodes (58): AggregateTestTriggerBuffer, GetTestTriggerBufferAggregateType, GetTestTriggerBufferGroupByPayload, TestTriggerBufferAggregateArgs, TestTriggerBufferAvgAggregateInputType, TestTriggerBufferAvgAggregateOutputType, TestTriggerBufferAvgOrderByAggregateInput, TestTriggerBufferCountAggregateInputType (+50 more)

### Community 14 - "ZapTable.tsx"
Cohesion: 0.09
Nodes (38): Connection, ConnectionsPage(), formatDate(), toConnections(), DashboardPage(), SCRATCH_CARDS, FILTER_CHIPS, HistoryPage() (+30 more)

### Community 15 - "create/page.tsx"
Cohesion: 0.10
Nodes (37): metadata, action, TriggerTestResult, useZapStore, zapData, Email(), Telegram(), ActionNode (+29 more)

### Community 16 - "cn"
Cohesion: 0.08
Nodes (36): Badge(), badgeVariants, Button(), buttonVariants, Card(), CardAction(), CardContent(), CardDescription() (+28 more)

### Community 17 - "primary_backend/index.ts"
Cohesion: 0.08
Nodes (27): agent, app, notifications, authMiddleware(), DecodedToken, Express, Request, actionRouter (+19 more)

### Community 18 - "diagnosis-http.test.ts"
Cohesion: 0.10
Nodes (22): DiagnosisModel, Evidence, EvidenceSchema, FixtureDiagnosisModel, PreviewOptions, createHttpServer(), RunningHttpServer, defaultFixtureDirectory() (+14 more)

### Community 19 - "eslint-config/package.json"
Cohesion: 0.08
Nodes (34): config, nextJsConfig, devDependencies, eslint, eslint-config-prettier, @eslint/js, eslint-plugin-only-warn, eslint-plugin-react (+26 more)

### Community 20 - "route/triage.ts"
Cohesion: 0.10
Nodes (30): InvestigationDecision, bearer(), createInvestigationRouter(), startSchema, start(), token(), bearer(), createTriageRouter() (+22 more)

### Community 21 - "commonInputTypes.ts"
Cohesion: 0.05
Nodes (37): BoolFilter, BoolWithAggregatesFilter, DateTimeFilter, DateTimeNullableFilter, DateTimeNullableWithAggregatesFilter, DateTimeWithAggregatesFilter, IntFilter, IntNullableFilter (+29 more)

### Community 22 - "private-http.ts"
Cohesion: 0.10
Nodes (16): BackendClient, BackendReadTimeout, BackendResponseError, ActionInputValidationEvidence, ExecutionEvidence, createDiagnosisRouter(), bearer(), createPrivateToolsRouter() (+8 more)

### Community 23 - "dlq-publisher.ts"
Cohesion: 0.08
Nodes (25): createDlqPublisher(), DlqPublisherDb, dueWhere(), DurableFailureEvent, evidenceSources, FailureRow, main(), ProcessDependencies (+17 more)

### Community 24 - "src/index.ts"
Cohesion: 0.11
Nodes (18): agentDatabaseUrl(), createCheckpoint(), migrateAgent(), DiagnosisOptions, poll(), port, InvestigationBinding, InvestigationStore (+10 more)

### Community 25 - "6. Phases, dependencies and implementation increments"
Cohesion: 0.06
Nodes (32): 1. Current AI-relevant architecture, 2. Release scope and workflow, 3. Boundaries, state and initial contracts, 4. Failure taxonomy and the minimum RAG corpus, 5. Deterministic replay design and release gate, 6. Phases, dependencies and implementation increments, 7. Verification and handoff, 8. Risks and deliberately deferred complexity (+24 more)

### Community 26 - "contracts.ts"
Cohesion: 0.09
Nodes (23): BackendClientOptions, ActionInputValidationEvidenceSchema, boundedError, boundedName, boundedSummary, DiagnosisSchema, evidenceRef, ExecutionEvidenceSchema (+15 more)

### Community 27 - "frontend/package.json"
Cohesion: 0.07
Nodes (28): @clerk/nextjs, eslint, react, react-dom, @types/node, @types/react, @types/react-dom, typescript (+20 more)

### Community 28 - "Appbar.tsx"
Cohesion: 0.15
Nodes (19): Avatar(), AvatarFallback(), AvatarImage(), DropdownMenu(), DropdownMenuContent(), DropdownMenuGroup(), DropdownMenuItem(), DropdownMenuLabel() (+11 more)

### Community 29 - "idempotency.test.ts"
Cohesion: 0.11
Nodes (25): getActionHandler(), AttemptOwner, accepted, acceptedRun, Call, dbFailure, harness(), rejected (+17 more)

### Community 30 - "ui/package.json"
Cohesion: 0.07
Nodes (27): dependencies, react, react-dom, devDependencies, eslint, @repo/eslint-config, @repo/typescript-config, @types/node (+19 more)

### Community 31 - "prismaNamespaceBrowser.ts"
Cohesion: 0.08
Nodes (24): ActionScalarFieldEnum, AnyNull, AvailableActionScalarFieldEnum, AvailableTriggerTypeScalarFieldEnum, DbNull, Decimal, JsonNull, JsonNullValueFilter (+16 more)

### Community 32 - "dependencies"
Cohesion: 0.08
Nodes (25): dependencies, axios, class-variance-authority, @clerk/nextjs, clsx, jwt-decode, lucide-react, motion (+17 more)

### Community 33 - "replay-policy-facts.ts"
Cohesion: 0.13
Nodes (19): Database, evaluateSnapshotPolicy(), PolicyRecord, Submission, evaluateReplayPolicy(), buildReplayPolicyFacts(), ConfigurationRow, CurrentConfiguration (+11 more)

### Community 34 - "client.ts"
Cohesion: 0.09
Nodes (23): Action, AvailableAction, AvailableTriggerType, $Enums, PrismaClient, TestTriggerBuffer, Trigger, User (+15 more)

### Community 35 - "triage-evidence.ts"
Cohesion: 0.17
Nodes (14): loadCurrentPolicyState(), ActionOrderRow, canonical(), ExecutionAttemptRow, hash(), OwnedCaseRow, PredecessorRow, sourceKind() (+6 more)

### Community 36 - "execution-store.ts"
Cohesion: 0.11
Nodes (22): canonicalJson(), ClaimDecision, createExecutionStore(), createFingerprints(), Delegate, DurableFailureEvidence, ExecutionDb, ExecutionKey (+14 more)

### Community 37 - "dialog.tsx"
Cohesion: 0.13
Nodes (13): DialogClose(), DialogDescription(), DialogFooter(), DialogHeader(), DialogOverlay(), DialogTitle(), DialogTrigger(), Appbar() (+5 more)

### Community 39 - "gemini-model.ts"
Cohesion: 0.14
Nodes (13): DiagnosisPrompt, IntegratedDiagnosisModel, ModelGeneration, boundedString, evidenceReference, FetchLike, GEMINI_DIAGNOSIS_SCHEMA, GeminiDiagnosisModel (+5 more)

### Community 40 - "checks.ts"
Cohesion: 0.15
Nodes (15): IntegratedDiagnosisResult, IntegratedDiagnosisResultSchema, boundedCode, checkDiagnosisEvaluation(), checkEvaluationDataset(), diagnosisIds, EvaluationCase, EvaluationCaseSchema (+7 more)

### Community 41 - "search-runbooks.ts"
Cohesion: 0.16
Nodes (17): allowedFiles, commaSeparated(), ignoredTerms, IndexedSection, intersects(), loadRunbooks(), normalizedFilters(), parseMetadata() (+9 more)

### Community 42 - "components.json"
Cohesion: 0.10
Nodes (19): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+11 more)

### Community 43 - "login/page.tsx"
Cohesion: 0.18
Nodes (7): LoginResponse, BACKEND_URL, HOOKS_URL, PrimaryButton(), CheckFeature(), Input(), axios

### Community 44 - "useTriage.ts"
Cohesion: 0.16
Nodes (12): TriagePage(), TriageResults(), ApiError, errorState(), operatorRequest(), useTriage(), FetchLike, requestTriage() (+4 more)

### Community 45 - "triage-operator.ts"
Cohesion: 0.18
Nodes (10): AccessAction, CaseRow, OperatorDb, project(), TriageOperatorCaseNotFound, TriageOperatorDenied, TriageOperatorService, caseId (+2 more)

### Community 46 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, jsx, lib, module, moduleDetection, moduleResolution (+11 more)

### Community 47 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, jsx, lib, module, moduleDetection, moduleResolution (+11 more)

### Community 48 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, jsx, lib, module, moduleDetection, moduleResolution (+11 more)

### Community 49 - "actions/telegram.ts"
Cohesion: 0.22
Nodes (15): boundedPositiveInteger(), FetchTransport, readJson(), resolutionError(), resolveChatId(), retryAfter(), safeIdentifier(), sendError() (+7 more)

### Community 50 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, jsx, lib, module, moduleDetection, moduleResolution (+11 more)

### Community 51 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 64 - "observability.ts"
Cohesion: 0.16
Nodes (11): ModelUsage, createLangfuseExporter(), errorType(), FetchLike, InvestigationTrace, InvestigationTracer, safeIdentifier, safeModelUsage() (+3 more)

### Community 65 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, lib, module, moduleDetection, moduleResolution, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 66 - "webhook/package.json"
Cohesion: 0.12
Nodes (16): devDependencies, prisma, @types/bun, express, prisma, @prisma/client, @prisma/extension-accelerate, typescript (+8 more)

### Community 67 - "worker/package.json"
Cohesion: 0.12
Nodes (16): @types/bun, dependencies, resend, devDependencies, @types/bun, module, name, peerDependencies (+8 more)

### Community 68 - "actions/email.ts"
Cohesion: 0.20
Nodes (12): emailAction, EmailTransport, resend, resendErrorNames, safeEmailCode(), safeReceipt(), sendEmail(), captureFailure() (+4 more)

### Community 69 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, declaration, declarationMap, esModuleInterop, incremental, isolatedModules, lib, module (+8 more)

### Community 70 - "primary_backend/package.json"
Cohesion: 0.12
Nodes (15): @clerk/nextjs, express, @types/express, zod, module, name, private, scripts (+7 more)

### Community 71 - "investigation-authority.ts"
Cohesion: 0.16
Nodes (9): Decision, DecisionRow, InvestigationAuthority, InvestigationDecisionDenied, ProposalRow, TransactionDb, authority(), input (+1 more)

### Community 72 - "investigation-notifications.ts"
Cohesion: 0.15
Nodes (6): SqlClient, InvestigationNotifications, PendingDecision, InvestigationProposals, pending, input

### Community 73 - "retrieval-experiment.ts"
Cohesion: 0.18
Nodes (12): bm25(), ignoredTerms, Metrics, RetrievalExperimentCase, retrievalExperimentCases, RetrievalExperimentResult, runRetrievalExperiment(), Split (+4 more)

### Community 74 - "processor/package.json"
Cohesion: 0.13
Nodes (14): dependencies, kafkajs, devDependencies, @types/bun, @types/bun, typescript, module, name (+6 more)

### Community 75 - "execution-store.test.ts"
Cohesion: 0.14
Nodes (14): { db, state }, failedOwner, fakeDb(), fingerprints, invalid, matches(), normalized, now (+6 more)

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

### Community 80 - "dependencies"
Cohesion: 0.15
Nodes (13): dependencies, bcrypt, @clerk/backend, @clerk/nextjs, cors, dotenv, express, jsonwebtoken (+5 more)

### Community 81 - "seed-f01-case.ts"
Cohesion: 0.21
Nodes (10): TriageEvidenceDb, assertLocalDatabase(), F01_CASE_ID, failedCompletedAt, failedStartedAt, predecessorCompletedAt, predecessorMetadata, runMetadata (+2 more)

### Community 82 - "validation.ts"
Cohesion: 0.26
Nodes (9): actionRegistry, ActionHandler, canonical(), fields, hasPath(), templatePaths(), validateActionInputs(), ValidationDependencies (+1 more)

### Community 84 - "Phase 3A Provider Outcomes Design"
Cohesion: 0.17
Nodes (12): Compatibility and Rollout, Contracts, Email Flow, Error Handling and Redaction, Non-Goals, Outcome Vocabulary, Phase 3A Provider Outcomes Design, Purpose (+4 more)

### Community 85 - "Documentation Map"
Cohesion: 0.20
Nodes (11): Delivery and State Invariants, Action Handler Contract, Action Registry, Event-Driven System Topology, Transactional Outbox Communication Boundary, ADR Transactional Outbox, Distributed Lease Claim, Workflow Execution Lifecycle (+3 more)

### Community 86 - "Kafka Zap Events Topic"
Cohesion: 0.20
Nodes (11): Processor Bun Service, Webhook Bun Service, Worker Bun Service, Kafka KRaft Service, PostgreSQL Service, Local Infrastructure Stack Configuration, Kafka Zap Events Topic, Prisma PostgreSQL Persistence (+3 more)

### Community 87 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, allowJs, jsx, module, moduleResolution, noEmit, plugins, extends (+2 more)

### Community 88 - "ai_agent/package.json"
Cohesion: 0.20
Nodes (9): name, private, type, version, @types/express, @types/node, @langchain/langgraph, @langchain/langgraph-checkpoint-postgres (+1 more)

### Community 89 - "layout.tsx"
Cohesion: 0.22
Nodes (6): nextConfig, geistMono, geistSans, inter, Toaster(), next

### Community 90 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, tw-animate-css, @types/node, @types/react (+2 more)

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
Cohesion: 0.20
Nodes (10): Allowed remediation, Evidence needed, Forbidden actions, Read-only investigation, Replay and approval, Simulated example, Sources, Symptoms (+2 more)

### Community 95 - "Transient provider failure"
Cohesion: 0.20
Nodes (10): Allowed remediation, Evidence needed, Forbidden actions, Read-only investigation, Replay and approval, Simulated example, Sources, Symptoms (+2 more)

### Community 96 - "Uncertain external delivery"
Cohesion: 0.20
Nodes (10): Allowed remediation, Evidence needed, Forbidden actions, Read-only investigation, Replay and approval, Simulated example, Sources, Symptoms (+2 more)

### Community 97 - "documentation.md"
Cohesion: 0.20
Nodes (8): 📚 Core Documentation Index, 🧭 Navigation Guidelines for Agents & Developers, Repository Documentation, Graphify Knowledge Graph Guidance, ⏱️ Update Policy & Workflow, 🔄 Updating Graphify, 🗺️ What is Graphify?, 🔍 When to Consult Graphify

### Community 98 - "Phase 3B Durable Failures Design"
Cohesion: 0.20
Nodes (10): Evidence and security rules, Non-goals, Phase 3B Durable Failures Design, Phase 3C boundary, Proposed schema and interfaces, Purpose, Scope, State transitions (+2 more)

### Community 99 - "triage-db.integration.test.ts"
Cohesion: 0.22
Nodes (8): executionId, foreignCaseId, foreignRunId, orphanCaseId, orphanRunId, ownedCaseId, ownedRunId, suffix

### Community 100 - "File Map"
Cohesion: 0.25
Nodes (7): File Map, Global Constraints, Phase 3A Provider Outcomes Implementation Plan, Task 1: Worker Outcome Contract and Generic Retry, Task 2: Normalize Resend Outcomes, Task 3: Normalize Telegram Resolution and Send Outcomes, Task 4: Wire and Verify the Phase 3A Boundary

### Community 101 - "Phase 3C Durable DLQ Publication Design"
Cohesion: 0.25
Nodes (7): Data model, Goal, Phase 3C Durable DLQ Publication Design, Publication boundary, Reconciliation, Runtime, Verification

### Community 103 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, check-types, demo, dev, migrate, test

### Community 104 - "Global Constraints"
Cohesion: 0.29
Nodes (6): Global Constraints, Phase 2 Evaluation Fixtures Implementation Plan, Task 1: Strict evaluation-case contract and JSONL parser, Task 2: Dataset-wide deterministic rubric, Task 3: Versioned 26-case dataset and held-out loader, Task 4: Privacy mutation checks and full verification

### Community 105 - "Global Constraints"
Cohesion: 0.29
Nodes (6): Global Constraints, Phase 3B Durable Failures Implementation Plan, Self-Review and Known Boundary, Task 1: Add the Durable Execution, Attempt, and Failure Schema, Task 2: Implement the Fenced Persistence State Machine, Task 3: Integrate Single-Shot Execution, ACK Gating, and Architecture Docs

### Community 106 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, check-types, dev, format, lint, postinstall

### Community 107 - "typescript-config/package.json"
Cohesion: 0.29
Nodes (6): license, name, private, publishConfig, access, version

### Community 108 - "ui/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, exclude, extends, include, @repo/typescript-config/react-library.json

### Community 109 - "dependencies"
Cohesion: 0.33
Nodes (6): dependencies, express, @langchain/langgraph, @langchain/langgraph-checkpoint-postgres, pg, zod

### Community 110 - "devDependencies"
Cohesion: 0.33
Nodes (6): devDependencies, @types/bun, @types/express, @types/node, @types/pg, typescript

### Community 111 - "Next.js Frontend Application"
Cohesion: 0.33
Nodes (6): Next.js Logo, Vercel Logo, Zapier Brand Logo, Next.js Frontend Application, Primary Backend Bun Service, Zapier Clone Project Overview

### Community 112 - "Mission: Production-style AI systems"
Cohesion: 0.33
Nodes (5): Constraints, Mission: Production-style AI systems, Out of scope, Success looks like, Why

### Community 117 - "react-library.json"
Cohesion: 0.33
Nodes (5): compilerOptions, jsx, extends, ./base.json, $schema

### Community 118 - "dependencies"
Cohesion: 0.40
Nodes (5): dependencies, express, @prisma/client, @prisma/extension-accelerate, @types/express

### Community 119 - "Global Constraints"
Cohesion: 0.40
Nodes (4): Global Constraints, Phase 3C Durable DLQ Publication Implementation Plan, Task 1: Phase 3C-A — Fenced Durable Failure Publisher, Task 2: Phase 3C-B — Reconciliation and Separate Runtime

### Community 120 - "Q: Where should Phase 3 provider outcomes and durable failure evidence integrate in the worker?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Where should Phase 3 provider outcomes and durable failure evidence integrate in the worker?, Source Nodes

### Community 121 - "Q: Start Phase 3C durable DLQ publication and reconciliation"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Start Phase 3C durable DLQ publication and reconciliation, Source Nodes

### Community 122 - "Q: oh but my idea for this prj dlq system was like instead of a support team sitting in the backend and seeing and debugging the error , sending it to developing and testing , the AI agent checks that , then finds the error and suggests remedy to the support team /in my case it will be me , then after approval the error is replayed for fix or other option . But now it is like the owner of the zap checks this .? what canthe owner do in the case of humman approval .? now i was learnign the phase 4 and i got to know this but the phase 5 was also completed now ."
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: oh but my idea for this prj dlq system was like instead of a support team sitting in the backend and seeing and debugging the error , sending it to developing and testing , the AI agent checks that , then finds the error and suggests remedy to the support team /in my case it will be me , then after approval the error is replayed for fix or other option . But now it is like the owner of the zap checks this .? what canthe owner do in the case of humman approval .? now i was learnign the phase 4 and i got to know this but the phase 5 was also completed now ., Source Nodes

### Community 123 - "devDependencies"
Cohesion: 0.40
Nodes (5): devDependencies, prettier, prisma, turbo, typescript

### Community 124 - "class.ts"
Cohesion: 0.40
Nodes (3): config, LogOptions, PrismaClientConstructor

### Community 131 - "kafkajs-bun-fix.js"
Cohesion: 0.40
Nodes (4): content, fs, path, possiblePaths

### Community 132 - "Production AI Service Resources"
Cohesion: 0.40
Nodes (4): Gaps, Knowledge, Production AI Service Resources, Wisdom (Communities)

### Community 133 - "Manual Offset Commit Protocol"
Cohesion: 0.50
Nodes (4): ADR Two-Phase Execution Lease, At-Least-Once Delivery Semantics, Manual Offset Commit Protocol, PostgreSQL Execution Lease

## Knowledge Gaps
- **1975 isolated node(s):** `ActionScalarFieldEnum`, `Args`, `At`, `AtLeast`, `AtLoose` (+1970 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 2362 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **42 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `zod` connect `route/triage.ts` to `replay-policy-facts.ts`, `gemini-model.ts`, `checks.ts`, `graph.ts`, `ai_agent/package.json`, `contracts.ts`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `kafkajs` connect `primary_backend/index.ts` to `processor/package.json`, `idempotency.test.ts`, `dlq-publisher.ts`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `@types/node` connect `ai_agent/package.json` to `ui/package.json`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `ActionScalarFieldEnum`, `Args`, `At` to the rest of the system?**
  _1975 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `prismaNamespace.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.015267175572519083 - nodes in this community are weakly interconnected._
- **Should `Zap.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.017094017094017096 - nodes in this community are weakly interconnected._
- **Should `Action.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.021052631578947368 - nodes in this community are weakly interconnected._