import { Prisma } from "../../../packages/db/generated/prisma/client.ts";
import type { ViewerCapabilities } from "../../../packages/triage-contracts/capabilities.ts";

export type ViewerCapabilitiesDb = {
  $queryRaw<T = unknown>(query: unknown): Promise<T>;
};

/**
 * Reads the authenticated viewer's own role capabilities.
 *
 * This is the only role-aware surface the browser is given, and it answers with two
 * booleans about the caller. It never lists roles, users or owners, and it never
 * accepts a role from the client: the actor id comes from the verified bearer token.
 * A missing row (or an unknown id) fails closed with both capabilities false.
 */
export class TriageViewerService {
  constructor(private readonly db: ViewerCapabilitiesDb) {}

  async readCapabilities(actorId: number): Promise<ViewerCapabilities> {
    const rows = await this.db.$queryRaw<{ isSupportOperator: boolean; isEngineer: boolean }[]>(Prisma.sql`
      SELECT "isSupportOperator", "isEngineer" FROM "User" WHERE id = ${actorId}
    `);
    const row = rows[0];
    return {
      isSupportOperator: row?.isSupportOperator === true,
      isEngineer: row?.isEngineer === true,
    };
  }
}
