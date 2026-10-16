import { labResources, labResourceFingerprint } from "../../../packages/triage-contracts/lab-profile.ts";

/** The only profile value that unlocks the replay release gate. Anything else fails closed. */
export const LAB_REPLAY_PROFILE = "triage-lab-v1";

// The production constant stays false. Section 5 provider-semantics confirmation and the
// current release checks own the production activation, so nothing in this module relaxes it.
export const REPLAY_RELEASE_READY = false;

export type ReplayRelease = {
  executionEnabled: boolean;
  releaseReady: boolean;
  labProfile: string | null;
  reasons: string[];
};

export const RELEASE_REASONS = {
  releaseNotReady: "release_not_ready",
  replaySwitchOff: "replay_switch_off",
  labProfileMissing: "lab_profile_missing",
  labEnvironmentInvalid: "lab_environment_invalid",
  labEnvironmentMismatch: "lab_environment_mismatch",
  verificationFailed: "lab_verification_failed",
} as const;

/**
 * The replay release gate. `REPLAY_RELEASE_READY=true` by itself never unlocks dispatch or
 * worker execution: the environment must also be a marked lab whose published ownership
 * fingerprint matches the database and broker resources it is actually configured with,
 * and the caller may add a verification callback (ownership marker, migration state) that
 * fails closed.
 */
export function replayRelease(env: Record<string, string | undefined> = process.env, verify?: () => boolean): ReplayRelease {
  // Production is never a replay environment, marked or not.
  const marked = env.NODE_ENV !== "production" && env.TRIAGE_LAB === "true";
  const profile = marked && env.TRIAGE_LAB_REPLAY_PROFILE === LAB_REPLAY_PROFILE
    ? LAB_REPLAY_PROFILE : null;
  const executionEnabled = env.REPLAY_ENABLED === "true";
  const releaseReady = REPLAY_RELEASE_READY || env.REPLAY_RELEASE_READY === "true";
  const databaseUrl = env.DATABASE_URL ?? "";
  const configured = marked ? labResourceFingerprint({ databaseUrl, brokers: env.KAFKA_BROKERS ?? "" }) : null;
  const published = env.TRIAGE_LAB_RESOURCE_FINGERPRINT ?? "";
  // The published fingerprint binds the database and brokers. The lab id must also be
  // present, because every owned topic and consumer-group name derives from it, so a mixed
  // identity is caught here instead of silently reporting a capability dispatch cannot use.
  const resources = marked && /^[a-f0-9]{32}$/.test(env.TRIAGE_LAB_ID ?? "")
    ? labResources(env.TRIAGE_LAB_ID!) : null;
  const bound = configured !== null && resources !== null &&
    env.KAFKA_EVENTS_TOPIC === resources.eventsTopic && env.KAFKA_DLQ_TOPIC === resources.dlqTopic &&
    env.KAFKA_WORKER_GROUP === resources.workerGroup &&
    /^[a-f0-9]{64}$/.test(published) && configured === published;

  const reasons = new Set<string>();
  if (!releaseReady) reasons.add(RELEASE_REASONS.releaseNotReady);
  if (!executionEnabled) reasons.add(RELEASE_REASONS.replaySwitchOff);
  // Binding alone would accept a lab identity with no replay profile, or one bound to
  // different lab resources. Every element is required, and any missing one fails closed.
  let verified = false;
  if (!marked) reasons.add(RELEASE_REASONS.labEnvironmentInvalid);
  else if (!profile) reasons.add(RELEASE_REASONS.labProfileMissing);
  if (!bound) reasons.add(RELEASE_REASONS.labEnvironmentMismatch);
  if (marked && profile && bound) {
    try { verified = verify ? verify() : true; }
    catch { verified = false; }
    if (!verified) reasons.add(RELEASE_REASONS.verificationFailed);
  }
  const enabled = releaseReady && executionEnabled && profile !== null && bound && verified;
  return { executionEnabled: enabled, releaseReady,
    labProfile: enabled ? profile : null, reasons: [...reasons] };
}

/** The single gate used by the dispatcher and the worker claim path. */
export const liveReplayEnabled = (verify?: () => boolean) => replayRelease(process.env, verify).executionEnabled;

/**
 * What the operator surface may report before any request exists. Capability is reported
 * separately from authorization: recording intent still requires support permission and a
 * live lease is revalidated again when a worker claims the stage.
 */
export function replayCapabilities(env: Record<string, string | undefined> = process.env, verify?: () => boolean) {
  const release = replayRelease(env, verify);
  const reasons = [...release.reasons];
  if (env.REPLAY_INTENT_ENABLED !== "true") reasons.unshift("replay_intent_disabled");
  return {
    investigation: env.INVESTIGATION_ENABLED === "true",
    replayIntent: env.REPLAY_INTENT_ENABLED === "true",
    replayExecution: release.executionEnabled,
    releaseReady: release.releaseReady,
    labProfile: release.labProfile,
    reasons: reasons.slice(0, 8),
  };
}
