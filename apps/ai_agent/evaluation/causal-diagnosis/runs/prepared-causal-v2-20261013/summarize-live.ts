// Offline audit only. Does not import or invoke a provider adapter.
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
const directory = import.meta.dir;
const root = join(directory, "../../../../../..");
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const load = async (name: string) => JSON.parse(await readFile(join(directory, name), "utf8"));
const jsonHash = (value: unknown) => hash(JSON.stringify(value, null, 2) + "\n");
const plan = await load("plan.json");
const prepared = await load("offline-review-final-2.json");
if (jsonHash(plan) !== prepared.planHash) throw new Error("Plan changed");
for (const [path, expected] of Object.entries(prepared.sourceHashes)) {
  if (hash(await readFile(join(root, path), "utf8")) !== expected) throw new Error(`Source changed: ${path}`);
}
for (const [name, expected] of Object.entries(prepared.frozenV1ArtifactHashes)) {
  if (hash(await readFile(join(directory, "../free-causal-pilot-20261013-v1", name), "utf8")) !== expected) throw new Error(`Frozen v1 artifact changed: ${name}`);
}
const rows = [];
for (let slot = 1; slot <= 6; slot++) {
  const row = await load(`result-${slot}.json`);
  const attempt = await load(`attempt-${slot}.json`);
  if (JSON.stringify(attempt.output) !== JSON.stringify(row.output)) throw new Error("Initial output changed");
  const pair = plan.pairs[Math.floor((slot - 1) / 2)];
  const order = Math.floor((slot - 1) / 2) % 2 === 0 ? ["current", "candidate"] : ["candidate", "current"];
  const variant = order[(slot - 1) % 2];
  if (row.caseId !== pair.caseId || row.variant !== variant || row.promptHash !== jsonHash(pair[variant]) ||
      row.retrievalHash !== jsonHash(pair.retrieval) || row.settingsHash !== jsonHash(plan.settings) ||
      pair.current.input !== pair.candidate.input) throw new Error("Pair parity changed");
  if (row.failure || row.usage.total_tokens > 64_000 || row.usage.output_tokens > 4096) throw new Error("Incomplete or over-budget comparison");
  rows.push(row);
}
const events = (await readFile(join(directory, "requests.jsonl"), "utf8")).trim().split("\n").map(line => JSON.parse(line));
const starts = events.filter(e => e.phase === "start");
const generations = starts.filter(e => e.operation === "generateContent");
const preflights = starts.filter(e => e.operation === "countTokens");
const finishes = events.filter(e => e.phase === "finish");
if (starts.length !== 12 || generations.length !== 6 || preflights.length !== 6 || finishes.length !== 12 ||
    finishes.some(e => e.status !== 200) || starts.some(e => !finishes.some(f => f.requestId === e.requestId))) throw new Error("Unexpected provider request allocation");
const gaps = generations.slice(1).map((e, i) => e.at - generations[i]!.at);
if (gaps.some(gap => gap < 10_000)) throw new Error("Generation spacing violated");
const files = ["plan.json", "access.json", "execution-authorization.json", "requests.jsonl", "report.json",
  ...rows.flatMap((_row, i) => [`started-${i + 1}.json`, `attempt-${i + 1}.json`, `result-${i + 1}.json`])];
const artifactHashes: Record<string, string> = {};
for (const name of files) artifactHashes[name] = hash(await readFile(join(directory, name), "utf8"));
const record = {
  status: "complete_semantic_gate_failed", recordedAt: new Date().toISOString(),
  model: plan.settings.model, planHash: prepared.planHash, codeRevision: prepared.codeRevision,
  sourceHashes: prepared.sourceHashes, frozenV1Unchanged: true, artifactHashes,
  generationRequests: generations.length, tokenPreflights: preflights.length, totalProviderRequests: starts.length,
  providerFailures: 0, allHttpStatuses: finishes.map(e => e.status), generationStartGapsMs: gaps,
  providerElapsedMs: finishes.at(-1)!.at - starts[0]!.at,
  usage: rows.reduce((acc, r) => ({ inputTokens: acc.inputTokens + r.usage.input_tokens,
    outputTokens: acc.outputTokens + r.usage.output_tokens, totalTokens: acc.totalTokens + r.usage.total_tokens }),
    { inputTokens: 0, outputTokens: 0, totalTokens: 0 }),
  cost: { estimatedGenerationUsd: 0, billedUsd: null, basis: "User-authorized reuse of the same previously confirmed free-tier key/project/model; billing not independently reverified" },
  allPairsIdenticalExceptInstructions: true, initialOutputsPreserved: true,
  candidateReview: [
    { caseId: rows[1]!.caseId, slot: 2, meetsRequirement: false,
      delivery: "Preserves known rejection", correction: "Unsupported destination correction: no independent defect finding",
      decision: "Address unsupported repair before any retrieval experiment" },
    { caseId: rows[2]!.caseId, slot: 3, meetsRequirement: true,
      correction: "Bounded correction cites fixture:failure:f04-invalid-destination and explicitly attributes defect to destination_format_invalid observation",
      replay: "No replay proposal or replacement value invented" },
    { caseId: rows[5]!.caseId, slot: 6, meetsRequirement: true,
      delivery: "abstained + outcome_unknown + escalate", replay: "No replay proposal or inferred non-delivery" },
  ],
  semanticReview: "Direct agent review with variant names visible; one sample each, not blinded or statistical validation",
  candidateFrozenForRetrieval: false, retrievalExperimentsStarted: false,
  recommendation: "Resolve error-to-defect conflation in the ambiguous case before changing retrieval. Existing local reranker remains the first bounded retrieval candidate after the diagnosis gate passes; HyDE/PageIndex require demonstrated vocabulary/navigation gaps.",
};
await writeFile(join(directory, "execution-manifest.json"), JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ status: record.status, generationRequests: 6, tokenPreflights: 6, generationStartGapsMs: gaps, usage: record.usage, candidateFrozenForRetrieval: false }));
