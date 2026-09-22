import {
  Resend,
  type CreateEmailOptions,
  type CreateEmailRequestOptions,
  type CreateEmailResponse,
} from "resend";
import { parse } from "../parse";
import {
  ActionExecutionError,
  type ActionHandler,
  type ActionResult,
} from "../types";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key");

export type EmailTransport = (
  payload: CreateEmailOptions,
  options?: CreateEmailRequestOptions,
) => Promise<CreateEmailResponse>;

const resendTransport: EmailTransport = (payload, options) =>
  resend.emails.send(payload, options);

function validStatus(value: unknown): number | undefined {
  return Number.isInteger(value) && Number(value) >= 100 && Number(value) <= 599
    ? Number(value)
    : undefined;
}

function safeEmailCode(value: unknown): string {
  if (typeof value !== "string") return "email_provider_error";
  const normalized = value.toLowerCase().replace(/[^a-z0-9_]+/g, "_").slice(0, 64);
  return normalized || "email_provider_error";
}

function safeReceipt(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= 128
    ? value.trim()
    : undefined;
}

/**
 * Sends an email via the Resend API.
 * Attaches the idempotency key in headers so duplicate retries do not trigger duplicate emails.
 */
export async function sendEmail(
  to: string,
  body: string,
  from: string,
  subject: string,
  idempotencyKey?: string,
  transport: EmailTransport = resendTransport,
): Promise<ActionResult> {
  const payload: CreateEmailOptions = {
    from: from || "Zapier Clone <onboarding@resend.dev>",
    to,
    subject,
    html: `<div style="white-space: pre-wrap;">${body}</div>`,
    headers: idempotencyKey
      ? {
          "X-Entity-Ref-ID": idempotencyKey,
        }
      : undefined,
  };
  const options: CreateEmailRequestOptions | undefined = idempotencyKey
    ? {
        headers: {
          "Idempotency-Key": idempotencyKey,
        },
      }
    : undefined;

  let response: CreateEmailResponse;
  try {
    response = await transport(payload, options);
  } catch {
    throw new ActionExecutionError("Email provider request failed", {
      provider: "email",
      phase: "send",
      outcome: "unknown",
      safeCode: "email_transport_error",
    });
  }

  if (response.error) {
    const status = validStatus(response.error.statusCode);
    throw new ActionExecutionError("Email provider rejected request", {
      provider: "email",
      phase: "send",
      outcome: status !== undefined && status >= 400 && status <= 499 ? "rejected" : "unknown",
      safeCode: safeEmailCode(response.error.name),
      ...(status === undefined ? {} : { status }),
    });
  }

  const receipt = safeReceipt(response.data?.id);
  if (!receipt) {
    throw new ActionExecutionError("Email provider receipt missing", {
      provider: "email",
      phase: "send",
      outcome: "unknown",
      safeCode: "email_receipt_missing",
    });
  }

  return {
    provider: "email",
    phase: "send",
    outcome: "accepted",
    safeReceiptId: receipt,
  };
}

/**
 * Email Action Handler.
 * Parses metadata template variables and dispatches the email with an idempotency key.
 */
export const emailAction: ActionHandler = {
  type: "email",
  execute: async (metadata, ctx) => {
    const to = parse(metadata?.to as string, ctx.zapRunMetadata).trim();
    const body = parse(metadata?.body as string, ctx.zapRunMetadata).trim();
    const from = parse(metadata?.from as string, ctx.zapRunMetadata).trim();
    const subject = parse(metadata?.subject as string, ctx.zapRunMetadata).trim();

    return sendEmail(to, body, from, subject, ctx.idempotencyKey);
  },
};
