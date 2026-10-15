import express from "express";
import type { prisma } from "../../packages/db/prisma/db";

type WebhookDb = Pick<typeof prisma, "$transaction" | "testTriggerBuffer">;

export function createWebhookApp(db: WebhookDb, secret: string | undefined) {
  const app = express();
  app.use(express.json());
  app.post("/hooks/catch/:userId/:zapId", async (req, res) => {
    if (!secret || req.headers["x-zap-secret"] !== secret) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const owner = req.params.userId;
    const userId = Number(owner);
    if (!/^[1-9]\d*$/.test(owner) || !Number.isSafeInteger(userId) || userId > 2_147_483_647) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    // Validate the ownership join in the same transaction as the durable ingestion.
    const result = await db.$transaction(async tx => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) return "User not found";
      const zap = await tx.zap.findFirst({ where: { id: req.params.zapId, userId } });
      if (!zap) return "Zap not found";
      const run = await tx.zapRun.create({ data: { zapId: zap.id, metadata: req.body } });
      await tx.zapRunOutbox.create({ data: { zapRunId: run.id } });
      return null;
    });
    if (result) return res.status(404).json({ message: result });
    return res.json({ message: "webhook recieved" });
  });
  // Preserve the existing temporary trigger-capture API; it is not a workflow run.
  app.post("/hooks/catch/test/:userId/:tempZapId", async (req, res) => {
    const userId = parseInt(req.params.userId);
    const tempZapId = req.params.tempZapId;
    const existing = await db.testTriggerBuffer.findFirst({ where: { tempZapId } });
    if (existing) {
      await db.testTriggerBuffer.update({ where: { id: existing.id }, data: { payload: req.body } });
    } else {
      await db.testTriggerBuffer.create({ data: { tempZapId, userId, payload: req.body } });
    }
    return res.json({ message: "test webhook recieved" });
  });
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = (error as { status?: number })?.status;
    if (status === 400 || status === 413) return res.status(status).json({ error: "Invalid request body" });
    return res.status(500).json({ error: "Webhook ingestion unavailable" });
  });
  return app;
}
