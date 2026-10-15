import { expect, test } from "bun:test";
import { assertSupervisorIdentity } from "./triage-lab-lifecycle.ts";
import { labResources } from "./triage-lab-config.ts";
import { parsePipelineFlags, reconcileIngestion } from "./triage-lab-pipeline.ts";

test("pipeline identity cannot reuse a lifecycle-only supervisor", () => {
  const marker = { version: 1, database: "triage_lab", labId: "a".repeat(32), resourceFingerprint: "test", ...labResources("a".repeat(32)) };
  expect(() => assertSupervisorIdentity({ marker, mode: "pipeline-simulated" }, marker)).not.toThrow();
  expect(() => assertSupervisorIdentity({ marker, mode: "lifecycle-only" }, marker)).toThrow();
  expect(() => assertSupervisorIdentity({ marker, mode: "lifecycle-only" }, marker, true)).not.toThrow();
  expect(() => assertSupervisorIdentity({ marker: { ...marker, labId: "b".repeat(32) }, mode: "lifecycle-only" }, marker, true)).toThrow();
});

test("pipeline CLI rejects unknown flags and requires an explicit verification batch", () => {
  expect(parsePipelineFlags("run", ["--scenario", "telegram-rate-limit", "--batch", "abc_123"])).toEqual({ scenario: "telegram-rate-limit", batch: "abc_123", timeout: 90000 });
  expect(() => parsePipelineFlags("verify", [])).toThrow();
  expect(() => parsePipelineFlags("run", ["--scenario", "absent"])).toThrow();
  expect(() => parsePipelineFlags("run", ["--batch", "../ordinary"])).toThrow();
  expect(() => parsePipelineFlags("run", ["--timeout-ms", "0"])).toThrow();
  expect(() => parsePipelineFlags("run", ["--batch", "a", "--batch", "b"])).toThrow();
});

test("partial reruns bind an already ingested run and never blindly post again", () => {
  expect(reconcileIngestion("reserved", [])).toBe("POST");
  expect(reconcileIngestion("posting", [{ id: "captured" }])).toBe("captured");
  expect(() => reconcileIngestion("posting", [])).toThrow("ambiguous");
  expect(() => reconcileIngestion("posted", [{ id: "a" }, { id: "b" }])).toThrow("Duplicate");
});
