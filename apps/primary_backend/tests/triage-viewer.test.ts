import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { TriageViewerService } from "../services/triage-viewer.ts";

function viewerFor(row: { isSupportOperator: boolean; isEngineer: boolean } | undefined) {
  const queries: string[] = [];
  const service = new TriageViewerService({
    $queryRaw: async <T>(query: unknown): Promise<T> => {
      queries.push(String((query as { sql?: string }).sql));
      return (row ? [row] : []) as T;
    },
  });
  return { service, queries };
}

describe("TriageViewerService capabilities", () => {
  test("reports both roles from the authenticated account row", async () => {
    const { service, queries } = viewerFor({ isSupportOperator: true, isEngineer: true });
    assert.deepEqual(await service.readCapabilities(42), { isSupportOperator: true, isEngineer: true });
    assert.equal(queries.length, 1);
    assert.match(queries[0]!, /FROM "User" WHERE id =/);
  });

  test("a broker with no support or engineering permission gets neither capability", async () => {
    const { service } = viewerFor({ isSupportOperator: false, isEngineer: false });
    assert.deepEqual(await service.readCapabilities(9), { isSupportOperator: false, isEngineer: false });
  });

  test("an unknown actor fails closed instead of defaulting to a role", async () => {
    const { service } = viewerFor(undefined);
    assert.deepEqual(await service.readCapabilities(12345), { isSupportOperator: false, isEngineer: false });
  });
});
