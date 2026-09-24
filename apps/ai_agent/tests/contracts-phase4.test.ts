import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  ActionInputValidationEvidenceSchema,
  ExecutionEvidenceSchema,
  FailureContextEvidenceSchema,
} from "../src/contracts.ts";

const fixture = JSON.parse(
  await readFile(
    join(import.meta.dir, "../../../packages/triage-contracts/fixtures/evidence-contracts.json"),
    "utf8",
  ),
) as { valid: Record<string, unknown>; invalid: Record<string, unknown> };

describe("Phase 4 shared HTTP contracts", () => {
  test("accepts the three versioned bounded evidence DTOs", () => {
    expect(FailureContextEvidenceSchema.parse(fixture.valid.failure_context).type).toBe("failure_context");
    expect(ExecutionEvidenceSchema.parse(fixture.valid.execution_evidence).type).toBe("execution_evidence");
    expect(ActionInputValidationEvidenceSchema.parse(fixture.valid.action_input_validation).type).toBe("action_input_validation");
  });

  test("rejects invalid and secret-bearing remote shapes", () => {
    expect(() => FailureContextEvidenceSchema.parse(fixture.invalid.failure_context)).toThrow();
    expect(() => ExecutionEvidenceSchema.parse(fixture.invalid.execution_evidence)).toThrow();
    expect(() => ActionInputValidationEvidenceSchema.parse(fixture.invalid.action_input_validation)).toThrow();
  });
});
