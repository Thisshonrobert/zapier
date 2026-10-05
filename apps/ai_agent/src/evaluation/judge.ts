import { z } from "zod";
import { ModelUsageSchema, type ModelUsage } from "../contracts.ts";
import { RUBRIC, buildJudgePrompt } from "./rubric.ts";

const id = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9._:-]+$/);
const sanitizedText = z
  .string()
  .min(1)
  .max(8_000)
  .refine(
    (text) =>
      ![
        /\bBearer\s+\S+/i,
        /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
        /\b\d{6,12}:[A-Za-z0-9_-]{20,}\b/,
        /\b(?:api[_ -]?key|password|secret|access[_ -]?token)\s*[=:]\s*\S+/i,
      ].some((pattern) => pattern.test(text)),
    "Use sanitized synthetic text only",
  );
const answer = z.object({ id, text: sanitizedText }).strict();
export const JudgePairSchema = z
  .object({
    case_id: id,
    split: z.enum(["development", "held_out"]),
    simulated: z.literal(true),
    evidence: z
      .array(z.object({ id, text: sanitizedText }).strict())
      .min(1)
      .max(16),
    left: answer,
    right: answer,
    human_winner: z.enum(["left", "right", "inconclusive"]).nullable(),
  })
  .strict()
  .refine(
    (p) =>
      p.left.id !== p.right.id &&
      new Set(p.evidence.map((e) => e.id)).size === p.evidence.length,
  )
  .refine(
    (p) => JSON.stringify(p).length <= 32_000,
    "Pair exceeds input budget",
  );
export type JudgePair = z.infer<typeof JudgePairSchema>;
const score = z.union([z.literal(0), z.literal(1)]);
export const JudgeVoteSchema = z
  .object({
    winner: z.enum(["A", "B"]),
    criteria: z
      .array(
        z
          .object({
            id: z.enum(["grounding", "abstention", "relevance", "clarity"]),
            A: score,
            B: score,
            evidence_refs: z.array(id).min(1).max(16),
          })
          .strict(),
      )
      .length(RUBRIC.length),
  })
  .strict()
  .refine((v) => new Set(v.criteria.map((c) => c.id)).size === RUBRIC.length);
export type JudgeVote = z.infer<typeof JudgeVoteSchema>;
export type JudgeModel = (
  prompt: string,
  signal: AbortSignal,
) => Promise<{ output: unknown; usage: ModelUsage | null }>;
export type JudgeReason =
  | "agreed"
  | "order_disagreement"
  | "equal_quality"
  | "invalid_output"
  | "provider_error"
  | "timeout"
  | "cancelled";
export class JudgeModelError extends Error {
  constructor(
    readonly reason:
      | "invalid_output"
      | "provider_error"
      | "timeout"
      | "cancelled",
    readonly invoked = true,
    readonly usage: ModelUsage | null = null,
  ) {
    super(reason);
  }
}
type Pass = {
  order: "left_right" | "right_left";
  winner: string | null;
  vote: JudgeVote | null;
  reason: JudgeReason;
  usage: ModelUsage | null;
  latency_ms: number;
};
export type JudgeResult = {
  case_id: string;
  split: JudgePair["split"];
  status: "conclusive" | "inconclusive";
  winner: string | null;
  reason: JudgeReason;
  invocations: number;
  passes: Pass[];
};

export async function judgePair(
  input: JudgePair,
  model: JudgeModel,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<JudgeResult> {
  const pair = JudgePairSchema.parse(input);
  const timeoutMs = z
    .number()
    .int()
    .positive()
    .max(60_000)
    .parse(options.timeoutMs ?? 30_000);
  const result: JudgeResult = {
    case_id: pair.case_id,
    split: pair.split,
    status: "inconclusive",
    winner: null,
    reason: "cancelled",
    invocations: 0,
    passes: [],
  };
  for (const swapped of [false, true]) {
    if (options.signal?.aborted) return result;
    const controller = new AbortController();
    const relay = () => controller.abort();
    options.signal?.addEventListener("abort", relay, { once: true });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    let rejectOnAbort: (() => void) | undefined;
    const aborted = new Promise<never>((_resolve, reject) => {
      rejectOnAbort = () => reject(new Error("Judge call interrupted"));
      controller.signal.addEventListener("abort", rejectOnAbort, {
        once: true,
      });
    });
    const started = performance.now();
    let invoked = true;
    const pass: Pass = {
      order: swapped ? "right_left" : "left_right",
      winner: null,
      vote: null,
      reason: "provider_error",
      usage: null,
      latency_ms: 0,
    };
    result.invocations++;
    try {
      const response = await Promise.race([
        model(buildJudgePrompt(pair, swapped), controller.signal),
        aborted,
      ]);
      pass.usage =
        response.usage === null ? null : ModelUsageSchema.parse(response.usage);
      pass.reason = "invalid_output";
      const vote = JudgeVoteSchema.parse(response.output);
      const allowed = new Set(pair.evidence.map((e) => e.id));
      if (
        vote.criteria.some((c) =>
          c.evidence_refs.some((ref) => !allowed.has(ref)),
        )
      )
        throw new Error("Invalid evidence reference");
      const firstDifference = RUBRIC.map(
        ({ id }) => vote.criteria.find((c) => c.id === id)!,
      ).find((c) => c.A !== c.B);
      if (
        firstDifference &&
        vote.winner !== (firstDifference.A > firstDifference.B ? "A" : "B")
      )
        throw new Error("Winner contradicts rubric");
      pass.vote = vote;
      if (!firstDifference) pass.reason = "equal_quality";
      else {
        pass.reason = "agreed";
        pass.winner =
          (vote.winner === "A") !== swapped ? pair.left.id : pair.right.id;
      }
    } catch (error) {
      if (error instanceof JudgeModelError) {
        pass.reason = error.reason;
        invoked = error.invoked;
        const measured = ModelUsageSchema.safeParse(error.usage);
        if (measured.success) pass.usage = measured.data;
        if (!invoked) result.invocations--;
      }
      if (controller.signal.aborted)
        pass.reason = timedOut ? "timeout" : "cancelled";
      // Store only typed failure codes, never raw provider output or exceptions.
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", relay);
      if (rejectOnAbort)
        controller.signal.removeEventListener("abort", rejectOnAbort);
      pass.latency_ms = Math.round(performance.now() - started);
      if (invoked) result.passes.push(pass);
    }
    if (
      pass.reason === "cancelled" ||
      pass.reason === "timeout" ||
      pass.reason === "provider_error"
    ) {
      result.reason = pass.reason;
      return result;
    }
  }
  const failed = result.passes.find((p) => p.reason !== "agreed");
  if (failed) result.reason = failed.reason;
  else if (result.passes[0]!.winner !== result.passes[1]!.winner)
    result.reason = "order_disagreement";
  else {
    result.status = "conclusive";
    result.reason = "agreed";
    result.winner = result.passes[0]!.winner;
  }
  return result;
}
