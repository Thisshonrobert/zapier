import assert from "node:assert/strict";
import { ActionExecutionError } from "../types";
import { sendEmail, type EmailTransport } from "./email";

const request = [
  "recipient@example.com",
  "secret body",
  "sender@example.com",
  "Private subject",
  "zaprun_run-1_stage_0",
] as const;

async function captureFailure(transport: EmailTransport) {
  try {
    await sendEmail(...request, transport);
    assert.fail("expected sendEmail to fail");
  } catch (error) {
    assert.ok(error instanceof ActionExecutionError);
    return error;
  }
}

async function main() {
  const accepted = await sendEmail(...request, async () => ({
    data: { id: "email_123" },
    error: null,
    headers: null,
  }));
  assert.deepEqual(accepted, {
    provider: "email",
    phase: "send",
    outcome: "accepted",
    safeReceiptId: "email_123",
  });

  const rejected = await captureFailure(async () => ({
    data: null,
    error: { name: "validation_error", message: "raw recipient detail", statusCode: 422 },
    headers: null,
  }));
  assert.deepEqual(rejected.evidence, {
    provider: "email",
    phase: "send",
    outcome: "rejected",
    safeCode: "validation_error",
    status: 422,
  });

  const untrustedName = await captureFailure(async () => ({
    data: null,
    error: {
      name: "private_message_body" as never,
      message: "secret provider response",
      statusCode: 422,
    },
    headers: null,
  }));
  assert.equal(untrustedName.evidence.safeCode, "email_provider_error");
  assert.equal(JSON.stringify(untrustedName.evidence).includes("private_message_body"), false);

  const unavailable = await captureFailure(async () => ({
    data: null,
    error: { name: "internal_server_error", message: "raw outage detail", statusCode: 503 },
    headers: null,
  }));
  assert.equal(unavailable.evidence.outcome, "unknown");

  const transportFailure = await captureFailure(async () => {
    throw new Error("secret transport response");
  });
  assert.equal(transportFailure.evidence.safeCode, "email_transport_error");

  const missingReceipt = await captureFailure(async () => ({
    data: {} as { id: string },
    error: null,
    headers: null,
  }));
  assert.equal(missingReceipt.evidence.safeCode, "email_receipt_missing");

  const serialized = JSON.stringify([
    rejected.evidence,
    untrustedName.evidence,
    unavailable.evidence,
    transportFailure.evidence,
    missingReceipt.evidence,
  ]);
  for (const secret of [request[0], request[1], request[2], request[3], "raw recipient detail", "private_message_body", "secret transport response"]) {
    assert.equal(serialized.includes(secret), false);
  }

  console.log("email.test.ts OK");
}

main();
