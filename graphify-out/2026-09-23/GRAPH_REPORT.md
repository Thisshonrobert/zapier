# Graph Report - zapier  (2026-09-23)

## Corpus Check
- 197 files · ~133,940 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 18 file(s) not represented in the graph (top: (none) 6, .toml 2, .css 2)

## Summary
- 2631 nodes · 3239 edges · 125 communities (79 shown, 41 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d91f2e5b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- prismaNamespace.ts
- Zap.ts
- Action.ts
- Trigger.ts
- ZapRun.ts
- User.ts
- AvailableAction.ts
- AvailableTriggerType.ts
- ZapRunOutbox.ts
- ZapRunExecution.ts
- TestTriggerBuffer.ts
- ZapRunRetry.ts
- idempotency.test.ts
- eslint-config/package.json
- cn
- commonInputTypes.ts
- ui/package.json
- package.json
- history/page.tsx
- Appbar.tsx
- frontend/package.json
- dependencies
- PrismaClient
- prismaNamespaceBrowser.ts
- webhook/package.json
- ZapRunExecutionAttempt.ts
- components.json
- compilerOptions
- compilerOptions
- compilerOptions
- compilerOptions
- compilerOptions
- user.ts
- login/page.tsx
- dialog.tsx
- ActionDelegate
- AvailableActionDelegate
- AvailableTriggerTypeDelegate
- TestTriggerBufferDelegate
- TriggerDelegate
- UserDelegate
- ZapDelegate
- ZapRunDelegate
- ZapRunExecutionDelegate
- ZapRunOutboxDelegate
- ZapRunRetryDelegate
- create/page.tsx
- compilerOptions
- layout.tsx
- worker/package.json
- graph.ts
- processor/package.json
- tasks
- ai_agent/package.json
- empty.tsx
- primary_backend/package.json
- browser.ts
- dependencies
- client.ts
- Kafka Zap Events Topic
- compilerOptions
- Transactional Outbox Communication Boundary
- execution-store.ts
- primary_backend/index.ts
- durable-failures-schema.test.ts
- Prisma__ZapClient
- typescript-config/package.json
- ui/tsconfig.json
- Next.js Frontend Application
- Prisma__ActionClient
- Prisma__TriggerClient
- Prisma__ZapRunClient
- react-library.json
- actions/telegram.ts
- ZapRunExecutionAttemptDelegate
- Prisma__AvailableActionClient
- Prisma__AvailableTriggerTypeClient
- Prisma__UserClient
- Prisma__ZapRunOutboxClient
- kafkajs-bun-fix.js
- Manual Offset Commit Protocol
- Prisma__TestTriggerBufferClient
- Prisma__ZapRunExecutionClient
- Prisma__ZapRunRetryClient
- src/button.tsx
- frontend/eslint.config.mjs
- postcss.config.mjs
- proxy.ts
- Retry and DLQ Design
- File Icon
- Globe Icon
- Window Icon
- Template Variable Interpolation
- Linear Workflow Limitation
- ai-dlq-master-plan.md
- Backend Three Features Plan
- Turbo ESLint Configuration
- Email Verification Gap
- compilerOptions
- actions/email.ts
- 6. Phases, dependencies and teaching workflow
- execution-store.test.ts
- checks.ts
- DLQ failure taxonomy and investigation requirements
- Phase 3A Provider Outcomes Design
- Phase 3B Durable Failures Design
- Autonomous DLQ Triage Agent — master implementation plan
- File Map
- Global Constraints
- Global Constraints
- 3. Boundaries, state and initial contracts
- Graphify Knowledge Graph Guidance
- Mission: Production-style AI systems
- Q: Where should Phase 3 provider outcomes and durable failure evidence integrate in the worker?
- class.ts
- Prisma__ZapRunExecutionAttemptClient
- Production AI Service Resources
- 0001-existing-python-fastapi-pydantic-foundation.md
- 0002-typescript-first-ai-learning.md
- NOTES.md

## God Nodes (most connected - your core abstractions)
1. `cn()` - 61 edges
2. `PrismaClient` - 22 edges
3. `lucide-react` - 20 edges
4. `compilerOptions` - 19 edges
5. `compilerOptions` - 19 edges
6. `compilerOptions` - 19 edges
7. `compilerOptions` - 19 edges
8. `ActionDelegate` - 18 edges
9. `AvailableActionDelegate` - 18 edges
10. `AvailableTriggerTypeDelegate` - 18 edges

## Surprising Connections (you probably didn't know these)
- `Delivery and State Invariants` --semantically_similar_to--> `Defense-in-Depth Idempotency`  [INFERRED] [semantically similar]
  AGENTS.MD → docs/idempotency.md
- `Zapier Brand Logo` --conceptually_related_to--> `Zapier Clone Project Overview`  [INFERRED]
  apps/frontend/public/Zapier-logo.png → README.md
- `Kafka Zap Events Topic` --conceptually_related_to--> `Kafka KRaft Service`  [INFERRED]
  README.md → docker-compose.yml
- `Prisma PostgreSQL Persistence` --conceptually_related_to--> `PostgreSQL Service`  [INFERRED]
  README.md → docker-compose.yml
- `Sequential Worker Action Execution` --conceptually_related_to--> `Worker Bun Service`  [INFERRED]
  README.md → apps/worker/README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Zap Execution Event Flow** — readme_transactional_outbox, readme_kafka_zap_events, readme_worker_action_execution [EXTRACTED 1.00]
- **Idempotency Defense Layers** — docs_architecture_transactional_outbox, docs_worker_execution_lease, docs_kafka_manual_offset_commits [INFERRED 0.95]

## Communities (125 total, 41 thin omitted)

### Community 0 - "prismaNamespace.ts"
Cohesion: 0.02
Nodes (130): ActionScalarFieldEnum, AnyNull, Args, At, AtLeast, AtLoose, AtStrict, AvailableActionScalarFieldEnum (+122 more)

### Community 1 - "Zap.ts"
Cohesion: 0.02
Nodes (116): AggregateZap, DateTimeFieldUpdateOperationsInput, GetZapAggregateType, GetZapGroupByPayload, Zap$actionsArgs, Zap$triggerArgs, Zap$zapRunArgs, ZapAggregateArgs (+108 more)

### Community 2 - "Action.ts"
Cohesion: 0.02
Nodes (94): ActionAggregateArgs, ActionAvgAggregateInputType, ActionAvgAggregateOutputType, ActionAvgOrderByAggregateInput, ActionCountAggregateInputType, ActionCountAggregateOutputType, ActionCountArgs, ActionCountOrderByAggregateInput (+86 more)

### Community 3 - "Trigger.ts"
Cohesion: 0.02
Nodes (85): AggregateTrigger, GetTriggerAggregateType, GetTriggerGroupByPayload, TriggerAggregateArgs, TriggerCountAggregateInputType, TriggerCountAggregateOutputType, TriggerCountArgs, TriggerCountOrderByAggregateInput (+77 more)

### Community 4 - "ZapRun.ts"
Cohesion: 0.02
Nodes (84): AggregateZapRun, GetZapRunAggregateType, GetZapRunGroupByPayload, ZapRun$zapRunOutboxArgs, ZapRunAggregateArgs, ZapRunCountAggregateInputType, ZapRunCountAggregateOutputType, ZapRunCountArgs (+76 more)

### Community 5 - "User.ts"
Cohesion: 0.03
Nodes (79): AggregateUser, GetUserAggregateType, GetUserGroupByPayload, IntFieldUpdateOperationsInput, NullableStringFieldUpdateOperationsInput, StringFieldUpdateOperationsInput, User$zapArgs, UserAggregateArgs (+71 more)

### Community 6 - "AvailableAction.ts"
Cohesion: 0.03
Nodes (70): AggregateAvailableAction, AvailableAction$actionArgs, AvailableActionAggregateArgs, AvailableActionCountAggregateInputType, AvailableActionCountAggregateOutputType, AvailableActionCountArgs, AvailableActionCountOrderByAggregateInput, AvailableActionCountOutputType (+62 more)

### Community 7 - "AvailableTriggerType.ts"
Cohesion: 0.03
Nodes (70): AggregateAvailableTriggerType, AvailableTriggerType$triggerArgs, AvailableTriggerTypeAggregateArgs, AvailableTriggerTypeCountAggregateInputType, AvailableTriggerTypeCountAggregateOutputType, AvailableTriggerTypeCountArgs, AvailableTriggerTypeCountOrderByAggregateInput, AvailableTriggerTypeCountOutputType (+62 more)

### Community 8 - "ZapRunOutbox.ts"
Cohesion: 0.03
Nodes (67): AggregateZapRunOutbox, GetZapRunOutboxAggregateType, GetZapRunOutboxGroupByPayload, ZapRunOutboxAggregateArgs, ZapRunOutboxCountAggregateInputType, ZapRunOutboxCountAggregateOutputType, ZapRunOutboxCountArgs, ZapRunOutboxCountOrderByAggregateInput (+59 more)

### Community 9 - "ZapRunExecution.ts"
Cohesion: 0.02
Nodes (88): AggregateZapRunExecution, GetZapRunExecutionAggregateType, GetZapRunExecutionGroupByPayload, ZapRunExecution$attemptsArgs, ZapRunExecution$failureArgs, ZapRunExecutionAggregateArgs, ZapRunExecutionAvgAggregateInputType, ZapRunExecutionAvgAggregateOutputType (+80 more)

### Community 10 - "TestTriggerBuffer.ts"
Cohesion: 0.03
Nodes (58): AggregateTestTriggerBuffer, GetTestTriggerBufferAggregateType, GetTestTriggerBufferGroupByPayload, TestTriggerBufferAggregateArgs, TestTriggerBufferAvgAggregateInputType, TestTriggerBufferAvgAggregateOutputType, TestTriggerBufferAvgOrderByAggregateInput, TestTriggerBufferCountAggregateInputType (+50 more)

### Community 11 - "ZapRunRetry.ts"
Cohesion: 0.03
Nodes (77): AggregateZapRunRetry, BoolFieldUpdateOperationsInput, GetZapRunRetryAggregateType, GetZapRunRetryGroupByPayload, NullableDateTimeFieldUpdateOperationsInput, NullableIntFieldUpdateOperationsInput, ZapRunRetry$executionArgs, ZapRunRetryAggregateArgs (+69 more)

### Community 12 - "idempotency.test.ts"
Cohesion: 0.11
Nodes (27): actionRegistry, getActionHandler(), createFingerprints(), accepted, acceptedRun, Call, dbFailure, harness() (+19 more)

### Community 13 - "eslint-config/package.json"
Cohesion: 0.08
Nodes (34): config, nextJsConfig, devDependencies, eslint, eslint-config-prettier, @eslint/js, eslint-plugin-only-warn, eslint-plugin-react (+26 more)

### Community 14 - "cn"
Cohesion: 0.10
Nodes (29): Badge(), badgeVariants, Button(), buttonVariants, Card(), CardAction(), CardContent(), CardDescription() (+21 more)

### Community 15 - "commonInputTypes.ts"
Cohesion: 0.05
Nodes (37): BoolFilter, BoolWithAggregatesFilter, DateTimeFilter, DateTimeNullableFilter, DateTimeNullableWithAggregatesFilter, DateTimeWithAggregatesFilter, IntFilter, IntNullableFilter (+29 more)

### Community 16 - "ui/package.json"
Cohesion: 0.07
Nodes (28): dependencies, react, react-dom, devDependencies, eslint, @repo/eslint-config, @repo/typescript-config, @types/node (+20 more)

### Community 17 - "package.json"
Cohesion: 0.07
Nodes (27): dependencies, @prisma/client, @prisma/extension-accelerate, devDependencies, prettier, prisma, turbo, typescript (+19 more)

### Community 18 - "history/page.tsx"
Cohesion: 0.09
Nodes (33): Connection, ConnectionsPage(), formatDate(), toConnections(), DashboardPage(), SCRATCH_CARDS, FILTER_CHIPS, HistoryPage() (+25 more)

### Community 19 - "Appbar.tsx"
Cohesion: 0.14
Nodes (20): Avatar(), AvatarFallback(), AvatarImage(), DropdownMenu(), DropdownMenuContent(), DropdownMenuGroup(), DropdownMenuItem(), DropdownMenuLabel() (+12 more)

### Community 20 - "frontend/package.json"
Cohesion: 0.07
Nodes (27): @clerk/nextjs, eslint, react, react-dom, @types/node, @types/react, @types/react-dom, typescript (+19 more)

### Community 21 - "dependencies"
Cohesion: 0.06
Nodes (35): dependencies, axios, class-variance-authority, @clerk/nextjs, clsx, jwt-decode, lucide-react, motion (+27 more)

### Community 23 - "prismaNamespaceBrowser.ts"
Cohesion: 0.08
Nodes (24): ActionScalarFieldEnum, AnyNull, AvailableActionScalarFieldEnum, AvailableTriggerTypeScalarFieldEnum, DbNull, Decimal, JsonNull, JsonNullValueFilter (+16 more)

### Community 24 - "webhook/package.json"
Cohesion: 0.08
Nodes (23): dependencies, express, @prisma/client, @prisma/extension-accelerate, @types/express, devDependencies, prisma, @types/bun (+15 more)

### Community 25 - "ZapRunExecutionAttempt.ts"
Cohesion: 0.02
Nodes (80): AggregateZapRunExecutionAttempt, GetZapRunExecutionAttemptAggregateType, GetZapRunExecutionAttemptGroupByPayload, ZapRunExecutionAttemptAggregateArgs, ZapRunExecutionAttemptAvgAggregateInputType, ZapRunExecutionAttemptAvgAggregateOutputType, ZapRunExecutionAttemptAvgOrderByAggregateInput, ZapRunExecutionAttemptCountAggregateInputType (+72 more)

### Community 26 - "components.json"
Cohesion: 0.10
Nodes (19): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+11 more)

### Community 27 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, jsx, lib, module, moduleDetection, moduleResolution (+11 more)

### Community 28 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, jsx, lib, module, moduleDetection, moduleResolution (+11 more)

### Community 29 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, jsx, lib, module, moduleDetection, moduleResolution (+11 more)

### Community 30 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, jsx, lib, module, moduleDetection, moduleResolution (+11 more)

### Community 31 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 32 - "user.ts"
Cohesion: 0.16
Nodes (14): authMiddleware(), DecodedToken, Express, Request, clerk, router, router, zapRouter (+6 more)

### Community 33 - "login/page.tsx"
Cohesion: 0.13
Nodes (10): LoginResponse, BACKEND_URL, HOOKS_URL, Appbar(), PrimaryButton(), CheckFeature(), Hero(), HeroVideo() (+2 more)

### Community 34 - "dialog.tsx"
Cohesion: 0.18
Nodes (12): Dialog(), DialogClose(), DialogContent(), DialogDescription(), DialogFooter(), DialogHeader(), DialogOverlay(), DialogTitle() (+4 more)

### Community 46 - "create/page.tsx"
Cohesion: 0.10
Nodes (36): metadata, action, TriggerTestResult, useZapStore, zapData, Email(), Telegram(), ActionNode (+28 more)

### Community 47 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, declaration, declarationMap, esModuleInterop, incremental, isolatedModules, lib, module (+8 more)

### Community 48 - "layout.tsx"
Cohesion: 0.22
Nodes (6): nextConfig, geistMono, geistSans, inter, Toaster(), next

### Community 49 - "worker/package.json"
Cohesion: 0.12
Nodes (15): dependencies, resend, devDependencies, @types/bun, @types/bun, typescript, module, name (+7 more)

### Community 50 - "graph.ts"
Cohesion: 0.08
Nodes (39): boundedError, boundedName, boundedSummary, DiagnosisModel, DiagnosisSchema, Evidence, evidenceRef, EvidenceSchema (+31 more)

### Community 51 - "processor/package.json"
Cohesion: 0.13
Nodes (14): dependencies, kafkajs, devDependencies, @types/bun, @types/bun, typescript, module, name (+6 more)

### Community 52 - "tasks"
Cohesion: 0.13
Nodes (14): dependsOn, inputs, outputs, dependsOn, cache, persistent, dependsOn, $schema (+6 more)

### Community 53 - "ai_agent/package.json"
Cohesion: 0.07
Nodes (26): dependencies, express, @langchain/langgraph, zod, devDependencies, @types/bun, @types/express, @types/node (+18 more)

### Community 54 - "empty.tsx"
Cohesion: 0.24
Nodes (11): Empty(), EmptyContent(), EmptyDescription(), EmptyHeader(), EmptyMedia(), emptyMediaVariants, EmptyTitle(), formatDate() (+3 more)

### Community 55 - "primary_backend/package.json"
Cohesion: 0.13
Nodes (14): @clerk/nextjs, express, @types/express, zod, module, name, private, scripts (+6 more)

### Community 56 - "browser.ts"
Cohesion: 0.13
Nodes (13): Action, AvailableAction, AvailableTriggerType, $Enums, TestTriggerBuffer, Trigger, User, Zap (+5 more)

### Community 57 - "dependencies"
Cohesion: 0.15
Nodes (13): dependencies, bcrypt, @clerk/backend, @clerk/nextjs, cors, dotenv, express, jsonwebtoken (+5 more)

### Community 58 - "client.ts"
Cohesion: 0.14
Nodes (13): Action, AvailableAction, AvailableTriggerType, $Enums, TestTriggerBuffer, Trigger, User, Zap (+5 more)

### Community 59 - "Kafka Zap Events Topic"
Cohesion: 0.20
Nodes (11): Processor Bun Service, Webhook Bun Service, Worker Bun Service, Kafka KRaft Service, PostgreSQL Service, Local Infrastructure Stack Configuration, Kafka Zap Events Topic, Prisma PostgreSQL Persistence (+3 more)

### Community 60 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, allowJs, jsx, module, moduleResolution, noEmit, plugins, extends (+2 more)

### Community 61 - "Transactional Outbox Communication Boundary"
Cohesion: 0.22
Nodes (10): Delivery and State Invariants, Action Handler Contract, Action Registry, Event-Driven System Topology, Transactional Outbox Communication Boundary, ADR Transactional Outbox, Distributed Lease Claim, Workflow Execution Lifecycle (+2 more)

### Community 62 - "execution-store.ts"
Cohesion: 0.12
Nodes (21): canonicalJson(), ClaimDecision, createExecutionStore(), Delegate, DurableFailureEvidence, ExecutionDb, ExecutionKey, FinalizeDecision (+13 more)

### Community 63 - "primary_backend/index.ts"
Cohesion: 0.16
Nodes (11): app, actionRouter, router, router, triggerRouter, userRouter, kafka, app (+3 more)

### Community 64 - "durable-failures-schema.test.ts"
Cohesion: 0.24
Nodes (9): PrismaClient, assertField(), attempt, attemptFields, field(), generatedClient, migrationPath, model() (+1 more)

### Community 66 - "typescript-config/package.json"
Cohesion: 0.29
Nodes (6): license, name, private, publishConfig, access, version

### Community 67 - "ui/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, exclude, extends, include, @repo/typescript-config/react-library.json

### Community 68 - "Next.js Frontend Application"
Cohesion: 0.33
Nodes (6): Next.js Logo, Vercel Logo, Zapier Brand Logo, Next.js Frontend Application, Primary Backend Bun Service, Zapier Clone Project Overview

### Community 72 - "react-library.json"
Cohesion: 0.33
Nodes (5): compilerOptions, jsx, extends, ./base.json, $schema

### Community 73 - "actions/telegram.ts"
Cohesion: 0.22
Nodes (15): boundedPositiveInteger(), FetchTransport, readJson(), resolutionError(), resolveChatId(), retryAfter(), safeIdentifier(), sendError() (+7 more)

### Community 79 - "kafkajs-bun-fix.js"
Cohesion: 0.40
Nodes (4): content, fs, path, possiblePaths

### Community 80 - "Manual Offset Commit Protocol"
Cohesion: 0.50
Nodes (4): ADR Two-Phase Execution Lease, At-Least-Once Delivery Semantics, Manual Offset Commit Protocol, PostgreSQL Execution Lease

### Community 98 - "ai-dlq-master-plan.md"
Cohesion: 0.28
Nodes (5): 📚 Core Documentation Index, 🧭 Navigation Guidelines for Agents & Developers, Repository Documentation, Monorepo Layout, Tooling & Verification Commands

### Community 103 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, lib, module, moduleDetection, moduleResolution, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 104 - "actions/email.ts"
Cohesion: 0.20
Nodes (12): emailAction, EmailTransport, resend, resendErrorNames, safeEmailCode(), safeReceipt(), sendEmail(), captureFailure() (+4 more)

### Community 105 - "6. Phases, dependencies and teaching workflow"
Cohesion: 0.12
Nodes (17): 6. Phases, dependencies and teaching workflow, Optional — MCP adapter, Phase 10 — Streaming and minimal operator UI, Phase 11 — Evaluation dataset, experiments and code evaluators, Phase 12 — LLM-as-a-judge, only for semantic quality, Phase 13 — Next.js command center, Phase 14 — Production hardening and staged rollout, Phase 15 — Supervisor/subagents only after measured justification (+9 more)

### Community 106 - "execution-store.test.ts"
Cohesion: 0.14
Nodes (15): AttemptOwner, { db, state }, failedOwner, fakeDb(), fingerprints, invalid, matches(), normalized (+7 more)

### Community 107 - "checks.ts"
Cohesion: 0.20
Nodes (12): boundedCode, checkEvaluationDataset(), diagnosisIds, EvaluationCase, EvaluationCaseSchema, expectedCaseMetadata, loadEvaluationCases(), parseEvaluationCases() (+4 more)

### Community 108 - "DLQ failure taxonomy and investigation requirements"
Cohesion: 0.14
Nodes (14): Cross-cutting evaluation cases, DLQ failure taxonomy and investigation requirements, Evidence that actually exists, F01 — Telegram rate limit, F02 — Provider outage or transport failure, F03 — Telegram credential or permission failure, F04 — Invalid destination or missing template input, F05 — Unsupported action type (+6 more)

### Community 109 - "Phase 3A Provider Outcomes Design"
Cohesion: 0.15
Nodes (12): Compatibility and Rollout, Contracts, Email Flow, Error Handling and Redaction, Non-Goals, Outcome Vocabulary, Phase 3A Provider Outcomes Design, Purpose (+4 more)

### Community 110 - "Phase 3B Durable Failures Design"
Cohesion: 0.18
Nodes (10): Evidence and security rules, Non-goals, Phase 3B Durable Failures Design, Phase 3C boundary, Proposed schema and interfaces, Purpose, Scope, State transitions (+2 more)

### Community 111 - "Autonomous DLQ Triage Agent — master implementation plan"
Cohesion: 0.22
Nodes (9): 1. Current AI-relevant architecture, 2. Architectural review, 4. Failure taxonomy and the minimum RAG corpus, 5. Deterministic replay design and release gate, 7. Verification and first-phase checklist, 8. Risks and deliberately deferred complexity, Autonomous DLQ Triage Agent — master implementation plan, Code/documentation discrepancies that affect this design (+1 more)

### Community 112 - "File Map"
Cohesion: 0.25
Nodes (7): File Map, Global Constraints, Phase 3A Provider Outcomes Implementation Plan, Task 1: Worker Outcome Contract and Generic Retry, Task 2: Normalize Resend Outcomes, Task 3: Normalize Telegram Resolution and Send Outcomes, Task 4: Wire and Verify the Phase 3A Boundary

### Community 113 - "Global Constraints"
Cohesion: 0.29
Nodes (6): Global Constraints, Phase 2 Evaluation Fixtures Implementation Plan, Task 1: Strict evaluation-case contract and JSONL parser, Task 2: Dataset-wide deterministic rubric, Task 3: Versioned 26-case dataset and held-out loader, Task 4: Privacy mutation checks and full verification

### Community 114 - "Global Constraints"
Cohesion: 0.29
Nodes (6): Global Constraints, Phase 3B Durable Failures Implementation Plan, Self-Review and Known Boundary, Task 1: Add the Durable Execution, Attempt, and Failure Schema, Task 2: Implement the Fenced Persistence State Machine, Task 3: Integrate Single-Shot Execution, ACK Gating, and Architecture Docs

### Community 115 - "3. Boundaries, state and initial contracts"
Cohesion: 0.33
Nodes (6): 3. Boundaries, state and initial contracts, Agent-service contract, Four tool contracts, Initial footprint and trust boundary, Persistence, API and run ownership (introduced in Phase 8), Typed state and output

### Community 116 - "Graphify Knowledge Graph Guidance"
Cohesion: 0.33
Nodes (5): Graphify Knowledge Graph Guidance, ⏱️ Update Policy & Workflow, 🔄 Updating Graphify, 🗺️ What is Graphify?, 🔍 When to Consult Graphify

### Community 117 - "Mission: Production-style AI systems"
Cohesion: 0.33
Nodes (5): Constraints, Mission: Production-style AI systems, Out of scope, Success looks like, Why

### Community 118 - "Q: Where should Phase 3 provider outcomes and durable failure evidence integrate in the worker?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Where should Phase 3 provider outcomes and durable failure evidence integrate in the worker?, Source Nodes

### Community 119 - "class.ts"
Cohesion: 0.40
Nodes (3): config, LogOptions, PrismaClientConstructor

### Community 121 - "Production AI Service Resources"
Cohesion: 0.40
Nodes (4): Gaps, Knowledge, Production AI Service Resources, Wisdom (Communities)

## Knowledge Gaps
- **1784 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+1779 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 2127 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **41 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PrismaClient` connect `PrismaClient` to `prismaNamespace.ts`, `class.ts`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `TestTriggerBufferDelegate` connect `TestTriggerBufferDelegate` to `TestTriggerBuffer.ts`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `ActionDelegate` connect `ActionDelegate` to `Action.ts`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _1784 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `prismaNamespace.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.015267175572519083 - nodes in this community are weakly interconnected._
- **Should `Zap.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.017094017094017096 - nodes in this community are weakly interconnected._
- **Should `Action.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.021052631578947368 - nodes in this community are weakly interconnected._