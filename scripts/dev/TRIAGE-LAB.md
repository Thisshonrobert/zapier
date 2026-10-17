# Persistent local triage lab (16A–16F)

The lab runs the authenticated webhook, PostgreSQL outbox processor, Kafka worker and durable DLQ publisher. Both providers are simulated at the production handlers' transport boundaries. No failure rows are fabricated. Investigations and paid model calls stay disabled.

Prerequisites: local PostgreSQL/Kafka on the allowlisted addresses, existing dependencies, Bun and Node with TypeScript support. Root commands use `apps/primary_backend/.env` for local database connection credentials; the ordinary database name is replaced with `triage_lab`. Explicit overrides are `TRIAGE_LAB_DATABASE_URL` and `TRIAGE_LAB_KAFKA_BROKERS`; they must remain local. Seeding refuses ordinary/unmarked databases or unowned topics. Credentials are written only to ignored `.tmp-turbo-user/triage-lab/accounts.json`.

```powershell
rtk proxy bun run lab:seed
# Keep this foreground supervisor running in its own terminal:
rtk proxy bun run lab:start
# In another terminal:
rtk proxy bun run lab:run --scenario all
rtk proxy bun run lab:run --scenario telegram-rate-limit --batch example-rate-limit
rtk proxy bun run lab:verify --batch example-rate-limit
rtk proxy bun run lab:status
rtk proxy bun run lab:stop
```

## Interactive replay (16F)

Replay runs the real dispatcher and worker path against a captured eligible Telegram 429 case, but only inside a verified replay profile. `REPLAY_RELEASE_READY=true` alone changes nothing: the profile must also be a marked lab whose published ownership fingerprint matches the database and brokers it is actually configured with, and the processor re-confirms the durable ownership marker before it dispatches. An ordinary `lab:start` keeps `REPLAY_ENABLED=false`.

```powershell
# Start the owner with the verified replay profile enabled:
rtk proxy bun run lab:start:replay
# Produce captured failures first, then replay one of them:
rtk proxy bun run lab:run --scenario telegram-rate-limit --batch replay-example
rtk proxy bun run lab:replay --run-id <run id from that batch> [--timeout-ms 90000]
# or target a known case:
rtk proxy bun run lab:replay --case-id <case id>
```

`lab:replay` builds the advisory F01 diagnosis from the case's live evidence, submits it through the real proposal/policy service, waits out the recorded cooldown, records an operator approval, runs a dry run review, records one explicit request and then verifies the durable ledger: publication, execution, the recorded provider outcome, exactly one simulated replay provider operation and an unchanged original execution. It also repeats the request identity, forces an extra dispatch pass, attempts a second replay (which must be denied), and prints the cross-investigation request history. The report is written to `.tmp-turbo-user/triage-lab/replay-<case>.json`.

The advisory diagnosis in this journey is the documented bounded F01 shape because the lab runs no paid model. Eligibility, approval, request, publication and execution all run the production application code path against real captured evidence; no failure row is fabricated and no provider is contacted.

`run` prints its batch identifier before triggering scenarios. Reuse the same `--batch` and scenario selection after an interrupted command: existing correlated runs are reused. If a crash leaves ingestion ambiguous with no matching run, the command refuses to resend; allow the in-flight webhook to settle and retry reconciliation, or use a new batch. `--timeout-ms` accepts 1000–300000 (default 90000). A mismatch, missing event, unpublished failure or deadline returns nonzero. Machine-readable successful reports live at `.tmp-turbo-user/triage-lab/batch-<id>.json`.

`seed` reuses five accounts and 39 Zaps (six 16A placeholders plus 33 owner/scenario definitions). It preserves repairs and history. Running a changed/repaired scenario refuses to overwrite it. Use the existing explicitly guarded full `lab:reset --yes` only if you want to discard the entire marked lab database/topics. Selective cleanup is not exposed: immutable authority rows must not be bypassed.

The matrix includes Telegram 429, 403, destination resolution rejection, transport uncertainty and missing credentials; email 422, transport uncertainty, missing subject and missing template; a two-provider successful control and an email-success/Telegram-failure sequence. Each scenario runs for three ordinary owners. The full batch expects 33 runs, 39 executions, 30 published failures and 36 simulated provider operations. Missing Telegram credentials are `not_attempted / resolve_destination / telegram_credentials_missing`; missing email subject is a real send-boundary rejection from the simulated Resend response, rather than a fabricated validation-phase failure.

Verification checks owner/run/step/attempt linkage, exact safe codes/status/retry delay, input fingerprints, single provider operations, ordered predecessor success, empty outbox, durable DLQ broker-ACK stamps and matching Kafka failure events. Kafka stage publications may repeat under at-least-once delivery; provider attempts must remain single. Duplicate DLQ matches are reported as mismatches. SQL timestamp reads use Prisma's UTC interpretation, independent of the host timezone.

The authenticated supervisor reports owned child liveness. `lab:run`/`lab:verify` prove data-plane readiness. Stopping retains all definitions, batches and history. Stop can authenticate and shut down an older 16A supervisor; start/run require the 16B identity. Never adopt an unrelated process, PID, occupied port, database or topic.

## Cross-role acceptance smoke (16H)

`lab:smoke` walks the Section 9 acceptance journey against the live lab in one command. It reads a batch that already exists and never triggers scenarios itself, so a retry cannot create new runs or a second replay. It is read-only apart from one owner-repair routing and one engineering escalation/return, which are the handoffs the journey has to prove. The runbook is [docs/AI/runbooks/support-lab-acceptance-journey.md](../../docs/AI/runbooks/support-lab-acceptance-journey.md).

```powershell
rtk proxy bun run lab:run --scenario all --batch smoke-<date>
rtk proxy bun run lab:smoke --batch smoke-<date>
# With the verified replay profile active, step 5 is reported and the journey is run separately:
rtk proxy bun run lab:smoke --batch smoke-<date> --require-replay
rtk proxy bun run lab:replay --case-id <case id printed by the smoke run>
# Stop before running lab:test; the lifecycle test reserves the lab ports and refuses an occupied one.
rtk proxy bun run lab:stop
rtk proxy bun run lab:test
```

Steps verified by the command: the owner/provider matrix with durable DLQ failures; owner isolation and the privileged-queue denial; support routing across every owner's cases with a durable re-read; the engineering escalation, findings return and customer-safe owner projection; the replay eligibility and denial facts the batch itself carries (missing credentials, unknown delivery, missing required input), the lab/ordinary-database/host guards and the ownership marker. Step 5 is not duplicated: the replay journey keeps its own ledger assertions in `lab:replay`, and the smoke run prints the exact eligible Telegram 429 case id to use. A lab without a verified replay profile reports step 5 as skipped, and `--require-replay` turns that into a failure.

```powershell
rtk proxy bun run lab:test
rtk proxy bun run lab:check-types
# Replay evidence checks (no database needed):
rtk proxy bun test apps/primary_backend/tests/replay-release.test.ts apps/primary_backend/tests/triage-replay-http.test.ts
# With the owned pipeline stopped (avoids racing the temporary ingestion fixture):
$env:TRIAGE_LAB_INTEGRATION = 'true'
rtk proxy bun --env-file=apps/primary_backend/.env test scripts/dev/triage-lab.integration.test.ts
# With the owned 16B pipeline running:
$env:TRIAGE_LAB_PIPELINE_INTEGRATION = 'true'
rtk proxy bun --env-file=apps/primary_backend/.env test scripts/dev/triage-lab-pipeline.integration.test.ts
```

The pipeline integration test retains its new batch for inspection and verifies unchanged SQL snapshots after same-batch reconciliation and consumed duplicate Kafka deliveries. It does not establish live provider semantics, production replay readiness, broker outage recovery, paid diagnosis or the browser-level role journeys.

## 16H cross-role coverage outside the lab

The lab proves the pipeline; the mounted router proves the three role surfaces. Both are needed, and neither replaces the other.

```powershell
# Real PostgreSQL, real HTTP router, real role rows; no lab and no supervisor needed.
$env:TRIAGE_CROSS_ROLE_INTEGRATION = 'true'
rtk proxy bun --env-file=apps/primary_backend/.env test apps/primary_backend/tests/triage-cross-role.integration.test.ts
```

That suite walks one case through owner -> support -> owner -> support -> engineering -> support -> owner on real rows: the owner's own-case list and the missing-field repair, the foreign-id 404 and the privileged-queue 403, the operator routing and its durable event trail, the engineer escalation/findings return, the owner's customer-safe projection, the access audit and role revocation.
