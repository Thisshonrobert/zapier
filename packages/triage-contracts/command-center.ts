import { z } from "zod";
import { investigationStatuses } from "./events.ts";

export const HistorySchema = z.object({
  currentSequence: z.number().int().nonnegative(),
  currentStatus: z.enum(investigationStatuses),
  truncated: z.boolean(),
  events: z.array(z.object({ sequence: z.number().int().positive(),
    status: z.enum(investigationStatuses), observedAt: z.iso.datetime() }).strict()).max(64),
}).strict().superRefine((history, ctx) => {
  let previous = 0;
  for (const event of history.events) {
    if (event.sequence <= previous || event.sequence > history.currentSequence)
      ctx.addIssue({ code: "custom", message: "Invalid history ordering" });
    previous = event.sequence;
  }
});

const metric = z.object({ numerator: z.number().int().nonnegative(), denominator: z.number().int().nonnegative(),
  rate: z.number().min(0).max(1).nullable(), target: z.number().min(0).max(1), met: z.boolean() });
const split = z.object({ caseCount: z.number().int().nonnegative(), diagnosisAcceptance: metric,
  retrievalRecallAt3: metric, modelInvocations: z.number().int().nonnegative(), costUsd: z.number().nonnegative(),
  latencyMs: z.object({ measuredCount: z.number().int().nonnegative(), mean: z.number().nonnegative().nullable(),
    p95: z.number().nonnegative().nullable() }) });

// Strip individual fixture rows and probe details; the UI receives aggregate measurements only.
export const EvaluationSummarySchema = z.object({ reportVersion: z.literal(1), datasetVersion: z.number().int().positive(),
  datasetHash: z.string().regex(/^[a-f0-9]{64}$/), measurement: z.string().max(120), model: z.string().max(120),
  safety: z.object({ violations: z.number().int().nonnegative(), complete: z.boolean(), passed: z.boolean() }),
  splits: z.object({ development: split, held_out: split.optional() }) });

export type InvestigationHistory = z.infer<typeof HistorySchema>;
export type EvaluationSummary = z.infer<typeof EvaluationSummarySchema>;
export type CommandCenter = {
  investigationId: string;
  history: { data: InvestigationHistory | null; unavailable: boolean };
  evaluation: { data: EvaluationSummary | null; unavailable: boolean };
  trace: { id: string; url: string | null; exportVerified: false } | null;
};
