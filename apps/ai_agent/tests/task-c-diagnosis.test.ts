import { expect, test } from "bun:test";
import { buildTaskCSchedule } from "../src/evaluation/task-c-diagnosis.ts";

test("Task C schedules each of 12 incidents three times in a two-arm, 72-attempt bound", () => {
  const ids = Array.from({ length: 12 }, (_, i) => `case-${i}`);
  const rows = buildTaskCSchedule(ids);
  expect(rows).toHaveLength(72);
  expect(new Set(rows.map(row => row.slot)).size).toBe(72);
  for (const id of ids) for (const arm of ["keyword-production", "minilm-procedure-question"])
    expect(rows.filter(row => row.caseId === id && row.arm === arm)).toHaveLength(3);
  expect(rows.every(row => row.state === "unavailable_not_dispatched")).toBe(true);
  expect(() => buildTaskCSchedule(ids.slice(1))).toThrow("Exactly 12");
});
