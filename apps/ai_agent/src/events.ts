import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import type { Response } from "express";
import { encodeInvestigationEvent } from "../../../packages/triage-contracts/events.ts";
import type { InvestigationStore } from "./investigation-store.ts";

export async function writeEvent(response: Response, frame: string, signal: AbortSignal) {
  signal.throwIfAborted();
  if (!response.write(frame)) {
    // Bound stalled consumers; do not keep fetching and queueing history while the socket is full.
    await once(response, "drain", { signal: AbortSignal.any([signal, AbortSignal.timeout(5_000)]) });
  }
}

export async function streamInvestigationEvents(input: {
  response: Response; store: Pick<InvestigationStore, "events">; id: string; caseId: string;
  ownerId: number; cursor: number | null; signal: AbortSignal; expiresAt: number;
}) {
  const remainingMs = input.expiresAt - Date.now();
  if (remainingMs <= 0) return;
  const signal = AbortSignal.any([input.signal, AbortSignal.timeout(remainingMs)]);
  let cursor = input.cursor;
  let heartbeatAt = Date.now() + 10_000;
  while (Date.now() < input.expiresAt) {
    signal.throwIfAborted();
    const batch = await input.store.events(input.id, input.caseId, input.ownerId, cursor);
    if (batch.snapshot) {
      await writeEvent(input.response, encodeInvestigationEvent("snapshot", batch.snapshot), signal);
      cursor = batch.snapshot.sequence;
    }
    for (const event of batch.events) {
      await writeEvent(input.response, encodeInvestigationEvent("milestone", event), signal);
      cursor = event.sequence;
    }
    if (Date.now() >= heartbeatAt) {
      await writeEvent(input.response, ": heartbeat\n\n", signal);
      heartbeatAt = Date.now() + 10_000;
    }
    if (batch.events.length === 64) continue;
    await delay(Math.min(1_000, Math.max(1, input.expiresAt - Date.now())), undefined, { signal });
  }
}
