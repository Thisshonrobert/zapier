import { Router } from "express";
import { prisma } from "../../../packages/db/prisma/db"
import { ZapScehema } from "../types/zodtypes";
const router = Router();
import { authMiddleware } from "../middleware";

router.post("/", authMiddleware, async (req, res) => {
    // @ts-ignore
    const id: string = req.id;
    const parsed = ZapScehema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(411).json({
            message: "Incorrect inputs."
        })
    } 
    const zap = await prisma.zap.create({
        data: {
          userId: parseInt(id),
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