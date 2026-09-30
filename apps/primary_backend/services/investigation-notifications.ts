import { Prisma } from "../../../packages/db/generated/prisma/client.ts";
import type { SqlClient } from "./investigation-authority.ts";

export type PendingDecision = { decisionId: string; investigationId: string;
  caseId: string; subjectOwnerId: number; decision: string };

export class InvestigationNotifications {
  constructor(private readonly db: SqlClient,
    private readonly notify: (decision: PendingDecision) => Promise<void>) {}

  async deliver(decisionId: string): Promise<boolean> {
    const [pending] = await this.db.$queryRaw<PendingDecision[]>(Prisma.sql`
      SELECT "decisionId", "investigationId", "caseId", "subjectOwnerId", decision
      FROM "TriageDecisionNotification"
      WHERE "decisionId" = ${decisionId} AND "deliveredAt" IS NULL
    `);
    if (!pending) return true;
    try {
      await this.notify(pending);
      await this.db.$executeRaw(Prisma.sql`
        UPDATE "TriageDecisionNotification" SET "deliveredAt" = now()
        WHERE "decisionId" = ${decisionId} AND "deliveredAt" IS NULL
      `);
      return true;
    } catch {
      await this.db.$executeRaw(Prisma.sql`
        UPDATE "TriageDecisionNotification"
        SET "nextAttemptAt" = now() + interval '10 seconds'
        WHERE "decisionId" = ${decisionId} AND "deliveredAt" IS NULL
      `);
      return false;
    }
  }

  async drain(): Promise<number> {
    const pending = await this.db.$queryRaw<PendingDecision[]>(Prisma.sql`
      SELECT "decisionId", "investigationId", "caseId", "subjectOwnerId", decision
      FROM "TriageDecisionNotification"
      WHERE "deliveredAt" IS NULL AND "nextAttemptAt" <= now()
      ORDER BY "createdAt" LIMIT 20
    `);
    let delivered = 0;
    for (const row of pending) if (await this.deliver(row.decisionId)) delivered++;
    return delivered;
  }
}
