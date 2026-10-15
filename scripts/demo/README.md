# Local triage recording demo

This setup keeps four seeded cases and two real pipeline failures visible for recording. All provider outcomes are simulated. Only the two pipeline cases establish webhook → database outbox → Kafka → worker → durable failure → DLQ publication. They do not establish real Telegram behavior or production readiness.

| Case | Origin | Observation |
| --- | --- | --- |
| Rate limit | Seeded | Telegram 429 with retry-after 60 seconds |
| Missing credentials | Seeded | No Telegram token in action metadata; seeded not-attempted evidence |
| Unknown delivery | Seeded | Transport failure with unknown delivery; no safe replay claim |
| Invalid input | Pipeline | Missing destination; stub rejects destination resolution before send |
| Provider rejection | Pipeline | Valid action input; stub returns Telegram 403 on send |
| Replay approved | Seeded | Telegram 429 with completed operator approval and successful replay execution |

Run from the repository root. Existing local PostgreSQL and Kafka must be reachable. Load the existing backend and agent environment files; credentials are never written to the demo manifest.

```powershell
rtk proxy bun --env-file=apps/primary_backend/.env --env-file=apps/ai_agent/.env run scripts/demo/triage-demo.ts verify
```

`verify` uses ports 3101/3102/3104, an independently created database and per-run Kafka topics. It makes no paid model calls. It asserts five operator-visible cases, two broker-observed DLQ messages and five agent-to-backend evidence reads. The database/topics are removed on exit. Logs and a sanitized manifest remain under ignored `.tmp-turbo-user/triage-demo-<id>/`.

For recording, stop the existing frontend/backend/agent processes yourself, then:

```powershell
rtk proxy bun --env-file=apps/primary_backend/.env --env-file=apps/ai_agent/.env run scripts/demo/triage-demo.ts serve
```

If another project needs port 3000, keep it running and choose another frontend port. The launcher updates its port check, frontend process, backend CORS origin and displayed login URL together:

```powershell
$env:TRIAGE_DEMO_FRONTEND_PORT = "3005"
rtk proxy bun --env-file=apps/primary_backend/.env --env-file=apps/ai_agent/.env run scripts/demo/triage-demo.ts serve
```

Open `http://localhost:3005/login` in that case. Remove the override with `Remove-Item Env:TRIAGE_DEMO_FRONTEND_PORT` to restore the default port for subsequent launches.

This starts the frontend (3000), backend (3001), webhook (3002), processor, worker, separate DLQ publisher and agent (3004). It refuses occupied ports. Sign out of your existing browser account, open `http://localhost:3000/login`, and sign in with `triage-demo@example.invalid` / `TriageDemo-LocalOnly-2026!`. Open `/triage` without previous case/investigation URL parameters. Case IDs and their scenario labels appear in the terminal/manifest. Show the two pipeline cases first, then the three explicitly labeled seeded cases. Click Investigate to run the configured live diagnosis model; these clicks incur its normal API usage. Seeded evidence is deliberately synthesized and must be described as such in the recording, even though it passes through the existing persisted-evidence adapter.

The normal 256,000-token daily allowance only permits four 64,000-token reservations. The disposable demo gets a bounded ten-attempt token/spend allowance, allowing all five cases plus limited retakes. It does not change production or existing local quotas. Provider fetches in the dedicated worker are blocked except the exact demo Telegram stub. No real messages are sent.

The demo sets `INVESTIGATION_MODEL_TIMEOUT_MS=45000`: a model request that exceeds the normal 15-second default can still finish within the unchanged 60-second investigation deadline. The setting accepts integers from 1 through 45,000 milliseconds; absent configuration retains 15 seconds. Restart the demo launcher after changing runtime code. Existing failed investigations remain failed; a fresh launch creates a new disposable stack for a new investigation. The frontend shows the case timeline and trace only; offline evaluation reports stay outside the case UI.

The serving `gemini-2.5-flash` configuration disables thinking with `thinkingBudget: 0`, retaining the 2,048-token generation cap. Default dynamic thinking otherwise shares that cap with the visible JSON diagnosis and can leave output incomplete. Other configured models keep their existing configuration. The adapter still rejects truncated or blocked responses; its checkpoint error now names recognized finish reasons (`MAX_TOKENS`, `SAFETY`, `RECITATION`, `OTHER`) without storing provider text or thought content. This does not introduce automatic retries or enable replay.

Keep the launcher terminal open while recording. Ctrl+C stops its children and deletes only its own database/topics. After a hard launcher termination, inspect that run's logs and PostgreSQL/Kafka inventory before manually removing any leftover `triage_demo_<id>` database/topics; never remove the normal application database or topics.

Local triage load errors found during setup: agent migration 0005 supplies `investigation_snapshot.trace_id`; pending application migrations supply `TriageProposal` and the authority/replay tables. Apply existing migrations, not new schema work. The regular backend `.env` uses port 3001, so the agent's regular `PRIMARY_BACKEND_URL` must use 3001 too, followed by an agent restart.

The screenshot's investigation loads again after these migrations, but remains queued because the recent evaluation reservations already consume all 256,000 tokens of its rolling daily allowance. Waiting for those reservations to age out preserves the normal quota. The separate disposable demo has its own fresh reservations and bounded demo allowance; no existing reservations are deleted or refunded.
