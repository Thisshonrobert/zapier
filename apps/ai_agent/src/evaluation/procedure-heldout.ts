import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve, join, relative, isAbsolute } from "node:path";
import { parseArgs } from "node:util";
import { execFileSync } from "node:child_process";
import { loadRunbooks, searchRunbooks, type RunbookIndex, type RunbookSearchInput } from "../tools/search-runbooks.ts";
import { eligibleR25 } from "./r25-analysis.ts";
import { loadR2Corpus, validateScores } from "./retrieval-r2.ts";
import { hash, metrics } from "./retrieval-r21.ts";
import { rowsAtR24 } from "./r24-analysis.ts";
import { productionQueryVariant } from "./retrieval-selection.ts";

type HeldoutQuery = RunbookSearchInput & { id: string; relevantCitations: string[] };
type Row = { id: string; relevant: string[]; candidates: string[]; returned: string[]; latencyMs: number };
const base = "apps/ai_agent/evaluation/production-selection/runs";
const historical = "apps/ai_agent/evaluation/r25/runs";
const json = async (path: string) => JSON.parse(await readFile(path, "utf8"));
const digest = async (path: string) => createHash("sha256").update(await readFile(path)).digest("hex");
const format = (value: unknown) => JSON.stringify(value, null, 2) + "\n";

export function buildPairedInputs(index: RunbookIndex, queries: readonly HeldoutQuery[]) {
  if (new Set(queries.map(q => q.id)).size !== queries.length) throw new Error("Duplicate query IDs");
  const build = (procedure: boolean) => queries.map(q => {
    const input = procedure ? productionQueryVariant(q, "procedure-question") : q;
    const eligible = eligibleR25(index, input);
    return { id: q.id, query: input.query, candidates: eligible.map(s => s.citation),
      passages: Object.fromEntries(eligible.map(s => [s.citation, `${s.heading}\n${s.content}`])) };
  });
  return { original: build(false), procedure: build(true) };
}

export function summarizeHeldout(rows: readonly Row[]) {
  for (const row of rows) {
    if (row.returned.length > 3 || new Set(row.returned).size !== row.returned.length ||
        row.returned.some(c => !row.candidates.includes(c))) throw new Error("Invalid returned citations");
  }
  const exclusions = rows.filter(r => r.relevant.some(c => !r.candidates.includes(c)))
    .map(r => ({ id: r.id, missing: r.relevant.filter(c => !r.candidates.includes(c)) }));
  const eligible = rows.filter(r => !exclusions.some(e => e.id === r.id));
  const precision = (rs: readonly Row[]) => rs.length ? rs.reduce((sum, r) => sum +
    r.returned.filter(c => r.relevant.includes(c)).length / 3, 0) / rs.length : null;
  return { allCases: metrics(rows), eligible: metrics(eligible),
    labelledPrecisionAt3: precision(eligible), exclusions,
    sufficientAnswerCases: eligible.filter(r => r.relevant.length && r.relevant.every(c => r.returned.includes(c))).length,
    hitCases: eligible.filter(r => r.relevant.some(c => r.returned.includes(c))).length };
}

async function main() {
  const { values } = parseArgs({ options: { output: { type: "string" }, report: { type: "boolean" } }, strict: true });
  if (!values.output) throw new Error("New output directory required");
  const out = resolve(values.output), rel = relative(resolve(base), out);
  if (isAbsolute(rel) || rel.startsWith("..") || !rel) throw new Error("Use a new production-selection run directory");
  const save = (name: string, value: unknown) => writeFile(join(out, name), format(value), { flag: "wx" });
  if (!values.report) {
    const paths = [
      `${historical}/exhaustive-v2/dataset-audited.json`, `${historical}/exhaustive-v2/inference-inputs.json`,
      `${historical}/exhaustive-v2/scores.json`, `${historical}/fresh-v1/dataset.json`,
      `${historical}/fresh-v1/inference-inputs.json`, `${historical}/fresh-v1/scores.json`,
      "apps/ai_agent/src/evaluation/procedure-heldout.ts", "apps/ai_agent/src/evaluation/r25-models.mjs",
      "apps/ai_agent/src/evaluation/retrieval-selection.ts", "apps/ai_agent/src/evaluation/retrieval-r21.ts",
      "apps/ai_agent/src/evaluation/r24-analysis.ts", "apps/ai_agent/src/evaluation/r23-analysis.ts",
      "apps/ai_agent/src/evaluation/r25-analysis.ts", "apps/ai_agent/src/evaluation/retrieval-r2.ts",
      "apps/ai_agent/src/tools/search-runbooks.ts",
    ];
    for (const name of await readdir("docs/AI/runbooks")) if (name.endsWith(".md")) paths.push(`docs/AI/runbooks/${name}`);
    for (const name of await readdir("apps/ai_agent/evaluation/r2/runbooks")) if (name.endsWith(".md")) paths.push(`apps/ai_agent/evaluation/r2/runbooks/${name}`);
    const previous = await json(`${base}/task-b-followup-20261013-v3/freeze.json`);
    const modelAssets = Object.fromEntries(Object.entries(previous.modelFileHashes as Record<string, string>)
      .filter(([path]) => path.includes("ms-marco-MiniLM-L-6-v2")));
    if (!Object.keys(modelAssets).length) throw new Error("Missing pinned model asset hashes");
    for (const [path, expected] of Object.entries(modelAssets)) if (await digest(path) !== expected) throw new Error(`Model changed: ${path}`);
    const config = (await json(`${historical}/fresh-v1/inference-inputs.json`)).config;
    if (config.cutoff !== .001 || config.model.revision !== "a09144355adeed5f58c8ed011d209bf8ee5a1fec") throw new Error("Unexpected historical config");
    const datasets = {
      reused: (await json(paths[0]!)).queries.filter((q: any) => q.split === "held_out"),
      fresh: (await json(paths[3]!)).queries,
    };
    if (datasets.reused.length !== 48 || datasets.fresh.length !== 32) throw new Error("Unexpected cohort sizes");
    const corpora = { historical: await loadR2Corpus(), production: await loadRunbooks(resolve("docs/AI/runbooks")) };
    await mkdir(out, { recursive: false });
    const artifacts: string[] = [];
    for (const [corpusName, index] of Object.entries(corpora)) {
      const corpus = index.map(({ headingTerms, contentTerms, ...s }) => s);
      await save(`corpus-${corpusName}.json`, corpus); artifacts.push(`corpus-${corpusName}.json`);
      for (const [cohort, queries] of Object.entries(datasets)) {
        const paired = buildPairedInputs(index, queries as HeldoutQuery[]);
        for (const [arm, inferenceQueries] of Object.entries(paired)) {
          const input = { config, queries: inferenceQueries, corpusHash: hash(corpus) };
          const name = `inputs-${corpusName}-${cohort}-${arm}.json`;
          await save(name, { ...input, inputHash: hash(input) }); artifacts.push(name);
        }
      }
    }
    await save("datasets.json", datasets); artifacts.push("datasets.json");
    await save("freeze.json", {
      frozenAt: new Date().toISOString(), config,
      authority: "User explicitly requested procedure-question testing on held-out cases and integration conditional on winning; accepted 75% recall earlier. This authorizes historical held-out access for this fixed comparison, not tuning against its labels.",
      scope: "One fixed procedure prefix, unchanged .001 cutoff; paired original MiniLM and unchanged keyword; separate 60-section diagnostic and 54-section production-corpus cohorts. No live diagnosis calls.",
      gates: { recallAt3: .75, noMatchAbstention: .9, falseAbstentionMaximum: .05, labelledPrecision: "At least paired keyword", warmScoringP95MaximumMs: 3000 },
      integration: "Conditional on retrieval gates and remaining production-path/diagnosis acceptance; this historical human-question benchmark alone cannot establish independent incident-path release acceptance.",
      limitations: ["Historical fresh scenarios were independent when authored, but their aggregate results have already been exposed.", "Both cohorts use human search questions rather than incident-derived production queries.", "Labels remain frozen; incomplete gold lists limit precision interpretation; no human adjudication."],
      sourceHashes: Object.fromEntries(await Promise.all(paths.map(async path => [path, await digest(path)]))), modelAssets,
      artifactHashes: Object.fromEntries(await Promise.all(artifacts.map(async name => [name, await digest(join(out, name))]))),
      startingGitStatus: execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }),
    });
    console.log(`Frozen 8 paired inference batches in ${out}; labels excluded from inference.`);
    return;
  }
  const frozen = await json(join(out, "freeze.json"));
  for (const [path, expected] of Object.entries({ ...frozen.sourceHashes, ...frozen.modelAssets }))
    if (await digest(path) !== expected) throw new Error(`Frozen source changed: ${path}`);
  for (const [name, expected] of Object.entries(frozen.artifactHashes))
    if (await digest(join(out, name)) !== expected) throw new Error(`Frozen artifact changed: ${name}`);
  const datasets = await json(join(out, "datasets.json"));
  const results = [];
  for (const corpusName of ["historical", "production"]) {
    const corpus = await json(join(out, `corpus-${corpusName}.json`));
    const index = corpusName === "historical" ? await loadR2Corpus() : await loadRunbooks(resolve("docs/AI/runbooks"));
    if (hash(index.map(({ headingTerms, contentTerms, ...s }) => s)) !== hash(corpus)) throw new Error("Corpus drift");
    for (const cohort of ["reused", "fresh"]) {
      const queries: HeldoutQuery[] = datasets[cohort];
      const arms: Record<string, { rows: Row[]; summary: ReturnType<typeof summarizeHeldout>; modelLoadMs?: number }> = {};
      const keywordRows = queries.map(q => {
        const start = performance.now(), returned = searchRunbooks(index, q).map(s => s.citation);
        return { id: q.id, relevant: q.relevantCitations, candidates: eligibleR25(index, q).map(s => s.citation), returned, latencyMs: performance.now() - start };
      });
      arms.keyword = { rows: keywordRows, summary: summarizeHeldout(keywordRows) };
      for (const arm of ["original", "procedure"]) {
        const input = await json(join(out, `inputs-${corpusName}-${cohort}-${arm}.json`));
        const capture = await json(join(out, `scores-${corpusName}-${cohort}-${arm}.json`));
        if (capture.inputHash !== input.inputHash || capture.configHash !== hash(frozen.config) ||
            Object.keys(capture.records).length !== queries.length || Object.keys(capture.records).some(id => !queries.some(q => q.id === id))) throw new Error("Capture provenance mismatch");
        const rows = queries.map(q => {
          const record = capture.records[q.id], candidates = input.queries.find((c: any) => c.id === q.id).candidates;
          validateScores(record.logits, candidates, -Number.MAX_VALUE, Number.MAX_VALUE);
          if (!Number.isFinite(record.rerankMs) || record.rerankMs < 0) throw new Error("Invalid latency");
          const returned = rowsAtR24([{ split: "held_out", relevant: q.relevantCitations, candidates, logits: record.logits, latencyMs: record.rerankMs }], .001)[0]!.returned;
          return { id: q.id, relevant: q.relevantCitations, candidates, returned, latencyMs: record.rerankMs };
        });
        if (corpusName === "historical" && arm === "original") {
          const prior = await json(`${historical}/${cohort === "fresh" ? "fresh-v1" : "exhaustive-v2"}/scores.json`);
          for (const q of queries) if (hash(capture.records[q.id].logits) !== hash(prior.records[q.id].logits)) throw new Error(`Historical original score replay differs: ${q.id}`);
        }
        arms[arm] = { rows, summary: summarizeHeldout(rows), modelLoadMs: capture.modelLoadMs };
      }
      const candidate = arms.procedure!.summary, control = arms.keyword!.summary, m = candidate.eligible;
      const failures = [
        (m.recallAt3 ?? 0) < .75 ? "recall" : null,
        (m.noMatchAbstentionRate ?? 0) < .9 ? "no_match_abstention" : null,
        (m.answerableAbstentionRate ?? 1) > .05 ? "false_abstention" : null,
        (candidate.labelledPrecisionAt3 ?? 0) < (control.labelledPrecisionAt3 ?? 0) ? "labelled_precision_regression" : null,
        (m.latency.p95Ms ?? Infinity) > 3000 ? "latency" : null,
      ].filter(Boolean);
      const paired = arms.procedure!.rows.map(row => {
        const original = arms.original!.rows.find(r => r.id === row.id)!;
        return { id: row.id, relevant: row.relevant, original: original.returned, procedure: row.returned,
          relevantHitDelta: row.returned.filter(c => row.relevant.includes(c)).length - original.returned.filter(c => row.relevant.includes(c)).length };
      });
      results.push({ corpusName, sectionCount: index.length, cohort, arms, failures, paired });
    }
  }
  const report = { frozen, results, externalCalls: 0, costUsd: 0, productionReady: false,
    decision: results.some(r => r.failures.length) ? "retrieval_gates_failed_no_promotion" : "historical_retrieval_gates_passed_production_path_acceptance_pending" };
  await save("report.json", report);
  const pct = (v: number | null) => v === null ? "unavailable" : `${(v * 100).toFixed(2)}%`;
  const lines = results.flatMap(r => Object.entries(r.arms).map(([arm, data]) => {
    const m = data.summary.eligible;
    return `| ${r.corpusName} (${r.sectionCount}) | ${r.cohort} | ${arm} | ${m.positiveQueryCount} | ${pct(m.recallAt3)} | ${pct(data.summary.labelledPrecisionAt3)} | ${m.noMatchConfusion.tp}/${m.noMatchQueryCount} | ${m.noMatchConfusion.fp}/${m.positiveQueryCount} | ${m.latency.p95Ms?.toFixed(1)} | ${data.summary.exclusions.length} |`;
  }));
  await writeFile(join(out, "decision.md"), ["# Fixed procedure-question held-out comparison", "", `Decision: **${report.decision}**. Production remains unchanged.`, "",
    "Fixed prefix and .001 cutoff; 75% recall target accepted by the user before testing. No label, filter, passage or threshold tuning.", "",
    "| Corpus | Cohort | Arm | Eligible positives | Recall@3 | Labelled precision@3 | Negative abstention | False abstention | Scoring p95 ms | Excluded positives |",
    "| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |", ...lines, "",
    ...results.map(r => `${r.corpusName}/${r.cohort} procedure failures: ${r.failures.join(", ") || "none"}.`), "",
    "Recall is macro section coverage under the unchanged historical labels, not the Task B any-sufficient-procedure metric. Corpus-ineligible positive cases remain in all-case metrics and are excluded only from eligible metrics; they never become negatives. Labelled precision is a diagnostic lower bound where labels are incomplete.", "",
    "Original historical logits were re-run and matched saved scores exactly. Timing covers local model scoring, not end-to-end service latency or concurrency. Historical cohorts contain authored search questions and exposed synthetic cases; they do not establish independent incident-path or semantic diagnosis acceptance. Zero API calls or external spend.",
  ].join("\n") + "\n", { flag: "wx" });
  const artifactNames = (await readdir(out)).filter(name => name !== "result-manifest.json");
  await save("result-manifest.json", { artifacts: Object.fromEntries(await Promise.all(artifactNames.map(async name => [name, await digest(join(out, name))]))), decision: report.decision });
  console.log(format(results.map(r => ({ corpus: r.corpusName, cohort: r.cohort, failures: r.failures,
    arms: Object.fromEntries(Object.entries(r.arms).map(([arm, data]) => [arm, data.summary])) }))));
}

if (import.meta.main) await main();
