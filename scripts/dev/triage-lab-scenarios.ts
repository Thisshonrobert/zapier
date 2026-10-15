import type { DurableFailureEvidence } from "../../apps/worker/execution-store.ts";

export const fakeTelegramToken = "0:triage-lab-fake";
export const fakeEmailKey = "re_triage_lab_fake";
export type LabAction = { type: "telegram" | "email"; metadata: Record<string, string> };
export type LabScenario = { key: string; actions: LabAction[]; failure?: Omit<DurableFailureEvidence, "requiresHuman"> & { stage: number } };
const telegram: LabAction = { type: "telegram", metadata: { channelUserName: "-100123456", message: "[LAB] No external message", botToken: fakeTelegramToken } };
const email: LabAction = { type: "email", metadata: { to: "owner@example.invalid", from: "lab@example.invalid", subject: "[LAB] Simulated email", body: "Lab only" } };
const failure = (provider: "email" | "telegram", safeCode: string, providerOutcome: "rejected" | "unknown" | "not_attempted",
  phase: "send" | "resolve_destination" = "send", providerStatus?: number, retryAfterSeconds?: number) =>
  ({ provider, safeCode, providerOutcome, phase, stage: 0, providerStatus, retryAfterSeconds });

export const labScenarios: LabScenario[] = [
  { key: "telegram-rate-limit", actions: [telegram], failure: failure("telegram", "telegram_http_429", "rejected", "send", 429, 2) },
  { key: "telegram-forbidden", actions: [telegram], failure: failure("telegram", "telegram_http_403", "rejected", "send", 403) },
  { key: "telegram-resolution", actions: [{ type: "telegram", metadata: { ...telegram.metadata, channelUserName: "@lab_missing" } }],
    failure: failure("telegram", "telegram_resolution_rejected", "not_attempted", "resolve_destination", 400) },
  { key: "telegram-transport", actions: [telegram], failure: failure("telegram", "telegram_transport_error", "unknown") },
  { key: "telegram-missing-credentials", actions: [{ type: "telegram", metadata: { ...telegram.metadata, botToken: "" } }],
    failure: failure("telegram", "telegram_credentials_missing", "not_attempted", "resolve_destination") },
  { key: "email-rejection", actions: [email], failure: failure("email", "validation_error", "rejected", "send", 422) },
  { key: "email-transport", actions: [email], failure: failure("email", "email_transport_error", "unknown") },
  { key: "email-missing-subject", actions: [{ type: "email", metadata: { ...email.metadata, subject: "" } }],
    failure: failure("email", "missing_required_field", "rejected", "send", 422) },
  { key: "email-missing-template", actions: [{ type: "email", metadata: { ...email.metadata, subject: "{{missing.subject}}" } }],
    failure: failure("email", "missing_required_field", "rejected", "send", 422) },
  { key: "successful-control", actions: [email, telegram] },
  { key: "multi-stage-failure", actions: [email, telegram], failure: { ...failure("telegram", "telegram_http_403", "rejected", "send", 403), stage: 1 } },
];

export function selectScenarios(key: string): LabScenario[] {
  const selected = key === "all" ? labScenarios : labScenarios.filter(s => s.key === key);
  if (!selected.length) throw new Error("Unknown lab scenario");
  return selected;
}
