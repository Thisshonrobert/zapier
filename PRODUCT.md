# Product

## What this is

Zappy is an event-driven Zapier-style workflow automation platform. A Zap is a trigger
plus ordered action steps; a run executes those steps asynchronously through the webhook,
outbox, Kafka and worker pipeline. Delivery is at-least-once, so every step is idempotent
and every failure is durable evidence rather than a lost log line.

The support surface is not the product's main event, but it is where trust is won or lost:
an automation platform is judged by what happens when a step fails at 03:00 and someone has
to decide whether it is safe to run it again.

## Who uses it, and for what

Three roles read the same failure through different doors. Application code owns every one
of these decisions; the AI resolver is read-only, case-scoped and advisory.

| Role | Route | The job they came to do |
| --- | --- | --- |
| Owner | `/failures` | "One of my Zaps failed. What broke, what exactly must I change, and did support ask me for anything?" |
| Support operator | `/triage` | "What failed across all owners, what evidence supports the diagnosis, who is responsible next, and which actions am I permitted to take right now?" |
| Engineer | `/engineering` | "Support routed this to me. Why, what evidence am I authorized to see, and how do I hand findings back?" |

## What is true about this domain

These are product truths, not preferences. Any surface that contradicts them is wrong.

- **The failure is immutable.** Editing a Zap changes future configuration. It never rewrites
  the run, attempt, failure, or fingerprint that already happened.
- **Advice is not authority.** A diagnosis is advisory. Only deterministic backend policy
  decides replay eligibility, and only a human operator approves it. Confidence never grants
  access, and no UI control creates permission.
- **Eligibility, approval, publication and execution are four different facts.** A case can be
  policy-eligible with no approval; approved with nothing dispatched; dispatched with no
  recorded provider outcome; and accepted by a provider without confirming end-user delivery.
  Collapsing any two of those is a lie the operator will act on.
- **Absence is information.** Archived snapshots are genuinely unavailable sometimes. The
  product says which evidence is missing and why, rather than filling the gap with a plausible
  guess, a placeholder metric, or a green check.
- **Denial has a reason.** Replay refusal is a bounded, named policy reason from a fixed
  vocabulary (`cooldown_pending`, `changed_fingerprint`, `replay_limit`,
  `ungrounded_candidate`, …), not a generic "unavailable".
- **Server-reported capability beats client copy.** Whether investigation, replay intent and
  replay execution are enabled, and whether the release profile is verified, comes from the
  server on every load. A hard-coded paragraph in the client drifts and misleads.
- **Roles are real only when the server says so.** Navigation hides what a viewer cannot open,
  but every privileged read and write is authorized server-side and re-checked. Revocation
  takes effect on the next request.
- **Internal evidence stays internal.** Support notes, raw payloads, credentials and
  unsanitized model output never reach an owner's projection, and an owner's failure is never
  visible to another owner.
- **Replay is bounded and rare.** A narrow allowlist (captured Telegram send-stage rejections
  with unchanged inputs and an explicit fingerprinted bot token), at most one replay, no bulk,
  no changed-input replay, no email replay. Duplicate clicks and restarts must not create a
  second external send.
- **In-app is the only delivery.** Escalation is recorded in application state. There is no
  email, Slack, ticket or paging integration, and a recipient's email address is an account
  identifier, never a notification target.

## The states the product must be able to say out loud

Fresh start with nothing to fix · not yet investigated · investigating · missing evidence ·
provider outcome unknown · awaiting the owner · awaiting engineering · repair review pending ·
policy-eligible for replay · in cooldown · approval denied or stale · proposal expired ·
replay queued / published / running · replay accepted / failed / unknown · access revoked ·
service outage.

Every one of these is reachable in the shipped UI, and each is rendered from real contract
data. No state label is invented for a state the backend cannot report.

## Constraints

- Existing stack only: Next.js App Router (React 19), Tailwind v4, lucide icons, bun test with
  `react-dom/server` for render assertions. No new dependency for this surface.
- Existing endpoints only. Presentation work does not change routes, contracts or policy.
- The deployed product identity is the Zapier accent (`#FF4F00`) on restrained neutral
  surfaces, tight typography and visible focus. This surface extends that identity; it does
  not replace it.
- Streaming with polling fallback for investigation updates is a shipped behaviour and stays.
- Operate mode: the visitor completes a task. Scanability, honest state and familiar
  affordances outrank expression. Brand lives in precise details.

## Deliberate non-goals

Autonomous resolution, role-management UI, bulk or changed-input replay, email replay,
external ticket delivery, SLA automation, decorative dashboards, fabricated metrics, and any
control that claims an outcome the backend has not recorded.
