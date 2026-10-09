import { readFile, mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadR2Corpus } from "./retrieval-r2.ts";
import { hash } from "./retrieval-r21.ts";
import { eligibleR25 } from "./r25-analysis.ts";
import { rowsAtR24 } from "./r24-analysis.ts";
import { createFixtureTools, fixtureInput } from "./fixture-tools.ts";
import { EvaluationCaseSchema, checkEvaluationObservation, type CapturedEvaluationContext } from "./checks.ts";
import { buildDiagnosisService, retrievalInput, RunbookMatchSchema } from "../graph.ts";
import { IntegratedModelOutputSchema } from "../contracts.ts";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const json = async (p: string) => JSON.parse(await readFile(p, "utf8"));
async function main() {
  const directory = join(root, "apps/ai_agent/evaluation/r25");
  const frozen = await json(join(directory, "method-freeze.json"));
  if (frozen.method !== "minilm-original") throw new Error("This downstream control covers only the selected original MiniLM method");
  for (const [p, expected] of Object.entries(frozen.sourceHashes)) if (
    createHash("sha256").update(await readFile(new URL(p, import.meta.url))).digest("hex") !== expected
  ) throw new Error("Frozen method source changed");
  const index = await loadR2Corpus();
  if (hash(index.map(({ headingTerms, contentTerms, ...s }) => s)) !== frozen.corpusHash) throw new Error("Frozen corpus changed");
  const baselineInputs = await json(join(root, "apps/ai_agent/evaluation/r2/results/inputs.json"));
  const baselineReport = await json(join(root, "apps/ai_agent/evaluation/r2/results/report.json"));
  const historical = baselineReport.diagnosis.downstream.find((r: { variant: string }) => r.variant === "hybrid-reranked");
  const cases = baselineInputs.diagnosisCases.map((c: unknown) => EvaluationCaseSchema.parse(c));
  const adapters = cases.map((c: ReturnType<typeof EvaluationCaseSchema.parse>) => createFixtureTools(fixtureInput(c), index, "2026-10-07T00:00:00.000Z"));
  const queries = adapters.map((a: ReturnType<typeof createFixtureTools>, i: number) => {
    const input = retrievalInput(a.bundle), id = `diagnosis-${cases[i].case_id}`;
    const prior = baselineInputs.queries.find((q: { id: string }) => q.id === id);
    if (!prior || hash({ ...input, id }) !== hash({ query: prior.query, providers: prior.providers, limit: 3, id })) throw new Error("Actual graph retrieval query changed");
    const candidates = eligibleR25(index, input);
    return { id, query: input.query, candidates: candidates.map(s => s.citation), passages: Object.fromEntries(candidates.map(s => [s.citation, `${s.heading}\n${s.content}`])) };
  });
  const input = { config: frozen.config, queries, freezeHash: hash(frozen) }, inputHash = hash(input);
  const out = join(directory, "runs/downstream-contract-v1"); await mkdir(out);
  const save = (name: string, value: unknown) => writeFile(join(out, name), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
  await save("inference-inputs.json", { ...input, inputHash });
  execFileSync("node", ["--experimental-transform-types", fileURLToPath(new URL("./r25-models.mjs", import.meta.url)), join(out, "inference-inputs.json"), join(out, "scores.json")], { cwd: root, stdio: "inherit", timeout: 600000 });
  const capture = await json(join(out, "scores.json"));
  if (capture.inputHash !== inputHash) throw new Error("Downstream score provenance changed");
  const rows = [];
  for (let i = 0; i < cases.length; i++) {
    const item = cases[i], adapter = adapters[i], q = queries[i];
    const returned = rowsAtR24([{ split: item.split, relevant: [], candidates: q.candidates, logits: capture.records[q.id].logits, latencyMs: capture.records[q.id].rerankMs }], frozen.config.cutoff)[0]!.returned;
    const matches = returned.map(c => {
      const s = index.find(s => s.citation === c)!;
      return RunbookMatchSchema.parse({ runbookId: s.id, version: s.version, citation: c, heading: s.heading, content: s.content, contentHash: s.contentHash,
        taxonomy: s.taxonomy, providers: s.providers, simulated: true, authority: "untrusted_procedural_guidance", canChangePolicy: false,
        score: 1 / (1 + Math.exp(-capture.records[q.id].logits[c])) });
    });
    const recorded = historical.cases.find((c: { id: string }) => c.id === item.case_id).observation.result;
    const { not_before, ...proposal } = recorded.proposal;
    const output = IntegratedModelOutputSchema.parse({ status: recorded.status, diagnosis: recorded.diagnosis,
      proposal: { ...proposal, runbook_citations: returned } });
    let calls = 0;
    const result = await buildDiagnosisService({ ...adapter.tools, searchRunbooks: input => {
      if (hash(input) !== hash(retrievalInput(adapter.bundle))) throw new Error("Graph query does not match scored input");
      return matches;
    } }, { close: async () => {}, generate: async () => {
      calls++; return { output, usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 } };
    } }, { modelName: "recorded-output contract replay", allowSimulatedEvidence: true, maxRepairAttempts: 0 }).diagnose();
    const context: CapturedEvaluationContext = { context_version: 1, case_id: item.case_id, evidence: adapter.bundle,
      retrieval: { input: { query: q.query, providers: retrievalInput(adapter.bundle).providers ? [...retrievalInput(adapter.bundle).providers!] : undefined, limit: 3 }, matches },
      rejection: null, failure: null };
    const observation = { case_id: item.case_id, result, model_invocations: calls, usage: null, cost_usd: 0, latency_ms: 0 };
    const checked = checkEvaluationObservation(item, observation, returned, context, "advisory-v2");
    rows.push({ id: item.case_id, context, observation, checked });
  }
  const passed = rows.every(r => r.checked.schemaValid && r.checked.safetyIssues.length === 0);
  await save("report.json", { mode: "offline recorded-output contract replay with refreshed citations", inputHash, freezeHash: hash(frozen),
    scoresHash: hash(capture), historicalInputsHash: hash(baselineInputs), historicalReportHash: hash(baselineReport),
    sourceHash: createHash("sha256").update(await readFile(fileURLToPath(import.meta.url))).digest("hex"), rows, passed,
    externalModelCalls: 0, productionReady: false,
    limitations: ["Recorded diagnosis outputs are replayed with new citation arrays; this verifies contract integration and safety routing, not model adaptation to new excerpts or semantic diagnosis quality.",
      "All tools and cases are simulated. No action provider, workflow write, approval or replay operation exists in this control."] });
  console.log(JSON.stringify({ cases: rows.length, contractAndSafetyPassed: passed, externalModelCalls: 0 }));
  if (!passed) throw new Error("Downstream contract or safety regression");
}
if (import.meta.main) await main();
