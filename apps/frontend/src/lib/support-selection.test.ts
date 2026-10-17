import { describe, expect, test } from "bun:test";

import { initialSelection, moveFocus, tabStopIndex } from "./support-selection";
import { ageLabel, caseSummary, executionMark, providerOutcomeLabel, workflowMark } from "./support-copy";

describe("support index keyboard movement", () => {
  const nav = { count: 3, selectedId: "b", focusedIndex: 1 };

  test("moves one row at a time and stops at both ends", () => {
    expect(moveFocus(nav, "next")).toBe(2);
    expect(moveFocus(nav, "previous")).toBe(0);
    expect(moveFocus({ ...nav, focusedIndex: 2 }, "next")).toBe(2);
    expect(moveFocus({ ...nav, focusedIndex: 0 }, "previous")).toBe(0);
  });

  test("Home and End reach the ends", () => {
    expect(moveFocus(nav, "first")).toBe(0);
    expect(moveFocus(nav, "last")).toBe(2);
  });

  test("an out-of-range focus is clamped rather than lost", () => {
    expect(moveFocus({ ...nav, focusedIndex: 99 }, "previous")).toBe(1);
    expect(moveFocus({ ...nav, focusedIndex: -4 }, "next")).toBe(1);
  });

  test("an empty index has no tab stop to move to", () => {
    expect(moveFocus({ count: 0, selectedId: null, focusedIndex: 0 }, "next")).toBe(0);
    expect(tabStopIndex({ count: 0, selectedId: null, focusedIndex: -1, visibleIds: [] })).toBe(-1);
  });

  test("the tab stop falls back to the first row when the selected row is filtered out", () => {
    expect(tabStopIndex({ count: 3, selectedId: "b", focusedIndex: -1, visibleIds: ["a", "b", "c"] })).toBe(1);
    expect(tabStopIndex({ count: 2, selectedId: "z", focusedIndex: -1, visibleIds: ["a", "c"] })).toBe(0);
    expect(tabStopIndex({ count: 2, selectedId: "z", focusedIndex: 1, visibleIds: ["a", "c"] })).toBe(1);
  });

  test("a cold load opens the requested case, else the newest row", () => {
    const rows = [{ caseId: "a" }, { caseId: "b" }];
    expect(initialSelection(rows, "b")).toBe("b");
    expect(initialSelection(rows, "gone")).toBe("a");
    expect(initialSelection([], "a")).toBeNull();
  });
});

describe("support copy states only what was recorded", () => {
  test("provider acceptance is never reported as delivery", () => {
    expect(providerOutcomeLabel("accepted")).toContain("delivery is not confirmed");
    expect(providerOutcomeLabel("rejected")).toBe("Provider rejected the request");
    expect(providerOutcomeLabel(null)).toBe("No provider outcome recorded");
    expect(providerOutcomeLabel("something_new")).toContain("recorded provider outcome");
  });

  test("an unresolved execution state is not presented as an outcome", () => {
    expect(executionMark("SUCCESS").tone).toBe("accepted");
    expect(executionMark("UNKNOWN").tone).toBe("denied");
    expect(executionMark("RUNNING").tone).toBe("active");
    expect(executionMark(null).label).toBe("No execution recorded");
  });

  test("workflow state carries one label and one tone", () => {
    expect(workflowMark("awaiting_owner")).toEqual({ label: "Needs owner fix", tone: "waiting" });
    expect(workflowMark("escalated", "engineering").tone).toBe("engineering");
    expect(workflowMark(undefined, "support")).toEqual({ label: "With support", tone: "neutral" });
    expect(workflowMark("brand_new_state").label).toBe("Brand new state");
  });

  test("a failure row summarises the stage and the recorded provider result", () => {
    expect(caseSummary({ stage: 0, provider_outcome: "rejected", safe_code: null })).toBe("Trigger · rejected");
    expect(caseSummary({ stage: 2, provider_outcome: "rejected", safe_code: "telegram_http_429" })).toBe(
      "Action 2 · telegram_http_429",
    );
    expect(caseSummary({ stage: 1, provider_outcome: null, safe_code: null })).toBe("Action 1 · no provider outcome");
  });

  test("age never claims a time the backend did not record", () => {
    const now = Date.parse("2026-10-17T12:00:00.000Z");
    expect(ageLabel("not-a-date", now)).toBe("time not recorded");
    expect(ageLabel("2026-10-17T11:59:30.000Z", now)).toBe("just now");
    expect(ageLabel("2026-10-17T11:30:00.000Z", now)).toBe("30m");
    expect(ageLabel("2026-10-17T09:00:00.000Z", now)).toBe("3h");
    expect(ageLabel("2026-10-15T12:00:00.000Z", now)).toBe("2d");
  });
});
