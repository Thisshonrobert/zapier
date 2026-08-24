export const DLQ_TOPIC = "zap-events-dlq";

type Sinks = {
  send: (payload: object) => Promise<void>;
  record: (row: {
    zapRunId: string;
    stage: number;
    attempt: number;
    lastError: string;
  }) => Promise<void>;
};

/**
 * Park an event that ran out of retries: one Kafka message for replay, one
 * Postgres row for inspection. Each sink is tried independently, and both
 * failures are swallowed — losing a dead letter is bad, but throwing here
 * would kill the consumer loop and lose every event behind it too.
 */
export async function deadLetter(
  sinks: Sinks,
  zapRunId: string,
  stage: number,
  attempt: number,
  error: unknown
) {
  const lastError = error instanceof Error ? error.message : String(error);

  try {
    await sinks.send({
      zapRunId,
      stage,
      attempt,
      error: lastError,
      failedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("dead-letter publish failed", { zapRunId, stage, err });
  }

  try {
    await sinks.record({ zapRunId, stage, attempt, lastError });
  } catch (err) {
    console.error("dead-letter record failed", { zapRunId, stage, err });
  }
}
