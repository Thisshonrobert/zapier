import { readFile } from "node:fs/promises";
import { EvaluationSummarySchema } from "../../../packages/triage-contracts/command-center.ts";

export async function readEvaluationSummary() {
  const raw = await readFile(new URL("../../ai_agent/evaluation/phase-11-report.json", import.meta.url), "utf8");
  if (raw.length > 500_000) throw new Error("Evaluation report too large");
  return EvaluationSummarySchema.parse(JSON.parse(raw));
}

// URLs come from deployment configuration, never from a model, case or upstream response.
// Langfuse's documented URL format: https://langfuse.com/docs/observability/features/url
export function traceLink(id: unknown, baseUrl = process.env.LANGFUSE_BASE_URL,
  projectId = process.env.LANGFUSE_PROJECT_ID) {
  if (typeof id !== "string" || !/^[a-f0-9]{32}$/.test(id)) return null;
  let url: string | null = null;
  if (baseUrl && projectId && /^[a-zA-Z0-9_-]{1,100}$/.test(projectId)) {
    try {
      const base = new URL(baseUrl);
      const local = ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname);
      if ((base.protocol === "https:" || (local && base.protocol === "http:")) &&
          !base.username && !base.password && !base.search && !base.hash) {
        url = new URL(`/project/${projectId}/traces/${id}`, base).toString();
      }
    } catch { /* Missing or invalid configuration leaves the identifier usable without a link. */ }
  }
  return { id, url, exportVerified: false as const };
}
