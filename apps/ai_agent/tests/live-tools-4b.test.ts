import { describe, expect, test } from "bun:test";

import { BackendExecutionEvidenceTool } from "../src/tools/execution-evidence.ts";

describe("Phase 4B execution-evidence tool", () => {
  test("passes only a bounded history limit to the bound backend client", async () => {
    const seen: number[] = [];
    const backend = {
      async getExecutionEvidence(limit: number) {
        seen.push(limit);
        return { type: "execution_evidence" as const };
      },
    };
    const tool = new BackendExecutionEvidenceTool(backend);

    expect((await tool.get(500)).type).toBe("execution_evidence");
    expect(seen).toEqual([50]);
  });
});
