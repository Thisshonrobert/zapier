import  express  from "express";
import { prisma } from "../../packages/db/prisma/db";

const app = express();

app.use(express.json());

app.post("/hooks/catch/:userId/:zapId", async (req, res) => {
  const userId = req.params.userId;
  const zapId = req.params.zapId;
  const body = req.body;

  console.log("Webhook received:", { userId, zapId });


  const user =  await prisma.user.findUnique({
    where: {
      id: parseInt(userId),
    }
  });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  const zap = await prisma.zap.findUnique({
    where: {
      id: zapId,
    }
  });
  if (!zap) {
    return res.status(404).json({ message: "Zap not found" });
  }

  await prisma.$transaction(async tx => {
    console.log("Reached here 2");

    const run = await tx.zapRun.create({
      data: {
        zapId: zapId,
        metadata: body,
      },
    });
    console.log("Reached here 3");

    await tx.zapRunOutbox.create({
      data: {
        zapRunId: run.id,
      },
    });
  });
  res.json({
    message: "webhook recieved",
  });
});
app.listen(3002, () => {
  console.log("Hooks server is running on localhost:3002");
})
