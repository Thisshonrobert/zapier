export async function sendTelegram(chatId: string, message: string,telegramBotToken: string) {
  await fetch(
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
}

export  async function resolveChatId(input: string,telegramBotToken: string) {
  // If already numeric, return as-is
  if (/^-?\d+$/.test(input)) return input;
  const clean = input.trim().replace(/^@+/, "");
  // Otherwise, call Telegram API to convert @username -> chat_id
  const res = await fetch(
    `https://api.telegram.org/bot${telegramBotToken}/getChat?chat_id=@${clean}`
  );
  const data:any = await res.json();

  if (!data.ok) throw new Error("Invalid channel username");

  return data.result.id; // returns -100xxxxxxxx
}

