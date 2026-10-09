import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { AutoTokenizer, AutoModelForSequenceClassification, env } from "@huggingface/transformers";
// Explicit one-time public download; experiment inference itself stays local-only.
const config=JSON.parse(await readFile("apps/ai_agent/evaluation/r24/config.json","utf8"));
env.cacheDir=resolve(".tmp-turbo-user/r24-models");
const model=config.models.reranker;
const options={revision:model.revision,dtype:"q8",device:"cpu"};
await AutoTokenizer.from_pretrained(model.id,options);
const reranker=await AutoModelForSequenceClassification.from_pretrained(model.id,options);
await reranker.dispose();
for(const [file,expected] of Object.entries(config.modelFileHashes)) {
  const actual=createHash("sha256").update(await readFile(resolve(env.cacheDir,model.id,model.revision,file))).digest("hex");
  if(actual!==expected) throw new Error(`Pinned file hash mismatch: ${file}`);
}
console.log("Pinned public model cached and all file hashes verified");
