import { FixtureDiagnosisModel } from "./fixture-model.ts";
import { GeminiDiagnosisModel } from "./gemini-model.ts";
import { createHttpServer } from "./http.ts";
import { defaultFixtureDirectory, defaultRunbookDirectory } from "./paths.ts";
import { loadRunbooks } from "./tools/search-runbooks.ts";
import { createLangfuseExporter } from "./observability.ts";

const port = Number(process.env.PORT ?? 3004);
const serviceSecret = process.env.TRIAGE_SERVICE_SECRET;
const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
let langfuse;
if (process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY) {
  try {
    langfuse = createLangfuseExporter({
      baseUrl: process.env.LANGFUSE_BASE_URL ?? "https://cloud.langfuse.com",
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
    });
  } catch {
    console.warn("Langfuse exporter unavailable");
  }
}
const diagnosis =
  serviceSecret && geminiApiKey
    ? {
        backendBaseUrl:
          process.env.PRIMARY_BACKEND_URL ?? "http://127.0.0.1:3002",
        serviceSecret,
        model: new GeminiDiagnosisModel({
          apiKey: geminiApiKey,
          model: geminiModel,
        }),
        diagnosisOptions: {
          ...(langfuse ? { observability: langfuse } : {}),
          modelName: geminiModel,
        },
        runbookIndex: await loadRunbooks(defaultRunbookDirectory()),
      }
    : undefined;
const running = await createHttpServer({
  fixtureDirectory: defaultFixtureDirectory(),
  model: new FixtureDiagnosisModel(),
  ...(serviceSecret
    ? {
        privateTools: {
          backendBaseUrl:
            process.env.PRIMARY_BACKEND_URL ?? "http://127.0.0.1:3002",
          serviceSecret,
        },
      }
    : {}),
  ...(diagnosis ? { diagnosis } : {}),
}).start(port);

console.log(`ai-agent running at ${running.baseUrl}`);

async function shutdown() {
  await running.close();
  process.exit(0);
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
