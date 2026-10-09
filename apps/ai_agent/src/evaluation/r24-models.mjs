import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import {
  AutoTokenizer,
  AutoModelForSequenceClassification,
  env,
} from "@huggingface/transformers";
import { hash } from "./retrieval-r21.ts";
const [inputPath, outputPath] = process.argv.slice(2);
const { inputHash, ...input } = JSON.parse(await readFile(inputPath, "utf8"));
if (hash(input) !== inputHash) throw new Error("Input hash mismatch");
const { config, queries } = input;
env.cacheDir = resolve(".tmp-turbo-user/r24-models");
for (const [file, expected] of Object.entries(config.modelFileHashes)) {
  const actual = createHash("sha256")
    .update(
      await readFile(
        resolve(
          env.cacheDir,
          config.models.reranker.id,
          config.models.reranker.revision,
          file,
        ),
      ),
    )
    .digest("hex");
  if (actual !== expected) throw new Error("Pinned cached model file changed");
}
const model = config.models.reranker;
const options = {
  revision: model.revision,
  dtype: "q8",
  device: "cpu",
  local_files_only: true,
};
const start = performance.now();
const tokenizer = await AutoTokenizer.from_pretrained(model.id, options);
const reranker = await AutoModelForSequenceClassification.from_pretrained(
  model.id,
  options,
);
const modelLoadMs = performance.now() - start,
  records = {};
try {
  for (const q of queries) {
    const tokenCounts = {},
      tokenHashes = {},
      logits = {};
    for (const c of q.candidates) {
      const ids = Array.from(
        tokenizer(q.query, {
          text_pair: q.passages[c],
          padding: false,
          truncation: false,
        }).input_ids.data,
        (v) => Number(v),
      );
      tokenCounts[c] = ids.length;
      tokenHashes[c] = hash(ids);
    }
    const started = performance.now();
    for (let i = 0; i < q.candidates.length; i += 8) {
      const batch = q.candidates.slice(i, i + 8);
      const features = tokenizer(
        batch.map(() => q.query),
        {
          text_pair: batch.map((c) => q.passages[c]),
          padding: true,
          truncation: true,
          max_length: 512,
        },
      );
      const output = await reranker(features);
      if (output.logits.data.length !== batch.length)
        throw new Error("Unexpected logit shape");
      batch.forEach((c, i) => {
        logits[c] = Number(output.logits.data[i]);
      });
    }
    records[q.id] = {
      logits,
      tokenCounts,
      tokenHashes,
      rerankMs: performance.now() - started,
    };
    console.log(`R2.4: ${q.id}, ${q.candidates.length} fixed candidates`);
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
