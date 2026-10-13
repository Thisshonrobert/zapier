import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
const selection = await import(pathToFileURL(resolve("apps/ai_agent/src/evaluation/retrieval-selection.ts")).href);
const { hash: canonicalHash } = await import(pathToFileURL(resolve("apps/ai_agent/src/evaluation/retrieval-r21.ts")).href);
const { loadRunbooks } = await import(pathToFileURL(resolve("apps/ai_agent/src/tools/search-runbooks.ts")).href);
const { eligibleR25 } = await import(pathToFileURL(resolve("apps/ai_agent/src/evaluation/r25-analysis.ts")).href);
const { rankR2 } = await import(pathToFileURL(resolve("apps/ai_agent/src/evaluation/retrieval-r2.ts")).href);
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const json = data => JSON.stringify(data,null,2)+"\n";
const variants = ["production", "normalized-observations", "procedure-question"];
const { values } = parseArgs({ options: { mode:{type:"string"}, out:{type:"string"}, review:{type:"string"} }, strict:true });
if (!values.out?.startsWith("apps/ai_agent/evaluation/production-selection/runs/")) throw new Error("Use a new selection run directory");
const out = resolve(values.out);
const read = async name => JSON.parse(await readFile(resolve(out,name),"utf8"));
const save = (name,data) => writeFile(resolve(out,name),json(data),{flag:"wx"});
if (values.mode === "prepare") {
  if (!values.review) throw new Error("Reviewed benchmark required");
  await selection.prepareMatrix(values.out,values.review);
  const benchmark = await read("benchmark.json"), config = await read("config.json"), baseHybrid = await read("inference-hybrid.json"), baseOriginal = await read("inference-original.json");
  const index = await loadRunbooks(resolve("docs/AI/runbooks"));
  const queries = variants.flatMap(variant => benchmark.cases.map(c => {
    const input = variant === "production" ? c.input : selection.productionQueryVariant(c.input,variant);
    return { id:`${variant}:${c.id}`, originalId:c.id, variant, input };
  }));
  const hybrid = {config,corpus:baseHybrid.corpus,queries:queries.map(q=>({id:q.id,...q.input}))};
  const original = {config:baseOriginal.config,queries:queries.map(q=> {
    const eligible=eligibleR25(index,q.input);
    return {id:q.id,query:q.input.query,candidates:eligible.map(s=>s.citation),passages:{original:Object.fromEntries(eligible.map(s=>[s.citation,`${s.heading}\n${s.content}`]))}};
  })};
  const hypotheses = {
    authority:"User chose Resolve Task B failures first; external model ceiling $0. Retain all gates, corpus, models, labels and provider restrictions.",
    purpose:"Two bounded query interventions after a score-blind annotation sufficiency audit. No production adoption or independent release claims.",
    interventions:[
      {name:"normalized-observations",factor:"Replace underscore separators with spaces",hypothesis:"Typed observation codes are readable tokens but the cross-encoder was trained on prose; delimiter normalization can improve procedural ranking without changing observed facts or eligibility."},
      {name:"procedure-question",factor:"Explicit fixed retrieval task added to the unchanged observed query",hypothesis:"The serving query describes symptoms and bookkeeping, but omits the user's direct-procedure task; incident queries rank supporting replay guidance above direct procedures. This tests the new incident/direct-procedure scope, unlike prior intent prefixes added to already explicit human questions. No causal or repair claim is added."},
    ],
    success:"Same 80% development macro recall, 90% negative abstention, <=5% false abstention, no direct-precision loss versus unchanged production keyword, reliability/latency gates. Failure means reject; no third intervention or optional pilot.",
    fixed:{originalCutoff:.001,semanticThreshold:.2,batchSize:8,maxLength:512,calibratedHybridGrid:config.rerankThresholds},
    noGeneration:true,externalCostCeilingUsd:0,reviewPath:values.review,reviewHash:sha(await readFile(values.review)),
  };
  await save("hypotheses.json",hypotheses);
  await save("query-variants.json",queries);
  await save("inference-hybrid-followup.json",{...hybrid,inputHash:canonicalHash(hybrid)});
  await save("inference-original-followup.json",{...original,inputHash:canonicalHash(original)});
  const driver = await readFile(fileURLToPath(import.meta.url));
  await writeFile(resolve(out,"followup-driver.mjs"),driver,{flag:"wx"});
  const resource = await readFile("apps/ai_agent/evaluation/production-selection/runs/task-b-20261013-v2/resource-monitor.mjs");
  await writeFile(resolve(out,"resource-monitor.mjs"),resource,{flag:"wx"});
  const names=["hypotheses.json","query-variants.json","inference-hybrid-followup.json","inference-original-followup.json","followup-driver.mjs","resource-monitor.mjs"];
  await save("interventions-freeze.json",{variants,preparedAt:new Date().toISOString(),
    artifactHashes:Object.fromEntries(await Promise.all(names.map(async n=>[n,sha(await readFile(resolve(out,n)))]))),
    hybridInputHash:canonicalHash(hybrid),originalInputHash:canonicalHash(original),
    configHash:canonicalHash(config),originalConfigHash:canonicalHash(original.config)});
  console.log(`Frozen follow-up: ${benchmark.cases.length} cases, unchanged baseline + two query factors; ${queries.length} local inference queries.`);
} else if (values.mode === "report") {
  const frozen=await read("freeze.json"), interventions=await read("interventions-freeze.json");
  for(const [path,digest] of Object.entries({...frozen.inputHashes,...frozen.modelFileHashes})) if(sha(await readFile(path))!==digest) throw new Error(`Frozen source/input/model changed: ${path}`);
  for(const [name,digest] of Object.entries({...frozen.artifactHashes,...interventions.artifactHashes})) if(sha(await readFile(resolve(out,name)))!==digest) throw new Error(`Frozen artifact changed: ${name}`);
  const h=await read("scores-hybrid-followup.json"),o=await read("scores-original-followup.json"),benchmark=await read("benchmark.json"),config=await read("config.json"),queries=await read("query-variants.json");
  if(h.inputHash!==interventions.hybridInputHash||o.inputHash!==interventions.originalInputHash||h.configHash!==interventions.configHash||o.configHash!==interventions.originalConfigHash||canonicalHash(h.models)!==canonicalHash(config.models)||canonicalHash(o.models)!==canonicalHash(config.models)) throw new Error("Inference provenance mismatch");
  for(const capture of [h,o]) if(Object.keys(capture.records).length!==queries.length||Object.keys(capture.records).some(id=>!queries.some(q=>q.id===id)))throw new Error("Incomplete/unknown scheduled inference outputs");
  const index=await loadRunbooks(resolve("docs/AI/runbooks"));
  if(sha(json(index.map(({headingTerms,contentTerms,...s})=>s)))!==frozen.corpusHash)throw new Error("Corpus drift");
  const results=variants.map(variant=> {
    const cases=benchmark.cases.map(c=>({id:c.id,kind:c.kind,input:queries.find(q=>q.variant===variant&&q.originalId===c.id).input,answerSets:c.answerSets,direct:c.direct,supporting:c.supporting,missingRuntimeFacts:c.missingRuntimeFacts}));
    const records=Object.fromEntries(cases.map(c=>{
      const key=`${variant}:${c.id}`,hybrid=h.records[key],original=o.records[key]?.original;
      const expected=rankR2(index,c.input,"hybrid",hybrid.semantic,{}, {semantic:.2,rerank:0},12).map(s=>s.citation);
      if(canonicalHash(expected)!==canonicalHash(hybrid.candidates))throw new Error(`Candidate drift: ${key}`);
      return[c.id,{semantic:hybrid.semantic,hybridLogits:hybrid.logits,originalLogits:original?.logits,embeddingMs:hybrid.embeddingMs,hybridMs:hybrid.candidateMs+hybrid.rerankMs,originalMs:original?.rerankMs}];
    }));
    const matrix=selection.evaluateSelectionMatrix(index,cases,records);
    return {variant,cases,matrix};
  });
  const productionKeyword=results[0].matrix.candidates.find(c=>c.method==="keyword");
  const candidates=results.flatMap(r=>r.matrix.candidates.map(c=>({...c,queryVariant:r.variant})));
  // Stable reference: every intervention is compared with unchanged production keyword precision.
  const decision=selection.selectDevelopmentFinalist([{...productionKeyword,queryVariant:"production"},...candidates.filter(c=>!(c.queryVariant==="production"&&c.method==="keyword"))]);
  const paired=results.slice(1).map(r=>({variant:r.variant,rows:r.matrix.candidates.flatMap(c=>c.report.rows.map(row=>{
    const base=results[0].matrix.candidates.find(b=>b.method===c.method&&b.cutoff===c.cutoff).report.rows.find(b=>b.id===row.id);
    return{id:row.id,method:c.method,cutoff:c.cutoff,recallDelta:row.sectionRecall===null?null:row.sectionRecall-(base.sectionRecall??0),precisionDelta:row.directPrecision-base.directPrecision,returned:row.returned};
  }))}));
  const report={version:3,labelReviewHash:sha(await readFile(resolve(out,"benchmark.json"))),results,decision,paired,
    startup:{hybridMs:h.modelLoadMs,originalMs:o.modelLoadMs,corpusEmbeddingMs:h.corpusEmbeddingMs},
    limitations:["User-authorized agent development annotations; exposed synthetic cases; no independent acceptance.","Label corrections change required-answer semantics; compare query variants only within v3, never pool v2/v3 metrics.","Sequential local inference with captured timings; no concurrency or full diagnosis measurement.","External generations/cost zero; no default/runtime adoption; Task C not run."],externalGenerations:0,costUsd:0,productionReady:false};
  await save("followup-report.json",report);
  await save("decision.json",{status:decision.status,finalist:decision.finalist&&{method:decision.finalist.method,cutoff:decision.finalist.cutoff,queryVariant:decision.finalist.queryVariant},productionReady:false,externalGenerations:0,costUsd:0,interventionsUsed:2});
  const pct=v=>v===null?"unmeasured":`${(v*100).toFixed(2)}%`;
  const table=decision.evaluated.map(c=>`| ${c.queryVariant} | ${c.method} | ${c.cutoff} | ${pct(c.report.metrics.recallAt3)} | ${pct(c.report.metrics.precisionAt3)} | ${pct(c.report.noMatchAbstention.rate)} | ${pct(c.report.falseAbstention.rate)} | ${c.failures.join(", ")||"none"} |`);
  await writeFile(resolve(out,"decision.md"),["# Task B bounded follow-up decision","",`Status: **${decision.status}**.`,"","Score-blind sufficiency audit precedes two query interventions. All variants use the same v3 labels, eligible corpus and pinned models. Original .001 cutoff is preserved; hybrid cutoff calibration remains development-only. No-direct-procedure abstention is the same user-selected scope for positives and negatives.","","| Query | Method | Cutoff | Recall@3 | Direct precision | No-match abstention | False abstention | Gate failures |","| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |",...table,"",decision.finalist?`Development finalist: ${decision.finalist.method}, ${decision.finalist.queryVariant}, cutoff ${decision.finalist.cutoff}. Independent Task C acceptance remains required.`:"No configuration passes all gates. Two interventions consumed; stop this follow-up without promoting the least-bad method or changing release gates.","","Historical v2 scores remain unchanged. Any recall shift from correcting sufficient alternatives is a measurement correction, not retrieval improvement. Query improvements are measured against the re-scored v3 unchanged production query. Agent annotations, synthetic evidence and the small exposed cohort limit conclusions. External model calls/spending: zero. Task C, runtime integration and frontend validation did not run. Graphify required: no."].join("\n")+"\n",{flag:"wx"});
  console.log(JSON.stringify({status:decision.status,finalist:decision.finalist&&{method:decision.finalist.method,cutoff:decision.finalist.cutoff,queryVariant:decision.finalist.queryVariant},originalRows:results.map(r=>({variant:r.variant,...r.matrix.candidates.find(c=>c.method==="minilm-original").report.metrics,noMatch:r.matrix.candidates.find(c=>c.method==="minilm-original").report.noMatchAbstention}))},null,2));
} else throw new Error("Use mode prepare or report");
