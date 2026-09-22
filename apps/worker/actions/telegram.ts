import { parse } from "../parse";
import {
  ActionExecutionError,
  type ActionHandler,
  type ActionResult,
} from "../types";

export type FetchTransport = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

const defaultFetch: FetchTransport = (input, init) => fetch(input, init);

function validStatus(value: unknown): number | undefined {
  return Number.isInteger(value) && Number(value) >= 100 && Number(value) <= 599
    ? Number(value)
    : undefined;
}

function boundedPositiveInteger(
  value: unknown,
  maximum: number,
): number | undefined {
  return Number.isInteger(value) &&
    Number(value) > 0 &&
    Number(value) <= maximum
    ? Number(value)
    : undefined;
}

function safeIdentifier(value: unknown): string | undefined {
  const text =
    typeof value === "string"
      ? value.trim()
      : Number.isSafeInteger(value)
        ? String(value)
        : "";
  return text.length > 0 && text.length <= 128 ? text : undefined;
}

async function readJson(
  response: Response,
): Promise<Record<string, unknown> | undefined> {
  try {
    const value: unknown = await response.json();
    return value !== null && typeof value === "object"
      ? (value as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

function resolutionError(
  safeCode: string,
  status?: number,
): ActionExecutionError {
  return new ActionExecutionError("Telegram destination resolution failed", {
    provider: "telegram",
    phase: "resolve_destination",
    outcome: "not_attempted",
    safeCode,
    ...(status === undefined ? {} : { status }),
  });
}

function retryAfter(
  data: Record<string, unknown> | undefined,
): number | undefined {
  const parameters = data?.parameters;
  return parameters !== null && typeof parameters === "object"
    ? boundedPositiveInteger(
        (parameters as Record<string, unknown>).retry_after,
        86_400,
      )
    : undefined;
}

function sendError(
  outcome: "rejected" | "unknown",
  safeCode: string,
  status?: number,
  retryAfterSeconds?: number,
): ActionExecutionError {
  return new ActionExecutionError("Telegram message delivery failed", {
    provider: "telegram",
    phase: "send",
    outcome,
    safeCode,
    ...(status === undefined ? {} : { status }),
    ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
  });
}

/** Resolves a channel @username to its internal numeric chat ID if needed. */
export async function resolveChatId(
  input: string,
  telegramBotToken: string,
  fetchImpl: FetchTransport = defaultFetch,
): Promise<string> {
  const destination = input.trim();
  if (/^-?\d+$/.test(destination)) return destination;

  let response: Response;
  try {
    const username = destination.replace(/^@+/, "");
    response = await fetchImpl(
      `https://api.telegram.org/bot${telegramBotToken}/getChat?chat_id=@${username}`,
    );
  } catch {
    throw resolutionError("telegram_resolution_transport_error");
  }

  const status = validStatus(response.status);
  const data = await readJson(response);
  if (!data)
    throw resolutionError("telegram_resolution_response_invalid", status);
  if (!response.ok || data.ok !== true) {
    throw resolutionError("telegram_resolution_rejected", status);
  }

  const result = data.result;
  const chatId =
    result !== null && typeof result === "object"
      ? safeIdentifier((result as Record<string, unknown>).id)
      : undefined;
  if (!chatId) throw resolutionError("telegram_chat_id_missing", status);
  return chatId;
}

/** Sends a text message to a Telegram chat or channel via the Bot API. */
export async function sendTelegram(
  chatId: string,
  message: string,
  telegramBotToken: string,
  fetchImpl: FetchTransport = defaultFetch,
): Promise<ActionResult> {
  let response: Response;
  try {
    response = await fetchImpl(
      `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: message }),
      },
    );
  } catch {
    throw sendError("unknown", "telegram_transport_error");
  }

  const status = validStatus(response.status);
  const data = await readJson(response);
  if (!response.ok) {
    const outcome =
      status !== undefined && status >= 400 && status <= 499
        ? "rejected"
        : "unknown";
    const safeCode =
      status === undefined
        ? "telegram_provider_error"
        : `telegram_http_${status}`;
    throw sendError(
      outcome,
      safeCode,
      status,
      status === 429 ? retryAfter(data) : undefined,
    );
  }

  if (!data) throw sendError("unknown", "telegram_response_invalid");
  if (data.ok !== true) {
    const errorStatus = validStatus(data.error_code);
    if (errorStatus !== undefined && errorStatus >= 400 && errorStatus <= 499) {
      throw sendError(
        "rejected",
        `telegram_http_${errorStatus}`,
        errorStatus,
        errorStatus === 429 ? retryAfter(data) : undefined,
      );
    }
    throw sendError("unknown", "telegram_provider_error");
  }

  const result = data.result;
  const receipt =
    result !== null && typeof result === "object"
      ? safeIdentifier((result as Record<string, unknown>).message_id)
      : undefined;
  if (!receipt) throw sendError("unknown", "telegram_receipt_missing");
  return {
    provider: "telegram",
    phase: "send",
    outcome: "accepted",
    safeReceiptId: receipt,
  };
}

/** Telegram Action Handler. */
export const telegramAction: ActionHandler = {
  type: "telegram",
  execute: async (metadata, ctx) => {
    console.log("telegram post action", {
      zapRunId: ctx.zapRunId,
      stage: ctx.stage,
    });

    const botToken =
      parse(metadata?.botToken as string, ctx.zapRunMetadata).trim() ||
      process.env.TELEGRAM_BOT_TOKEN ||
      "";
    const channelUserName = parse(
      metadata?.channelUserName as string,
      ctx.zapRunMetadata,
    ).trim();
    const chatId = await resolveChatId(channelUserName, botToken);
    const message = parse(
      metadata?.message as string,
      ctx.zapRunMetadata,
    ).trim();

    return sendTelegram(chatId, message, botToken);
  },
};
