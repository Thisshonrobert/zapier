import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { AutoTokenizer, AutoModelForSequenceClassification, env } from "@huggingface/transformers";
import { hash } from "./retrieval-r21.ts";
const [inputPath, outputPath] = process.argv.slice(2);
const { inputHash, ...input } = JSON.parse(await readFile(inputPath, "utf8"));
if (hash(input) !== inputHash) throw new Error("Input hash mismatch");
const { config, queries } = input;
if (queries.length > 96 || queries.some(q => q.candidates.length > 60)) throw new Error("Inference bound exceeded");
env.cacheDir = resolve(".tmp-turbo-user/r2-models");
env.allowRemoteModels = false;
const options = { ...config.model, revision: config.model.revision, dtype: "q8", device: "cpu", local_files_only: true };
const started = performance.now();
const tokenizer = await AutoTokenizer.from_pretrained(config.model.id, options);
const reranker = await AutoModelForSequenceClassification.from_pretrained(config.model.id, options);
const modelLoadMs = performance.now() - started, records = {};
try {
  for (const q of queries) {
    const logits = {}, tokenCounts = {}, tokenHashes = {};
    for (const c of q.candidates) {
      const ids = Array.from(tokenizer(q.query, { text_pair: q.passages[c], padding: false, truncation: false }).input_ids.data, Number);
      tokenCounts[c] = ids.length;
      tokenHashes[c] = hash(ids);
    }
    const start = performance.now();
    for (let i = 0; i < q.candidates.length; i += 8) {
      const batch = q.candidates.slice(i, i + 8);
      const output = await reranker(tokenizer(batch.map(() => q.query), { text_pair: batch.map(c => q.passages[c]), padding: true, truncation: true, max_length: 512 }));
      if (output.logits.data.length !== batch.length) throw new Error("Unexpected logit shape");
      batch.forEach((c, i) => { logits[c] = Number(output.logits.data[i]); });
    }
    records[q.id] = { logits, tokenCounts, tokenHashes, rerankMs: performance.now() - start };
    console.log(`R2.5: ${q.id}, ${q.candidates.length} eligible sections`);
  }
  await writeFile(outputPath, JSON.stringify({ inputHash, configHash: hash(config), modelLoadMs, records }, null, 2) + "\n", { flag: "wx" });
} finally { await reranker.dispose(); }
