import { parse } from "../parse";
import type { ActionHandler } from "../types";

/**
 * Sends a text message to a Telegram chat or channel via the Bot API.
 */
export async function sendTelegram(chatId: string, message: string, telegramBotToken: string) {
  const res = await fetch(
    `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
      }),
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Telegram sendMessage failed (${res.status}): ${errorText}`);
  }
}

/**
 * Resolves a channel @username to its internal numeric chat ID if needed.
 */
export async function resolveChatId(input: string, telegramBotToken: string) {
  if (/^-?\d+$/.test(input)) return input;
  const clean = input.trim().replace(/^@+/, "");
  const res = await fetch(
    `https://api.telegram.org/bot${telegramBotToken}/getChat?chat_id=@${clean}`
  );
  const data: any = await res.json();

  if (!data.ok) throw new Error("Invalid channel username");

  return data.result.id;
}

/**
 * Telegram Action Handler.
 * Resolves chat destination, interpolates message variables, and sends the Telegram message.
 */
export const telegramAction: ActionHandler = {
  type: "telegram",
  execute: async (metadata, ctx) => {
    console.log("telegram post action", { zapRunId: ctx.zapRunId, stage: ctx.stage });

    const botToken =
      parse(metadata?.botToken as string, ctx.zapRunMetadata).trim() ||
      process.env.TELEGRAM_BOT_TOKEN ||
      "";

    const channelUserName = parse(
      metadata?.channelUserName as string,
      ctx.zapRunMetadata
    ).trim();

    const chatId = await resolveChatId(channelUserName, botToken);
    const message = parse(metadata?.message as string, ctx.zapRunMetadata).trim();

    await sendTelegram(chatId, message, botToken);
  },
};
