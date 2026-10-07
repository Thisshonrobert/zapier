import { test, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

test("timeline and evaluation failures are independently accessible and never imply replay readiness", async () => {
  const subject = await import("./CommandCenter.tsx").catch(() => null);
  expect(subject).not.toBeNull();
  const Panel = subject!.CommandCenterPanel;
  const html = renderToStaticMarkup(<Panel state={{ kind: "ready", data: {
    investigationId: "saved", history: { data: { currentSequence: 4, currentStatus: "approved", truncated: true,
      events: [{ sequence: 4, status: "approved", observedAt: "2026-10-05T00:00:00Z" }] }, unavailable: false },
    evaluation: { data: null, unavailable: true }, trace: null,
  } }} />);
  expect(html).toContain("History is partial");
  expect(html).toContain("Evaluation unavailable");
  expect(html).toContain("dateTime=");
  expect(html).toContain("No trace was recorded");
  expect(html).not.toContain("Replay ready");
});
