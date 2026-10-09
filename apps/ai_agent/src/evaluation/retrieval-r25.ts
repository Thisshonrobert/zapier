import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { resolve, join, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { loadR23 } from "./retrieval-r23.ts";
import { hash, metrics } from "./retrieval-r21.ts";
import { eligibleR25, auditDatasetR25 } from "./r25-analysis.ts";
import { rowsAtR24 } from "./r24-analysis.ts";
import { validateScores } from "./retrieval-r2.ts";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const json = async (p: string) => JSON.parse(await readFile(p, "utf8"));
const fileHash = async (p: string) => createHash("sha256").update(await readFile(p)).digest("hex");

async function main() {
  const { values } = parseArgs({ options: {
    output: { type: "string" }, prepare: { type: "boolean" }, audit: { type: "string" },
    packet: { type: "string" }, scores: { type: "string" },
  }, strict: true });
  const out = resolve(root, values.output ?? `apps/ai_agent/evaluation/r25/runs/${new Date().toISOString().replace(/[:.]/g, "-")}`);
  const rel = relative(root, out).replaceAll("\\", "/");
  if (isAbsolute(rel) || !["apps/ai_agent/evaluation/r25/runs/", ".tmp-turbo-user/"].some(p => rel.startsWith(p)))
    throw new Error("Output must be a new R2.5 or ignored run directory");
  const baseline = await loadR23();
  const { index, queries, dataset, config, r22Capture } = baseline;
  const reportPath = "apps/ai_agent/evaluation/r23/runs/r23-v1-local/report.json";
  const report = await json(join(root, reportPath));
  const original = report.results.find((r: { variant: string }) => r.variant === "original");
  if (!original) throw new Error("Missing frozen R2.3 original rows");
  const packet = queries.map((q, i) => {
    const returned: string[] = original.rows.find((r: { id: string }) => r.id === q.id).returned;
    // Audit every supplied gold/returned pair, including agreements and no-match controls.
    const citations = [...new Set([...q.relevantCitations, ...returned])];
    return { id: `audit-${String(i + 1).padStart(3, "0")}`, query: q.query,
      sections: citations.map(c => {
        const s = index.find(s => s.citation === c)!;
        return { citation: c, heading: s.heading, content: s.content, contentHash: s.contentHash };
      }).sort((a, b) => hash(q.query + a.citation).localeCompare(hash(q.query + b.citation))),
    };
  }).sort((a, b) => hash(a.query).localeCompare(hash(b.query)));
  const key = Object.fromEntries(queries.map((q, i) => [`audit-${String(i + 1).padStart(3, "0")}`, q.id]));
  const packetHash = hash(packet);
  if (values.prepare) {
    await mkdir(resolve(out, ".."), { recursive: true });
    await mkdir(out);
    const save = (name: string, value: unknown) => writeFile(join(out, name), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
    await save("audit-packet.json", { version: "r25-blind-v1", packetHash, rubric: {
      direct: "The section explicitly answers the requested question. Credit only content present, not inferred adjacent procedures.",
      supporting: "Useful context but does not directly answer the requested question.",
      irrelevant: "Does not answer or support this question.",
    }, packet });
    await save("audit-template.json", { packetHash, reviewer: "", independent: true,
      reviews: packet.map(p => ({ id: p.id, sections: p.sections.map(s => ({ citation: s.citation, relevance: "", rationale: "" })) })) });
    await save("audit-key.json", key);
    await save("baseline-freeze.json", { datasetHash: hash(dataset), corpusHash: hash(baseline.corpus), reportHash: await fileHash(join(root, reportPath)) });
    console.log(`Blinded review prepared: ${packet.length} queries, ${packet.reduce((n, p) => n + p.sections.length, 0)} sections. ${out}`);
    return;
  }
  if (!values.audit || !values.packet) throw new Error("Complete independent audit and matching --packet are required before inference");
  const frozenPacket = await json(resolve(root, values.packet));
  if (frozenPacket.packetHash !== packetHash || hash(frozenPacket.packet) !== packetHash)
    throw new Error("Review packet changed");
  const review = await json(resolve(root, values.audit));
  const audited = auditDatasetR25(dataset, packet, key, review, packetHash);
  await mkdir(resolve(out, ".."), { recursive: true });
  await mkdir(out);
  const save = (name: string, value: unknown) => writeFile(join(out, name), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
  await save("dataset-original.json", dataset);
  await save("dataset-audited.json", audited);
  await save("audit.json", review);
  const sourcePaths = ["retrieval-r25.ts", "r25-analysis.ts", "r25-models.mjs"].map(p => `apps/ai_agent/src/evaluation/${p}`);
  const sourceHashes = Object.fromEntries(await Promise.all(sourcePaths.map(async p => [p, await fileHash(join(root, p))])));
  const inferenceQueries = queries.map(q => ({ id: q.id, query: q.query,
    candidates: eligibleR25(index, q).map(s => s.citation),
    passages: Object.fromEntries(eligibleR25(index, q).map(s => [s.citation, `${s.heading}\n${s.content}`])),
  }));
  const inference = { config: { model: config.models.reranker, cutoff: 0.001, maxLength: 512, batchSize: 8, candidateBound: 60 },
    queries: inferenceQueries, corpusHash: hash(baseline.corpus), sourceHashes };
  const inputHash = hash(inference);
  await save("inference-inputs.json", { ...inference, inputHash });
  const scoresPath = values.scores ? resolve(root, values.scores) : join(out, "scores.json");
  if (!values.scores) execFileSync("node", ["--experimental-transform-types", fileURLToPath(new URL("./r25-models.mjs", import.meta.url)), join(out, "inference-inputs.json"), scoresPath],
    { cwd: root, stdio: "inherit", timeout: 600_000 });
  const capture = await json(scoresPath);
  if (capture.inputHash !== inputHash || capture.configHash !== hash(inference.config) ||
      Object.keys(capture.records).length !== queries.length) throw new Error("Capture provenance mismatch");
  for (const q of inferenceQueries) {
    const r = capture.records[q.id];
    if (!r || !Number.isFinite(r.rerankMs) || r.rerankMs < 0) throw new Error("Missing or invalid capture");
    validateScores(r.logits, q.candidates, -Number.MAX_VALUE, Number.MAX_VALUE);
    validateScores(r.tokenCounts, q.candidates, 3, Number.MAX_SAFE_INTEGER);
  }
  if (values.scores) {
    const prior = await json(join(resolve(scoresPath, ".."), "report.json"));
    if (prior.inputHash !== inputHash || prior.scoresHash !== hash(capture)) throw new Error("Replay capture changed");
    await save("scores.json", capture);
  }
  const results = [dataset, audited].map(labels => {
    const rows = queries.map(q => ({ id: q.id, split: q.split,
      relevant: labels.queries.find((r: { id: string }) => r.id === q.id)!.relevantCitations,
      candidates: inferenceQueries.find(r => r.id === q.id)!.candidates,
      logits: capture.records[q.id].logits, latencyMs: capture.records[q.id].rerankMs,
    }));
    return { labelVersion: labels.version,
      controls: [0.001, 0].map(cutoff => ({ cutoff, rows: rowsAtR24(rows, cutoff), splits: ["development", "held_out"].map(split => {
        const chosen = rows.filter(q => q.split === split);
        return { split, metrics: metrics(rowsAtR24(chosen, cutoff)),
          candidateRecall: metrics(chosen.map(r => ({ ...r, returned: r.candidates }))).recallAt3,
          previousPoolRecall: metrics(chosen.map(r => ({ ...r, returned: r22Capture.records[r.id]!.candidates }))).recallAt3,
          excludedGold: chosen.flatMap(r => r.relevant.filter(c => !r.candidates.includes(c)).map(c => ({ id: r.id, citation: c }))),
        };
      }) })) };
  });
  await save("report.json", { experiment: "R2.5-exhaustive-control", inputHash, scoresHash: hash(capture), packetHash, sourceHashes,
    originalDatasetHash: hash(dataset), auditedDatasetHash: hash(audited), auditHash: hash(review),
    results, externalCostUsd: 0, productionReady: false,
    limitations: ["Reused synthetic data is diagnostic; independent model review is not human adjudication.",
      "Audit covers gold/returned sections only; other corpus sections may still have incomplete labels.",
      "Fixed MiniLM cutoff and zero-cutoff control; no threshold selected against reused held-out data.",
      "Exhaustive candidate coverage does not establish final recall, downstream quality or production suitability."] });
  console.log(JSON.stringify(results.map(r => ({ labelVersion: r.labelVersion, controls: r.controls.map(c => ({ cutoff: c.cutoff, splits: c.splits })) })), null, 2));
}
if (import.meta.main) await main();
