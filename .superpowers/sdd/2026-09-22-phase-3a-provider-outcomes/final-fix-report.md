# Phase 3A Final Fix Report

## Scope

Fixed only the three items in `final-review-findings.md`. No Phase 3B persistence, migration, replay, dependency, or unrelated edge-case work was added.

## Findings and fixes

1. **Email provider-code redaction defect**
   - Root cause: `safeEmailCode` normalized arbitrary provider strings, so an injected `error.name` such as `private_message_body` was retained in `ActionExecutionError.evidence.safeCode`.
   - Resend 6.4.2 declares these supported names in `node_modules/resend/dist/index.d.ts`: `missing_required_field`, `invalid_idempotency_key`, `invalid_idempotent_request`, `concurrent_idempotent_requests`, `invalid_access`, `invalid_parameter`, `invalid_region`, `rate_limit_exceeded`, `missing_api_key`, `invalid_api_key`, `suspended_api_key`, `invalid_from_address`, `validation_error`, `not_found`, `method_not_allowed`, `application_error`, and `internal_server_error`.
   - `safeEmailCode` now normalizes only for comparison, accepts only that explicit allowlist, and returns `email_provider_error` for every other value.
   - Added an adversarial regression that injects `private_message_body`, asserts the fallback code, and asserts the untrusted name is absent from serialized evidence.

2. **Plan sanitizer example drift**
   - Updated Task 2's `safeEmailCode` example to contain the same explicit Resend 6.4.2 allowlist and fallback as the implementation.

3. **Plan no-resend wording was too broad**
   - Clarified that Phase 3A only prevents a failed `SUCCESS` write from re-entering the current in-process `withRetry` call.
   - Clarified that Phase 3B owns durable acceptance persistence and protection from a later Kafka redelivery reclaiming an expired `PENDING` lease and resending.

## Files changed

- `apps/worker/actions/email.ts`
- `apps/worker/actions/email.test.ts`
- `docs/superpowers/plans/2026-09-22-phase-3a-provider-outcomes.md`

## RED / GREEN evidence

### RED

Command:

```powershell
.\node_modules\.bin\jiti.exe apps\worker\actions\email.test.ts
```

Output before the production change:

```text
AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
+ actual - expected

+ 'private_message_body'
- 'email_provider_error'
```

This demonstrates the test exercised the existing redaction defect rather than a test setup error.

### GREEN

Command:

```powershell
.\node_modules\.bin\jiti.exe apps\worker\actions\email.test.ts
```

Output:

```text
email.test.ts OK
```

## Regression and type-check results

All commands completed successfully unless noted.

```powershell
.\node_modules\.bin\jiti.exe apps\worker\actions\email.test.ts
# email.test.ts OK

.\node_modules\.bin\jiti.exe apps\worker\actions\telegram.test.ts
# telegram.test.ts OK

.\node_modules\.bin\jiti.exe apps\worker\retry.test.ts
# retry.test.ts OK

.\node_modules\.bin\jiti.exe apps\worker\idempotency.test.ts
# idempotency.test.ts OK

.\node_modules\.bin\jiti.exe apps\worker\deadletter.test.ts
# deadletter.test.ts OK

.\node_modules\.bin\tsc.exe --noEmit --skipLibCheck --target es2022 --module esnext --moduleResolution bundler --types bun apps\worker\index.ts
# exit 0
```

The initial equivalent direct type check without `--skipLibCheck` failed only in installed `bun-types` declarations against Node 24 (`TextEncoderEncodeIntoResult`, `ConnectionOptions`, `KeyObject`, and `TLSSocket`). The worker's own `tsconfig.json` already specifies `skipLibCheck: true`; the succeeding command matches that project setting and produced no output.

`git diff --check` for the three fix-wave files produced no errors. The repository-wide check still reports two pre-existing trailing-whitespace errors in the unrelated `apps/ai_agent/src/tools/failure-context.ts`, which was not modified or staged.

## Self-review

- The allowlist is exactly the installed Resend 6.4.2 SDK union and the implementation and plan contain the same values.
- The adversarial test fails if the allowlist guard is removed or arbitrary normalized names are accepted.
- Existing supported names, outcome classification, receipt behavior, retry behavior, and Telegram behavior are preserved by the focused regressions.
- No Phase 3B behavior was implemented.
- Unrelated `.claude/settings.local.json`, `apps/ai_agent/src/tools/failure-context.ts`, and `graphify-out/` changes were preserved and excluded from this fix wave.

## Concerns

- None for this scoped fix. The direct compiler invocation requires `--skipLibCheck` in this environment because the installed Bun declarations are not compatible with the available Node 24 declarations; that is already the worker project's configured setting.
