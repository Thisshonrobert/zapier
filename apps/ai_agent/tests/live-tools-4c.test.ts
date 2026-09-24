import { describe, expect, test } from "bun:test";

import { BackendValidateActionInputsTool } from "../src/tools/validate-action-inputs.ts";

describe("Phase 4C validation tool", () => {
  test("accepts no model-selected payload or identity", async () => {
    let calls = 0;
    const tool = new BackendValidateActionInputsTool({
      async validateActionInputs() {
        calls++;
        return { type: "action_input_validation" as const };
      },
    });

    expect((await tool.validate()).type).toBe("action_input_validation");
    expect(calls).toBe(1);
  });
});
