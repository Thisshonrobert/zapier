# Phase 16G surface brief — unified three-pane support UI

Tracked deliverable for Phase 16G of [`docs/AI/support-workspaces-and-dlq-lab-plan.md`](../../AI/support-workspaces-and-dlq-lab-plan.md)
(Section 7 UI brief, Section 8 16G row). Product truth lives in [`PRODUCT.md`](../../../PRODUCT.md);
this brief holds only the strategy that belongs to these surfaces.

## Scope and mode

Surfaces: `/triage` (support operator), `/failures` (owner), `/engineering` (engineer).
Mode: **Operate**. The visitor completes a task; scanability, honest state and familiar
affordances outrank expression, and brand lives in precise details.

This is an **extension of an established world**, not a redesign. The incumbent visual
decisions are the Zapier accent `#FF4F00`, the zinc neutral surface scale, the shadcn radius
set, the Inter/Geist stack wired in `apps/frontend/src/app/layout.tsx`, and the button/field
vocabulary in `mycomponents/app/FormKit.tsx`. Those are preserved as-is; this phase adds one
shared composition and one shared set of state marks on top of them, and removes the
copy-pasted "rounded-xl border border-zinc-200 bg-white p-5" card from the support surfaces.

## Audience, job, action

| Surface | Audience | Job | Actions | Proof the surface must carry |
| --- | --- | --- | --- | --- |
| `/triage` | Support operator | Decide what failed, which evidence supports it, who is responsible next, and what is permitted now | Investigate · Approve/Reject · Request owner repair · Escalate · Resolve · Approve replay · Run dry run review · Request replay | Server-reported capability, application eligibility with named policy reasons, approval/publication/execution as separate facts, cross-investigation replay history |
| `/failures` | Owner | Understand which of my Zaps failed at which step and fix it | Open Zap editor · Save changes · Submit repair completion | The exact step, the exact missing fields, the published instructions, and the fact that the original run is untouched |
| `/engineering` | Engineer | Read a routed escalation and hand findings back | Return findings to support · Resolve with an explanation | The escalation reason, authorized evidence, handoff history |

Frequency: high-volume scanning during an incident, low-volume deep reading per case. Assume a
keyboard-first operator on desktop and a triaging owner on a phone.

## Constraints

- No new dependency, no backend route, schema or policy change. Existing operator, owner and
  engineering endpoints only.
- Streaming with polling fallback for investigation updates is shipped behaviour and stays.
- Every status label, count and state is derived from real contract data. No invented state,
  no placeholder metric, no control that performs nothing.

## Chosen direction — "Case file, not dashboard"

One ticket list on the left behaves as a dense, keyboard-navigable case index. The middle pane
is the case file: identity, diagnosis, responsibility and the actions the server currently
allows. The right pane is the evidence room: observed facts, input validation, attempt ledger,
provenance and runbook citations, with an honest `unavailable` line wherever the backend could
not supply something.

**Memorable moment:** the replay ledger, where policy eligibility, operator approval, request
publication and worker execution appear as four separately stamped rows on one timeline. It is
the one thing a support operator cannot see anywhere else in the product, and it is the reason
this surface exists.

Composition, from the reference ([Ecomiq customer-support ticketing by Bagus Fikri /
Fikri Studio](https://dribbble.com/shots/26211530-Ecomiq-SaaS-E-commerce-Customer-Support-Ticketing)):

- Adopted: a narrow left index of rows each carrying a title, a one-line summary and a compact
  priority mark; a middle conversation-shaped column; a right rail of reference material
  reached by tabs; three-column proportions near 24 / 40 / 36; flat white surfaces divided by
  hairlines rather than nested cards; a search field at the top of the index; a small metadata
  line under each row title; and the reference's restrained palette (`#EEF0F3` ground,
  `#0D0D13` ink, `#CACACA` borders) already matching our zinc scale.
- Rejected: the chat composer (this is not a chatbot), the message bubbles, the icon rail, the
  pastel article-tile illustration, and the avatar-based identity treatment.

**Type:** keep the shipped Inter/Geist stack. Scale and weight carry the hierarchy — 13px/600
row titles, 12px/400 muted summaries, 11px tabular for IDs, timestamps and counts, 15px/600
pane headings, 18px/600 case titles.

**Color:** restrained. Neutral zinc surfaces; `#FF4F00` reserved for the single primary action
of a pane; a small semantic set for state marks only (zinc = with support / settled, amber =
waiting on a person, sky = submitted or published, violet = engineering, emerald = resolved or
provider-accepted, red = denied or failed). No gradient, no glow, no colored side stripes.

**Motion:** none by default. One authored transition — the evidence drawer's slide and the
selected-row mark — both removed under `prefers-reduced-motion: reduce`.

## Required state coverage

Empty (no failures / nothing selected), no diagnosis yet, investigating, missing evidence,
provider uncertainty, awaiting owner, awaiting engineering, repair review pending,
policy-eligible replay, cooldown pending, denied or stale approval, expired proposal,
replay queued / published / running, accepted / failed / unknown outcome, revoked access,
and service outage. The fixed "live replay is disabled" paragraph is removed; capability is
reported by the server.

## Unresolved

- Operator ticket rows cannot show Zap names or step labels: the operator case projection
  carries IDs, stage, safe code, provider outcome and source only, and this phase may not
  widen the API. The row shows the failure summary instead, and Zap/step context arrives in
  the middle pane once failure-context evidence loads.
- The Next.js dev server cannot start under the current file sandbox (`spawn EPERM`, the same
  boundary recorded for `frontend#build` in 16C–16F), so visual inspection runs against a
  static harness that renders the real components to markup and serves them with a compiled
  Tailwind stylesheet.
