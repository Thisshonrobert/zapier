import { assertLabBrokers, assertLabDatabase, labResources } from "../../packages/triage-contracts/lab-profile.ts";
import { replayRelease, LAB_REPLAY_PROFILE, type ReplayRelease } from "../../apps/primary_backend/services/replay-release.ts";

/**
 * Pure environment guard for the replay-enabled lab. It has no database, broker or model
 * dependency, so it can be checked without a running lab: it refuses anything that is not
 * the marked lab holding the published ownership fingerprint, and it refuses a release
 * profile that the application gate would not honour.
 */
export function assertLabReplayRuntime(env: Record<string, string | undefined>, verify?: () => boolean): ReplayRelease {
  assertLabDatabase(env.DATABASE_URL ?? "", env.NODE_ENV);  assertLabBrokers(env.KAFKA_BROKERS ?? "");
  const resources = labResources(env.TRIAGE_LAB_ID ?? "");
  if (env.TRIAGE_LAB !== "true" || env.TRIAGE_LAB_REPLAY_PROFILE !== LAB_REPLAY_PROFILE ||
    !/^[a-f0-9]{64}$/.test(env.TRIAGE_LAB_RESOURCE_FINGERPRINT ?? "") ||
    env.KAFKA_EVENTS_TOPIC !== resources.eventsTopic || env.KAFKA_DLQ_TOPIC !== resources.dlqTopic ||
    env.KAFKA_WORKER_GROUP !== resources.workerGroup) throw new Error("Lab replay environment refused");
  const release = replayRelease(env, verify);
  if (!release.executionEnabled || release.labProfile !== LAB_REPLAY_PROFILE)
    throw new Error(`Lab replay release refused: ${release.reasons.join(",") || "unknown"}`);
  return release;
}
