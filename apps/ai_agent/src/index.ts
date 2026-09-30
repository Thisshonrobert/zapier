import { FixtureDiagnosisModel } from "./fixture-model.ts";
import { GeminiDiagnosisModel } from "./gemini-model.ts";
import { createHttpServer } from "./http.ts";
import { defaultFixtureDirectory, defaultRunbookDirectory } from "./paths.ts";
import { loadRunbooks } from "./tools/search-runbooks.ts";
import { createLangfuseExporter } from "./observability.ts";
import pg from "pg";
import { agentDatabaseUrl, createCheckpoint } from "./checkpoint.ts";
import { InvestigationStore } from "./investigation-store.ts";
import { createInvestigationExecutor, runInvestigationOnce } from "./runner.ts";
import { buildDiagnosisService, type InvestigationDecision } from "./graph.ts";

const port = Number(process.env.PORT ?? 3004);
const serviceSecret = process.env.TRIAGE_SERVICE_SECRET;
const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const databaseUrl = process.env.AI_AGENT_DATABASE_URL ?? process.env.DATABASE_URL;
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
const pool = databaseUrl && diagnosis ? new pg.Pool({ connectionString: agentDatabaseUrl(databaseUrl) }) : undefined;
const checkpoint = databaseUrl && diagnosis ? createCheckpoint(databaseUrl) : undefined;
const store = pool ? new InvestigationStore(pool) : undefined;
const resumeDecision = checkpoint && diagnosis ? async (threadId: string, decision: InvestigationDecision) =>
  buildDiagnosisService({
    getFailureContext: async () => { throw new Error("Evidence reads are unavailable during decision resume"); },
    getExecutionEvidence: async () => { throw new Error("Evidence reads are unavailable during decision resume"); },
    validateActionInputs: async () => { throw new Error("Evidence reads are unavailable during decision resume"); },
    searchRunbooks: () => [],
  }, diagnosis.model, { checkpointer: checkpoint, threadId, requireDecision: true })
    .resumeDecision(decision) : undefined;
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
  ...(store && serviceSecret && resumeDecision
    ? { investigations: { store, serviceSecret, resumeDecision } } : {}),
}).start(port);

const execute = store && checkpoint && diagnosis
  ? createInvestigationExecutor({ backendBaseUrl: diagnosis.backendBaseUrl,
      serviceSecret: diagnosis.serviceSecret, model: diagnosis.model,
      runbookIndex: diagnosis.runbookIndex, checkpointer: checkpoint,
      diagnosisOptions: diagnosis.diagnosisOptions })
  : undefined;
let polling = false;
const poll = async () => {
  if (!store || !execute || polling) return;
  polling = true;
  try { while (await runInvestigationOnce(store, execute)) { /* drain bounded claims */ } }
  catch (error) { console.error("Investigation runner unavailable", error); }
  finally { polling = false; }
};
const timer = execute ? setInterval(() => void poll(), 2_000) : undefined;
if (execute) void poll();

console.log(`ai-agent running at ${running.baseUrl}`);

async function shutdown() {
  if (timer) clearInterval(timer);
  await running.close();
  await checkpoint?.end();
  await pool?.end();
  process.exit(0);
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
