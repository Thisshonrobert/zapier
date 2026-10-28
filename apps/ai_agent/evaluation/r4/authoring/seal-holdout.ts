// R4.1 holdout seal.
//
// Writes holdout/seal.json with raw-byte SHA-256 hashes. It does not update
// protocol.json or the README; those hashes are recorded by hand so the frozen
// protocol keeps its formatting.
//
// Run:
//   bun run apps/ai_agent/evaluation/r4/authoring/seal-holdout.ts
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const repo = join(import.meta.dir, "../../../../..");
const holdoutDir = join(import.meta.dir, "../holdout");
const relative = (path: string) => path.slice(repo.length + 1).replaceAll("\\", "/");

const files = {
  cases: join(holdoutDir, "cases-v1.json"),
  labels: join(holdoutDir, "labels-v2.json"),
  evidence: join(holdoutDir, "evidence-v1.json"),
  review: join(holdoutDir, "review-v1.json"),
  diagnosisSubset: join(holdoutDir, "diagnosis-subset-v1.json"),
  fingerprints: join(holdoutDir, "fingerprints-v1.json"),
  authoringAttestation: join(holdoutDir, "authoring-attestation-v1.json"),
} as const;

const hashes: Record<string, { path: string; hash: string; bytes: number }> = {};
for (const [name, path] of Object.entries(files)) {
  const bytes = await readFile(path);
  hashes[name] = {
    path: relative(path),
    hash: createHash("sha256").update(bytes).digest("hex"),
    bytes: bytes.length,
  };
}

const readJson = async (path: string): Promise<unknown> =>
  JSON.parse(await readFile(path, "utf8"));

const cases = (await readJson(files.cases)) as Array<{ kind: string }>;
const labels = (await readJson(files.labels)) as { cases: unknown[] };
const evidence = (await readJson(files.evidence)) as { cases: unknown[] };
const diagnosis = (await readJson(files.diagnosisSubset)) as { cases: unknown[] };
const fingerprints = (await readJson(files.fingerprints)) as { cases: unknown[] };
const review = (await readJson(files.review)) as {
  verdict: string;
  independence: string;
  kappa?: { kappa?: number; passes?: boolean };
};

const seal = {
  version: 1,
  status: "sealed_before_candidate_freeze",
  sealedAt: new Date().toISOString(),
  hashMethod: "sha256 of raw file bytes",
  corpus: {
    path: "apps/ai_agent/evaluation/r3/corpus-v1.json",
    hash: "45e85c3585607ebfd0e1ebd1f2b068e2fab7c889b1bdd3af3a565f20afcbd440",
  },
  counts: {
    cases: cases.length,
    answerable: cases.filter((item) => item.kind === "answerable").length,
    noMatch: cases.filter((item) => item.kind === "no_match").length,
    labels: labels.cases.length,
    evidence: evidence.cases.length,
    diagnosisSubset: diagnosis.cases.length,
    fingerprints: fingerprints.cases.length,
  },
  files: hashes,
  review: {
    verdict: review.verdict,
    independence: review.independence,
    kappa: review.kappa?.kappa,
    passes: review.kappa?.passes,
  },
  rule:
    "Written before the R4.4 candidate freeze and before any retrieval run on the holdout. Any byte change to a sealed file invalidates the holdout; a label defect discovered after a run consumes it and requires a new sealed holdout.",
};

const sealPath = join(holdoutDir, "seal.json");
const bytes = Buffer.from(JSON.stringify(seal, null, 2) + "\n", "utf8");
await writeFile(sealPath, bytes);
console.log(
  JSON.stringify(
    {
      sealHash: createHash("sha256").update(bytes).digest("hex"),
      sealedAt: seal.sealedAt,
      files: hashes,
    },
    null,
    2,
  ),
);
