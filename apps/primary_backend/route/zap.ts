import { Router } from "express";
import { prisma } from "../../../packages/db/prisma/db"
import { ZapScehema } from "../types/zodtypes";
const router = Router();
import { authMiddleware } from "../middleware";

router.post("/create", authMiddleware, async (req, res) => {
    const id = req.id;
    const parsed = ZapScehema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(411).json({
            message: "Incorrect inputs."
        })
    } 
    const zap = await prisma.zap.create({
        data: {
          userId: id,
          name: parsed.data.name,
          time: new Date(),
          actions: {                                
            create: parsed.data.actions.map((action, index) => ({
              actionId: action.availableActionId,
              metadata: action.actionMetadata,
              sortingOrder: index,
            })),
          },
          trigger: {                              
            create: {
              typeId: parsed.data.availableTriggerId,
            },
          },
        },
        include: {                                 
          trigger: { include: { type: true } },
          actions:  { include: { type: true } },
        },
      });
      
    return res.json({ zapId: zap.id });
})

router.get("/",authMiddleware, async (req, res) => {
    const id = req.id;
    const zaps = await prisma.zap.findMany({
        where: {
            userId: id,
        },
        include: {
            trigger: { include: { type: true } },
            actions: { include: { type: true } },
        },
    });
    return res.json({ zaps });
})

// Zap history: every run of every zap owned by the user.
// Status is derived from the outbox row: still queued => "running", drained => "success".
router.get("/runs", authMiddleware, async (req, res) => {
    const id = req.id;
    const runs = await prisma.zapRun.findMany({
        where: {
            zap: { userId: id },
        },
        include: {
            zapRunOutbox: true,
            zap: {
                include: {
                    trigger: { include: { type: true } },
                    actions: { include: { type: true } },
                },
            },
        },
    });

    return res.json({
        runs: runs.map((run) => ({
            id: run.id,
            zapId: run.zapId,
            metadata: run.metadata,
            status: run.zapRunOutbox ? "running" : "success",
            zap: {
                id: run.zap.id,
                name: run.zap.name,
                time: run.zap.time,
                trigger: run.zap.trigger,
                actions: run.zap.actions,
            },
        })),
    });
})

router.get("/:id",authMiddleware, async (req, res) => {
    const id = req.id;
    const zapId = req.params.id;
    const zap = await prisma.zap.findFirst({
        where: {
            id: zapId,
            userId: id,
        },
        include: {
            trigger: { include: { type: true } },
            actions: { include: { type: true } },
        },
    });
    return res.json({ zap });
})
export const zapRouter = router;