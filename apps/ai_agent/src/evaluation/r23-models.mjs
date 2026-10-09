import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  AutoTokenizer,
  AutoModelForSequenceClassification,
  env,
} from "@huggingface/transformers";
import { hash } from "./retrieval-r21.ts";

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath)
  throw new Error("Expected frozen inputs and output path");
const { inputHash, ...input } = JSON.parse(await readFile(inputPath, "utf8"));
if (hash(input) !== inputHash) throw new Error("Inference input hash mismatch");
const { config, queries } = input;
env.cacheDir = resolve(".tmp-turbo-user/r2-models");
const description = config.models.reranker;
const options = {
  revision: description.revision,
  dtype: description.dtype,
  device: "cpu",
  local_files_only: true,
};
const started = performance.now();
const tokenizer = await AutoTokenizer.from_pretrained(description.id, options);
const reranker = await AutoModelForSequenceClassification.from_pretrained(
  description.id,
  options,
);
const modelLoadMs = performance.now() - started;
const records = {};
try {
  for (const [qi, q] of queries.entries()) {
    const variants = qi % 2 ? [...config.variants].reverse() : config.variants;
    records[q.id] = {};
    for (const variant of variants) {
      const logits = {},
        tokenCounts = {},
        tokenHashes = {};
      const inspectStart = performance.now();
      for (const citation of q.candidates) {
        const full = tokenizer(q.query, {
          text_pair: q.passages[variant][citation],
          truncation: false,
          padding: false,
        });
        const ids = Array.from(full.input_ids.data, (v) => Number(v));
        tokenCounts[citation] = ids.length;
        tokenHashes[citation] = hash(ids);
      }
      const tokenInspectionMs = performance.now() - inspectStart;
      const inferenceStart = performance.now();
      for (let i = 0; i < q.candidates.length; i += config.batchSize) {
        const batch = q.candidates.slice(i, i + config.batchSize);
        const features = tokenizer(
          batch.map(() => q.query),
          {
            text_pair: batch.map((c) => q.passages[variant][c]),
            padding: true,
            truncation: true,
            max_length: config.maxLength,
          },
        );
        const output = await reranker(features);
        if (output.logits.data.length !== batch.length)
          throw new Error("Unexpected reranker logit shape");
        batch.forEach((citation, i) => {
          logits[citation] = Number(output.logits.data[i]);
        });
      }
      records[q.id][variant] = {
        logits,
        tokenCounts,
        tokenHashes,
        tokenInspectionMs,
        rerankMs: performance.now() - inferenceStart,
      };
    }
    console.log(`R2.3: ${q.id}, ${q.candidates.length} fixed candidates`);
  }
  await writeFile(
    outputPath,
    JSON.stringify(
      {
        inputHash,
        configHash: hash(config),
        models: config.models,
        modelLoadMs,
        records,
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
} finally {
  await reranker.dispose();
}
