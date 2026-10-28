// D1 Task 0: pre-registered dev and acceptance subsets for diagnosis screening.
// Within each stratum, cases are ordered by sha256(seed + id) and the first N
// are taken. The acceptance subset excludes the 40 cases R4.5 already consumed.
// Run once: bun run apps/ai_agent/evaluation/d1/select-subsets.ts
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { DiagnosisSubsetCase } from "../../src/evaluation/diagnosis-r4.ts";

type Case = { id: string; kind: string };

const families = ["F01", "F02", "F03", "F04", "F05", "F06", "F07", "F08", "F09", "F10"];
const buckets = { missing_guidance: 3, missing_runtime_fact: 3, out_of_scope: 2, adversarial: 2 };

const familyOf = (id: string) => /^f(0[1-9]|10)-/.exec(id)?.[0].slice(0, 3).toUpperCase();
// Only the bucket-named no-match ids carry their bucket; legacy nmNN ids are skipped.
const bucketOf = (id: string) =>
  Object.keys(buckets).find((bucket) => id.startsWith(`nm-${bucket.replaceAll("_", "-")}-`));

function pick(cases: readonly Case[], seed: string): DiagnosisSubsetCase[] {
  const rank = (id: string) => createHash("sha256").update(seed + id).digest("hex");
  const ordered = [...cases].sort((a, b) => rank(a.id).localeCompare(rank(b.id)));
  const answerable = families.flatMap((family) =>
    ordered
      .filter((c) => c.kind === "answerable" && familyOf(c.id) === family)
      .slice(0, 3)
      .map((c) => ({ id: c.id, kind: "answerable" as const, family })),
  );
  const noMatch = Object.entries(buckets).flatMap(([bucket, count]) =>
    ordered
      .filter((c) => c.kind === "no_match" && bucketOf(c.id) === bucket)
      .slice(0, count)
      .map((c) => ({ id: c.id, kind: "no_match" as const, bucket })),
  );
  return [...answerable, ...noMatch];
}

export function selectD1Subsets(
  devCases: readonly Case[],
  holdoutCases: readonly Case[],
  consumedIds: readonly string[],
) {
  const consumed = new Set(consumedIds);
  const subset = (purpose: string, selection: string, cases: DiagnosisSubsetCase[]) => ({
    version: 1 as const, createdAt: "2026-10-26", purpose, selection, cases,
  });
  return {
    dev: subset(
      "D1 development slice for prompt/model screening; may be iterated on.",
      "R4 development cohort; per family F01-F10 and per no-match bucket (3/3/2/2), ascending sha256('d1-dev-v1:' + id).",
      pick(devCases, "d1-dev-v1:"),
    ),
    acceptance: subset(
      "D1 single-run acceptance subset; opened only after the D1 candidate freeze.",
      "R4 sealed holdout minus the 40 R4.5-consumed cases; per family F01-F10 and per no-match bucket (3/3/2/2), ascending sha256('d1-accept-v1:' + id).",
      pick(holdoutCases.filter((c) => !consumed.has(c.id)), "d1-accept-v1:"),
    ),
  };
}

if (import.meta.main) {
  const r4 = join(import.meta.dir, "../r4");
  const read = async (path: string) => JSON.parse(await readFile(join(r4, path), "utf8"));
  const { dev, acceptance } = selectD1Subsets(
    await read("development-cases-v1.json"),
    await read("holdout/cases-v1.json"),
    (await read("holdout/diagnosis-subset-v1.json")).cases.map((c: Case) => c.id),
  );
  const files: Record<string, string> = {};
  for (const [name, value] of [["dev-subset-v1.json", dev], ["acceptance-subset-v1.json", acceptance]] as const) {
    const bytes = JSON.stringify(value, null, 2) + "\n";
    await writeFile(join(import.meta.dir, name), bytes, { flag: "wx" });
    files[name] = createHash("sha256").update(bytes).digest("hex");
  }
  await writeFile(
    join(import.meta.dir, "subsets-manifest.json"),
    JSON.stringify({ version: 1, createdAt: "2026-10-26", hashMethod: "sha256 of raw file bytes", files }, null, 2) + "\n",
    { flag: "wx" },
  );
  console.log(files);
}
