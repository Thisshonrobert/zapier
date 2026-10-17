# Support lab acceptance journey (16H)

Runbook for the plan's Section 9 acceptance journey. It runs against the persistent local lab plus the repository's isolated PostgreSQL and Kafka suites. Nothing here activates production replay, and no step contacts a real provider.

Authority: [support-workspaces-and-dlq-lab-plan.md](../support-workspaces-and-dlq-lab-plan.md) Section 9 and the 16H row of Section 8. Lab command reference: [TRIAGE-LAB.md](../../../scripts/dev/TRIAGE-LAB.md).

## What this proves, and what it does not

Proves: the matrix runs through the authenticated webhook, outbox, Kafka worker and DLQ publisher with simulated providers; each role's real HTTP surface enforces its own authorization against real rows; routing survives a stop/start; a captured Telegram 429 replays exactly once; the denial facts the lab carries are refused by the live policy; the ownership marker and batch correlation survive a restart.

Does not prove: live provider semantics, production replay readiness, broker outage recovery, paid diagnosis, browser-level keyboard/screen-reader behaviour (16G covers that), or selective per-batch cleanup (`lab:cleanup` is not implemented; only the guarded full `lab:reset --yes` exists).

## Preconditions

- Local PostgreSQL and Kafka reachable on the allowlisted addresses.
- `apps/primary_backend/.env` present with local connection credentials (`DATABASE_URL` supplies credentials only; the lab substitutes the `triage_lab` database name).
- No ordinary service holding lab ports 3200/3201/3202/3204/3205.
- `lab:seed` seeds, `lab:run`/`lab:verify` require the 16B supervisor identity, `lab:replay` requires the verified replay profile.

## Step 1 - Lab matrix across owners and providers

```powershell
rtk proxy bun run lab:seed
# Keep this foreground supervisor in its own terminal:
rtk proxy bun run lab:start
# In another terminal:
rtk proxy bun run lab:run --scenario all --batch acceptance-<date>
rtk proxy bun run lab:verify --batch acceptance-<date>
```

Expected: `verifiedRuns 33`, `owners 3`, `executions 39`, `failures 30`, `providerOperations 36`, `replayEnabled false`. Verification matches each failure to its execution, attempt, input fingerprints, ordered predecessor, drained outbox, DLQ broker-ACK stamp and exactly one Kafka DLQ event. Repeated scenarios for three ordinary owners cover Telegram 429/403/destination rejection/transport uncertainty/missing credentials, email 422/transport uncertainty/missing subject/missing template, a two-provider control and a multi-stage failure.

## Step 2 - Owner repair and isolation

```powershell
rtk proxy bun run lab:smoke --batch acceptance-<date>
```

Smoke step 2 lists each owner's failures over the real authenticated route and asserts the list is exactly that owner's cases, that `/operator/cases` and `/engineering/cases` return 403, and that a foreign case id returns 404 rather than a denial that confirms the id. The full repair journey (named Zap/step, the missing subject field, the stale-token 409, the save, the acknowledgement returning the case to support, and the immutable original ledger) runs in:

```powershell
$env:TRIAGE_CROSS_ROLE_INTEGRATION = 'true'
rtk proxy bun --env-file=apps/primary_backend/.env test apps/primary_backend/tests/triage-cross-role.integration.test.ts
```

## Step 3 - Support routing after a restart

Smoke step 3 re-reads this batch's cases across all three owners through `/operator/cases`, requires each one to stay readable by its own authorized lookup, requires the batch to appear on the capped queue page, routes the newest one to its owner with an idempotency key, re-reads the workflow in a fresh request and requires the same queue plus the durable `request_owner_repair` event. The case stays visible to support after it moves to the owner queue. Per-case reads rather than page membership are the check because the operator queue is capped at 50 and a long-lived lab holds far more history than one page; the property being tested is that neither a queue filter nor an owner scope hides a case from support.

## Step 4 - Engineer findings

Smoke step 4 escalates a second case with an assigned engineer, requires it to appear in a fresh `/engineering/cases` read, requires the engineer to be refused on the support route, returns findings, then reads the case back as its owner. The customer-safe projection must show `queue: support` and must not contain the internal findings text.

## Step 5 - One eligible simulated Telegram 429 replay

```powershell
rtk proxy bun run lab:stop
rtk proxy bun run lab:start:replay
rtk proxy bun run lab:smoke --batch acceptance-<date> --require-replay
rtk proxy bun run lab:replay --case-id <case id printed by the smoke run> --timeout-ms 120000
```

`--require-replay` fails the smoke run if the supervisor has no verified replay profile, so a skipped step cannot pass silently. `--timeout-ms` bounds each backend request (default 20000, range 1000..300000). The replay command builds the advisory F01 diagnosis from the case's live evidence, submits it through the real proposal/policy service, waits out the recorded cooldown, records one operator approval, runs a dry-run review, records one explicit request, and then verifies the ledger: `publication: published`, `execution: SUCCESS`, `providerOutcome: accepted`, `providerOperations: 1`, `requests: 1`, the original execution still `FAILED`/`rejected` with one attempt, and the second request denied with `approval consumed or replay_limit`. The report lands in `.tmp-turbo-user/triage-lab/replay-<case>.json`.

The CLI reads the handler identity from the case's own execution before evaluating policy. Without that, a separate process would compare the recorded handler against an unset `WORKER_HANDLER_VERSION` and manufacture a `changed_handler` refusal.

## Step 6 - Replay denial facts

Smoke step 6 loads each denial case's live facts with the same loader the approval and request paths use, then runs the real `evaluateReplayPolicy`:

| Denial | Lab case | Observed reason |
| --- | --- | --- |
| Missing credentials | `telegram-missing-credentials` | `missing_evidence`, `unsupported_failure`, `unsafe_attempt`, `changed_fingerprint`, `changed_handler` |
| Unknown delivery | `telegram-transport` | the same set plus `unknown_outcome` |
| Missing required input | `email-missing-subject` | the first set plus `invalid_inputs` |
| Existing completed replay | the case replayed in step 5 | `approval consumed or replay_limit` |
| Role revocation | `replay-db.integration.test.ts`, `triage-cross-role.integration.test.ts` | `operator permission revoked` / `approver permission revoked` / 403 |
| Stale approval | `replay-db.integration.test.ts` | `approval_expired`, `approval_required`, `stale proposal version` |

Denials are never treated as authority: UI advice cannot grant a replay, and a denied request creates no `ReplayRequest` row.

## Step 7 - Restart, new-batch correlation and reset guards

```powershell
rtk proxy bun run lab:stop
rtk proxy bun run lab:status          # running false; data retained
rtk proxy bun run lab:start
rtk proxy bun run lab:smoke --batch acceptance-<date>
rtk proxy bun run lab:run --scenario all --batch acceptance-<date>-b
```

The second smoke run after the restart must reproduce the same matrix counts and still find the earlier batch's journals, which is the stop/start-preserves-history proof. The new batch must produce a new correlated set of runs without duplicating owners or Zaps; `triage-lab-pipeline.integration.test.ts` asserts the exact snapshot, same-batch reconciliation and duplicate Kafka delivery in one run.

Reset guards: `lab:reset` without `--yes` fails, an ordinary or remote database URL, a `schema=` override, a remote broker and an occupied unrelated port are all refused, an unowned Kafka topic is never adopted or deleted, and reset refuses while another client holds the lab database. There is no selective per-batch cleanup command.

## Full acceptance sequence

```powershell
rtk proxy bun run lab:seed
rtk proxy bun run lab:start
rtk proxy bun run lab:run --scenario all --batch acceptance-<date>
rtk proxy bun run lab:smoke --batch acceptance-<date>
rtk proxy bun run lab:stop
rtk proxy bun run lab:start:replay
rtk proxy bun run lab:smoke --batch acceptance-<date> --require-replay
rtk proxy bun run lab:replay --case-id <printed case id>
rtk proxy bun run lab:stop
rtk proxy bun run lab:start
rtk proxy bun run lab:smoke --batch acceptance-<date>
rtk proxy bun run lab:run --scenario all --batch acceptance-<date>-b
rtk proxy bun run lab:stop

# Repository and integration checks
rtk proxy bun run lab:test
rtk proxy bun run lab:check-types
$env:KAFKA_TEST_BROKERS = '127.0.0.1:9092'
$env:DATABASE_URL = '<local connection string>'
rtk proxy bun run test:replay-recovery
$env:TRIAGE_CROSS_ROLE_INTEGRATION = 'true'
rtk proxy bun --env-file=apps/primary_backend/.env test apps/primary_backend/tests/triage-cross-role.integration.test.ts
rtk proxy bun --env-file=apps/primary_backend/.env test apps/primary_backend/tests/replay-db.integration.test.ts
rtk proxy bun run check-types
rtk proxy bun run lint
rtk proxy bun run build
```

`lab:test` reserves the lab ports, so the lab must be stopped first; `triage-lab-pipeline.integration.test.ts` needs it running. Record any step that cannot run as blocked rather than assumed.

## Failure handling

- `Lab smoke mismatch: ...` names the exact assertion. Fix the state or the seed, never the assertion.
- `batch ... has no scenario journals` means `lab:run` has not correlated that batch id yet.
- `the running lab has no verified replay profile` means the supervisor was started without `--replay`.
- `Lab case is not eligible: blocked ...` prints the policy reasons; a `changed_handler` reason means the case and the evaluating process disagree about the handler identity.
- Never adopt an unrelated process, PID, port, database or topic. `lab:reset --yes` is the only destructive command and is out of scope for an acceptance run.
