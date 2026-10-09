import { expect, test } from "bun:test";
import { selectR24, rowsAtR24 } from "../src/evaluation/r24-analysis.ts";
import { validateR24Capture } from "../src/evaluation/retrieval-r24.ts";
import { hash } from "../src/evaluation/retrieval-r21.ts";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
test("R2.4 calibration ignores held-out scores and labels and retains no-match controls", () => {
  const rows = [
    {
      split: "development",
      relevant: ["a"],
      candidates: ["a"],
      logits: { a: 1 },
      latencyMs: 0,
    },
    {
      split: "development",
      relevant: [],
      candidates: ["a"],
      logits: { a: -10 },
      latencyMs: 0,
    },
    {
      split: "held_out",
      relevant: ["a"],
      candidates: ["a"],
      logits: { a: 0 },
      latencyMs: 0,
    },
  ];
  const selected = selectR24(rows, [0, 0.001, 0.3, 0.9]);
  expect(selected.threshold).toBe(0.001);
  expect(
    selectR24(
      rows.map((r) =>
        r.split === "held_out" ? { ...r, relevant: [], logits: { a: 999 } } : r,
      ),
      [0, 0.001, 0.3, 0.9],
    ),
  ).toEqual(selected);
  expect(rowsAtR24(rows, 0.001)[1]!.returned).toEqual([]);
  expect(() => rowsAtR24(rows, NaN)).toThrow();
});

test("R2.4 rejects missing scores and changed model provenance", async () => {
  const config=JSON.parse(await readFile("apps/ai_agent/evaluation/r24/config.json","utf8"));
  const capture={inputHash:"a".repeat(64),configHash:hash(config),models:config.models,modelLoadMs:0,
    records:{q:{logits:{a:1},tokenCounts:{a:10},tokenHashes:{a:"a".repeat(64)},rerankMs:0}}};
  const validate=(raw:unknown)=>validateR24Capture(raw,capture.inputHash,hash(config),config.models,[{id:"q",candidates:["a"]}]);
  expect(validate(capture).records.q!.logits.a).toBe(1);
  expect(()=>validate({...capture,records:{}})).toThrow();
  expect(()=>validate({...capture,inputHash:"b".repeat(64)})).toThrow();
  expect(()=>validate({...capture,models:{...config.models,reranker:{...config.models.reranker,revision:"b".repeat(40)}}})).toThrow();
});

test("R2.4 replay freezes calibration and rejects finite-logit tampering and baseline overwrite",async()=>{
  const source="apps/ai_agent/evaluation/r24/runs/r24-v1-local",out=`.tmp-turbo-user/r24-replay-${crypto.randomUUID()}`;
  const run=(scores:string,target:string)=>execFileSync(process.execPath,["apps/ai_agent/src/evaluation/retrieval-r24.ts","--scores",scores,"--output",target],{stdio:"pipe",timeout:30000});
  run(`${source}/scores.json`,out);
  const original=JSON.parse(await readFile(`${source}/report.json`,"utf8")),replay=JSON.parse(await readFile(`${out}/report.json`,"utf8"));
  expect(replay.inputHash).toBe(original.inputHash);
  expect(replay.candidateHash).toBe(original.candidateHash);
  expect(replay.scoresHash).toBe(original.scoresHash);
  expect(replay.calibration).toEqual(original.calibration);
  expect(replay.splits).toEqual(original.splits);
  expect(replay.decision).toEqual(original.decision);
  expect(()=>run(`${source}/scores.json`,out)).toThrow();
  expect(()=>run(`${source}/scores.json`,"apps/ai_agent/evaluation/r23/runs/r23-v1-local")).toThrow();
  const changed=`.tmp-turbo-user/r24-tampered-${crypto.randomUUID()}`;
  await mkdir(changed);
  const scores=JSON.parse(await readFile(`${source}/scores.json`,"utf8"));
  const record=scores.records[Object.keys(scores.records)[0]!];
  record.logits[Object.keys(record.logits)[0]!]+=1;
  await writeFile(`${changed}/scores.json`,JSON.stringify(scores));
  await writeFile(`${changed}/report.json`,JSON.stringify(original));
  expect(()=>run(`${changed}/scores.json`,`.tmp-turbo-user/r24-rejected-${crypto.randomUUID()}`)).toThrow();
},30000);
