import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateDiagnosisSubset } from "../src/evaluation/diagnosis-r4.ts";
import { selectD1Subsets } from "../evaluation/d1/select-subsets.ts";

const evaluation = fileURLToPath(new URL("../evaluation/", import.meta.url));
const read = async (path: string) => JSON.parse(await readFile(join(evaluation, path), "utf8"));
const sha256 = async (path: string) =>
  createHash("sha256").update(await readFile(join(evaluation, path))).digest("hex");

describe("D1 subsets", () => {
  test("d1 subsets are disjoint, stratified and frozen", async () => {
    const dev = await read("d1/dev-subset-v1.json");
    const accept = await read("d1/acceptance-subset-v1.json");
    validateDiagnosisSubset(dev.cases);
    validateDiagnosisSubset(accept.cases);

    const devIds = new Set((await read("r4/development-cases-v1.json")).map((c: { id: string }) => c.id));
    const holdoutIds = new Set((await read("r4/holdout/cases-v1.json")).map((c: { id: string }) => c.id));
    const consumed = new Set(
      (await read("r4/holdout/diagnosis-subset-v1.json")).cases.map((c: { id: string }) => c.id),
    );
    for (const item of dev.cases) expect(devIds.has(item.id)).toBe(true);
    for (const item of accept.cases) {
      expect(holdoutIds.has(item.id)).toBe(true);
      expect(consumed.has(item.id)).toBe(false);
    }

    const manifest = await read("d1/subsets-manifest.json");
    expect(manifest.files["dev-subset-v1.json"]).toBe(await sha256("d1/dev-subset-v1.json"));
    expect(manifest.files["acceptance-subset-v1.json"]).toBe(await sha256("d1/acceptance-subset-v1.json"));
  });

  test("selection is deterministic and excludes consumed and safety-cohort cases", async () => {
    const devCases = await read("r4/development-cases-v1.json");
    const holdoutCases = await read("r4/holdout/cases-v1.json");
    const consumed = (await read("r4/holdout/diagnosis-subset-v1.json")).cases.map((c: { id: string }) => c.id);
    const first = selectD1Subsets(devCases, holdoutCases, consumed);
    const second = selectD1Subsets(devCases, holdoutCases, consumed);
    expect(second).toEqual(first);
    expect(first.dev.cases).toEqual((await read("d1/dev-subset-v1.json")).cases);
    expect(first.dev.cases.some((c) => /^s\d/.test(c.id) || /^nm\d/.test(c.id))).toBe(false);
  });
});
