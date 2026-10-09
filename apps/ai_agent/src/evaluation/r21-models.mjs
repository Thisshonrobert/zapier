import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  pipeline,
  AutoTokenizer,
  AutoModelForSequenceClassification,
  env,
} from "@huggingface/transformers";
import { rankR2 } from "./retrieval-r2.ts";
import { hash } from "./retrieval-r21.ts";

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath)
  throw new Error("Expected frozen inference inputs and output path");
const input = JSON.parse(await readFile(inputPath, "utf8"));
const { inputHash, ...frozen } = input;
if (hash(frozen) !== inputHash)
  throw new Error("Inference input hash mismatch");
const { config, corpus, queries } = frozen;
const index = corpus.map((s) => ({
  ...s,
  headingTerms: new Set(s.headingTerms),
  contentTerms: new Set(s.contentTerms),
}));
env.cacheDir = resolve(".tmp-turbo-user/r2-models");
const options = (description) => ({
  revision: description.revision,
  dtype: description.dtype,
  device: "cpu",
  local_files_only: true,
});
const started = performance.now();
console.log("R2.1: loading pinned models from the R2 local cache");
const embed = await pipeline(
  "feature-extraction",
  config.models.embedding.id,
  options(config.models.embedding),
);
const tokenizer = await AutoTokenizer.from_pretrained(
  config.models.reranker.id,
  options(config.models.reranker),
);
const reranker = await AutoModelForSequenceClassification.from_pretrained(
  config.models.reranker.id,
  options(config.models.reranker),
);
const modelLoadMs = performance.now() - started;
const corpusStarted = performance.now(),
  vectors = [];
for (let i = 0; i < index.length; i += 8) {
  const encoded = await embed(
    index.slice(i, i + 8).map((s) => `${s.heading}\n${s.content}`),
    { pooling: "mean", normalize: true, truncation: true },
  );
  vectors.push(...encoded.tolist());
}
const corpusEmbeddingMs = performance.now() - corpusStarted,
  records = {};
try {
  for (const query of queries) {
    const embeddingStarted = performance.now();
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
    const embeddingMs = performance.now() - embeddingStarted;
    const candidateStarted = performance.now();
    const candidates = rankR2(
      index,
      query,
      "hybrid",
      semantic,
      {},
      { semantic: config.semanticThreshold, rerank: 0 },
      config.candidateLimit,
    );
    const candidateMs = performance.now() - candidateStarted;
    const rerankStarted = performance.now(),
      rawScores = [];
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
      const output = await reranker(features);
      if (output.logits.data.length !== batch.length)
        throw new Error("Unexpected cross-encoder logit shape");
      rawScores.push(...Array.from(output.logits.data));
    }
    records[query.id] = {
      semantic,
      logits: Object.fromEntries(
        candidates.map((s, i) => [s.citation, rawScores[i]]),
      ),
      candidates: candidates.map((s) => s.citation),
      embeddingMs,
      candidateMs,
      rerankMs: performance.now() - rerankStarted,
    };
    console.log(`R2.1: ${query.id}, ${candidates.length} candidates`);
  }
  await writeFile(
    outputPath,
    JSON.stringify(
      {
        inputHash,
        configHash: hash(config),
        models: config.models,
        modelLoadMs,
        corpusEmbeddingMs,
        records,
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await embed.dispose();
  await reranker.dispose();
}
