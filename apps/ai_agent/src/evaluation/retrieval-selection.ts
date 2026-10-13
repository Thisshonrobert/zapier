import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { z } from "zod";
import { retrievalInput } from "../graph.ts";
import { loadRunbooks, searchRunbooks, type RunbookIndex } from "../tools/search-runbooks.ts";
import { CapturedEvaluationContextSchema, EvaluationCaseSchema } from "./checks.ts";
import { eligibleR25 } from "./r25-analysis.ts";
import { intentMetrics } from "./retrieval-intent.ts";
import { rankR2, validateScores, type Scores } from "./retrieval-r2.ts";
import { diagnoseR23 } from "./r23-analysis.ts";
import { hash as canonicalHash } from "./retrieval-r21.ts";
import { ControlledFixtureEvidenceSchema } from "../contracts.ts";
import { cpus, totalmem } from "node:os";

const InputSchema = z.object({
  query: z.string().min(1).max(500), providers: z.array(z.string()).optional(),
  taxonomy: z.array(z.string()).optional(), limit: z.literal(3).optional(),
}).strict();
export const SelectionCaseSchema = z.object({
  id: z.string().min(1), kind: z.enum(["answerable", "no_match", "corpus_gap"]), input: InputSchema,
  answerSets: z.array(z.array(z.string().min(1)).min(1).max(3)),
  supporting: z.array(z.string()), missingRuntimeFacts: z.array(z.string()),
  direct: z.array(z.string()).optional(),
}).strict();
export type SelectionCase = z.infer<typeof SelectionCaseSchema>;
const OutputSchema = z.union([
  z.object({ id: z.string(), returned: z.array(z.string()).max(3), latencyMs: z.number().finite().nonnegative() }).strict(),
  z.object({ id: z.string(), error: z.string().min(1) }).strict(),
]);
type SelectionOutput = z.infer<typeof OutputSchema>;
const fraction = (numerator: number, denominator: number) => ({
  numerator, denominator, rate: denominator ? numerator / denominator : null,
});

export function verifyProvenance(expected: Record<string, string>, actual: Record<string, string>) {
  if (!Object.keys(expected).length || Object.keys(expected).length !== Object.keys(actual).length ||
    Object.entries(expected).some(([path, digest]) => actual[path] !== digest))
    throw new Error("Benchmark provenance changed");
}

export const selectionArms = ["keyword", "bm25", "semantic", "hybrid", "hybrid-reranked", "minilm-original"] as const;
export function productionQueryVariant(input: import("../tools/search-runbooks.ts").RunbookSearchInput,
  variant: "normalized-observations" | "procedure-question") {
  searchRunbooks([], input);
  const query = variant === "normalized-observations" ? input.query.replaceAll("_", " ") :
    `What incident-specific procedure applies to this observed failure? ${input.query}`;
  const revised = { ...input, query };
  searchRunbooks([], revised); // Reject overlong evidence instead of silently changing the comparison.
  return revised;
}
type SelectionArm = (typeof selectionArms)[number];
type MatrixRecord = {
  semantic?: Scores; hybridLogits?: Scores; originalLogits?: Scores;
  embeddingMs?: number; hybridMs?: number; originalMs?: number;
};
export const developmentCutoffs = [0, .00001, .0001, .001, .01, .05, .1, .3, .5, .7, .9] as const;
export function evaluateSelectionMatrix(index: RunbookIndex, rawCases: readonly SelectionCase[], records: Record<string, MatrixRecord>) {
  const cases = SelectionCaseSchema.array().parse(rawCases);
  if (!cases.some(c => c.kind === "no_match")) throw new Error("Matrix requires an adjudicated no-match cohort");
  if (!cases.some(c => c.kind === "answerable")) throw new Error("Matrix requires answerable incidents");
  // Validate labels/output IDs before any ranking. Missing scores remain unavailable.
  scoreSelection(index, cases, []);
  const candidates = selectionArms.flatMap(method => {
    const cutoffs = method === "hybrid-reranked" ? developmentCutoffs : [method === "minilm-original" ? .001 : 0];
    return cutoffs.map(cutoff => {
      const captures: { id: string; matches?: ReturnType<typeof rankSelectionArm>; error?: string; latencyMs?: number }[] = [];
      const outputs: SelectionOutput[] = cases.map(c => {
        try {
          const record = records[c.id];
          const started = performance.now();
          let inferenceMs = 0;
          const semantic = record?.semantic ?? {};
          const logits = (method === "minilm-original" ? record?.originalLogits : record?.hybridLogits) ?? {};
          if (method !== "keyword" && method !== "bm25") {
            if (method !== "minilm-original") validateScores(semantic, index.map(s => s.citation));
            if (method === "hybrid-reranked") {
              const candidates = rankR2(index, c.input, "hybrid", semantic, {}, { semantic: .2, rerank: 0 }, 12);
              validateScores(logits, candidates.map(m => m.citation), -Number.MAX_VALUE, Number.MAX_VALUE);
            }
            const time = method === "minilm-original" ? record?.originalMs :
              method === "hybrid-reranked" ? (record?.embeddingMs ?? NaN) + (record?.hybridMs ?? NaN) : record?.embeddingMs;
            if (time === undefined || !Number.isFinite(time) || time < 0) throw new Error("Missing inference timing");
            inferenceMs = time;
          }
          const matches = rankSelectionArm(index, c.input, method, { semantic, logits }, cutoff);
          const latencyMs = performance.now() - started + inferenceMs;
          captures.push({ id: c.id, matches, latencyMs });
          return { id: c.id, returned: matches.map(m => m.citation), latencyMs };
        } catch (error) {
          const message = error instanceof Error ? error.message : "scoring_unavailable";
          captures.push({ id: c.id, error: message });
          return { id: c.id, error: message };
        }
      });
      return { method, cutoff, captures, report: scoreSelection(index, cases, outputs) };
    });
  });
  return { candidates, decision: selectDevelopmentFinalist(candidates) };
}
export function rankSelectionArm(index: RunbookIndex, input: SelectionCase["input"], arm: SelectionArm,
  scores: { semantic: Scores; logits: Scores }, cutoff = .001) {
  if (arm === "keyword") return searchRunbooks(index, input);
  if (arm === "minilm-original") {
    const eligible = eligibleR25(index, input);
    const ranked = diagnoseR23([], eligible.map(s => s.citation), scores.logits);
    return ranked.returned.map(citation => {
      const s = eligible.find(s => s.citation === citation)!;
      return { runbookId: s.id, version: s.version, citation, heading: s.heading, content: s.content,
        contentHash: s.contentHash, taxonomy: s.taxonomy, providers: s.providers, simulated: true as const,
        authority: "untrusted_procedural_guidance" as const, canChangePolicy: false as const,
        score: ranked.ranking.find(r => r.citation === citation)!.score };
    });
  }
  const rerank = Object.fromEntries(Object.entries(scores.logits).map(([c, logit]) => [c, 1 / (1 + Math.exp(-logit))]));
  return rankR2(index, input, arm, scores.semantic, rerank, { semantic: .2, rerank: cutoff });
}

type DevelopmentCandidate = { method: string; cutoff: number; report: ReturnType<typeof scoreSelection> };
export function selectDevelopmentFinalist(candidates: DevelopmentCandidate[]) {
  const keyword = candidates.find(c => c.method === "keyword");
  const baselinePrecision = keyword?.report.metrics.precisionAt3 ?? 0;
  const evaluated = candidates.map(c => {
    const r = c.report;
    const failures = [
      !keyword && "keyword_comparator_missing",
      (r.metrics.recallAt3 === null || r.metrics.recallAt3 < .8) && "recall",
      (r.noMatchAbstention.rate === null || r.noMatchAbstention.rate < .9) && "no_match_abstention",
      (r.falseAbstention.rate === null || r.falseAbstention.rate > .05) && "false_abstention",
      (r.metrics.precisionAt3 === null || r.metrics.precisionAt3 < baselinePrecision) && "direct_precision_regression",
      (r.reliability.rate === null || r.reliability.rate < .95) && "reliability",
      (r.latency.p95Ms == null || r.latency.p95Ms > 3000) && "latency",
    ].filter(Boolean);
    return { ...c, failures };
  });
  const feasible = evaluated.filter(c => !c.failures.length).sort((a, b) => {
    const worst = (c: DevelopmentCandidate) => Math.min(...c.report.rows.filter(r => r.eligibleAnswerable).map(r => r.sectionRecall ?? 0));
    return worst(b) - worst(a) || (b.report.metrics.precisionAt3 ?? 0) - (a.report.metrics.precisionAt3 ?? 0) ||
      (b.report.metrics.recallAt3 ?? 0) - (a.report.metrics.recallAt3 ?? 0) ||
      selectionArms.indexOf(a.method as SelectionArm) - selectionArms.indexOf(b.method as SelectionArm) || a.cutoff - b.cutoff;
  });
  return { finalist: feasible[0] ?? null, feasible: feasible.slice(0, 2), evaluated,
    status: feasible.length ? "development_finalist_not_release_accepted" : "no_candidate_passes" };
}

export function scoreSelection(index: RunbookIndex, rawCases: readonly SelectionCase[], rawOutputs: readonly SelectionOutput[]) {
  const cases = SelectionCaseSchema.array().parse(rawCases);
  const outputs = OutputSchema.array().parse(rawOutputs);
  if (new Set(cases.map(c => c.id)).size !== cases.length ||
    new Set(outputs.map(o => o.id)).size !== outputs.length ||
    outputs.some(o => !cases.some(c => c.id === o.id))) throw new Error("Duplicate or unknown case output");
  const rows = cases.map(c => {
    if ((c.kind !== "answerable") !== (c.answerSets.length === 0)) throw new Error("Invalid no-match/corpus-gap labels");
    const directLabels = c.direct ?? c.answerSets.flat();
    const labels = [...c.answerSets.flat(), ...c.supporting, ...directLabels];
    if (labels.some(citation => !index.some(s => s.citation === citation)) ||
      c.answerSets.some(set => new Set(set).size !== set.length) ||
      new Set(c.supporting).size !== c.supporting.length ||
      c.supporting.some(citation => directLabels.includes(citation)) ||
      c.answerSets.flat().some(citation => !directLabels.includes(citation)) ||
      (c.kind !== "answerable" && directLabels.length > 0)) throw new Error("Invalid section labels");
    const eligible = new Set(eligibleR25(index, c.input).map(s => s.citation));
    const feasible = c.answerSets.filter(set => set.every(citation => eligible.has(citation)));
    const output = outputs.find(o => o.id === c.id);
    const available = Boolean(output && "returned" in output);
    const returned = output && "returned" in output ? output.returned : [];
    if (new Set(returned).size !== returned.length || returned.some(citation => !eligible.has(citation)))
      throw new Error("Duplicate, fabricated or ineligible output citation");
    // Each set is a sufficient alternative; never flatten alternatives into mandatory answers.
    const rankedSets = feasible.map(set => ({ set, recall: set.filter(citation => returned.includes(citation)).length / set.length }))
      .sort((a, b) => b.recall - a.recall);
    const relevant = rankedSets[0]?.set ?? [];
    const direct = new Set(directLabels.filter(citation => eligible.has(citation)));
    return {
      id: c.id, kind: c.kind, available, returned, relevant,
      eligibleAnswerable: c.kind === "answerable" && feasible.length > 0,
      providerExcluded: c.kind === "answerable" && feasible.length === 0,
      sectionRecall: rankedSets[0]?.recall ?? null,
      sufficientAnswer: rankedSets.some(s => s.recall === 1),
      directPrecision: returned.length ? returned.filter(citation => direct.has(citation)).length / returned.length : 0,
      supportingHits: returned.filter(citation => c.supporting.includes(citation)).length,
      latencyMs: output && "latencyMs" in output ? output.latencyMs : null,
      missingRuntimeFacts: c.missingRuntimeFacts,
      failure: available ? null : output && "error" in output ? output.error : "missing_output",
    };
  });
  const positives = rows.filter(r => r.eligibleAnswerable);
  const negatives = rows.filter(r => r.kind === "no_match");
  // Reuse macro recall/MRR; failed positives remain scheduled with zero coverage.
  // Abstention and latency need separate accounting: unavailable is never a successful no-match.
  const base = intentMetrics(positives.map(r => ({ relevant: r.relevant, returned: r.returned, latencyMs: r.latencyMs ?? 0 })));
  const times = rows.flatMap(r => r.latencyMs === null ? [] : [r.latencyMs]).sort((a, b) => a - b);
  return {
    rows,
    counts: { scheduled: rows.length, eligibleAnswerable: positives.length, noMatch: negatives.length,
      corpusGaps: rows.filter(r => r.kind === "corpus_gap").length,
      providerExcluded: rows.filter(r => r.providerExcluded).length, unavailable: rows.filter(r => !r.available).length },
    metrics: { recallAt3: base.recallAt3, mrr: base.mrr,
      precisionAt3: fraction(positives.reduce((sum, r) => sum + r.directPrecision, 0), positives.length).rate },
    recall: { macroSection: fraction(positives.reduce((sum, r) => sum + (r.sectionRecall ?? 0), 0), positives.length),
      sufficientAnswers: fraction(positives.filter(r => r.sufficientAnswer).length, positives.length) },
    noMatchAbstention: fraction(negatives.filter(r => r.available && !r.returned.length).length, negatives.length),
    falseAbstention: fraction(positives.filter(r => r.available && !r.returned.length).length, positives.length),
    reliability: fraction(rows.filter(r => r.available).length, rows.length),
    allIncidentCoverage: fraction(rows.filter(r => r.sufficientAnswer || (r.kind === "no_match" && r.available && !r.returned.length)).length, rows.length),
    latency: { measured: times.length, p95Ms: times.length ? times[Math.ceil(times.length * .95) - 1] : null },
  };
}

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const base = "apps/ai_agent/evaluation/production-selection";
const historical = "apps/ai_agent/evaluation/phase-11a-baseline-v6";
const json = (value: unknown) => JSON.stringify(value, null, 2) + "\n";
const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

export async function prepareSelection(output: string) {
  const out = resolve(root, output);
  const rel = relative(root, out).replaceAll("\\", "/");
  if (isAbsolute(rel) || !rel.startsWith(`${base}/runs/`) || rel === `${base}/runs/`) throw new Error("Use a new production-selection run directory");
  const paths = [
    `${base}/protocol.json`, `${historical}/cases.json`, `${historical}/contexts.json`,
    "apps/ai_agent/src/graph.ts", "apps/ai_agent/src/runner.ts", "apps/ai_agent/src/prompts.ts",
    "apps/ai_agent/src/gemini-model.ts", "apps/ai_agent/src/index.ts", "apps/ai_agent/src/tools/search-runbooks.ts",
    "apps/ai_agent/src/tools/runbook-retriever.ts", "apps/ai_agent/src/tools/minilm-process.mjs",
    "apps/ai_agent/src/evaluation/retrieval-selection.ts", "apps/ai_agent/src/evaluation/retrieval-intent.ts",
    "apps/ai_agent/src/evaluation/retrieval-r21.ts", "apps/ai_agent/src/evaluation/r25-analysis.ts",
    "apps/ai_agent/src/evaluation/checks.ts", "apps/ai_agent/src/contracts.ts", "apps/ai_agent/package.json", "bun.lock",
    ...["transient-provider-failure", "credentials-and-destinations", "template-and-registry-validation", "uncertain-delivery", "replay-and-stale-cases", "evidence-gaps"].map(name => `docs/AI/runbooks/${name}.md`),
  ];
  const inputHashes = Object.fromEntries(await Promise.all(paths.map(async path => [path, hash(await readFile(join(root, path)))])));
  const contexts = CapturedEvaluationContextSchema.array().parse(JSON.parse(await readFile(join(root, historical, "contexts.json"), "utf8")));
  const cases = EvaluationCaseSchema.array().parse(JSON.parse(await readFile(join(root, historical, "cases.json"), "utf8")));
  if (cases.some(c => c.split !== "development") || new Set(cases.map(c => c.case_id)).size !== cases.length ||
    contexts.length !== cases.length || new Set(contexts.map(c => c.case_id)).size !== contexts.length ||
    contexts.some(c => !cases.some(item => item.case_id === c.case_id))) throw new Error("Incomplete development capture");
  const index = await loadRunbooks(join(root, "docs/AI/runbooks"));
  const capture = contexts.map(context => {
    const item = cases.find(c => c.case_id === context.case_id)!;
    if (!context.evidence) return { id: context.case_id, rejection: context.rejection, failure: context.failure };
    const input = retrievalInput(context.evidence);
    if (json(input) !== json(context.retrieval?.input)) throw new Error(`Production query drift: ${context.case_id}`);
    return { id: context.case_id, input, evidence: context.evidence, missingRuntimeFacts: item.missing_evidence,
      eligibleCitations: eligibleR25(index, input).map(s => s.citation) };
  });
  // Label review covers the entire corpus, with access marked explicitly, before scores are exposed.
  const reviewPacket = capture.filter(c => "input" in c).map(c => ({ ...c,
    task: "Return the guidance needed for a bounded read-only investigation of this observed incident.",
    sections: index.map(s => ({ citation: s.citation, heading: s.heading, content: s.content,
      contentHash: s.contentHash, eligible: c.eligibleCitations?.includes(s.citation) })),
  }));
  const baseline = capture.filter(c => "input" in c).map(c => {
    const start = performance.now();
    const matches = searchRunbooks(index, c.input!);
    return { id: c.id, input: c.input, returned: matches.map(m => m.citation), matches, latencyMs: performance.now() - start,
      stage: "pending_label_adjudication", missingRuntimeFacts: c.missingRuntimeFacts };
  });
  const git = (args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  const snapshot = { head: git(["rev-parse", "HEAD"]), branch: git(["branch", "--show-current"]),
    status: git(["status", "--porcelain=v1", "--untracked-files=all"]), trackedDiffSha256: hash(git(["diff", "HEAD", "--no-ext-diff"])) };
  // Check all inputs again before writing a frozen run. Never overwrite historical/new runs.
  verifyProvenance(inputHashes, Object.fromEntries(await Promise.all(paths.map(async path => [path, hash(await readFile(join(root, path)))]))));
  await mkdir(resolve(out, ".."), { recursive: true });
  await mkdir(out);
  const save = (name: string, data: unknown) => writeFile(join(out, name), json(data), { flag: "wx" });
  const corpus = index.map(({ headingTerms, contentTerms, ...s }) => s);
  const artifacts = {
    "development-inputs.json": capture, "corpus.json": corpus,
    "review-packet.json": reviewPacket,
    "label-rationales-template.json": { status: "pending_human_adjudication", reviewer: "", packetHash: hash(json(reviewPacket)),
      cases: reviewPacket.map(c => ({ id: c.id, kind: null, answerSets: [], missingRuntimeFacts: c.missingRuntimeFacts,
        sections: c.sections.map(s => ({ citation: s.citation, relevance: null, rationale: "" })) })) },
    "keyword-capture.json": baseline,
  };
  for (const [name, data] of Object.entries(artifacts)) await save(name, data);
  await save("manifest.json", { version: 1, createdAt: new Date().toISOString(), snapshot, inputHashes,
    corpusHash: hash(json(corpus)), artifactHashes: Object.fromEntries(Object.entries(artifacts).map(([name, data]) => [name, hash(json(data))])),
    status: "prepared_not_accepted", labelStatus: "pending_human_adjudication", servingMethod: "keyword",
    controls: capture.filter(c => !("input" in c)), calls: 0, costUsd: 0,
    hardware: { platform: process.platform, architecture: process.arch, bun: Bun.version },
  });
  console.log(`Prepared ${reviewPacket.length} development incidents, ${index.length} sections, ${capture.length - reviewPacket.length} rejection controls. Labels pending; no selection decision. ${rel}`);
}

const models = {
  embedding: { id: "Xenova/all-MiniLM-L6-v2", revision: "751bff37182d3f1213fa05d7196b954e230abad9", dtype: "q8" },
  reranker: { id: "Xenova/ms-marco-MiniLM-L-6-v2", revision: "a09144355adeed5f58c8ed011d209bf8ee5a1fec", dtype: "q8" },
};
const reviewCaseSchema = SelectionCaseSchema.extend({
  evidence: ControlledFixtureEvidenceSchema, direct: z.array(z.string()),
  task: z.string().min(1), scenarioFamily: z.string().min(1), origin: z.enum(["exposed_development", "new_development_no_match", "new_development_control"]),
  rationale: z.string().min(1),
  sectionReviews: z.array(z.object({ citation: z.string(), relevance: z.enum(["direct", "supporting", "irrelevant"]), rationale: z.string().min(1) }).passthrough()),
}).passthrough();
const reviewSchema = z.object({
  version: z.literal(1), status: z.literal("agent_adjudicated_development"), reviewer: z.string().min(1),
  authority: z.string().min(1), sourcePacketSha256: z.string(), corpusHash: z.string(),
  scopeDefinition: z.string().min(1), cases: z.array(reviewCaseSchema).min(2),
}).passthrough();
const selectionOnly = (c: z.infer<typeof reviewCaseSchema>): SelectionCase => ({
  id: c.id, kind: c.kind, input: c.input, answerSets: c.answerSets, direct: c.direct,
  supporting: c.supporting, missingRuntimeFacts: c.missingRuntimeFacts,
});
const matrixSources = [
  "apps/ai_agent/src/evaluation/retrieval-selection.ts", "apps/ai_agent/src/evaluation/retrieval-r2.ts",
  "apps/ai_agent/src/evaluation/retrieval-r21.ts", "apps/ai_agent/src/evaluation/retrieval-intent.ts",
  "apps/ai_agent/src/evaluation/r23-analysis.ts", "apps/ai_agent/src/evaluation/r25-analysis.ts",
  "apps/ai_agent/src/evaluation/r21-models.mjs", "apps/ai_agent/src/evaluation/r23-models.mjs",
  "apps/ai_agent/src/graph.ts", "apps/ai_agent/src/contracts.ts", "apps/ai_agent/src/tools/search-runbooks.ts",
  "apps/ai_agent/src/tools/minilm-process.mjs",
  "apps/ai_agent/package.json", "bun.lock",
];
const hashPaths = async (paths: string[]) => Object.fromEntries(await Promise.all(paths.map(async path => [path, hash(await readFile(join(root, path)))])));

export async function prepareMatrix(output: string, reviewPath: string) {
  const out = resolve(root, output), rel = relative(root, out).replaceAll("\\", "/");
  if (isAbsolute(rel) || !rel.startsWith(`${base}/runs/`)) throw new Error("Use a new selection run directory");
  const originalRun = join(root, base, "runs/task-a-20261013-v1");
  const packetBytes = await readFile(join(originalRun, "review-packet.json"));
  const corpusBytes = await readFile(join(originalRun, "corpus.json"));
  const packet = JSON.parse(packetBytes.toString()) as { id: string; evidence: unknown; input: SelectionCase["input"] }[];
  const reviewBytes = await readFile(resolve(root, reviewPath));
  const review = reviewSchema.parse(JSON.parse(reviewBytes.toString()));
  if (review.sourcePacketSha256 !== hash(packetBytes) || review.corpusHash !== hash(corpusBytes)) throw new Error("Review provenance mismatch");
  const index = await loadRunbooks(join(root, "docs/AI/runbooks"));
  const corpus = index.map(({ headingTerms, contentTerms, ...s }) => s);
  if (hash(json(corpus)) !== hash(corpusBytes)) throw new Error("Deployment corpus changed; re-review required");
  if (new Set(review.cases.map(c => c.id)).size !== review.cases.length || packet.some(p => !review.cases.some(c => c.id === p.id))) throw new Error("Incomplete/duplicate reviewed cohort");
  for (const c of review.cases) {
    if (json(retrievalInput(c.evidence)) !== json(c.input)) throw new Error(`Production query mismatch: ${c.id}`);
    const original = packet.find(p => p.id === c.id);
    if (c.origin === "exposed_development" && (!original || json(c.evidence) !== json(original.evidence) || json(c.input) !== json(original.input))) throw new Error(`Original incident changed: ${c.id}`);
    const reviews = c.sectionReviews;
    if (reviews.length !== index.length || new Set(reviews.map(s => s.citation)).size !== index.length || reviews.some(s => !index.some(item => item.citation === s.citation))) throw new Error(`Incomplete section review: ${c.id}`);
    for (const label of ["direct", "supporting"] as const) {
      if (canonicalHash([...c[label]].sort()) !== canonicalHash(reviews.filter(s => s.relevance === label).map(s => s.citation).sort())) throw new Error(`Relevance mismatch: ${c.id}`);
    }
  }
  const cases = review.cases.map(selectionOnly);
  scoreSelection(index, cases, []);
  if (!cases.some(c => c.kind === "no_match")) throw new Error("Adjudicated no-match cohort required");
  const config = { models, semanticThreshold: .2, candidateLimit: 12,
    rerankThresholds: developmentCutoffs, originalCutoff: .001, batchSize: 8, maxLength: 512,
    scope: "scope-revision-v2", stochasticArms: 0, optionalPilots: 0, interventions: 0 };
  const modelPaths = Object.values(models).flatMap(m => ["config.json", "tokenizer.json", "tokenizer_config.json", "onnx/model_quantized.onnx"].map(file => `.tmp-turbo-user/r2-models/${m.id}/${m.revision}/${file}`));
  const modelFileHashes = await hashPaths(modelPaths);
  const originalAssets: Record<string, string> = {
    "config.json": "d827779a72d27ae68cf878a6fc2e954542663fe21ca515d9f4783fc96be2d37e",
    "tokenizer.json": "d241a60d5e8f04cc1b2b3e9ef7a4921b27bf526d9f6050ab90f9267a1f9e5c66",
    "tokenizer_config.json": "0b29c7bfc889e53b36d9dd3e686dd4300f6525110eaa98c76a5dafceb2029f53",
    "onnx/model_quantized.onnx": "e9d8ebf845c413e981c175bfe49a3bfa9b3dcce2a3ba54875ee5df5a58639fbe",
  };
  for (const [file, expected] of Object.entries(originalAssets)) {
    if (modelFileHashes[`.tmp-turbo-user/r2-models/${models.reranker.id}/${models.reranker.revision}/${file}`] !== expected) throw new Error("Original MiniLM model bytes changed");
  }
  const inputPaths = [...matrixSources, reviewPath, `${base}/protocol.json`, `${base}/scope-revision-v2.json`];
  const inputHashes = await hashPaths(inputPaths);
  const hybridInput = { config, corpus: index.map(s => ({ ...s, headingTerms: [...s.headingTerms], contentTerms: [...s.contentTerms] })),
    queries: cases.map(c => ({ id: c.id, ...c.input })) };
  const originalInput = { config: { ...config, variants: ["original"] },
    queries: cases.map(c => {
      const eligible = eligibleR25(index, c.input);
      return { id: c.id, query: c.input.query, candidates: eligible.map(s => s.citation),
        passages: { original: Object.fromEntries(eligible.map(s => [s.citation, `${s.heading}\n${s.content}`])) } };
    }) };
  const artifacts = {
    "benchmark.json": review, "config.json": config,
    "inference-hybrid.json": { ...hybridInput, inputHash: canonicalHash(hybridInput) },
    "inference-original.json": { ...originalInput, inputHash: canonicalHash(originalInput) },
  };
  verifyProvenance(inputHashes, await hashPaths(inputPaths));
  await mkdir(resolve(out, ".."), { recursive: true });
  await mkdir(out);
  for (const [name, data] of Object.entries(artifacts)) await writeFile(join(out, name), json(data), { flag: "wx" });
  await writeFile(join(out, "freeze.json"), json({ version: 2, createdAt: new Date().toISOString(), inputHashes, modelFileHashes,
    artifactHashes: Object.fromEntries(Object.entries(artifacts).map(([name, data]) => [name, hash(json(data))])),
    corpusHash: hash(corpusBytes), reviewHash: hash(reviewBytes), hybridInputHash: canonicalHash(hybridInput), originalInputHash: canonicalHash(originalInput),
    configHash: canonicalHash(config), originalConfigHash: canonicalHash(originalInput.config),
    hardware: { cpu: cpus()[0]?.model, cores: cpus().length, memoryBytes: totalmem(), platform: process.platform, architecture: process.arch, bun: Bun.version },
    productionReady: false, calls: 0, costUsd: 0,
  }), { flag: "wx" });
  console.log(`Frozen development matrix: ${cases.length} cases, ${cases.filter(c => c.kind === "no_match").length} no-match. ${rel}`);
}

export async function reportMatrix(directory: string) {
  const out = resolve(root, directory), rel = relative(root, out).replaceAll("\\", "/");
  if (isAbsolute(rel) || !rel.startsWith(`${base}/runs/`)) throw new Error("Invalid selection directory");
  const read = async (name: string) => JSON.parse(await readFile(join(out, name), "utf8"));
  const frozen = await read("freeze.json");
  verifyProvenance(frozen.inputHashes, await hashPaths(Object.keys(frozen.inputHashes)));
  verifyProvenance(frozen.modelFileHashes, await hashPaths(Object.keys(frozen.modelFileHashes)));
  for (const [name, expected] of Object.entries(frozen.artifactHashes)) if (hash(await readFile(join(out, name))) !== expected) throw new Error(`Frozen artifact changed: ${name}`);
  const review = reviewSchema.parse(await read("benchmark.json"));
  const index = await loadRunbooks(join(root, "docs/AI/runbooks"));
  if (hash(json(index.map(({ headingTerms, contentTerms, ...s }) => s))) !== frozen.corpusHash) throw new Error("Corpus drift");
  const hybrid = await read("scores-hybrid.json"), original = await read("scores-original.json");
  if (hybrid.inputHash !== frozen.hybridInputHash || original.inputHash !== frozen.originalInputHash ||
    hybrid.configHash !== frozen.configHash || original.configHash !== frozen.originalConfigHash ||
    canonicalHash(hybrid.models) !== canonicalHash(models) || canonicalHash(original.models) !== canonicalHash(models)) throw new Error("Inference provenance mismatch");
  const cases = review.cases.map(selectionOnly);
  for (const capture of [hybrid, original]) if (Object.keys(capture.records).length !== cases.length || Object.keys(capture.records).some(id => !cases.some(c => c.id === id))) throw new Error("Incomplete/unknown inference cohort");
  const records: Record<string, MatrixRecord> = Object.fromEntries(cases.map(c => {
    const h = hybrid.records[c.id], o = original.records[c.id]?.original;
    const candidates = rankR2(index, c.input, "hybrid", h.semantic, {}, { semantic: .2, rerank: 0 }, 12).map(m => m.citation);
    if (canonicalHash(candidates) !== canonicalHash(h.candidates)) throw new Error(`Candidate drift: ${c.id}`);
    return [c.id, { semantic: h.semantic, hybridLogits: h.logits, originalLogits: o?.logits,
      embeddingMs: h.embeddingMs, hybridMs: h.candidateMs + h.rerankMs, originalMs: o?.rerankMs }];
  }));
  const matrix = evaluateSelectionMatrix(index, cases, records);
  const baseline = matrix.candidates.find(c => c.method === "keyword")!;
  const regressions = matrix.candidates.map(c => ({ method: c.method, cutoff: c.cutoff,
    scenarios: c.report.rows.map(r => ({ id: r.id, family: review.cases.find(c => c.id === r.id)!.scenarioFamily,
      recallDelta: r.sectionRecall === null ? null : r.sectionRecall - (baseline.report.rows.find(b => b.id === r.id)?.sectionRecall ?? 0),
      directPrecisionDelta: r.directPrecision - (baseline.report.rows.find(b => b.id === r.id)?.directPrecision ?? 0),
    })) }));
  const failureLedger = matrix.candidates.flatMap(candidate => candidate.report.rows.flatMap<{
    id: string; method: SelectionArm; cutoff: number; citation: string | null; stage: string; missingRuntimeFacts: string[];
  }>(row => {
    const c = cases.find(c => c.id === row.id)!;
    if (c.kind === "corpus_gap") return [{ id: c.id, method: candidate.method, cutoff: candidate.cutoff, citation: null,
      stage: "no_suitable_corpus_guidance", missingRuntimeFacts: c.missingRuntimeFacts }];
    if (row.failure) return [{ id: c.id, method: candidate.method, cutoff: candidate.cutoff, citation: null,
      stage: "unavailable_output", missingRuntimeFacts: c.missingRuntimeFacts }];
    const eligible = new Set(eligibleR25(index, c.input).map(s => s.citation));
    return (row.relevant.length ? row.relevant : c.answerSets[0] ?? []).filter(citation => !row.returned.includes(citation)).map(citation => {
      let stage = "wrong_rank";
      if (!eligible.has(citation)) stage = "provider_ineligible";
      else if (candidate.method === "keyword" || candidate.method === "bm25") {
        if (!searchRunbooks(index.filter(s => s.citation === citation), c.input).length) stage = "candidate_omission";
      } else if (candidate.method === "semantic") {
        if ((records[c.id]?.semantic?.[citation] ?? -1) < .2) stage = "cutoff_rejection";
      } else if (candidate.method === "minilm-original") {
        if (1 / (1 + Math.exp(-records[c.id]!.originalLogits![citation]!)) < .001) stage = "cutoff_rejection";
      } else {
        const generated = rankR2(index, c.input, "hybrid", records[c.id]!.semantic!, {}, { semantic: .2, rerank: 0 }, 12);
        if (!generated.some(m => m.citation === citation)) stage = "candidate_omission";
        else if (candidate.method === "hybrid-reranked" && 1 / (1 + Math.exp(-records[c.id]!.hybridLogits![citation]!)) < candidate.cutoff) stage = "cutoff_rejection";
      }
      return { id: c.id, method: candidate.method, cutoff: candidate.cutoff, citation, stage, missingRuntimeFacts: c.missingRuntimeFacts };
    });
  }));
  const result = { version: 2, scope: "no_direct_procedural_answer", adjudication: "agent_under_user_authorization",
    matrix, regressions, productionReady: false, calls: 0, costUsd: 0,
    startup: { hybridModelLoadMs: hybrid.modelLoadMs, originalModelLoadMs: original.modelLoadMs, corpusEmbeddingMs: hybrid.corpusEmbeddingMs },
    latencyLimitations: "Warm inference timings plus ranking; repeated thresholds share captured inference. Sequential load only; concurrency/full-investigation latency not measured.",
    uncertainty: "Exposed synthetic development sample; no independent release inference. Per-family regressions and denominators are reported, not broad statistical reliability.",
  };
  await writeFile(join(out, "report.json"), json(result), { flag: "wx" });
  await writeFile(join(out, "failure-ledger.json"), json({ stages: failureLedger,
    scope: "Ranking/candidate/cutoff/access/corpus loss. Query observation loss needs manual review; diagnosis not run. Unavailable output is a separate reliability category." }), { flag: "wx" });
  await writeFile(join(out, "decision.json"), json({ status: matrix.decision.status, finalist: matrix.decision.finalist && {
    method: matrix.decision.finalist.method, cutoff: matrix.decision.finalist.cutoff },
    reason: matrix.decision.finalist ? "Development gates passed; Task C independent validation still required." : "No tested configuration passes every declared development gate.",
    sourceHashes: frozen.inputHashes, corpusHash: frozen.corpusHash, productionReady: false }), { flag: "wx" });
  const percent = (value: number | null) => value === null ? "unmeasured" : `${(value * 100).toFixed(2)}%`;
  const lines = ["# Task B development selection decision", "", `Status: **${matrix.decision.status}**.`, "",
    "User-authorized agent labels. Synthetic exposed development evidence, not independent acceptance. The frozen cohort counts are below. No production behavior changed.", "",
    `Scheduled cases: ${cases.length}; answerable: ${cases.filter(c => c.kind === "answerable").length}; no direct procedure: ${cases.filter(c => c.kind === "no_match").length}; corpus gaps: ${cases.filter(c => c.kind === "corpus_gap").length}.`, "",
    "| Method | Cutoff | Recall@3 | Direct precision | No-match abstention | False abstention | Warm p95 ms | Gate failures |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
    ...matrix.decision.evaluated.map(c => `| ${c.method} | ${c.cutoff} | ${percent(c.report.metrics.recallAt3)} | ${percent(c.report.metrics.precisionAt3)} | ${percent(c.report.noMatchAbstention.rate)} | ${percent(c.report.falseAbstention.rate)} | ${c.report.latency.p95Ms?.toFixed(1) ?? "unmeasured"} | ${c.failures.join(", ") || "none"} |`),
    "", "Reports preserve absolute denominators, per-case ranked citations/scores, supporting hits, unavailability, access exclusions, sufficient-answer coverage, paired scenario regressions and loss stages. The development sample is too small and exposed to establish independent release confidence.", "",
    "Thresholds were frozen before this matrix; only the hybrid reranker cutoff is calibrated on development. Original exhaustive MiniLM remains .001. Dense/hybrid semantic threshold is .2. Zero targeted query/corpus interventions and no optional HyDE/PageIndex pilot were used.", "",
    matrix.decision.finalist ? `Development finalist: **${matrix.decision.finalist.method}**, cutoff **${matrix.decision.finalist.cutoff}**. Task C must validate independently before runtime integration.` : "**No candidate passes.** Stop this selection round; do not promote the least-bad method or silently expand the search budget.", "",
    "Sequential Node/ONNX capture uses local pinned q8 models, batch 8 and 512 reranker tokens. Captured warm timings are reused across cutoff sweeps. Cold startup/corpus embedding are separate in report.json; resource snapshots are separate artifacts. Concurrent load and full diagnosis latency were not evaluated. New negative fixture details include explicit simulated observations and do not assert that production persistence captures provider response bodies.", "",
    "Rollback/default remains keyword. Task C, runtime integration and frontend validation have not run. Graphify required: no for this offline comparison.",
  ];
  await writeFile(join(out, "decision.md"), lines.join("\n") + "\n", { flag: "wx" });
  console.log(`Matrix complete: ${matrix.decision.status}; ${matrix.candidates.length} configurations. ${rel}`);
}

if (import.meta.main) {
  const { values } = parseArgs({ options: { output: { type: "string" }, review: { type: "string" }, report: { type: "boolean" } }, strict: true });
  if (!values.output) throw new Error("Provide --output for an immutable run");
  if (values.report) await reportMatrix(values.output);
  else if (values.review) await prepareMatrix(values.output, values.review);
  else await prepareSelection(values.output);
}
