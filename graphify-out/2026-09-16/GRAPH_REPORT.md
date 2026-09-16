# Graph Report - zapier  (2026-09-16)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2122 nodes · 2600 edges · 92 communities (55 shown, 32 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

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
- actions/email.ts
- next.config.ts
- eslint
- avatar.tsx
- ui/button.tsx
- commonInputTypes.ts
- ui/package.json
- package.json
- dependencies
- connections/page.tsx
- prismaNamespaceBrowser.ts
- dashboard/page.tsx
- webhook/package.json
- callback/page.tsx
- useZapStore
- components.json
- primary backend/tsconfig.json
- processor/tsconfig.json
- webhook/tsconfig.json
- worker/tsconfig.json
- PrismaClient
- app/page.tsx
- frontend/tsconfig.json
- primary backend/index.ts
- middleware.ts
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
- base.json
- Processor Bun Service
- Email.tsx
- primary backend/package.json
- processor/package.json
- turbo.json
- empty.tsx
- browser.ts
- dependencies
- client.ts
- layout.tsx
- nextjs.json
- CustonTrigger.tsx
- Prisma ZapClient
- typescript-config/package.json
- ui/tsconfig.json
- Next.js Logo
- Prisma ActionClient
- Prisma TriggerClient
- Prisma ZapRunClient
- react-library.json
- class.ts
- Prisma AvailableActionClient
- Prisma AvailableTriggerTypeClient
- Prisma UserClient
- Prisma ZapRunOutboxClient
- kafkajs-bun-fix.js
- Prisma TestTriggerBufferClient
- Prisma ZapRunExecutionClient
- Prisma ZapRunRetryClient
- src/button.tsx
- frontend/eslint.config.mjs
- postcss.config.mjs
- proxy.ts
- File Icon
- Globe Icon
- Window Icon
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
- `Zap Events Dead Letter Topic` --semantically_similar_to--> `Kafka Zap Events Topic`  [INFERRED] [semantically similar]
  docs/superpowers/plans/2026-08-20-backend-three-features.md → README.md
- `Zapier Brand Logo` --conceptually_related_to--> `Zapier Clone Project Overview`  [INFERRED]
  apps/frontend/public/Zapier-logo.png → README.md
- `Kafka Zap Events Topic` --conceptually_related_to--> `Kafka KRaft Service`  [INFERRED]
  README.md → docker-compose.yml
- `Prisma PostgreSQL Persistence` --conceptually_related_to--> `PostgreSQL Service`  [INFERRED]
  README.md → docker-compose.yml
- `Retry and Dead Letter Strategy` --conceptually_related_to--> `Sequential Worker Action Execution`  [INFERRED]
  docs/superpowers/plans/2026-08-20-backend-three-features.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Backend Reliability Delivery Plan** — docs_superpowers_plans_2026_08_20_backend_three_features_dead_letter_strategy, docs_superpowers_plans_2026_08_20_backend_three_features_dlq_topic, docker_compose_kafka_service [EXTRACTED 1.00]
- **Zap Execution Event Flow** — readme_transactional_outbox, readme_kafka_zap_events, readme_worker_action_execution [EXTRACTED 1.00]

## Communities (92 total, 32 thin omitted)

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

### Community 12 - "actions/email.ts"
Cohesion: 0.07
Nodes (39): emailAction, resend, sendEmail(), actionRegistry, getActionHandler(), resolveChatId(), sendTelegram(), telegramAction (+31 more)

### Community 13 - "next.config.ts"
Cohesion: 0.04
Nodes (45): nextConfig, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, tw-animate-css, @types/node (+37 more)

### Community 14 - "eslint"
Cohesion: 0.08
Nodes (34): config, nextJsConfig, devDependencies, eslint, eslint-config-prettier, @eslint/js, eslint-plugin-only-warn, eslint-plugin-react (+26 more)

### Community 15 - "avatar.tsx"
Cohesion: 0.13
Nodes (21): Avatar(), AvatarFallback(), AvatarImage(), DropdownMenu(), DropdownMenuCheckboxItem(), DropdownMenuContent(), DropdownMenuGroup(), DropdownMenuItem() (+13 more)

### Community 16 - "ui/button.tsx"
Cohesion: 0.12
Nodes (24): Button(), buttonVariants, Card(), CardAction(), CardContent(), CardDescription(), CardFooter(), CardHeader() (+16 more)

### Community 17 - "commonInputTypes.ts"
Cohesion: 0.07
Nodes (29): DateTimeFilter, DateTimeNullableFilter, DateTimeNullableWithAggregatesFilter, DateTimeWithAggregatesFilter, IntFilter, IntWithAggregatesFilter, JsonFilter, JsonFilterBase (+21 more)

### Community 18 - "ui/package.json"
Cohesion: 0.07
Nodes (28): dependencies, react, react-dom, devDependencies, eslint, @repo/eslint-config, @repo/typescript-config, @types/node (+20 more)

### Community 19 - "package.json"
Cohesion: 0.07
Nodes (27): dependencies, @prisma/client, @prisma/extension-accelerate, devDependencies, prettier, prisma, turbo, typescript (+19 more)

### Community 20 - "dependencies"
Cohesion: 0.08
Nodes (25): dependencies, axios, class-variance-authority, @clerk/nextjs, clsx, jwt-decode, lucide-react, motion (+17 more)

### Community 21 - "connections/page.tsx"
Cohesion: 0.15
Nodes (15): Connection, ConnectionsPage(), formatDate(), toConnections(), FILTER_CHIPS, STATUS_STYLES, Input(), LoaderOne() (+7 more)

### Community 22 - "prismaNamespaceBrowser.ts"
Cohesion: 0.08
Nodes (23): ActionScalarFieldEnum, AnyNull, AvailableActionScalarFieldEnum, AvailableTriggerTypeScalarFieldEnum, DbNull, Decimal, JsonNull, JsonNullValueFilter (+15 more)

### Community 23 - "dashboard/page.tsx"
Cohesion: 0.16
Nodes (18): DashboardPage(), SCRATCH_CARDS, HistoryPage(), preview(), ZapDetailPage(), authHeaders(), useZap(), useZapRuns() (+10 more)

### Community 24 - "webhook/package.json"
Cohesion: 0.08
Nodes (23): dependencies, express, @prisma/client, @prisma/extension-accelerate, @types/express, devDependencies, prisma, @types/bun (+15 more)

### Community 25 - "callback/page.tsx"
Cohesion: 0.19
Nodes (8): LoginResponse, BACKEND_URL, Appbar(), PrimaryButton(), CheckFeature(), Input(), axios, sonner

### Community 26 - "useZapStore"
Cohesion: 0.16
Nodes (18): useZapStore, Email(), Telegram(), ActionNode, CustomAction(), ActionItem, ActionResponse, App() (+10 more)

### Community 27 - "components.json"
Cohesion: 0.10
Nodes (19): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+11 more)

### Community 28 - "primary backend/tsconfig.json"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, jsx, lib, module, moduleDetection, moduleResolution (+11 more)

### Community 29 - "processor/tsconfig.json"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, jsx, lib, module, moduleDetection, moduleResolution (+11 more)

### Community 30 - "webhook/tsconfig.json"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, jsx, lib, module, moduleDetection, moduleResolution (+11 more)

### Community 31 - "worker/tsconfig.json"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, jsx, lib, module, moduleDetection, moduleResolution (+11 more)

### Community 33 - "app/page.tsx"
Cohesion: 0.16
Nodes (10): Dialog(), DialogContent(), DialogDescription(), DialogHeader(), DialogTitle(), DialogTrigger(), SecondaryButton(), FeatureComponent() (+2 more)

### Community 34 - "frontend/tsconfig.json"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 35 - "primary backend/index.ts"
Cohesion: 0.15
Nodes (12): app, actionRouter, router, router, triggerRouter, userRouter, kafka, app (+4 more)

### Community 36 - "middleware.ts"
Cohesion: 0.16
Nodes (14): authMiddleware(), DecodedToken, Express, Request, clerk, router, router, zapRouter (+6 more)

### Community 48 - "base.json"
Cohesion: 0.12
Nodes (16): compilerOptions, declaration, declarationMap, esModuleInterop, incremental, isolatedModules, lib, module (+8 more)

### Community 49 - "Processor Bun Service"
Cohesion: 0.15
Nodes (16): Processor Bun Service, Webhook Bun Service, Worker Bun Service, Kafka KRaft Service, PostgreSQL Service, Local Infrastructure Stack Configuration, Clerk to Application JWT Exchange, Retry and Dead Letter Strategy (+8 more)

### Community 50 - "Email.tsx"
Cohesion: 0.31
Nodes (9): Badge(), badgeVariants, btnPrimary, DialogHeading(), Field(), TINTS, FieldPicker(), TokenInput() (+1 more)

### Community 51 - "primary backend/package.json"
Cohesion: 0.13
Nodes (14): @clerk/nextjs, express, @types/express, module, name, private, scripts, dev (+6 more)

### Community 52 - "processor/package.json"
Cohesion: 0.13
Nodes (14): dependencies, kafkajs, devDependencies, @types/bun, @types/bun, typescript, module, name (+6 more)

### Community 53 - "turbo.json"
Cohesion: 0.13
Nodes (14): dependsOn, inputs, outputs, dependsOn, cache, persistent, dependsOn, $schema (+6 more)

### Community 54 - "empty.tsx"
Cohesion: 0.24
Nodes (11): Empty(), EmptyContent(), EmptyDescription(), EmptyHeader(), EmptyMedia(), emptyMediaVariants, EmptyTitle(), formatDate() (+3 more)

### Community 55 - "browser.ts"
Cohesion: 0.14
Nodes (12): Action, AvailableAction, AvailableTriggerType, $Enums, TestTriggerBuffer, Trigger, User, Zap (+4 more)

### Community 56 - "dependencies"
Cohesion: 0.15
Nodes (13): dependencies, bcrypt, @clerk/backend, @clerk/nextjs, cors, dotenv, express, jsonwebtoken (+5 more)

### Community 57 - "client.ts"
Cohesion: 0.15
Nodes (12): Action, AvailableAction, AvailableTriggerType, $Enums, TestTriggerBuffer, Trigger, User, Zap (+4 more)

### Community 58 - "layout.tsx"
Cohesion: 0.20
Nodes (8): geistMono, geistSans, inter, metadata, action, TriggerTestResult, zapData, Toaster()

### Community 59 - "nextjs.json"
Cohesion: 0.18
Nodes (10): compilerOptions, allowJs, jsx, module, moduleResolution, noEmit, plugins, extends (+2 more)

### Community 60 - "CustonTrigger.tsx"
Cohesion: 0.28
Nodes (7): CustomTrigger(), TriggerNode, Trigger, HOOKS_URL, tokenDecode(), btnSecondary, Section()

### Community 62 - "typescript-config/package.json"
Cohesion: 0.29
Nodes (6): license, name, private, publishConfig, access, version

### Community 63 - "ui/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, exclude, extends, include, @repo/typescript-config/react-library.json

### Community 64 - "Next.js Logo"
Cohesion: 0.33
Nodes (6): Next.js Logo, Vercel Logo, Zapier Brand Logo, Next.js Frontend Application, Primary Backend Bun Service, Zapier Clone Project Overview

### Community 68 - "react-library.json"
Cohesion: 0.33
Nodes (5): compilerOptions, jsx, extends, ./base.json, $schema

### Community 69 - "class.ts"
Cohesion: 0.40
Nodes (3): config, LogOptions, PrismaClientConstructor

### Community 74 - "kafkajs-bun-fix.js"
Cohesion: 0.40
Nodes (4): content, fs, path, possiblePaths

## Knowledge Gaps
- **1449 isolated node(s):** `ActionScalarFieldEnum`, `Args`, `At`, `AtLeast`, `AtLoose` (+1444 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1742 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **32 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PrismaClient` connect `PrismaClient` to `prismaNamespace.ts`, `class.ts`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `TriggerDelegate` connect `TriggerDelegate` to `Trigger.ts`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `ZapDelegate` connect `ZapDelegate` to `Zap.ts`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `ActionScalarFieldEnum`, `Args`, `At` to the rest of the system?**
  _1449 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `prismaNamespace.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.015503875968992248 - nodes in this community are weakly interconnected._
- **Should `Zap.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.017094017094017096 - nodes in this community are weakly interconnected._
- **Should `Action.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.021052631578947368 - nodes in this community are weakly interconnected._