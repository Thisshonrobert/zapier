import { prisma } from "../../../packages/db/prisma/db.ts";
import { createFingerprints } from "../../worker/execution-store.ts";
import { validateActionInputs } from "../../worker/validation.ts";

export const F01_CASE_ID = "f0100000-0000-4000-8000-000000000001";
const zapId = "f0100000-0000-4000-8000-000000000002";
const runId = "f0100000-0000-4000-8000-000000000003";
const predecessorActionId = "f0100000-0000-4000-8000-000000000004";
const telegramActionId = "f0100000-0000-4000-8000-000000000005";
const predecessorExecutionId = "f0100000-0000-4000-8000-000000000006";
const failedExecutionId = "f0100000-0000-4000-8000-000000000007";
const ownerEmail = "dev-f01-owner@example.invalid";
const fixtureName = "DEV ONLY - F01 Telegram 429";
const runMetadata = { fixture: "dev-f01-telegram-429" };
const predecessorMetadata = {
  to: "dev-only@example.invalid",
  subject: "Dev fixture",
  body: "No email is sent",
};
const telegramMetadata = {
  channelUserName: "devonlyfixture",
  message: "Dev fixture: no Telegram call",
  botToken: "0:dev-only-invalid-token",
};
const predecessorCompletedAt = new Date("2026-09-28T00:00:00.000Z");
const failedStartedAt = new Date("2026-09-28T00:01:00.000Z");
const failedCompletedAt = new Date("2026-09-28T00:01:01.000Z");

function assertLocalDatabase() {
  const url = process.env.DATABASE_URL;
  if (process.env.NODE_ENV === "production" || !url) {
    throw new Error("F01 seed requires a local development database");
  }
  const parsed = new URL(url);
  if (
    !(
      ["postgres:", "postgresql:"].includes(parsed.protocol) &&
      ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)
    )
  ) {
    throw new Error("F01 seed refuses non-local databases");
  }
}

export async function seedF01Case(
  mode: "seed" | "reset",
): Promise<{ caseId: string; ownerId: number; runId: string }> {
  assertLocalDatabase();
  const [owner, zap, existingCase] = await Promise.all([
    prisma.user.findUnique({ where: { email: ownerEmail } }),
    prisma.zap.findUnique({ where: { id: zapId } }),
    prisma.zapRunRetry.findUnique({ where: { id: F01_CASE_ID } }),
  ]);
  if (owner && owner.name !== "Dev F01 fixture owner") {
    throw new Error("F01 fixture owner email belongs to another record");
  }
  if (zap && (zap.name !== fixtureName || zap.userId !== owner?.id)) {
    throw new Error("F01 fixture Zap ID belongs to another record");
  }
  if (existingCase && existingCase.zapRunId !== runId) {
    throw new Error("F01 fixture case ID belongs to another run");
  }
  if (mode === "reset") {
    const [run, actions, executions] = await Promise.all([
      prisma.zapRun.findUnique({ where: { id: runId } }),
      prisma.action.findMany({
        where: { id: { in: [predecessorActionId, telegramActionId] } },
      }),
      prisma.zapRunExecution.findMany({
        where: { id: { in: [predecessorExecutionId, failedExecutionId] } },
      }),
    ]);
    if (
      (run && run.zapId !== zapId) ||
      actions.some((action) => action.zapId !== zapId) ||
      executions.some((execution) => execution.zapRunId !== runId)
    ) {
      throw new Error("F01 fixture IDs belong to another workflow");
    }
  }
  if (mode === "seed" && existingCase) {
    return { caseId: F01_CASE_ID, ownerId: owner!.id, runId };
  }

  const validation = validateActionInputs({
    actionType: "telegram",
    actionMetadata: telegramMetadata,
    zapRunMetadata: runMetadata,
  });
  if (validation.validation_status !== "valid")
    throw new Error("F01 Telegram inputs are invalid");
  const predecessorFingerprints = createFingerprints({
    zapRunId: runId,
    stage: 0,
    actionId: predecessorActionId,
    actionTypeId: "email",
    actionMetadata: predecessorMetadata,
    zapRunMetadata: runMetadata,
  });
  const fingerprints = createFingerprints({
    zapRunId: runId,
    stage: 1,
    actionId: telegramActionId,
    actionTypeId: "telegram",
    actionMetadata: telegramMetadata,
    zapRunMetadata: runMetadata,
  });

  const ownerId = await prisma.$transaction(async (tx) => {
    if (mode === "reset") {
      await tx.zapRunRetry.deleteMany({ where: { id: F01_CASE_ID } });
      await tx.zapRunExecutionAttempt.deleteMany({
        where: {
          executionId: { in: [predecessorExecutionId, failedExecutionId] },
        },
      });
      await tx.zapRunExecution.deleteMany({
        where: { id: { in: [predecessorExecutionId, failedExecutionId] } },
      });
      await tx.zapRun.deleteMany({ where: { id: runId } });
      await tx.action.deleteMany({
        where: { id: { in: [predecessorActionId, telegramActionId] } },
      });
      await tx.zap.deleteMany({ where: { id: zapId } });
    }
    const fixtureOwner = await tx.user.upsert({
      where: { email: ownerEmail },
      update: {},
      create: { name: "Dev F01 fixture owner", email: ownerEmail },
    });
    await tx.zap.create({
      data: { id: zapId, name: fixtureName, userId: fixtureOwner.id },
    });
    await tx.action.createMany({
      data: [
        {
          id: predecessorActionId,
          zapId,
          actionId: "email",
          sortingOrder: 0,
          metadata: predecessorMetadata,
        },
        {
          id: telegramActionId,
          zapId,
          actionId: "telegram",
          sortingOrder: 1,
          metadata: telegramMetadata,
        },
      ],
    });
    await tx.zapRun.create({
      data: { id: runId, zapId, metadata: runMetadata },
    });
    await tx.zapRunExecution.createMany({
      data: [
        {
          id: predecessorExecutionId,
          zapRunId: runId,
          stage: 0,
          status: "SUCCESS",
          completedAt: predecessorCompletedAt,
          providerOutcome: "accepted",
          ...predecessorFingerprints,
        },
        {
          id: failedExecutionId,
          zapRunId: runId,
          stage: 1,
          status: "FAILED",
          completedAt: failedCompletedAt,
          providerOutcome: "rejected",
          requiresHuman: true,
          ...fingerprints,
        },
      ],
    });
    await tx.zapRunExecutionAttempt.createMany({
      data: [
        {
          executionId: predecessorExecutionId,
          attemptNumber: 1,
          status: "ACCEPTED",
          provider: "email",
          phase: "send",
          safeCode: "email_accepted",
          startedAt: predecessorCompletedAt,
          completedAt: predecessorCompletedAt,
          ...predecessorFingerprints,
        },
        {
          executionId: failedExecutionId,
          attemptNumber: 1,
          status: "REJECTED",
          provider: "telegram",
          phase: "send",
          safeCode: "telegram_http_429",
          providerStatus: 429,
          retryAfterSeconds: 60,
          startedAt: failedStartedAt,
          completedAt: failedCompletedAt,
          ...fingerprints,
        },
      ],
    });
    await tx.zapRunRetry.create({
      data: {
        id: F01_CASE_ID,
        zapRunId: runId,
        stage: 1,
        attempt: 1,
        executionId: failedExecutionId,
        provider: "telegram",
        phase: "send",
        providerOutcome: "rejected",
        safeCode: "telegram_http_429",
        providerStatus: 429,
        retryAfterSeconds: 60,
        requiresHuman: true,
        evidenceSource: "captured",
        nextRunAt: new Date(failedCompletedAt.getTime() + 60_000),
        createdAt: failedCompletedAt,
        lastError: "[DEV FIXTURE] Telegram rejected send with HTTP 429",
        ...fingerprints,
      },
    });
    return fixtureOwner.id;
  });
  return { caseId: F01_CASE_ID, ownerId, runId };
}

if (import.meta.main) {
  const mode = Bun.argv[2];
  if (mode !== "seed" && mode !== "reset") {
    console.error("Usage: bun tests/seed-f01-case.ts seed|reset");
    process.exitCode = 2;
  } else {
    try {
      console.log(JSON.stringify(await seedF01Case(mode)));
    } catch (error) {
      console.error(error instanceof Error ? error.message : "F01 seed failed");
      process.exitCode = 1;
    } finally {
      await prisma.$disconnect();
    }
  }
}
