import { describe, expect, test } from "bun:test";
import { createHmac } from "node:crypto";

import { labToken, parseSmokeFlags } from "./triage-lab-smoke.ts";

describe("Phase 16H lab smoke command", () => {
  test("requires an explicit batch or derives a dated default", () => {
    expect(parseSmokeFlags(["--batch", "smoke-2026-10-18"])).toMatchObject({ batch: "smoke-2026-10-18", requireReplay: false });
    expect(parseSmokeFlags([]).batch).toStartWith("smoke-");
    expect(parseSmokeFlags(["--batch", "smoke-x", "--timeout-ms", "5000"]))
      .toEqual({ batch: "smoke-x", timeout: 5000, requireReplay: false });
    expect(parseSmokeFlags(["--require-replay"]).requireReplay).toBe(true);
    expect(parseSmokeFlags([]).timeout).toBe(20000);
  });

  test("refuses unknown, duplicated, malformed and unbounded flags", () => {
    expect(() => parseSmokeFlags(["--scenario", "all"])).toThrow("Unknown lab smoke flag");
    expect(() => parseSmokeFlags(["--batch", "smoke-x", "--batch", "smoke-y"])).toThrow("Invalid lab smoke flags");
    expect(() => parseSmokeFlags(["--batch"])).toThrow("Invalid lab smoke flags");
    expect(() => parseSmokeFlags(["--batch", "--require-replay"])).toThrow("Invalid lab smoke flags");
    expect(() => parseSmokeFlags(["--batch", "../ordinary"])).toThrow("Invalid lab batch ID");
    expect(() => parseSmokeFlags(["--timeout-ms", "10"])).toThrow("1000..300000");
    expect(() => parseSmokeFlags(["--timeout-ms", "1000.5"])).toThrow("1000..300000");
  });

  test("mints the exact HS256 claim the backend middleware verifies", () => {
    const secret = "b".repeat(64);
    const token = labToken(37, secret, 1_700_000_000_000);
    const [header, payload, signature] = token.split(".");
    expect(JSON.parse(Buffer.from(header!, "base64url").toString())).toEqual({ alg: "HS256", typ: "JWT" });
    expect(JSON.parse(Buffer.from(payload!, "base64url").toString())).toEqual({
      id: 37, iat: 1_700_000_000, exp: 1_700_003_600,
    });
    expect(signature).toBe(createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url"));
    // A role never travels in the token; only the identity does.
    expect(JSON.stringify(JSON.parse(Buffer.from(payload!, "base64url").toString()))).not.toContain("isSupportOperator");
  });
});
