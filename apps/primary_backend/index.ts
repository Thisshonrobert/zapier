import express from 'express';
import cors from 'cors';
import { actionRouter } from './route/action';
import { triggerRouter } from './route/trigger';
import { userRouter } from './route/user';
import { zapRouter } from './route/zap';
import { createTriageRouter } from './route/triage';
import { TriageEvidenceService, type TriageEvidenceDb } from './services/triage-evidence';
import { prisma } from '../../packages/db/prisma/db';

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());


app.use("/api/v1/user",userRouter)
app.use("/api/v1/zap",zapRouter)
app.use("/api/v1/trigger",triggerRouter)
app.use("/api/v1/action",actionRouter)
app.use("/api/v1/triage",createTriageRouter({
    evidence: new TriageEvidenceService(prisma as unknown as TriageEvidenceDb),
}))

app.listen(PORT,()=>{
    console.log("primary-backend running 3002")
})
