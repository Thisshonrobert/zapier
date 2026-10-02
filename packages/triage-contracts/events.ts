// Only lifecycle labels cross the streaming boundary. Results use the authorized snapshot API.
export const investigationStatuses = ["queued", "investigating", "proposed", "awaiting_approval",
  "blocked", "owner_action_required", "engineering_escalation_required", "resolved_without_replay",
  "approved", "rejected", "expired", "error"] as const;
export type InvestigationEvent = { sequence: number; status: typeof investigationStatuses[number] };

export function parseEventCursor(value: unknown): number | null {
  if (value === undefined) return null;
  if (typeof value !== "string" || !/^(0|[1-9]\d{0,15})$/.test(value) ||
      !Number.isSafeInteger(Number(value))) throw new Error("Invalid event cursor");
  return Number(value);
}

export function sanitizeInvestigationEvent(value: unknown): InvestigationEvent {
  const event = value as InvestigationEvent | null;
  if (!event || !Number.isSafeInteger(event.sequence) || event.sequence < 0 ||
      !investigationStatuses.includes(event.status)) throw new Error("Invalid investigation event");
  return { sequence: event.sequence, status: event.status };
}

export function encodeInvestigationEvent(type: "snapshot" | "milestone", value: InvestigationEvent) {
  const event = sanitizeInvestigationEvent(value);
  return `id: ${event.sequence}\nevent: ${type}\ndata: ${JSON.stringify(event)}\n\n`;
}
