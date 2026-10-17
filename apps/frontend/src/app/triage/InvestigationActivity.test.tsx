import { test, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { InvestigationActivity } from "@/mycomponents/support/SupportWorkbench";

/**
 * The activity panel reads the command-center projection. These cases pin the honesty rules:
 * a missing evaluation baseline is not a failure the operator needs to see, a partial history
 * announces its bound, and a missing trace is reported rather than implied.
 */
test("investigation activity keeps its timeline without an offline evaluation baseline", () => {
  const html = renderToStaticMarkup(
    <InvestigationActivity
      state={{
        kind: "ready",
        data: {
          investigationId: "saved",
          history: {
            data: {
              currentSequence: 4,
              currentStatus: "approved",
              truncated: true,
              events: [{ sequence: 4, status: "approved", observedAt: "2026-10-05T00:00:00Z" }],
            },
            unavailable: false,
          },
          evaluation: { data: null, unavailable: true },
          trace: null,
        },
      }}
    />,
  );
  expect(html).toContain("History is partial");
  expect(html).toContain("dateTime=");
  expect(html).toContain("No trace was recorded");
  expect(html).not.toContain("Evaluation unavailable");
  expect(html).not.toContain("Offline evaluation baseline");
  expect(html).not.toContain("Replay ready");
});

test("loading and error states describe only the investigation timeline", () => {
  const loading = renderToStaticMarkup(<InvestigationActivity state={{ kind: "loading" }} />);
  const failed = renderToStaticMarkup(<InvestigationActivity state={{ kind: "error" }} />);
  expect(loading).toContain("Loading the investigation timeline");
  expect(failed).toContain("Timeline unavailable");
  for (const html of [loading, failed]) {
    expect(html).not.toContain("Evaluation");
    expect(html).not.toContain("evaluation");
  }
});

test("no activity panel is rendered before a case has an investigation", () => {
  expect(renderToStaticMarkup(<InvestigationActivity state={null} />)).toBe("");
});
