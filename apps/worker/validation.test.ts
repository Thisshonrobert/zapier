import { describe, expect, test } from "bun:test";

import { validateActionInputs } from "./validation.ts";

describe("Phase 4C action input validation", () => {
  test("reports missing template paths and invalid field types without values", () => {
    const result = validateActionInputs({
      actionType: "email",
      actionMetadata: {
        to: "{{customer.email}}",
        subject: 42,
        body: "Hello {{customer.name}} / {{missing.path}}",
        from: "sender@example.invalid",
      },
      zapRunMetadata: { customer: { email: "secret@example.invalid", name: "Ada" } },
    });

    expect(result.missing_template_paths).toEqual(["missing.path"]);
    expect(result.invalid_field_types).toEqual([
      { field: "subject", expected: "string", actual: "number" },
    ]);
    expect(JSON.stringify(result)).not.toContain("secret@example.invalid");
    expect(JSON.stringify(result)).not.toContain("Ada");
  });

  test("blocks unsupported actions and never executes a returned handler", () => {
    let providerCalls = 0;
    const result = validateActionInputs(
      { actionType: "custom-secret-action", actionMetadata: {}, zapRunMetadata: {} },
      {
        getHandler: () => ({
          type: "custom-secret-action",
          execute: async () => {
            providerCalls++;
            throw new Error("must not execute");
          },
        }),
        supportedTypes: new Set(["email", "telegram"]),
      },
    );

    expect(result.supported).toBe(false);
    expect(result.validation_status).toBe("blocked");
    expect(result.blocked_reasons).toContain("unsupported_action");
    expect(providerCalls).toBe(0);
  });

  test("returns credential presence indicators instead of secret values", () => {
    const result = validateActionInputs({
      actionType: "telegram",
      actionMetadata: {
        channelUserName: "@channel",
        message: "hello",
        botToken: "123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcd",
      },
      zapRunMetadata: {},
    });

    expect(result.credential_presence).toEqual([
      { field: "botToken", present: true, source: "action_metadata" },
    ]);
    expect(JSON.stringify(result)).not.toContain("ABCDEFGHIJKLMNOPQRSTUVWXYZabcd");
    expect(result.input_fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });
});
