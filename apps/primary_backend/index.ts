import express from 'express';
import cors from 'cors';
import { actionRouter } from './route/action';
import { triggerRouter } from './route/trigger';
import { userRouter } from './route/user';
import { zapRouter } from './route/zap';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());


app.use("/api/v1/user",userRouter)
app.use("/api/v1/zap",zapRouter)
app.use("/api/v1/trigger",triggerRouter)
app.use("/api/v1/action",actionRouter)

app.listen(PORT,()=>{
    console.log("primary-backend running 3001")
})