//It handles cases where the database and execution state are inconsistent.
const STALE = Symbol("stale reconciliation");

type ExecutionRow = {
  id: string;
  zapRunId: string;
  stage: number;
  status: string;
  claimToken: string | null;
  actionFingerprint: string | null;
  requestFingerprint: string | null;
};

type ReconcilerTx = {
  zapRunExecution: {
    updateMany(args: object): Promise<{ count: number }>;
  };
  zapRunExecutionAttempt: {
    updateMany(args: object): Promise<{ count: number }>;
  };
  zapRunRetry: {
    create(args: object): Promise<{ id: string }>;
  };
};

export type ReconcilerDb = {
  zapRunExecution: {
    findFirst(args: object): Promise<ExecutionRow | null>;
  };
  $transaction<T>(fn: (tx: ReconcilerTx) => Promise<T>): Promise<T>;
};

const isUniqueError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "P2002";

export function createDlqReconciler(
  db: ReconcilerDb,
  options: { now?: () => Date } = {},
) {
  const now = options.now ?? (() => new Date());

  const reconcileExpired = async (execution: ExecutionRow, timestamp: Date) => {
    await db.$transaction(async (tx) => {
      const fenced = await tx.zapRunExecution.updateMany({
        where: {
          id: execution.id,
          status: "PENDING",
          claimToken: execution.claimToken,
          OR: [{ leaseUntil: { lte: timestamp } }, { leaseUntil: null }],
        },
        data: {
          status: "FAILED",
          leaseUntil: null,
          completedAt: timestamp,
          providerOutcome: "unknown",
          requiresHuman: true,
        },
      });
      if (fenced.count !== 1) throw STALE;
      const attempts = await tx.zapRunExecutionAttempt.updateMany({
        where: { executionId: execution.id, status: "STARTED" },
        data: {
          status: "UNKNOWN",
          safeCode: "lease_expired",
          completedAt: timestamp,
        },
      });
      await tx.zapRunRetry.create({
        data: {
          zapRunId: execution.zapRunId,
          stage: execution.stage,
          attempt: attempts.count > 0 ? 1 : 0,
          executionId: execution.id,
          provider: null,
          phase: null,
          providerOutcome: "unknown",
          safeCode: "lease_expired",
          actionFingerprint: execution.actionFingerprint,
          requestFingerprint: execution.requestFingerprint,
          requiresHuman: true,
          evidenceSource: "reconciled_execution",
        },
      });
    });
  };

  const repairFailed = async (execution: ExecutionRow) => {
    await db.$transaction(async (tx) => {
      const fenced = await tx.zapRunExecution.updateMany({
        where: {
          id: execution.id,
          status: "FAILED",
          claimToken: execution.claimToken,
          failure: { is: null },
        },
        data: { requiresHuman: true },
      });
      if (fenced.count !== 1) throw STALE;
      await tx.zapRunRetry.create({
        data: {
          zapRunId: execution.zapRunId,
          stage: execution.stage,
          attempt: 0,
          executionId: execution.id,
          provider: null,
          phase: null,
          providerOutcome: "unknown",
          safeCode: "missing_failure_record",
          actionFingerprint: execution.actionFingerprint,
          requestFingerprint: execution.requestFingerprint,
          requiresHuman: true,
          evidenceSource: "reconciled_execution",
        },
      });
    });
  };

  return {
    async reconcileNext(): Promise<
      "EMPTY" | "QUARANTINED" | "REPAIRED" | "STALE"
    > {
      const timestamp = now();
      const expired = await db.zapRunExecution.findFirst({
        where: {
          status: "PENDING",
          OR: [{ leaseUntil: { lte: timestamp } }, { leaseUntil: null }],
        },
        orderBy: { createdAt: "asc" },
      });
      try {
        if (expired) {
          await reconcileExpired(expired, timestamp);
          return "QUARANTINED";
        }
        const failed = await db.zapRunExecution.findFirst({
          where: { status: "FAILED", failure: { is: null } },
          orderBy: { createdAt: "asc" },
        });
        if (!failed) return "EMPTY";
        await repairFailed(failed);
        return "REPAIRED";
      } catch (error) {
        if (error === STALE || isUniqueError(error)) return "STALE";
        throw error;
      }
    },
  };
}
/**ZapRunExecution = PENDING
leaseUntil      = expired

It converts it into:
FAILED
providerOutcome = unknown
safeCode = lease_expired */