// R3.5r.3 offline scorer. Node owns ONNX native inference so the screening run
// uses the same pinned local model as the frozen R3 arms. No network access.
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  AutoModelForSequenceClassification,
  AutoTokenizer,
  env,
} from "@huggingface/transformers";

const [inputPath, outputPath, cacheArg] = process.argv.slice(2);
if (!inputPath || !outputPath)
  throw new Error("Expected <inference-original.json> <scores-original.json> [cache-dir]");

const cacheDir = resolve(cacheArg ?? ".tmp-turbo-user/r2-models");
const id = "Xenova/ms-marco-MiniLM-L-6-v2";
const revision = "a09144355adeed5f58c8ed011d209bf8ee5a1fec";
const options = {
  revision,
  dtype: "q8",
  device: "cpu",
  local_files_only: true,
};

env.cacheDir = cacheDir;
env.allowRemoteModels = false;

const expectedHashes = {
  "config.json": "d827779a72d27ae68cf878a6fc2e954542663fe21ca515d9f4783fc96be2d37e",
  "tokenizer.json": "d241a60d5e8f04cc1b2b3e9ef7a4921b27bf526d9f6050ab90f9267a1f9e5c66",
  "tokenizer_config.json": "0b29c7bfc889e53b36d9dd3e686dd4300f6525110eaa98c76a5dafceb2029f53",
  "onnx/model_quantized.onnx": "e9d8ebf845c413e981c175bfe49a3bfa9b3dcce2a3ba54875ee5df5a58639fbe",
};
for (const [file, expected] of Object.entries(expectedHashes)) {
  const bytes = await readFile(resolve(cacheDir, id, revision, file));
  if (createHash("sha256").update(bytes).digest("hex") !== expected)
    throw new Error(`MiniLM model integrity mismatch: ${file}`);
}

const input = JSON.parse(await readFile(inputPath, "utf8"));
if (!Array.isArray(input.queries) || typeof input.inputHash !== "string")
  throw new Error("Inference input is not a recovery payload");

const tokenizer = await AutoTokenizer.from_pretrained(id, options);
const model = await AutoModelForSequenceClassification.from_pretrained(id, options);

const records = {};
for (const query of input.queries) {
  if (
    typeof query.id !== "string" ||
    typeof query.query !== "string" ||
    !Array.isArray(query.candidates) ||
    query.candidates.length > 60
  )
    throw new Error(`Invalid query ${query.id}`);

  const started = performance.now();
  const logits = {};
  for (let index = 0; index < query.candidates.length; index += 8) {
    const batch = query.candidates.slice(index, index + 8);
    const passages = batch.map((citation) => query.passages?.original?.[citation]);
    if (passages.some((passage) => typeof passage !== "string"))
      throw new Error(`Missing passage for ${query.id}`);
    const output = await model(
      tokenizer(
        batch.map(() => query.query),
        {
          text_pair: passages,
          padding: true,
          truncation: true,
          max_length: 512,
        },
      ),
    );
    if (output.logits.data.length !== batch.length)
      throw new Error(`Invalid logit shape for ${query.id}`);
    batch.forEach((citation, offset) => {
      const value = Number(output.logits.data[offset]);
      if (!Number.isFinite(value)) throw new Error(`Non-finite logit for ${citation}`);
      logits[citation] = value;
    });
  }
  records[query.id] = {
    original: {
      logits,
      rerankMs: performance.now() - started,
    },
  };
}

await writeFile(
  outputPath,
  JSON.stringify({ inputHash: input.inputHash, records }, null, 2) + "\n",
  { flag: "wx" },
);
console.log(`scored ${input.queries.length} recovery queries`);
