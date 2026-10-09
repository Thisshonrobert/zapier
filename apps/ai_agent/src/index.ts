import { FixtureDiagnosisModel } from "./fixture-model.ts";
import { GeminiDiagnosisModel } from "./gemini-model.ts";
import { createHttpServer } from "./http.ts";
import { defaultFixtureDirectory, defaultRunbookDirectory } from "./paths.ts";
import { loadRunbooks } from "./tools/search-runbooks.ts";
import { createRunbookRetriever } from "./tools/runbook-retriever.ts";
import { createLangfuseExporter } from "./observability.ts";
import { agentPool, createCheckpoint } from "./checkpoint.ts";
import { InvestigationStore } from "./investigation-store.ts";
import { createInvestigationExecutor, createInvestigationPoller } from "./runner.ts";
import { buildDiagnosisService, type InvestigationDecision } from "./graph.ts";
import { investigationEnabled, operationalLimits } from "./operational-limits.ts";

const port = Number(process.env.PORT ?? 3004);
const serviceSecret = process.env.TRIAGE_SERVICE_SECRET;
const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const databaseUrl = process.env.AI_AGENT_DATABASE_URL;
if (investigationEnabled()) operationalLimits();
if (investigationEnabled() && geminiModel !== "gemini-2.5-flash")
  throw new Error("Investigation pricing supports only gemini-2.5-flash");
if (investigationEnabled() && (!databaseUrl || !serviceSecret || serviceSecret.length < 32 || !geminiApiKey))
  throw new Error("Investigation requires a dedicated database URL, service secret and model key");
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
          api: "generate-content",
          maxOutputTokens: 2048,
          maxTotalTokens: 64000,
        }),
        diagnosisOptions: {
          ...(langfuse ? { observability: langfuse } : {}),
          modelName: geminiModel,
          maxPromptCharacters: 16000,
          maxRepairAttempts: 0 as const,
        },
        runbookIndex: await loadRunbooks(defaultRunbookDirectory()),
      }
    : undefined;
const pool = databaseUrl && serviceSecret ? agentPool(databaseUrl) : undefined;
const checkpoint = databaseUrl && serviceSecret ? createCheckpoint(databaseUrl) : undefined;
const store = pool ? new InvestigationStore(pool) : undefined;
const resumeOnlyModel = { generate: async () => { throw new Error("Model disabled during decision resume"); },
  close: async () => {} };
const resumeDecision = checkpoint && store ? async (threadId: string, decision: InvestigationDecision) =>
  buildDiagnosisService({
    getFailureContext: async () => { throw new Error("Evidence reads are unavailable during decision resume"); },
    getExecutionEvidence: async () => { throw new Error("Evidence reads are unavailable during decision resume"); },
    validateActionInputs: async () => { throw new Error("Evidence reads are unavailable during decision resume"); },
    searchRunbooks: () => [],
  }, diagnosis?.model ?? resumeOnlyModel, { checkpointer: checkpoint, threadId, requireDecision: true })
    .resumeDecision(decision) : undefined;
const runbookRetriever = diagnosis
  ? await createRunbookRetriever(diagnosis.runbookIndex) : undefined;
const execute = investigationEnabled() && store && checkpoint && diagnosis
  ? createInvestigationExecutor({ backendBaseUrl: diagnosis.backendBaseUrl,
      serviceSecret: diagnosis.serviceSecret, model: diagnosis.model,
      runbookIndex: diagnosis.runbookIndex, runbookRetriever, checkpointer: checkpoint,
      diagnosisOptions: diagnosis.diagnosisOptions })
  : undefined;
const poller = createInvestigationPoller(store, execute, investigationEnabled,
  () => console.error("Investigation runner unavailable"));
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
  // The synchronous diagnosis endpoint has no durable quota reservation.
  ...(store && serviceSecret
    ? { investigations: { store, serviceSecret, ...(resumeDecision ? { resumeDecision } : {}),
      enabled: poller.accepting } } : {}),
}).start(port);

poller.start();

console.log(`ai-agent running at ${running.baseUrl}`);

async function shutdown() {
  await poller.stop();
  await running.close();
  await diagnosis?.model.close();
  await runbookRetriever?.close();
  await checkpoint?.end();
  await pool?.end();
  console.log("Investigation service shutdown complete");
}

process.once("SIGINT", () => { void shutdown().catch(() => { process.exitCode = 1; }); });
process.once("SIGTERM", () => { void shutdown().catch(() => { process.exitCode = 1; }); });
