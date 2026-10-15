import { test, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

test("case timeline remains visible without the offline evaluation baseline", async () => {
  const subject = await import("./CommandCenter.tsx").catch(() => null);
  expect(subject).not.toBeNull();
  const Panel = subject!.CommandCenterPanel;
  const html = renderToStaticMarkup(<Panel state={{ kind: "ready", data: {
    investigationId: "saved", history: { data: { currentSequence: 4, currentStatus: "approved", truncated: true,
      events: [{ sequence: 4, status: "approved", observedAt: "2026-10-05T00:00:00Z" }] }, unavailable: false },
    evaluation: { data: null, unavailable: true }, trace: null,
  } }} />);
  expect(html).toContain("History is partial");
  expect(html).not.toContain("Evaluation unavailable");
  expect(html).not.toContain("Offline evaluation baseline");
  expect(html).toContain("dateTime=");
  expect(html).toContain("No trace was recorded");
  expect(html).not.toContain("Replay ready");
});

test("loading and error states describe only the investigation timeline", async () => {
  const { CommandCenterPanel } = await import("./CommandCenter.tsx");
  const loading = renderToStaticMarkup(<CommandCenterPanel state={{ kind: "loading" }} />);
  const failed = renderToStaticMarkup(<CommandCenterPanel state={{ kind: "error" }} />);
  expect(loading).not.toContain("evaluation");
  expect(failed).not.toContain("evaluation");
});
