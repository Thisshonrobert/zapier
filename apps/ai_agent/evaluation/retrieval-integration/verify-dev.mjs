// Production corpus + saved development questions only. No fresh scenarios,
// held-out rows, Gemini calls, service credentials or network inference.
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { createRunbookRetriever } from "../../src/tools/runbook-retriever.ts";
import { loadRunbooks, searchRunbooks } from "../../src/tools/search-runbooks.ts";
import { defaultRunbookDirectory } from "../../src/paths.ts";
import { loadR2Corpus } from "../../src/evaluation/retrieval-r2.ts";
import { hash } from "../../src/evaluation/retrieval-r21.ts";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const read = async name => JSON.parse(await readFile(resolve(root, name), "utf8"));
const dev = "apps/ai_agent/evaluation/intent-dev/runs/intent-v3/";
const benchmark = await read(dev + "benchmark.json");
const inputs = await read(dev + "inference-inputs.json");
const capture = await read(dev + "scores.json");
const prior = await read(dev + "report.json");
const { inputHash, ...unhashed } = inputs;
if (hash(unhashed) !== inputHash || capture.inputHash !== inputHash ||
    prior.inputHash !== inputHash || prior.scoresHash !== hash(capture) ||
    inputs.datasetHash !== hash(benchmark)) throw new Error("Frozen development provenance mismatch");
const index = await loadRunbooks(defaultRunbookDirectory());
const started = performance.now();
const retriever = await createRunbookRetriever(index, {
  RUNBOOK_RETRIEVAL_METHOD: "minilm-original",
  RUNBOOK_MINILM_CACHE_DIR: resolve(process.argv[2] ?? resolve(root, ".tmp-turbo-user/r2-models")),
});
const loadMs = performance.now() - started;
const frozenIndex = await loadR2Corpus();
let frozenRetriever;
const rows = [];
try {
  frozenRetriever = await createRunbookRetriever(frozenIndex, {
    RUNBOOK_RETRIEVAL_METHOD: "minilm-original",
    RUNBOOK_MINILM_CACHE_DIR: resolve(process.argv[2] ?? resolve(root, ".tmp-turbo-user/r2-models")),
  });
  for (const q of benchmark.queries) {
    if (q.split !== "development") throw new Error("Only development questions are allowed");
    const saved = inputs.queries.find(i => i.id === `${q.id}:baseline`);
    const logits = capture.records[saved?.id]?.logits;
    if (!saved || !logits) throw new Error("Missing frozen baseline scores");
    for (const s of index) {
      if (saved.passages[s.citation] !== `${s.heading}\n${s.content}`) throw new Error("Production passage differs from frozen passage");
    }
    const start = performance.now();
    const matches = await retriever.search(q);
    const latencyMs = performance.now() - start;
    // Same original query, same passages, same logits: restrict saved ranking to
    // the six-document production corpus before applying the fixed cutoff/top3.
    const expected = index.map(s => ({ citation: s.citation, score: 1 / (1 + Math.exp(-logits[s.citation])) }))
      .filter(r => r.score >= 0.001)
      .sort((a,b) => b.score - a.score || a.citation.localeCompare(b.citation)).slice(0,3);
    const returned = matches.map(r => r.citation);
    const frozenMatches = await frozenRetriever.search(q);
    const frozenExpected = saved.candidates.map(citation => ({ citation, score: 1 / (1 + Math.exp(-logits[citation])) }))
      .filter(r => r.score >= 0.001).sort((a,b) => b.score-a.score || a.citation.localeCompare(b.citation)).slice(0,3);
    if (hash(frozenMatches.map(r => r.citation)) !== hash(frozenExpected.map(r => r.citation)) ||
        frozenMatches.some((r,i) => Math.abs(r.score - frozenExpected[i].score) > 1e-5))
      throw new Error(`Runtime/frozen corpus score mismatch: ${q.id}`);
    rows.push({ id: q.id, relevant: q.relevantCitations, returned,
      keyword: searchRunbooks(index,q).map(r => r.citation), latencyMs, frozenParity: true,
      restrictedSavedRankingMatches: hash(returned) === hash(expected.map(r => r.citation)),
      maximumReturnedScoreDrift: Math.max(0,...matches.map(r => Math.abs(r.score - 1/(1+Math.exp(-logits[r.citation]))))) });
  }
} finally { await retriever.close(); await frozenRetriever?.close(); }
const metrics = method => {
  const positive = rows.filter(r => r.relevant.length), negative = rows.filter(r => !r.relevant.length);
  return { positiveCount: positive.length, recallAt3: positive.reduce((sum,r) => sum + r.relevant.filter(c => r[method].includes(c)).length/r.relevant.length,0)/positive.length,
    noMatchCount: negative.length, noMatchAbstentions: negative.filter(r => !r[method].length).length };
};
const report = { version: "retrieval-integration-dev-v1", createdAt: new Date().toISOString(),
  corpusDocuments: new Set(index.map(s => s.id)).size, corpusSections: index.length,
  benchmarkHash: hash(benchmark), savedInputHash: inputs.inputHash, captureHash: hash(capture),
  modelLoadMs: loadMs, externalCalls: 0, defaultMethod: "keyword", model: "minilm-original",
  target: 0.8, keyword: metrics("keyword"), minilm: metrics("returned"),
  frozenParityCount: rows.filter(r => r.frozenParity).length,
  restrictedSavedRankingMatchCount: rows.filter(r => r.restrictedSavedRankingMatches).length,
  maximumReturnedScoreDrift: Math.max(...rows.map(r => r.maximumReturnedScoreDrift)),
  meanLatencyMs: rows.reduce((sum,r) => sum+r.latencyMs,0)/rows.length, rows,
  limitations: ["Repeated synthetic development questions; does not establish independent 80% acceptance.",
    "Uses production runbook loader and runtime scorer, but standalone questions rather than incident evidence queries.",
    "Frozen parity uses the original 60-section corpus; production uses 54. Different padded batches can change q8 scores.",
    "No downstream LLM comparison or fresh held-out evaluation performed."] };
const output = resolve(root,"apps/ai_agent/evaluation/retrieval-integration/runs/dev-v2");
await mkdir(output,{ recursive:true });
await writeFile(resolve(output,"report.json"),JSON.stringify(report,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({ ...report, rows: undefined, limitations: undefined }));
