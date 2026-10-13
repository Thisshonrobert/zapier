const token = "0:triage-demo";
const valid = { channelUserName: "-100123456", message: "[DEMO] No message is sent", botToken: token };
export const scenarios = [
  { key: "rate-limit", source: "seeded", title: "[SEEDED DEMO] Telegram 429", metadata: valid,
    outcome: "rejected", code: "telegram_http_429", phase: "send", status: 429, retryAfter: 60 },
  { key: "missing-credentials", source: "seeded", title: "[SEEDED DEMO] Missing Telegram credentials",
    metadata: { ...valid, botToken: "" }, outcome: "not_attempted", code: "telegram_credentials_missing", phase: "validation" },
  { key: "unknown-delivery", source: "seeded", title: "[SEEDED DEMO] Unknown Telegram delivery", metadata: valid,
    outcome: "unknown", code: "telegram_transport_error", phase: "send" },
  { key: "invalid-input", source: "pipeline", title: "[PIPELINE DEMO] Missing destination",
    metadata: { ...valid, channelUserName: "" }, outcome: "not_attempted", code: "telegram_resolution_rejected", phase: "resolve_destination" },
  { key: "provider-rejection", source: "pipeline", title: "[PIPELINE DEMO] Stub Telegram 403", metadata: valid,
    outcome: "rejected", code: "telegram_http_403", phase: "send" },
] as const;

export function assertDemoDatabase(databaseUrl: string) {
  const url = new URL(databaseUrl);
  if (process.env.NODE_ENV === "production" || !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    !/^\/triage_demo_[a-f0-9]{12}$/.test(url.pathname))
    throw new Error("Requires a disposable local triage_demo database");
}

// This transport is installed only in the dedicated demo worker process.
export async function demoProviderFetch(input: string | URL | Request): Promise<Response> {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (url.origin !== "https://api.telegram.org" || !url.pathname.startsWith(`/bot${token}/`))
    throw new Error("Demo worker refuses external provider access");
  if (url.pathname === `/bot${token}/getChat`)
    return Response.json({ ok: false, error_code: 400, description: "[DEMO] Invalid destination" }, { status: 400 });
  if (url.pathname === `/bot${token}/sendMessage`)
    return Response.json({ ok: false, error_code: 403, description: "[DEMO] Provider rejected send" }, { status: 403 });
  throw new Error("Unsupported demo provider operation");
}
