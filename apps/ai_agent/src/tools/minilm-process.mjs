// Dedicated local inference process: no HTTP inference and no model downloads.
import { AutoTokenizer, AutoModelForSequenceClassification, env } from "@huggingface/transformers";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

env.cacheDir = process.argv[2];
env.allowRemoteModels = false;
const id = "Xenova/ms-marco-MiniLM-L-6-v2";
const options = {
  revision: "a09144355adeed5f58c8ed011d209bf8ee5a1fec",
  dtype: "q8", device: "cpu", local_files_only: true,
};
// Bytes of the pinned model used by the frozen baseline, checked before loading.
const expectedHashes = {
  "config.json": "d827779a72d27ae68cf878a6fc2e954542663fe21ca515d9f4783fc96be2d37e",
  "tokenizer.json": "d241a60d5e8f04cc1b2b3e9ef7a4921b27bf526d9f6050ab90f9267a1f9e5c66",
  "tokenizer_config.json": "0b29c7bfc889e53b36d9dd3e686dd4300f6525110eaa98c76a5dafceb2029f53",
  "onnx/model_quantized.onnx": "e9d8ebf845c413e981c175bfe49a3bfa9b3dcce2a3ba54875ee5df5a58639fbe",
};
for (const [file, expected] of Object.entries(expectedHashes)) {
  const bytes = await readFile(resolve(env.cacheDir, id, options.revision, file));
  if (createHash("sha256").update(bytes).digest("hex") !== expected) throw new Error("MiniLM model integrity mismatch");
}
const tokenizer = await AutoTokenizer.from_pretrained(id, options);
const model = await AutoModelForSequenceClassification.from_pretrained(id, options);
let busy = false;
process.on("message", async (message) => {
  if (busy || !message || typeof message.query !== "string" || message.query.length > 500 ||
      !Array.isArray(message.passages) || message.passages.length > 60 ||
      message.passages.some(p => typeof p !== "string" || p.length > 5000)) process.exit(1);
  busy = true;
  try {
    const logits = [];
    for (let i = 0; i < message.passages.length; i += 8) {
      const batch = message.passages.slice(i, i + 8);
      const output = await model(tokenizer(batch.map(() => message.query), {
        text_pair: batch, padding: true, truncation: true, max_length: 512,
      }));
      if (output.logits.data.length !== batch.length) throw new Error("Invalid logit shape");
      logits.push(...Array.from(output.logits.data, Number));
    }
    process.send({ logits });
  } catch { process.exit(1); }
  finally { busy = false; }
});
process.on("disconnect", () => process.exit(0));
process.send({ ready: true });
