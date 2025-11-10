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

export const triggerRouter = router;