import express from 'express';
import cors from 'cors';
import { actionRouter } from './route/action';
import { triggerRouter } from './route/trigger';
import { userRouter } from './route/user';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());


app.use("/api/v1/user",userRouter)
app.use("/api/v1/zap",zapRouter)
app.use("/api/v1/trigger",triggerRouter)
app.use("/api/v1/action",actionRouter)

app.listen(3001,()=>{
    console.log("primary-backend running 3001")
})