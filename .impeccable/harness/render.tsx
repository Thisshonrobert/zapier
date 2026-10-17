import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";

import { CaseFile, Section, Fact, type CaseIdentity } from "@/mycomponents/support/CaseFile";
import { EvidenceRoom } from "@/mycomponents/support/EvidenceRoom";
import { CapabilitySummary, ReplayLedger } from "@/mycomponents/support/ReplayLedger";
import { ThreePane, PaneNotice } from "@/mycomponents/support/Shell";
import { StatusMark } from "@/mycomponents/support/Marks";
import { TicketIndex } from "@/mycomponents/support/TicketIndex";
import { EngineeringWorkspace } from "@/app/engineering/EngineeringWorkspace";
import { StatusChip } from "@/app/failures/OwnerStatusChip";
import { caseSummary } from "@/lib/support-copy";
import type { SupportTicket } from "@/types/support";
import {
  blockedSaved,
  cases,
  diagnosis,
  engineeringCases,
  evidence,
  ownerFailures,
  saved,
} from "./fixtures";

/**
 * Inspection harness. It renders the real components to static markup so one browser pass can
 * see the desktop and mobile compositions, every required state, and the browser-surface
 * details (focus rings, scrollbars, tabular numerals) that a component test cannot show.
 *
 * Run: bun .impeccable/harness/render.mjs > .impeccable/review/harness.html
 */

const root = join(import.meta.dir, "..", "review");
mkdirSync(root, { recursive: true });

const capabilities = {
  investigation: true,
  replayIntent: true,
  replayExecution: true,
  releaseReady: true,
  labProfile: "triage-lab-v1",
  reasons: [] as string[],
};
const deniedCapabilities = {
  investigation: true,
  replayIntent: false,
  replayExecution: false,
  releaseReady: false,
  labProfile: null,
  reasons: ["release_not_ready", "replay_switch_off"],
};

const toTicket = (item: (typeof cases)[number]): SupportTicket => ({
  caseId: item.case_id,
  summary: caseSummary(item),
  status: item.source === "reconciled_execution" ? "Reconciled" : "Durable failure",
  tone: item.provider_outcome === "rejected" ? "denied" : item.provider_outcome === "unknown" ? "waiting" : "neutral",
  observedAt: item.observed_at,
  ownerLabel: `Owner ${item.subject_owner_id}`,
  safeCode: item.safe_code,
});

const identity: CaseIdentity = {
  caseId: cases[0]!.case_id,
  title: caseSummary(cases[0]!),
  subtitle: "Durable failure row",
  status: "Provider rejected",
  tone: "denied",
  observedAt: cases[0]!.observed_at,
  ownerLabel: `Owner ${cases[0]!.subject_owner_id}`,
  safeCode: cases[0]!.safe_code,
  providerOutcome: cases[0]!.provider_outcome,
  source: cases[0]!.source,
  stage: cases[0]!.stage,
  zapRunId: cases[0]!.zap_run_id,
};

const queue = (
  <TicketIndex
    title="Support queue"
    count={`${cases.length}/${cases.length}`}
    state={{ kind: "ready", rows: cases }}
    toTicket={toTicket}
    onSelect={() => {}}
    selectedCaseId={cases[0]!.case_id}
    search={{ label: "Search cases", placeholder: "Case, run, owner or error code", value: "", onChange: () => {} }}
  />
);

const caseFile = (
  <CaseFile
    identity={identity}
    aside={
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF4F00] px-3 py-1.5 text-xs font-semibold text-white"
        >
          Investigate again
        </button>
        <StatusMark label="Investigation proposed" tone="neutral" />
        <span className="text-[11px] text-zinc-500">Updates stream while this investigation is open.</span>
      </div>
    }
    context={
      <Section title="Step handler" description="Reported by the captured failure evidence, when it was recorded." id="step-handler">
        <p className="text-xs text-zinc-700">telegram</p>
      </Section>
    }
    work={
      <>
        <Section
          title="Diagnosis"
          description="Advisory only. Application policy, not this advice, decides what may be replayed."
          id="diagnosis"
          actions={<StatusMark label="high confidence" tone="submitted" />}
        >
          <h4 className="text-sm font-semibold text-zinc-900">{diagnosis.diagnosis.taxonomy_id}</h4>
          <p className="mt-1 text-sm text-zinc-700">{diagnosis.diagnosis.summary}</p>
          <p className="mt-2 text-[11px] text-zinc-500">Investigation status: completed</p>
          <div className="mt-3">
            <p className="mb-1 text-[11px] font-medium text-zinc-500">Other explanations the evidence allows</p>
            <ul className="list-disc space-y-0.5 pl-4 text-xs text-zinc-700">
              {diagnosis.diagnosis.alternate_explanations!.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </Section>

        <Section
          title="Advisory next step"
          description="What the resolver proposed. It is not an approval and not a dispatch."
          id="proposal"
          actions={<StatusMark label="replay candidate" tone="neutral" />}
        >
          <p className="text-sm text-zinc-800">{diagnosis.proposal.summary}</p>
          <dl className="mt-2">
            <div className="flex items-baseline justify-between gap-3 border-b border-zinc-100 py-1.5">
              <dt className="text-xs text-zinc-500">Proposal kind</dt>
              <dd className="text-xs font-medium text-zinc-800">wait then replay</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 py-1.5">
              <dt className="text-xs text-zinc-500">Not before</dt>
              <dd className="text-xs font-medium text-zinc-800">{diagnosis.proposal.not_before}</dd>
            </div>
          </dl>
          <div className="mt-2">
            <p className="mb-1 text-[11px] font-medium text-zinc-500">Why the resolver proposed this</p>
            <ul className="list-disc space-y-0.5 pl-4 text-xs text-zinc-700">
              {diagnosis.proposal.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
          <div className="mt-2">
            <p className="mb-1 text-[11px] font-medium text-zinc-500">Preconditions it recorded</p>
            <ul className="list-disc space-y-0.5 pl-4 text-xs text-zinc-700">
              {diagnosis.proposal.preconditions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </Section>

        <Section title="Missing evidence" description="What the diagnosis could not see. Nothing is inferred to replace it." id="missing">
          <ul className="flex flex-wrap gap-1">
            {diagnosis.diagnosis.missing_evidence.map((item) => (
              <li key={item}>
                <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-zinc-700">{item}</code>
              </li>
            ))}
          </ul>
        </Section>

        <ReplayLedger
          saved={saved}
          capabilities={capabilities}
          pending={false}
          onDecision={() => {}}
          onDryRun={() => {}}
          onRequestReplay={() => {}}
        />
        <CapabilitySummary capabilities={capabilities} />
      </>
    }
    activity={
      <Section title="Investigation activity" description="Durable milestones, in order, from the saved investigation." id="activity">
        <ol className="space-y-2">
          {["proposed", "investigating", "queued"].map((status, index) => (
            <li key={status} className="flex items-baseline gap-3 text-xs">
              <time dateTime={cases[0]!.observed_at} className="shrink-0 font-mono text-[11px] tabular-nums text-zinc-400">
                {`0${index + 1}:0${index + 2}`}
              </time>
              <span className="font-medium text-zinc-800">{status}</span>
            </li>
          ))}
        </ol>
        <div className="mt-3 border-t border-zinc-100 pt-2.5 text-[11px] text-zinc-600">
          <a href="#trace" className="font-medium text-[#b33800] underline underline-offset-2">
            Open investigation trace ↗
          </a>
          <p className="mt-1 font-mono break-all text-zinc-400">Trace 7f4c1a2e-0000-4000-8000-000000000001</p>
          <p className="mt-1">
            Export is best effort; a recorded trace ID does not confirm delivery to the trace service. Trace access
            requires project membership.
          </p>
        </div>
      </Section>
    }
  />
);

const observedRoom = (
  <EvidenceRoom caseId={cases[0]!.case_id} state={{ kind: "ready", evidence }} onReload={() => {}} saved={saved} diagnosis={diagnosis} />
);
const executionRoom = (
  <EvidenceRoom
    caseId={cases[0]!.case_id}
    state={{ kind: "ready", evidence }}
    onReload={() => {}}
    saved={saved}
    diagnosis={diagnosis}
    initialTab="execution"
  />
);
const runbooksRoom = (
  <EvidenceRoom
    caseId={cases[0]!.case_id}
    state={{ kind: "ready", evidence }}
    onReload={() => {}}
    saved={saved}
    diagnosis={diagnosis}
    initialTab="runbooks"
  />
);

const desktop = (
  <div className="flex h-[900px] w-[1440px] flex-col bg-[#fffdf9]">
    <ThreePane index={queue} main={caseFile} aside={observedRoom} />
  </div>
);

const desktopExecution = (
  <div className="flex h-[900px] w-[1440px] flex-col bg-[#fffdf9]">
    <ThreePane
      index={
        <TicketIndex
          title="Support queue"
          count="0/0"
          state={{
            kind: "empty",
            title: "No failures need support",
            detail: "No recent failed workflow case is inside this bounded view. New durable failures appear here on their own.",
          }}
          toTicket={toTicket}
          onSelect={() => {}}
        />
      }
      main={caseFile}
      aside={executionRoom}
    />
  </div>
);

const desktopBlocked = (
  <div className="flex h-[900px] w-[1440px] flex-col bg-[#fffdf9]">
    <ThreePane
      index={
        <TicketIndex
          title="Support queue"
          count="3/4"
          state={{ kind: "ready", rows: cases }}
          toTicket={toTicket}
          onSelect={() => {}}
          selectedCaseId={cases[0]!.case_id}
          filteredEmpty={{ title: "No case matches these filters", detail: "4 cases are loaded.", onClear: () => {} }}
        />
      }
      main={
        <CaseFile
          identity={{ ...identity, status: "Outcome unknown", tone: "waiting" }}
          work={
            <>
              <ReplayLedger
                saved={blockedSaved}
                capabilities={deniedCapabilities}
                pending={false}
                onDecision={() => {}}
                onDryRun={() => {}}
                onRequestReplay={() => {}}
              />
              <CapabilitySummary capabilities={deniedCapabilities} />
            </>
          }
        />
      }
      aside={runbooksRoom}
    />
  </div>
);

const ownerPane = (
  <div className="flex h-[820px] w-[1440px] flex-col bg-[#fffdf9]">
    <ThreePane
      index={
        <TicketIndex
          title="Your failures"
          count={String(ownerFailures.length)}
          state={{ kind: "ready", rows: ownerFailures }}
          toTicket={(failure) => ({
            caseId: failure.caseId,
            zapName: failure.zapName,
            stepLabel: `${failure.stepLabel}${failure.safeCode ? ` · ${failure.safeCode}` : ""}`,
            summary: failure.stepLabel,
            status: failure.status === "awaiting_owner" ? "Needs your fix" : "With support",
            tone: failure.status === "awaiting_owner" ? "waiting" : "neutral",
            observedAt: failure.observedAt,
            safeCode: failure.safeCode,
          })}
          onSelect={() => {}}
          selectedCaseId={ownerFailures[0]!.caseId}
        />
      }
      main={
        <div className="mx-auto w-full max-w-2xl px-4 py-4">
          <div className="mb-3 flex items-center gap-2 text-xs text-zinc-500">
            Edits change how the Zap runs from now on. The original failed run and its evidence are never rewritten.
          </div>
          <StaticRepairPanel />
        </div>
      }
      aside={
        <div className="border-t border-zinc-200 p-4 text-xs text-zinc-600 lg:border-t-0">
          <h2 className="text-[13px] font-semibold text-zinc-900">What happens after you submit</h2>
          <ol className="mt-2 space-y-2">
            <li>Support reviews your change against the original failure evidence.</li>
            <li>
              A submitted repair is an acknowledgement, not a certification: it does not prove the failure is fixed, and
              it does not replay the original run.
            </li>
            <li>The original failed run, its attempts and its fingerprints stay exactly as they were recorded.</li>
          </ol>
        </div>
      }
    />
  </div>
);

/** The owner repair panel reads on mount, so the harness shows its presentation with static content. */
function StaticRepairPanel() {
  return (
    <div className="space-y-5">
      <div className="border-b border-zinc-100 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold tracking-tight text-zinc-900">Meeting reminder</h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              Email (action 1) · failed {new Date(cases[2]!.observed_at).toLocaleString()}
            </p>
          </div>
          <StatusChip status="awaiting_owner" />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800"
          >
            Open Meeting reminder
          </button>
          <span className="rounded-md bg-zinc-100 px-2 py-1 font-mono text-xs text-zinc-600">invalid_action_inputs</span>
        </div>
      </div>

      <Section title="What support asked you to fix" description="Written by a person, not by a model.">
        <p className="text-sm text-zinc-800">Add the email subject in step 1. Nothing else needs to change.</p>
        <p className="mt-2 text-xs text-zinc-600">
          Missing: <span className="font-medium text-zinc-800">Subject</span>
        </p>
      </Section>

      <div className="border-b border-zinc-100 pb-4">
        <h3 className="text-[13px] font-semibold tracking-tight text-zinc-900">Fix the step</h3>
        <p className="mt-0.5 text-xs text-zinc-500">This step needs a fix before it can run again.</p>
        <div className="mt-3 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-zinc-800">To</span>
            <span className="block text-xs text-zinc-500">Required</span>
            <textarea
              rows={1}
              readOnly
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
              value="customer@example.invalid"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-zinc-800">Subject</span>
            <span className="block text-xs text-zinc-500">Required</span>
            <textarea
              rows={1}
              readOnly
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
              value=""
            />
          </label>
          <p className="rounded-lg bg-zinc-50 p-3 text-xs text-zinc-500">
            Credentials such as Bot token are never shown here and are left unchanged.
          </p>
          <p className="text-xs text-amber-700">Fill in Subject before saving.</p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#FF4F00] px-4 py-2.5 text-sm font-semibold text-white opacity-60"
            >
              Save changes
            </button>
            <span className="text-xs text-zinc-500">No unsaved changes</span>
          </div>
        </div>
      </div>

      <div className="border-b border-zinc-100 pb-4">
        <h3 className="text-[13px] font-semibold tracking-tight text-zinc-900">Tell support you are done</h3>
        <p className="mt-0.5 text-xs text-zinc-500">
          Only your own Zap configuration changes. The original failed run and its evidence are kept.
        </p>
        <label className="mt-3 block space-y-1.5">
          <span className="text-sm font-medium text-zinc-800">Note for support</span>
          <span className="block text-xs text-zinc-500">Optional</span>
          <textarea
            rows={3}
            readOnly
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
            value=""
          />
        </label>
        <button
          type="button"
          disabled
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-[#FF4F00] px-4 py-2.5 text-sm font-semibold text-white opacity-60"
        >
          Submit repair completion
        </button>
      </div>
    </div>
  );
}

const engineeringPane = (
  <div className="flex h-[900px] w-[1440px] flex-col bg-[#fffdf9]">
    <ThreePane
      index={
        <TicketIndex
          title="Engineering queue"
          count={String(engineeringCases.length)}
          state={{ kind: "ready", rows: engineeringCases }}
          toTicket={(item) => ({
            caseId: item.case_id,
            summary: `${item.stage === 0 ? "Trigger" : `Action ${item.stage}`} · ${item.safe_code}`,
            status: "With engineering",
            tone: "engineering",
            observedAt: item.observed_at,
            ownerLabel: `Owner ${item.subject_owner_id}`,
            safeCode: item.safe_code,
          })}
          onSelect={() => {}}
          selectedCaseId={engineeringCases[0]!.case_id}
        />
      }
      main={
        <EngineeringWorkspace
          caseId={engineeringCases[0]!.case_id}
          capabilities={{ isSupportOperator: false, isEngineer: true }}
        />
      }
      aside={
        <div className="border-t border-zinc-200 p-4 text-xs text-zinc-600 lg:border-t-0">
          <h2 className="text-[13px] font-semibold text-zinc-900">What this workspace can and cannot do</h2>
          <ul className="mt-2 space-y-2">
            <li>You can record findings and return the case to support, or resolve it with an explanation.</li>
            <li>
              The evidence room reads the captured failure and the attempt ledger. Input validation is not authorized
              for this role.
            </li>
            <li>Replay approval, request and dispatch are support-operator surfaces.</li>
          </ul>
        </div>
      }
    />
  </div>
);

const errors = (
  <div className="flex w-[1440px] flex-col gap-6 bg-[#fffdf9] p-6">
    <div className="rounded-lg border border-zinc-200 bg-white">
      <PaneNotice
        tone="alert"
        title="The support queue could not load"
        detail="Triage service unavailable. Nothing is cached from a previous read."
      />
    </div>
    <div className="rounded-lg border border-zinc-200 bg-white">
      <PaneNotice
        tone="alert"
        title="Support access is required"
        detail="This account cannot open the support queue. Ask an administrator to grant the support operator role."
      />
    </div>
    <div className="rounded-lg border border-zinc-200 bg-white">
      <PaneNotice
        tone="alert"
        title="Evidence access denied"
        detail="Support operator permission required. Reloading will not change this; the permission is checked on every read."
      />
    </div>
    <div className="rounded-lg border border-zinc-200 bg-white">
      <PaneNotice
        title="Application eligibility"
        detail="blocked · replay_limit, ungrounded_candidate — the panel states the policy denial rather than hiding the action."
      />
    </div>
  </div>
);

const mobileList = (
  <div className="flex h-[844px] w-[390px] flex-col bg-[#fffdf9]">
    <TicketIndex
      title="Support queue"
      count="4/4"
      state={{ kind: "ready", rows: cases }}
      toTicket={toTicket}
      onSelect={() => {}}
      search={{ label: "Search cases", placeholder: "Case, run, owner or error code", value: "telegram", onChange: () => {} }}
      collapsedOnNarrow
    />
  </div>
);

const mobileDetail = (
  <div className="flex h-[844px] w-[390px] flex-col bg-[#fffdf9]">
    <div className="min-h-0 flex-1 overflow-y-auto">
      <CaseFile
        identity={identity}
        onBack={() => {}}
        onOpenEvidence={() => {}}
        work={
          <ReplayLedger
            saved={blockedSaved}
            capabilities={deniedCapabilities}
            pending={false}
            onDecision={() => {}}
            onDryRun={() => {}}
            onRequestReplay={() => {}}
          />
        }
      />
    </div>
  </div>
);

const mobileDrawer = (
  <div className="relative h-[844px] w-[390px] overflow-hidden bg-[#fffdf9]">
    <div className="absolute inset-0 flex flex-col justify-end">
      <div className="absolute inset-0 bg-zinc-900/30" />
      <div className="relative flex h-[692px] flex-col overflow-hidden rounded-t-xl border-t border-zinc-200 bg-white">
        <EvidenceRoom
          caseId={cases[0]!.case_id}
          state={{ kind: "ready", evidence }}
          onReload={() => {}}
          onClose={() => {}}
          saved={saved}
          diagnosis={diagnosis}
          initialTab="execution"
        />
      </div>
    </div>
  </div>
);

const mobileOwner = (
  <div className="flex h-[844px] w-[390px] flex-col bg-[#fffdf9]">
    <TicketIndex
      title="Your failures"
      count={String(ownerFailures.length)}
      state={{ kind: "ready", rows: ownerFailures }}
      toTicket={(failure) => ({
        caseId: failure.caseId,
        zapName: failure.zapName,
        stepLabel: `${failure.stepLabel}${failure.safeCode ? ` · ${failure.safeCode}` : ""}`,
        summary: failure.stepLabel,
        status: failure.status === "awaiting_owner" ? "Needs your fix" : "With support",
        tone: failure.status === "awaiting_owner" ? "waiting" : "neutral",
        observedAt: failure.observedAt,
        safeCode: failure.safeCode,
      })}
      onSelect={() => {}}
    />
  </div>
);

const sections: { title: string; note: string; body: string }[] = [
  { title: "Desktop · support workbench, three panes", note: "1440×900", body: renderToStaticMarkup(desktop) },
  { title: "Desktop · empty queue with the execution ledger", note: "1440×900", body: renderToStaticMarkup(desktopExecution) },
  { title: "Desktop · blocked eligibility and terminal unknown", note: "1440×900", body: renderToStaticMarkup(desktopBlocked) },
  { title: "Desktop · owner failures and repair", note: "1440×820", body: renderToStaticMarkup(ownerPane) },
  { title: "Desktop · engineering escalation", note: "1440×900 · evidence loads in the browser only", body: renderToStaticMarkup(engineeringPane) },
  { title: "Empty, error and denied states", note: "1440", body: renderToStaticMarkup(errors) },
  { title: "Mobile · index", note: "390×844", body: renderToStaticMarkup(mobileList) },
  { title: "Mobile · case file and ledger", note: "390×844", body: renderToStaticMarkup(mobileDetail) },
  { title: "Mobile · evidence drawer", note: "390×844", body: renderToStaticMarkup(mobileDrawer) },
  { title: "Mobile · owner failures", note: "390×844", body: renderToStaticMarkup(mobileOwner) },
];

const css = readFileSync(join(root, "tailwind.css"), "utf8");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Phase 16G support surfaces — inspection</title>
<style>${css}</style>
<style>body{margin:0;font-family:var(--font-inter),ui-sans-serif,system-ui,sans-serif;background:#f4f4f5}</style>
</head>
<body>
${sections
  .map(
    (section, index) => `<section id="s${index}" style="margin:24px auto;width:max-content">
  <p style="font:600 12px/1.4 ui-sans-serif;color:#52525b;margin:0 0 6px">${section.title} — ${section.note}</p>
  <div style="box-shadow:0 1px 2px rgba(0,0,0,.08);border:1px solid #e4e4e7;overflow:hidden;background:#fff">${section.body}</div>
</section>`,
  )
  .join("\n")}
</body>
</html>`;

writeFileSync(join(root, "harness.html"), html);
writeFileSync(join(root, "harness-meta.json"), JSON.stringify({ sections: sections.map((s) => s.title) }, null, 2));
console.log(`wrote ${sections.length} sections to .impeccable/review/harness.html`);
