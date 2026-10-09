// Node owns ONNX native inference; Bun owns the existing diagnosis graph.
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  pipeline,
  AutoTokenizer,
  AutoModelForSequenceClassification,
  env,
} from "@huggingface/transformers";
import { rankR2 } from "./retrieval-r2.ts";
const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath)
  throw new Error("Expected frozen input and output paths");
const input = JSON.parse(await readFile(inputPath, "utf8"));
const index = input.corpus.map((s) => ({
  ...s,
  headingTerms: new Set(s.headingTerms),
  contentTerms: new Set(s.contentTerms),
}));
env.cacheDir = resolve(".tmp-turbo-user/r2-models");
const models = {
  embedding: {
    id: "Xenova/all-MiniLM-L6-v2",
    revision: "751bff37182d3f1213fa05d7196b954e230abad9",
    dtype: "q8",
  },
  reranker: {
    id: "Xenova/ms-marco-MiniLM-L-6-v2",
    revision: "a09144355adeed5f58c8ed011d209bf8ee5a1fec",
    dtype: "q8",
  },
};
const started = performance.now();
console.log("R2: loading pinned local embedding and cross-encoder models");
const embed = await pipeline("feature-extraction", models.embedding.id, {
  revision: models.embedding.revision,
  dtype: "q8",
  device: "cpu",
});
const tokenizer = await AutoTokenizer.from_pretrained(models.reranker.id, {
  revision: models.reranker.revision,
});
const reranker = await AutoModelForSequenceClassification.from_pretrained(
  models.reranker.id,
  { revision: models.reranker.revision, dtype: "q8", device: "cpu" },
);
const modelLoadMs = performance.now() - started;
const embeddingStarted = performance.now();
const vectors = [];
for (let i = 0; i < index.length; i += 8) {
  const result = await embed(
    index.slice(i, i + 8).map((s) => `${s.heading}\n${s.content}`),
    { pooling: "mean", normalize: true, truncation: true },
  );
  vectors.push(...result.tolist());
}
const corpusEmbeddingMs = performance.now() - embeddingStarted;
const records = {};
for (const query of input.queries) {
  const embeddingStart = performance.now();
  const vector = (
    await embed(query.query, {
      pooling: "mean",
      normalize: true,
      truncation: true,
    })
  ).tolist()[0];
  const semantic = Object.fromEntries(
    index.map((s, i) => [
      s.citation,
      vectors[i].reduce((sum, v, d) => sum + v * vector[d], 0),
    ]),
  );
  const embeddingMs = performance.now() - embeddingStart;
  // Capture only a bounded candidate union for development threshold calibration.
  const union = new Map();
  for (const threshold of [0.2, 0.3, 0.4, 0.5, 0.6, 0.7]) {
    for (const match of rankR2(
      index,
      query,
      "hybrid",
      semantic,
      {},
      { semantic: threshold, rerank: 0.5 },
      12,
    ))
      union.set(match.citation, match);
  }
  const candidates = [...union.values()];
  const rerankStart = performance.now();
  const scores = [];
  for (let i = 0; i < candidates.length; i += 8) {
    const batch = candidates.slice(i, i + 8);
    const features = tokenizer(
      batch.map(() => query.query),
      {
        text_pair: batch.map((s) => `${s.heading}\n${s.content}`),
        padding: true,
        truncation: true,
        max_length: 512,
      },
    );
    const result = await reranker(features);
    scores.push(
      ...Array.from(result.logits.data).map((v) => 1 / (1 + Math.exp(-v))),
    );
  }
  records[query.id] = {
    semantic,
    rerank: Object.fromEntries(
      candidates.map((s, i) => [s.citation, scores[i]]),
    ),
    embeddingMs,
    rerankMs: performance.now() - rerankStart,
    rerankCandidateCount: candidates.length,
  };
  console.log(
    `R2: scored ${query.id} (${candidates.length} calibration candidates)`,
  );
}
await embed.dispose();
await reranker.dispose();
await writeFile(
  outputPath,
  JSON.stringify(
    {
      inputHash: input.inputHash,
      models,
      modelLoadMs,
      corpusEmbeddingMs,
      records,
    },
    null,
    2,
  ) + "\n",
);
