import express from 'express';
import cors from 'cors';
import { actionRouter } from './route/action';
import { triggerRouter } from './route/trigger';
import { userRouter } from './route/user';
import { zapRouter } from './route/zap';
import { createTriageRouter } from './route/triage';
import { TriageEvidenceService, type TriageEvidenceDb } from './services/triage-evidence';
import { TriageOperatorService } from './services/triage-operator';
import { InvestigationAuthority } from './services/investigation-authority';
import { InvestigationProposals, evaluateSnapshotPolicy } from './services/investigation-proposals';
import { revalidateProposalPolicy } from './services/replay-policy-facts';
import { InvestigationNotifications } from './services/investigation-notifications';
import { TriageAgentClient } from './services/triage-agent';
import { createServiceScope } from '../../packages/triage-contracts';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../packages/db/prisma/db';

const app = express();
const PORT = process.env.PORT || 3002;
const agent = new TriageAgentClient(process.env.AI_AGENT_URL ?? 'http://127.0.0.1:3004');
const serviceSecret = process.env.TRIAGE_SERVICE_SECRET ?? '';
const notifications = new InvestigationNotifications(prisma, async (pending) => {
    const correlationId = randomUUID();
    const scope = createServiceScope({ secret: serviceSecret, ownerId: pending.subjectOwnerId,
        caseId: pending.caseId, investigationId: pending.investigationId, correlationId,
        operations: ['failure_context'] });
    await agent.read(`/private/v1/investigations/${pending.investigationId}/decision`,
        scope, correlationId, 'POST', 5_000,
        { decisionId: pending.decisionId, decision: pending.decision });
});

app.use(cors());
app.use(express.json());


app.use("/api/v1/user",userRouter)
app.use("/api/v1/zap",zapRouter)
app.use("/api/v1/trigger",triggerRouter)
app.use("/api/v1/action",actionRouter)
app.use("/api/v1/triage",createTriageRouter({
    evidence: new TriageEvidenceService(prisma as unknown as TriageEvidenceDb),
    operator: new TriageOperatorService(prisma),
    proposals: new InvestigationProposals(prisma, evaluateSnapshotPolicy),
    authority: new InvestigationAuthority(prisma, revalidateProposalPolicy),
    notifications,
}))

let draining = false;
setInterval(async () => {
    if (draining) return;
    draining = true;
    try { await notifications.drain(); }
    catch (error) { console.error('Decision notification retry unavailable', error); }
    finally { draining = false; }
}, 5_000);

app.listen(PORT,()=>{
    console.log("primary-backend running 3002")
})
