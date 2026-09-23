# Graph Report - zapier  (2026-09-18)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2143 nodes · 2612 edges · 103 communities (62 shown, 36 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `63539296`
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
- worker/index.ts
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
- dashboard/page.tsx
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
- CustomAction.tsx
- compilerOptions
- zapStore.ts
- worker/package.json
- CustonTrigger.tsx
- processor/package.json
- tasks
- create/page.tsx
- empty.tsx
- primary_backend/package.json
- browser.ts
- dependencies
- client.ts
- Kafka Zap Events Topic
- compilerOptions
- Transactional Outbox Communication Boundary
- devDependencies
- primary_backend/index.ts
- db.ts
- Prisma__ZapClient
- typescript-config/package.json
- ui/tsconfig.json
- Next.js Frontend Application
- Prisma__ActionClient
- Prisma__TriggerClient
- Prisma__ZapRunClient
- react-library.json
- scripts
- MvpDialog.tsx
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
- Monorepo Layout
- Backend Three Features Plan
- Turbo ESLint Configuration
- Email Verification Gap

## God Nodes (most connected - your core abstractions)
1. `cn()` - 61 edges
2. `PrismaClient` - 21 edges
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

## Communities (103 total, 36 thin omitted)

### Community 0 - "prismaNamespace.ts"
Cohesion: 0.02
Nodes (128): ActionScalarFieldEnum, AnyNull, Args, At, AtLeast, AtLoose, AtStrict, AvailableActionScalarFieldEnum (+120 more)

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
Cohesion: 0.03
Nodes (60): AggregateZapRunExecution, GetZapRunExecutionAggregateType, GetZapRunExecutionGroupByPayload, NullableDateTimeFieldUpdateOperationsInput, ZapRunExecutionAggregateArgs, ZapRunExecutionAvgAggregateInputType, ZapRunExecutionAvgAggregateOutputType, ZapRunExecutionAvgOrderByAggregateInput (+52 more)

### Community 10 - "TestTriggerBuffer.ts"
Cohesion: 0.03
Nodes (58): AggregateTestTriggerBuffer, GetTestTriggerBufferAggregateType, GetTestTriggerBufferGroupByPayload, TestTriggerBufferAggregateArgs, TestTriggerBufferAvgAggregateInputType, TestTriggerBufferAvgAggregateOutputType, TestTriggerBufferAvgOrderByAggregateInput, TestTriggerBufferCountAggregateInputType (+50 more)

### Community 11 - "ZapRunRetry.ts"
Cohesion: 0.03
Nodes (58): AggregateZapRunRetry, GetZapRunRetryAggregateType, GetZapRunRetryGroupByPayload, ZapRunRetryAggregateArgs, ZapRunRetryAvgAggregateInputType, ZapRunRetryAvgAggregateOutputType, ZapRunRetryAvgOrderByAggregateInput, ZapRunRetryCountAggregateInputType (+50 more)

### Community 12 - "worker/index.ts"
Cohesion: 0.09
Nodes (31): emailAction, resend, sendEmail(), actionRegistry, getActionHandler(), resolveChatId(), sendTelegram(), telegramAction (+23 more)

### Community 13 - "eslint-config/package.json"
Cohesion: 0.08
Nodes (34): config, nextJsConfig, devDependencies, eslint, eslint-config-prettier, @eslint/js, eslint-plugin-only-warn, eslint-plugin-react (+26 more)

### Community 14 - "cn"
Cohesion: 0.11
Nodes (27): Badge(), badgeVariants, Button(), buttonVariants, Card(), CardAction(), CardContent(), CardDescription() (+19 more)

### Community 15 - "commonInputTypes.ts"
Cohesion: 0.07
Nodes (29): DateTimeFilter, DateTimeNullableFilter, DateTimeNullableWithAggregatesFilter, DateTimeWithAggregatesFilter, IntFilter, IntWithAggregatesFilter, JsonFilter, JsonFilterBase (+21 more)

### Community 16 - "ui/package.json"
Cohesion: 0.07
Nodes (28): dependencies, react, react-dom, devDependencies, eslint, @repo/eslint-config, @repo/typescript-config, @types/node (+20 more)

### Community 17 - "package.json"
Cohesion: 0.07
Nodes (27): dependencies, @prisma/client, @prisma/extension-accelerate, devDependencies, prettier, prisma, turbo, typescript (+19 more)

### Community 18 - "history/page.tsx"
Cohesion: 0.14
Nodes (17): Connection, ConnectionsPage(), formatDate(), toConnections(), FILTER_CHIPS, HistoryPage(), preview(), STATUS_STYLES (+9 more)

### Community 19 - "Appbar.tsx"
Cohesion: 0.16
Nodes (19): Avatar(), AvatarFallback(), AvatarImage(), DropdownMenu(), DropdownMenuCheckboxItem(), DropdownMenuContent(), DropdownMenuGroup(), DropdownMenuItem() (+11 more)

### Community 20 - "frontend/package.json"
Cohesion: 0.08
Nodes (24): @clerk/nextjs, eslint, react, react-dom, @types/node, @types/react, @types/react-dom, typescript (+16 more)

### Community 21 - "dependencies"
Cohesion: 0.08
Nodes (25): dependencies, axios, class-variance-authority, @clerk/nextjs, clsx, jwt-decode, lucide-react, motion (+17 more)

### Community 22 - "PrismaClient"
Cohesion: 0.08
Nodes (4): config, LogOptions, PrismaClient, PrismaClientConstructor

### Community 23 - "prismaNamespaceBrowser.ts"
Cohesion: 0.08
Nodes (23): ActionScalarFieldEnum, AnyNull, AvailableActionScalarFieldEnum, AvailableTriggerTypeScalarFieldEnum, DbNull, Decimal, JsonNull, JsonNullValueFilter (+15 more)

### Community 24 - "webhook/package.json"
Cohesion: 0.08
Nodes (23): dependencies, express, @prisma/client, @prisma/extension-accelerate, @types/express, devDependencies, prisma, @types/bun (+15 more)

### Community 25 - "dashboard/page.tsx"
Cohesion: 0.18
Nodes (16): DashboardPage(), SCRATCH_CARDS, ZapDetailPage(), authHeaders(), useZap(), useZapRuns(), useZaps(), appTint() (+8 more)

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
Cohesion: 0.15
Nodes (15): authMiddleware(), DecodedToken, Express, Request, clerk, router, router, zapRouter (+7 more)

### Community 33 - "login/page.tsx"
Cohesion: 0.18
Nodes (7): LoginResponse, Appbar(), PrimaryButton(), CheckFeature(), Hero(), HeroVideo(), Input()

### Community 34 - "dialog.tsx"
Cohesion: 0.16
Nodes (12): Dialog(), DialogClose(), DialogContent(), DialogDescription(), DialogFooter(), DialogHeader(), DialogOverlay(), DialogTitle() (+4 more)

### Community 46 - "CustomAction.tsx"
Cohesion: 0.28
Nodes (12): useZapStore, Email(), Telegram(), ActionNode, CustomAction(), btnPrimary, DialogHeading(), Field() (+4 more)

### Community 47 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, declaration, declarationMap, esModuleInterop, incremental, isolatedModules, lib, module (+8 more)

### Community 48 - "zapStore.ts"
Cohesion: 0.14
Nodes (11): nextConfig, geistMono, geistSans, inter, metadata, action, TriggerTestResult, zapData (+3 more)

### Community 49 - "worker/package.json"
Cohesion: 0.12
Nodes (15): dependencies, resend, devDependencies, @types/bun, @types/bun, typescript, module, name (+7 more)

### Community 50 - "CustonTrigger.tsx"
Cohesion: 0.21
Nodes (8): CustomTrigger(), TriggerNode, BACKEND_URL, HOOKS_URL, tokenDecode(), btnSecondary, Section(), axios

### Community 51 - "processor/package.json"
Cohesion: 0.13
Nodes (14): dependencies, kafkajs, devDependencies, @types/bun, @types/bun, typescript, module, name (+6 more)

### Community 52 - "tasks"
Cohesion: 0.13
Nodes (14): dependsOn, inputs, outputs, dependsOn, cache, persistent, dependsOn, $schema (+6 more)

### Community 53 - "create/page.tsx"
Cohesion: 0.20
Nodes (12): ActionItem, ActionResponse, App(), nodeTypes, TriggerItem, TriggerResponse, useAvailableActionsAndTriggers(), Action (+4 more)

### Community 54 - "empty.tsx"
Cohesion: 0.24
Nodes (11): Empty(), EmptyContent(), EmptyDescription(), EmptyHeader(), EmptyMedia(), emptyMediaVariants, EmptyTitle(), formatDate() (+3 more)

### Community 55 - "primary_backend/package.json"
Cohesion: 0.14
Nodes (13): @clerk/nextjs, express, @types/express, module, name, private, scripts, dev (+5 more)

### Community 56 - "browser.ts"
Cohesion: 0.14
Nodes (12): Action, AvailableAction, AvailableTriggerType, $Enums, TestTriggerBuffer, Trigger, User, Zap (+4 more)

### Community 57 - "dependencies"
Cohesion: 0.15
Nodes (13): dependencies, bcrypt, @clerk/backend, @clerk/nextjs, cors, dotenv, express, jsonwebtoken (+5 more)

### Community 58 - "client.ts"
Cohesion: 0.15
Nodes (12): Action, AvailableAction, AvailableTriggerType, $Enums, TestTriggerBuffer, Trigger, User, Zap (+4 more)

### Community 59 - "Kafka Zap Events Topic"
Cohesion: 0.20
Nodes (11): Processor Bun Service, Webhook Bun Service, Worker Bun Service, Kafka KRaft Service, PostgreSQL Service, Local Infrastructure Stack Configuration, Kafka Zap Events Topic, Prisma PostgreSQL Persistence (+3 more)

### Community 60 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, allowJs, jsx, module, moduleResolution, noEmit, plugins, extends (+2 more)

### Community 61 - "Transactional Outbox Communication Boundary"
Cohesion: 0.22
Nodes (10): Delivery and State Invariants, Action Handler Contract, Action Registry, Event-Driven System Topology, Transactional Outbox Communication Boundary, ADR Transactional Outbox, Distributed Lease Claim, Workflow Execution Lifecycle (+2 more)

### Community 62 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, tw-animate-css, @types/node, @types/react (+2 more)

### Community 63 - "primary_backend/index.ts"
Cohesion: 0.24
Nodes (7): app, actionRouter, router, router, triggerRouter, userRouter, cors

### Community 64 - "db.ts"
Cohesion: 0.28
Nodes (5): kafka, app, PrismaClient, prisma, kafkajs

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

### Community 73 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

### Community 74 - "MvpDialog.tsx"
Cohesion: 0.50
Nodes (3): MvpAction(), NAV, Sidebar()

### Community 79 - "kafkajs-bun-fix.js"
Cohesion: 0.40
Nodes (4): content, fs, path, possiblePaths

### Community 80 - "Manual Offset Commit Protocol"
Cohesion: 0.50
Nodes (4): ADR Two-Phase Execution Lease, At-Least-Once Delivery Semantics, Manual Offset Commit Protocol, PostgreSQL Execution Lease

## Knowledge Gaps
- **1455 isolated node(s):** `ActionScalarFieldEnum`, `Args`, `At`, `AtLeast`, `AtLoose` (+1450 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1752 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **36 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `TriggerDelegate` connect `TriggerDelegate` to `Trigger.ts`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `ZapDelegate` connect `ZapDelegate` to `Zap.ts`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `ZapRunOutboxDelegate` connect `ZapRunOutboxDelegate` to `ZapRunOutbox.ts`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `ActionScalarFieldEnum`, `Args`, `At` to the rest of the system?**
  _1455 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `prismaNamespace.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.015503875968992248 - nodes in this community are weakly interconnected._
- **Should `Zap.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.017094017094017096 - nodes in this community are weakly interconnected._
- **Should `Action.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.021052631578947368 - nodes in this community are weakly interconnected._