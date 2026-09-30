import { randomUUID } from "node:crypto";
import { Prisma } from "../../../packages/db/generated/prisma/client.ts";
import type { SqlClient } from "./investigation-authority.ts";

// Phase 9C must prove recovery and provider rejection semantics before changing this gate.
export const REPLAY_RELEASE_READY = false;
export const liveReplayEnabled = () => REPLAY_RELEASE_READY && process.env.REPLAY_ENABLED === "true";

type Sink = { send(message: { key: string; value: string }): Promise<void> };
type DispatchRow = { requestId: string; zapRunId: string; stage: number; dispatchAttempts: number };

export function createReplayDispatcher(db: SqlClient, sink: Sink,
  options: { enabled?: boolean; now?: () => Date } = {}) {
  const now = options.now ?? (() => new Date());
  return { async dispatchOne() {
    if (!(options.enabled ?? liveReplayEnabled())) return false;
    const token = randomUUID(), at = now();
    const [row] = await db.$queryRaw<DispatchRow[]>(Prisma.sql`
      WITH candidate AS (
        SELECT execution."requestId" FROM "ReplayExecution" execution
        JOIN "ReplayRequest" request ON request.id = execution."requestId"
        WHERE execution.status = 'RESERVED' AND execution."publishedAt" IS NULL
          AND request."notBefore" <= ${at} AND request."expiresAt" > ${at}
          AND (execution."dispatchLeaseUntil" IS NULL OR execution."dispatchLeaseUntil" <= ${at})
          AND (execution."nextDispatchAt" IS NULL OR execution."nextDispatchAt" <= ${at})
        ORDER BY request."createdAt", request.id LIMIT 1 FOR UPDATE OF execution SKIP LOCKED
      )
      UPDATE "ReplayExecution" execution SET "dispatchToken" = ${token},
        "dispatchLeaseUntil" = ${new Date(at.getTime() + 120_000)},
        "dispatchAttempts" = execution."dispatchAttempts" + 1
      FROM candidate, "ReplayRequest" request
      WHERE execution."requestId" = candidate."requestId" AND request.id = execution."requestId"
      RETURNING execution."requestId", request."zapRunId", request.stage, execution."dispatchAttempts"`);
    if (!row) return false;
    try {
      await sink.send({ key: row.zapRunId, value: JSON.stringify({ zapRunId: row.zapRunId,
        stage: row.stage, replayRequestId: row.requestId }) });
    } catch {
      await db.$executeRaw(Prisma.sql`UPDATE "ReplayExecution" SET "dispatchToken" = NULL,
        "dispatchLeaseUntil" = NULL, "nextDispatchAt" = ${new Date(now().getTime() + Math.min(60_000, 1000 * 2 ** Math.min(row.dispatchAttempts, 6)))}
        WHERE "requestId" = ${row.requestId} AND "dispatchToken" = ${token}`);
      return true;
    }
    // A persistence failure after broker ACK leaves the same identity available after lease expiry.
    await db.$executeRaw(Prisma.sql`UPDATE "ReplayExecution" SET "publishedAt" = ${now()},
      "dispatchToken" = NULL, "dispatchLeaseUntil" = NULL, "nextDispatchAt" = NULL
      WHERE "requestId" = ${row.requestId} AND "dispatchToken" = ${token}`);
    return true;
  } };
}
