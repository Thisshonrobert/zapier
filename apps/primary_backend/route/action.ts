import { Router } from "express";
import {prisma} from "../../../packages/db/prisma/db"
const router = Router();

router.get("/available",async (req, res) => {
    const available_actions  = await prisma.availableAction.findMany({
        where:{}
    })
    return res.json({
        available_actions
    })
});

export const actionRouter = router;