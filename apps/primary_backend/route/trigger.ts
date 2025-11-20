import { Router } from "express";
import {prisma} from "../../../packages/db/prisma/db"
const router = Router();

router.get("/available",async (req, res) => {
    const available_triggers  = await prisma.availableTriggerType.findMany({
        where:{}
    })
    return res.json({
        available_triggers
    })
});

router.get("/test/result/:tempZapId",async(req,res)=>{
   const tempZapId = req.params.tempZapId;
    const testResult = await prisma.testTriggerBuffer.findFirst({
        where:{
            tempZapId:tempZapId
        }
    })

    return res.json({
        testResult
    })

})

export const triggerRouter = router;