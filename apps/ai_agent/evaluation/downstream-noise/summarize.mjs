import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
const base='apps/ai_agent/evaluation/downstream-noise/runs/live-v1/';
const manifest=JSON.parse(readFileSync(base+'manifest.json','utf8'));
const report=JSON.parse(readFileSync(base+'report.json','utf8'));
const counts=arm=>{const rows=report.rows.filter(r=>r.arm===arm);return {n:rows.length,...Object.fromEntries(['schemaValid','rootCauseCorrect','referencesValid','actionCorrect','missingEvidenceDisclosed','passed'].map(k=>[k,rows.filter(r=>r.assessment[k]).length])),graphAccepted:rows.filter(r=>r.graphAccepted).length,unsafeReplayProposals:rows.filter(r=>r.generation?.output.proposal.disposition==='replay_candidate').length};};
const pairs=manifest.samples.filter(s=>!s.noMatch).map(s=>({id:s.id,gold:s.clean.map(r=>r.citation),baseline:s.baseline.map(r=>r.citation),rows:report.rows.filter(r=>r.sampleId===s.id).map(r=>({id:r.id,passed:r.assessment.passed,route:r.generation?.output.proposal.disposition,graphAccepted:r.graphAccepted}))}));
const controls=report.rows.filter(r=>r.arm==='no_match').map(r=>({id:r.id,status:r.generation?.output.status,taxonomy:r.generation?.output.diagnosis.taxonomy_id,route:r.generation?.output.proposal.disposition,citations:r.generation?.output.proposal.runbook_citations,safeUnknownAbstention:r.generation?.output.status==='abstained'&&r.generation?.output.diagnosis.taxonomy_id==='unknown'&&r.generation?.output.proposal.kind==='escalate'&&r.generation?.output.proposal.runbook_citations.length===0&&r.assessment.referencesValid}));
const summary={reportSha256:createHash('sha256').update(readFileSync(base+'report.json')).digest('hex'),manifestHash:report.manifestHash,calls:report.calls,tokens:report.totalTokens,paired:report.paired,arms:['clean','baseline','no_match'].map(arm=>({arm,...counts(arm)})),pairs,controls};
writeFileSync(base+'impact-summary.json',JSON.stringify(summary,null,2)+'\n');
if(process.argv.includes('--verify-replay')) {
  const replay=JSON.parse(readFileSync('apps/ai_agent/evaluation/downstream-noise/runs/replay-v1/report.json','utf8'));
  const stable=r=>({id:r.id,generation:r.generation,result:r.result,assessment:r.assessment,graphAccepted:r.graphAccepted,error:r.error});
  if(replay.manifestHash!==report.manifestHash||replay.calls!==0||JSON.stringify(replay.rows.map(stable))!==JSON.stringify(report.rows.map(stable)))throw Error('Capture replay mismatch');
  const env=parseEnv(readFileSync('apps/ai_agent/.env','utf8'));
  const key=process.env.GEMINI_API_KEY??env.GEMINI_API_KEY;
  if(key && readdirSync(base).some(p=>readFileSync(base+p,'utf8').includes(key)))throw Error('Credential present in artifacts');
  const review=JSON.parse(readFileSync(base+'qualitative-review.json','utf8'));
  if(review.reportSha256!==summary.reportSha256)throw Error('Qualitative review provenance mismatch');
  writeFileSync(base+'verification.json',JSON.stringify({reportSha256:summary.reportSha256,manifestHash:report.manifestHash,replayedOutputs:replay.rows.length,externalReplayCalls:replay.calls,identicalGenerationsAssessmentsAndGraphResults:true,qualitativeReviewHashMatches:true,credentialLeakDetected:false},null,2)+'\n');
}
console.log(JSON.stringify({calls:summary.calls,tokens:summary.tokens,paired:summary.paired,arms:summary.arms,noMatchUnknownAbstentions:summary.controls.filter(c=>c.safeUnknownAbstention).length},null,2));
