---
version: 1
slug: "apps-frontend-src-app-triage-page-tsx"
primary_target: "apps/frontend/src/app/triage/page.tsx"
related_targets: ["apps/frontend/src/app/failures/page.tsx","apps/frontend/src/app/engineering/page.tsx"]
---

# Support workspaces — three-pane support UI (Phase 16G)

## Scope and mode

Route group: `/triage` (support operator), `/failures` (owner), `/engineering` (engineer).
Mode: **Operate**. The visitor completes a task; scanability, honest state and familiar
affordances outrank expression, and brand lives in precise details.

This is an **extension of an established world**, not a redesign. The incumbent visual
decisions are the Zapier accent `#FF4F00`, the zinc neutral surface scale, the shadcn radius
set, the Inter/Geist stack wired in `apps/frontend/src/app/layout.tsx`, and the button/field
vocabulary in `mycomponents/app/FormKit.tsx`. Those are preserved as-is; this brief adds one
shared composition and one shared set of state marks on top of them.

## Audience, job, action

| Surface | Audience | Job | Primary action | Proof the surface must carry |
| --- | --- | --- | --- | --- |
| `/triage` | Support operator | Decide what failed, which evidence supports it, who is responsible next, and what is permitted now | Investigate · Approve replay · Request replay · Escalate · Request owner repair | Server-reported capability, application eligibility with named policy reasons, separate approval/publication/execution facts, cross-investigation replay history |
| `/failures` | Owner | Understand which of my Zaps failed at which step and fix it | Open Zap editor · Save changes · Submit repair completion | The exact step, the exact missing fields, the published instructions, and the fact that the original run is untouched |
| `/engineering` | Engineer | Read a routed escalation and hand findings back | Return findings to support · Resolve with an explanation | The escalation reason, authorized evidence, and handoff history |

Frequency: high-volume scanning during an incident, low-volume deep reading per case. Assume
a keyboard-first operator on a desktop and a triaging owner on a phone.

## Constraints

- No new dependency, no backend route, schema or policy change. Existing operator and owner
  endpoints only.
- Streaming with polling fallback for investigation updates is shipped behaviour and stays.
- Every status label and count is derived from real contract data. No invented state, no
  placeholder metric, no control that performs nothing.

## Chosen direction

**"Case file, not dashboard."** One ticket list on the left behaves as a dense, keyboard-
navigable case index. The middle pane is the case file: identity, diagnosis, responsibility
and the actions the server currently allows. The right pane is the evidence room: observed
facts, input validation, attempt ledger, provenance and runbook citations, with an honest
`unavailable` line wherever the backend could not supply something.

Memorable moment: the **replay ledger**, where eligibility, approval, publication and worker
execution appear as four separately stamped rows on one timeline. It is the one thing a
support operator could not see anywhere else in the product, and it is the reason this
surface exists.

Composition, from the reference ([Ecomiq customer-support ticketing](https://dribbble.com/shots/26211530-Ecomiq-SaaS-E-commerce-Customer-Support-Ticketing)):
a narrow left index of rows carrying a title, a one-line summary and a compact priority mark;
a middle conversation-shaped column; a right rail of reference material reached by tabs.
Adopted from it: the row anatomy, the three-column proportions (roughly 24 / 40 / 36), the
flat white surfaces divided by hairlines rather than nested cards, the search field at the top
of the index, and the reference list's small metadata line under each title.
Rejected from it: the chat composer (this is not a chatbot), the message bubbles, the icon
rail, the pastel article-tile illustration, and the avatar-based identity treatment.

Type: keep the shipped Inter/Geist stack. Scale and weight carry the hierarchy — 13px/500 for
row titles, 11px/400 tabular for IDs, timestamps and counts, 15px/600 for pane headings.

Color: restrained. Neutral zinc surfaces, `#FF4F00` reserved for the single primary action of
a pane, and a small semantic set for state marks only (zinc = with support/settled, amber =
waiting on a person, sky = submitted/published, violet = engineering, emerald = resolved or
provider-accepted, red = denied or failed). No gradient, no glow, no colored side stripes.

## Unresolved

- Ticket rows on the operator surface cannot show Zap names or step labels: the operator case
  projection carries IDs, stage, safe code and provider outcome only, and this phase may not
  widen the API. The row shows the failure summary instead, and the Zap/step context arrives
  in the middle pane once failure-context evidence loads.
- The dev server cannot start under the current file sandbox (`spawn EPERM`), so the visual
  inspection runs against a static harness that renders the real components to markup and
  serves them with a compiled Tailwind stylesheet.
