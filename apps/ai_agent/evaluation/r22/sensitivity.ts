import { readFile, writeFile } from "node:fs/promises";
import { hash, metrics } from "../../src/evaluation/retrieval-r21.ts";
import { rerankR22 } from "../../src/evaluation/retrieval-r22.ts";
const read = async (p: string) => JSON.parse(await readFile(p, "utf8"));
const base = await read("apps/ai_agent/evaluation/r21/runs/r21-v1-local/scores.json");
const capture = await read("apps/ai_agent/evaluation/r22/runs/r22-v1-local/scores.json");
const { queries } = await read("apps/ai_agent/evaluation/r21/queries.json");
const drift: {id: string; citation: string; baselineLogit: number; r22Logit: number; difference: number; candidateRank: number}[] = [];
const rows = queries.map((q: { id: string; split: string; relevantCitations: string[] }) => {
  const record = capture.records[q.id], baseline = base.records[q.id];
  baseline.candidates.forEach((citation: string, i: number) => drift.push({id:q.id,citation,
    baselineLogit:baseline.logits[citation], r22Logit:record.logits[citation],
    difference:Math.abs(baseline.logits[citation]-record.logits[citation]),candidateRank:i+1}));
  const logits = { ...record.logits, ...baseline.logits };
  const ranking = rerankR22({ ...record, logits });
  return { id:q.id,split:q.split,relevant:q.relevantCitations,returned:ranking.filter(r=>r.score>=.001).slice(0,3).map(r=>r.citation),latencyMs:0,ranking };
});
const result = { baselineScoresHash:hash(base), r22ScoresHash:hash(capture),
  purpose:"Sensitivity diagnostic only: baseline logits for shared candidates plus fresh R2.2 logits for added candidates. This is a mixed capture, not a new model inference run; latency excluded.",
  maximumSharedLogitDifference: Math.max(...drift.map(r=>r.difference)),
  firstBatchMaximumDifference: Math.max(...drift.filter(r=>r.candidateRank<=8).map(r=>r.difference)),
  sharedLogitDrift:drift,
  frozenSharedLogitControl:["development","held_out"].map(split=>({split,metrics:metrics(rows.filter((r:{split:string})=>r.split===split))})),rows,
};
if (process.argv[2]) await writeFile(process.argv[2],JSON.stringify(result,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({maxDrift:result.maximumSharedLogitDifference,firstBatchDrift:result.firstBatchMaximumDifference,control:result.frozenSharedLogitControl}));
