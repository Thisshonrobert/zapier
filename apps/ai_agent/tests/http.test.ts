import { afterEach, describe, expect, test } from "bun:test";

import type { DiagnosisModel } from "../src/contracts.ts";
import type { PreviewOptions } from "../src/graph.ts";
import { createHttpServer, type RunningHttpServer } from "../src/http.ts";
import { defaultFixtureDirectory } from "../src/paths.ts";
import { TaxonomyFixtureModel } from "./test-model.ts";

let running: RunningHttpServer | undefined;

afterEach(async () => {
  await running?.close();
  running = undefined;
});

async function start(
  model: DiagnosisModel = new TaxonomyFixtureModel(),
  previewOptions?: PreviewOptions,
) {
  running = await createHttpServer({
    fixtureDirectory: defaultFixtureDirectory(),
    model,
    previewOptions,
  }).start(0);
  return { model, baseUrl: running.baseUrl };
}

describe("preview HTTP API", () => {
  test("returns a validated investigation", async () => {
    const { baseUrl } = await start();
    const response = await fetch(`${baseUrl}/investigations/preview`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fixture_id: "telegram-rate-limit" }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      diagnosis: { taxonomy_id: string };
    };
    expect(body.diagnosis.taxonomy_id).toBe("F01");
  });

  test("rejects unknown fields and path-like fixture IDs", async () => {
    const { baseUrl } = await start();
    for (const body of [
      { fixture_id: "telegram-rate-limit", unsafe: true },
      { fixture_id: "../../README" },
    ]) {
      const response = await fetch(`${baseUrl}/investigations/preview`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      expect(response.status).toBe(422);
    }
  });

  test("maps an unknown fixture to 404", async () => {
    const { baseUrl } = await start();
    const response = await fetch(`${baseUrl}/investigations/preview`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fixture_id: "missing-fixture" }),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ detail: "Fixture not found" });
  });

  test("closes the injected model when the server stops", async () => {
    const model = new TaxonomyFixtureModel();
    await start(model);
    expect(model.closed).toBe(false);

    await running!.close();
    running = undefined;

    expect(model.closed).toBe(true);
  });

  test("returns bounded JSON for malformed and oversized request bodies", async () => {
    const { baseUrl } = await start();

    const malformed = await fetch(`${baseUrl}/investigations/preview`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: '{"fixture_id":',
    });
    expect(malformed.status).toBe(400);
    expect(await malformed.json()).toEqual({ detail: "Malformed JSON" });

    const oversized = await fetch(`${baseUrl}/investigations/preview`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fixture_id: "x".repeat(17_000) }),
    });
    expect(oversized.status).toBe(413);
    expect(await oversized.json()).toEqual({
      detail: "Request body too large",
    });
  });

  test("maps the full investigation deadline to 504", async () => {
    const model: DiagnosisModel = {
      diagnose: async () => {
        await Bun.sleep(30);
        return {};
      },
      close: async () => {},
    };
    const { baseUrl } = await start(model, {
      investigationTimeoutMs: 1,
      modelTimeoutMs: 100,
    });

    const response = await fetch(`${baseUrl}/investigations/preview`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fixture_id: "telegram-rate-limit" }),
    });

    expect(response.status).toBe(504);
    expect(await response.json()).toEqual({
      detail: "Investigation timed out",
    });
  });
});
