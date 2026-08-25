import { Resend } from "resend";
import { parse } from "../parse";
import type { ActionHandler } from "../types";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key");

/**
 * Sends an email via the Resend API.
 * Attaches the idempotency key in headers so duplicate retries do not trigger duplicate emails.
 */
export async function sendEmail(
  to: string,
  body: string,
  from: string,
  subject: string,
  idempotencyKey?: string
) {
  console.log("email start", { to, subject, idempotencyKey });

  await resend.emails.send(
    {
      from: from || "Zapier Clone <onboarding@resend.dev>",
      to: to,
      subject: subject,
      html: `<div style="white-space: pre-wrap;">${body}</div>`,
      headers: idempotencyKey
        ? {
            "X-Entity-Ref-ID": idempotencyKey,
          }
        : undefined,
    },
    idempotencyKey
      ? {
          headers: {
            "Idempotency-Key": idempotencyKey,
          },
        }
      : undefined
  );

  console.log("email sent");
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

    console.log("results from email parser =", { to, from, body, subject });
    await sendEmail(to, body, from, subject, ctx.idempotencyKey);
  },
};
