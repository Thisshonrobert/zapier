import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  LAB_REPLAY_PROFILE,
  REPLAY_RELEASE_READY,
  liveReplayEnabled,
  replayCapabilities,
  replayRelease,
} from "../services/replay-release.ts";
import { assertLabReplayRuntime } from "../../../scripts/dev/triage-lab-replay-environment.ts";
import { labResourceFingerprint, labResources } from "../../../packages/triage-contracts/lab-profile.ts";

const labId = "a".repeat(32);
const resources = labResources(labId);
const brokers = "127.0.0.1:9092";
const url = "postgresql://lab:lab@127.0.0.1:5432/triage_lab?schema=public";
const fingerprint = labResourceFingerprint({ databaseUrl: url, brokers })!;
const marked = {  DATABASE_URL: url, KAFKA_BROKERS: brokers, NODE_ENV: "development", TRIAGE_LAB: "true",
  TRIAGE_LAB_ID: labId, TRIAGE_LAB_RESOURCE_FINGERPRINT: fingerprint, TRIAGE_LAB_REPLAY_PROFILE: LAB_REPLAY_PROFILE,
  REPLAY_ENABLED: "true", REPLAY_RELEASE_READY: "true",
  KAFKA_EVENTS_TOPIC: resources.eventsTopic, KAFKA_DLQ_TOPIC: resources.dlqTopic, KAFKA_WORKER_GROUP: resources.workerGroup,
};

/** Absence, rather than an `undefined` value, is the real configuration failure. */
const without = (...keys: (keyof typeof marked)[]) => {
  const env: Record<string, string | undefined> = { ...marked };
  for (const key of keys) delete env[key];
  return env;
};

describe("Phase 16F replay release profile", () => {
  test("the production release constant stays false", () => {
    assert.equal(REPLAY_RELEASE_READY, false);
  });

  test("only the fully verified marked lab unlocks dispatch and worker execution", () => {
    const release = replayRelease(marked);
    assert.equal(release.executionEnabled, true);
    assert.equal(release.labProfile, LAB_REPLAY_PROFILE);
    assert.deepEqual(release.reasons, []);
    assert.equal(liveReplayEnabled(), false); // the process environment is not the lab
  });

  test("REPLAY_RELEASE_READY=true alone never unlocks anything", () => {
    for (const env of [
      without("TRIAGE_LAB"),
      without("TRIAGE_LAB_REPLAY_PROFILE"),
      { ...marked, TRIAGE_LAB_REPLAY_PROFILE: "triage-lab-v2" },
      { ...marked, TRIAGE_LAB_ID: "b".repeat(32) },
      { ...marked, TRIAGE_LAB_RESOURCE_FINGERPRINT: "c".repeat(64) },
      { ...marked, KAFKA_BROKERS: "127.0.0.1:9093" },
      { ...marked, DATABASE_URL: "postgresql://lab:lab@127.0.0.1:5432/mydatabase?schema=public" },
      { ...marked, DATABASE_URL: "postgresql://lab:lab@db.internal:5432/triage_lab?schema=public" },
      { ...marked, NODE_ENV: "production" },
      { ...marked, TRIAGE_LAB: "false" },
    ]) {
      const release = replayRelease(env);
      assert.equal(release.executionEnabled, false, `unexpected enablement for ${JSON.stringify(env)}`);
      assert.equal(release.labProfile, null);
      assert.ok(release.reasons.length > 0);
    }
  });

  test("a named but unproven lab override fails closed with reasons", () => {
    const override = replayRelease({ DATABASE_URL: url, KAFKA_BROKERS: brokers, NODE_ENV: "development",
      REPLAY_ENABLED: "true", REPLAY_RELEASE_READY: "true" });
    assert.equal(override.executionEnabled, false);
    assert.ok(override.reasons.includes("lab_environment_invalid"));
    assert.ok(override.reasons.includes("lab_environment_mismatch"));
  });

  test("missing switches and a failing verification callback keep the gate closed", () => {
    assert.equal(replayRelease({ ...marked, REPLAY_ENABLED: "false" }).executionEnabled, false);
    assert.deepEqual(replayRelease({ ...marked, REPLAY_ENABLED: "false" }).reasons, ["replay_switch_off"]);
    const rejected = replayRelease(marked, () => false);
    assert.equal(rejected.executionEnabled, false);
    assert.deepEqual(rejected.reasons, ["lab_verification_failed"]);
    const thrown = replayRelease(marked, () => { throw new Error("marker mismatch"); });
    assert.equal(thrown.executionEnabled, false);
    assert.deepEqual(thrown.reasons, ["lab_verification_failed"]);
  });

  test("the lab runtime guard refuses unmarked or mismatched resources", () => {
    assert.doesNotThrow(() => assertLabReplayRuntime(marked));
    for (const env of [
      without("TRIAGE_LAB"),
      without("TRIAGE_LAB_RESOURCE_FINGERPRINT"),
      { ...marked, KAFKA_EVENTS_TOPIC: "zap-events" },
      { ...marked, DATABASE_URL: "postgresql://lab:lab@127.0.0.1:5432/mydatabase?schema=public" },
      { ...marked, REPLAY_RELEASE_READY: "false" },
    ]) assert.throws(() => assertLabReplayRuntime(env),
      /Lab replay (environment|release) refused|Requires the dedicated local triage_lab database/);
  });

  test("capabilities report switches, release readiness and bounded reasons", () => {
    assert.deepEqual(replayCapabilities({ ...marked, REPLAY_INTENT_ENABLED: "true" }), { investigation: false,
      replayIntent: true, replayExecution: true, releaseReady: true, labProfile: LAB_REPLAY_PROFILE, reasons: [] });
    const closed = replayCapabilities({ ...marked, REPLAY_INTENT_ENABLED: "false", REPLAY_ENABLED: "false" });
    assert.equal(closed.replayIntent, false);
    assert.equal(closed.replayExecution, false);
    assert.deepEqual(closed.reasons, ["replay_intent_disabled", "replay_switch_off"]);
  });
});
