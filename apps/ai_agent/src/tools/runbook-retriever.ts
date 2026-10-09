import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { searchRunbooks, type RunbookIndex, type RunbookMatch, type RunbookSearchInput } from "./search-runbooks.ts";

type Scorer = {
  score(query: string, passages: string[]): Promise<number[]>;
  close(): Promise<void>;
};
export type RunbookRetriever = {
  search(input: RunbookSearchInput): Promise<RunbookMatch[]>;
  close(): Promise<void>;
};

// Node owns native ONNX; the Bun service keeps its existing runtime. One in-flight
// request per process avoids an unbounded inference queue. Timeout kills ONNX.
async function loadScorer(environment: Record<string, string | undefined>): Promise<Scorer> {
  const cache = environment.RUNBOOK_MINILM_CACHE_DIR;
  if (!cache) throw new Error("MiniLM requires RUNBOOK_MINILM_CACHE_DIR with the pinned local model");
  const child = spawn("node", [fileURLToPath(new URL("./minilm-process.mjs", import.meta.url)), cache], {
    stdio: ["ignore", "ignore", "ignore", "ipc"],
    windowsHide: true,
  });
  let closed = false;
  let pending: { resolve(value: number[]): void; reject(error: Error): void; timer: ReturnType<typeof setTimeout> } | undefined;
  const fail = () => {
    closed = true;
    if (pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error("MiniLM scoring unavailable"));
      pending = undefined;
    }
    child.kill();
  };
  child.on("error", fail);
  child.on("exit", fail);
  child.on("message", (message: unknown) => {
    if (!pending) return;
    const value = message as { ready?: boolean; logits?: number[] };
    if (!value || (!value.ready && !Array.isArray(value.logits))) return fail();
    clearTimeout(pending.timer);
    pending.resolve(value.logits ?? []);
    pending = undefined;
  });
  const wait = (timeout: number) => new Promise<number[]>((resolve, reject) => {
    pending = { resolve, reject, timer: setTimeout(fail, timeout) };
  });
  await wait(60_000);
  return {
    async score(query, passages) {
      if (closed || pending) throw new Error("MiniLM scorer unavailable or busy");
      const result = wait(5_000);
      child.send({ query, passages }, error => { if (error) fail(); });
      return result;
    },
    async close() { fail(); },
  };
}

export async function createRunbookRetriever(
  index: RunbookIndex,
  environment: Record<string, string | undefined> = process.env,
  scorerFactory: (environment: Record<string, string | undefined>) => Promise<Scorer> = loadScorer,
): Promise<RunbookRetriever> {
  const method = environment.RUNBOOK_RETRIEVAL_METHOD ?? "keyword";
  if (method === "keyword") return {
    search: async input => searchRunbooks(index, input), close: async () => {},
  };
  if (method !== "minilm-original") throw new Error("RUNBOOK_RETRIEVAL_METHOD must be keyword or minilm-original");
  const scorer = await scorerFactory(environment);
  return {
    async search(input) {
      // Reuse the frozen keyword boundary for query/filter/limit validation only.
      searchRunbooks([], input);
      const normalize = (values: readonly string[] = []) => values.map(v => v.trim().toLowerCase()).filter(Boolean);
      const taxonomy = normalize(input.taxonomy), providers = normalize(input.providers);
      const eligible = index.filter(s => s.status === "current" &&
        (!taxonomy.length || s.taxonomy.some(t => taxonomy.includes(t.toLowerCase()))) &&
        (!providers.length || s.providers.includes("generic") || s.providers.some(p => providers.includes(p))))
        .sort((a, b) => a.citation.localeCompare(b.citation));
      if (eligible.length > 60) throw new Error("MiniLM eligible section bound exceeded");
      if (!eligible.length) return [];
      const logits = await scorer.score(input.query, eligible.map(s => `${s.heading}\n${s.content}`));
      if (logits.length !== eligible.length || logits.some(l => !Number.isFinite(l)))
        throw new Error("Invalid MiniLM scores");
      return eligible.map((section, i) => ({ section, score: 1 / (1 + Math.exp(-logits[i]!)) }))
        .filter(r => r.score >= 0.001)
        .sort((a, b) => b.score - a.score || a.section.citation.localeCompare(b.section.citation))
        .slice(0, input.limit ?? 3)
        .map(({ section, score }) => ({
          runbookId: section.id, version: section.version, citation: section.citation,
          heading: section.heading, content: section.content, contentHash: section.contentHash,
          taxonomy: section.taxonomy, providers: section.providers, simulated: true,
          authority: "untrusted_procedural_guidance", canChangePolicy: false, score,
        }));
    },
    close: () => scorer.close(),
  };
}
