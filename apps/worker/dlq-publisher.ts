//publishing business logic LIKE FIND FAILURE, CLAIM LEASE, PUBLISH TO SINK, AND UPDATE DB
const CLAIM_LEASE_MS = 2 * 60 * 1000;
const MAX_BACKOFF_MS = 60 * 1000;
const SAFE_CODE = /^[a-z0-9_]{1,64}$/;

const providerOutcomes = new Set(["rejected", "not_attempted", "unknown"]);
const evidenceSources = new Set([
  "captured",
  "reconciled_execution",
  "legacy_unknown",
]);

type FailureRow = {
  id: string;
  zapRunId: string;
  stage: number;
  attempt: number;
  providerOutcome: string | null;
  safeCode: string | null;
  evidenceSource: string | null;
  createdAt: Date;
  dlqPublishAttempts: number;
};

export type DurableFailureEvent = {
  failureId: string;
  zapRunId: string;
  stage: number;
  attempt: number;
  providerOutcome: "rejected" | "not_attempted" | "unknown";
  safeCode: string;
  requiresHuman: true;
  evidenceSource: "captured" | "reconciled_execution" | "legacy_unknown";
  failedAt: string;
};

export type DlqPublisherDb = {
  zapRunRetry: {
    findMany(args: object): Promise<FailureRow[]>;
    findUnique(args: object): Promise<FailureRow | null>;
    updateMany(args: object): Promise<{ count: number }>;
  };
};

type Sink = { send(message: { key: string; value: string }): Promise<void> };

const dueWhere = (now: Date) => ({
  dlqPublishedAt: null,
  AND: [
    { OR: [{ dlqNextAttemptAt: null }, { dlqNextAttemptAt: { lte: now } }] },
    {
      OR: [
        { dlqPublishLeaseUntil: null },
        { dlqPublishLeaseUntil: { lte: now } },
      ],
    },
  ],
});

const eventFrom = (row: FailureRow, now: Date): DurableFailureEvent => ({
  failureId: row.id,
  zapRunId: row.zapRunId,
  stage: Number.isInteger(row.stage) && row.stage >= 0 ? row.stage : 0,
  attempt: Number.isInteger(row.attempt) && row.attempt >= 0 ? row.attempt : 0,
  providerOutcome: providerOutcomes.has(row.providerOutcome ?? "")
    ? (row.providerOutcome as DurableFailureEvent["providerOutcome"])
    : "unknown",
  safeCode: SAFE_CODE.test(row.safeCode ?? "")
    ? row.safeCode!
    : "legacy_unknown",
  requiresHuman: true,
  evidenceSource: evidenceSources.has(row.evidenceSource ?? "")
    ? (row.evidenceSource as DurableFailureEvent["evidenceSource"])
    : "legacy_unknown",
  failedAt:
    row.createdAt instanceof Date && Number.isFinite(row.createdAt.getTime())
      ? row.createdAt.toISOString()
      : now.toISOString(),
});

export function createDlqPublisher(
  db: DlqPublisherDb,
  sink: Sink,
  options: { now?: () => Date; randomUUID?: () => string } = {},
) {
  const now = options.now ?? (() => new Date());
  const randomUUID = options.randomUUID ?? crypto.randomUUID.bind(crypto);

  const claimNext = async (): Promise<
    (FailureRow & { claimToken: string }) | null
  > => {
    const timestamp = now();
    const candidates = await db.zapRunRetry.findMany({
      where: dueWhere(timestamp),
      orderBy: { createdAt: "asc" },
      take: 10,
    });
    for (const candidate of candidates) {
      const claimToken = randomUUID();
      const claimed = await db.zapRunRetry.updateMany({
        where: { id: candidate.id, ...dueWhere(timestamp) },
        data: {
          dlqPublishClaimToken: claimToken,
          dlqPublishLeaseUntil: new Date(timestamp.getTime() + CLAIM_LEASE_MS),
          dlqPublishAttempts: { increment: 1 },
        },
      });
      if (claimed.count !== 1) continue;
      const row = await db.zapRunRetry.findUnique({
        where: { id: candidate.id },
      });
      if (row) return { ...row, claimToken };
    }
    return null;
  };

  return {
    async publishNext(): Promise<
      "EMPTY" | "PUBLISHED" | "RETRY_SCHEDULED" | "STALE"
    > {
      const claimed = await claimNext();
      if (!claimed) return "EMPTY";
      try {
        await sink.send({
          key: claimed.id,
          value: JSON.stringify(eventFrom(claimed, now())),
        });
      } catch {
        const exponent = Math.min(
          Math.max(claimed.dlqPublishAttempts - 1, 0),
          6,
        );
        const retryAt = new Date(
          now().getTime() + Math.min(MAX_BACKOFF_MS, 1000 * 2 ** exponent),
        );
        const released = await db.zapRunRetry.updateMany({
          where: {
            id: claimed.id,
            dlqPublishedAt: null,
            dlqPublishClaimToken: claimed.claimToken,
          },
          data: {
            dlqPublishClaimToken: null,
            dlqPublishLeaseUntil: null,
            dlqNextAttemptAt: retryAt,
          },
        });
        return released.count === 1 ? "RETRY_SCHEDULED" : "STALE";
      }

      const publishedAt = now();
      const stamped = await db.zapRunRetry.updateMany({
        where: {
          id: claimed.id,
          dlqPublishedAt: null,
          dlqPublishClaimToken: claimed.claimToken,
        },
        data: {
          dlqPublishedAt: publishedAt,
          dlqPublishClaimToken: null,
          dlqPublishLeaseUntil: null,
          dlqNextAttemptAt: null,
        },
      });
      return stamped.count === 1 ? "PUBLISHED" : "STALE";
    },
  };
}
