import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { z } from "zod";
import { ModelUsageSchema } from "../contracts.ts";
import { geminiEndpoint } from "../gemini-model.ts";
import {
  JudgePairSchema,
  JudgeVoteSchema,
  JudgeModelError,
  judgePair,
  type JudgeModel,
  type JudgePair,
  type JudgeResult,
} from "./judge.ts";
import {
  JUDGE_INSTRUCTIONS,
  RUBRIC,
  RUBRIC_VERSION,
  buildJudgePrompt,
} from "./rubric.ts";

const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const rubricHash = () => hash({ RUBRIC, JUDGE_INSTRUCTIONS });
export const JudgeDatasetSchema = z
  .array(JudgePairSchema)
  .min(1)
  .max(26)
  .refine(
    (pairs) => new Set(pairs.map((p) => p.case_id)).size === pairs.length,
  );
const OptionsSchema = z.object({
  model: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[A-Za-z0-9._:-]+$/),
  includeHeldOut: z.boolean().default(false),
  timeoutMs: z.number().int().positive().max(60_000).default(30_000),
  runTimeoutMs: z.number().int().positive().max(1_800_000).default(600_000),
});

export async function runJudgeEvaluation(
  input: JudgePair[],
  model: JudgeModel,
  options: z.input<typeof OptionsSchema>,
  signal?: AbortSignal,
) {
  const dataset = JudgeDatasetSchema.parse(input);
  const settings = OptionsSchema.parse(options);
  const pairs = dataset.filter(
    (p) => settings.includeHeldOut || p.split === "development",
  );
  if (!pairs.length) throw new Error("No selected judge pairs");
  const controller = new AbortController();
  const relay = () => controller.abort();
  signal?.addEventListener("abort", relay, { once: true });
  if (signal?.aborted) relay();
  const timer = setTimeout(relay, settings.runTimeoutMs);
  const rows: JudgeResult[] = [];
  try {
    for (const pair of pairs)
      rows.push(
        await judgePair(pair, model, {
          signal: controller.signal,
          timeoutMs: settings.timeoutMs,
        }),
      );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", relay);
  }
  const calibrationFor = (selected: JudgePair[]) => {
    const labelled = selected.filter((p) => p.human_winner !== null);
    const conclusive = labelled.filter(
      (p) => rows.find((r) => r.case_id === p.case_id)!.status === "conclusive",
    );
    const agreements = conclusive.filter(
      (p) =>
        rows.find((r) => r.case_id === p.case_id)!.winner ===
        (p.human_winner === "left"
          ? p.left.id
          : p.human_winner === "right"
            ? p.right.id
            : null),
    ).length;
    return {
      labelled: labelled.length,
      conclusive: conclusive.length,
      agreements,
      agreement_rate: conclusive.length ? agreements / conclusive.length : null,
      coverage: labelled.length ? conclusive.length / labelled.length : null,
    };
  };
  return {
    schema_version: 1,
    rubric_version: RUBRIC_VERSION,
    authority: "advisory_only" as const,
    model: settings.model,
    settings,
    dataset_hash: hash(pairs),
    rubric_hash: rubricHash(),
    source_hashes: Object.fromEntries(
      await Promise.all(
        ["judge.ts", "rubric.ts", "judge-runner.ts"].map(async (path) => [
          path,
          hash(await readFile(new URL(path, import.meta.url), "utf8")),
        ]),
      ),
    ),
    rows,
    calibration: calibrationFor(pairs),
    splits: Object.fromEntries(
      (["development", "held_out"] as const)
        .filter((split) => pairs.some((p) => p.split === split))
        .map((split) => [
          split,
          calibrationFor(pairs.filter((p) => p.split === split)),
        ]),
    ),
    invocations: rows.reduce((sum, r) => sum + r.invocations, 0),
    cost_usd: null,
    caveats: [
      "Human agreement is a small-sample diagnostic, not a release or authorization gate.",
      "Human labels are supplied separately and their provenance is not independently verified.",
      "No human calibration is claimed without labels; no usefulness threshold is inferred.",
      "Two-pass agreement detects order sensitivity but does not eliminate systematic judge bias.",
      "Synthetic sanitized pairs only; no production effects or changes to deterministic safety checks.",
      "Held-out pairs require explicit selection and must never be used for tuning.",
      "Unknown provider cost and missing token usage remain null.",
    ],
  };
}

export function createGeminiJudge(options: {
  model: string;
  apiKey: string;
  fetch?: (input: string, init: RequestInit) => Promise<Response>;
}): JudgeModel {
  if (!/^gemini-[a-z0-9.-]+$/.test(options.model) || !options.apiKey)
    throw new Error("Explicit Gemini model and credential required");
  const transport = options.fetch ?? fetch;
  return async (prompt, signal) => {
    if (prompt.length > 40_000) throw new JudgeModelError("invalid_output");
    const response = await transport(
      geminiEndpoint(options.model, "generate-content"),
      {
        method: "POST",
        signal,
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": options.apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: JUDGE_INSTRUCTIONS }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 1024,
            responseMimeType: "application/json",
            responseJsonSchema: z.toJSONSchema(JudgeVoteSchema, {
              unrepresentable: "any",
            }),
          },
        }),
      },
    );
    if (!response.ok) {
      await response.body?.cancel();
      throw new JudgeModelError("provider_error");
    }
    // Bound response bytes before JSON parsing; never retain provider bodies in reports.
    const reader = response.body?.getReader();
    if (!reader) throw new JudgeModelError("invalid_output");
    let text = "";
    let bytes = 0;
    const decoder = new TextDecoder();
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > 65_536) throw new JudgeModelError("invalid_output");
        text += decoder.decode(chunk.value, { stream: true });
      }
      text += decoder.decode();
    } finally {
      await reader.cancel();
      reader.releaseLock();
    }
    try {
      const envelope = z
        .object({
          candidates: z
            .array(
              z.object({
                finishReason: z.literal("STOP"),
                content: z.object({
                  parts: z
                    .array(
                      z
                        .object({
                          text: z.string().max(16_384).optional(),
                          thought: z.boolean().optional(),
                        })
                        .passthrough(),
                    )
                    .min(1)
                    .max(16),
                }),
              }),
            )
            .length(1),
          usageMetadata: z
            .object({
              promptTokenCount: z.number().int().nonnegative(),
              candidatesTokenCount: z.number().int().nonnegative().default(0),
              thoughtsTokenCount: z.number().int().nonnegative().default(0),
              totalTokenCount: z.number().int().nonnegative(),
            })
            .optional(),
        })
        .parse(JSON.parse(text));
      const usage = envelope.usageMetadata;
      const outputParts = envelope.candidates[0]!.content.parts.filter(
        (p) => p.thought !== true && p.text !== undefined,
      );
      if (outputParts.length !== 1) throw new JudgeModelError("invalid_output");
      return {
        output: JSON.parse(outputParts[0]!.text!),
        usage: usage
          ? ModelUsageSchema.parse({
              input_tokens: usage.promptTokenCount,
              output_tokens:
                usage.candidatesTokenCount + usage.thoughtsTokenCount,
              total_tokens: usage.totalTokenCount,
            })
          : null,
      };
    } catch {
      throw new JudgeModelError("invalid_output");
    }
  };
}

const FrozenPassSchema = z
  .object({
    case_id: z.string(),
    order: z.enum(["left_right", "right_left"]),
    prompt_hash: z.string().regex(/^[a-f0-9]{64}$/),
    invoked: z.boolean(),
    vote: JudgeVoteSchema.nullable(),
    usage: ModelUsageSchema.nullable(),
    failure: z
      .enum(["invalid_output", "provider_error", "timeout", "cancelled"])
      .nullable(),
  })
  .strict()
  .refine((p) => (p.vote !== null) !== (p.failure !== null))
  .refine((p) => p.invoked || (p.failure === "cancelled" && p.usage === null));
const FrozenVotesSchema = z
  .object({
    schema_version: z.literal(1),
    model: z.string().min(1).max(128),
    rubric_hash: z.string().regex(/^[a-f0-9]{64}$/),
    records: z.array(FrozenPassSchema).max(52),
  })
  .strict();
export function frozenJudge(
  pairs: JudgePair[],
  input: unknown,
  expectedModel?: string,
): JudgeModel {
  const envelope = FrozenVotesSchema.parse(input);
  if (
    envelope.rubric_hash !== rubricHash() ||
    (expectedModel && envelope.model !== expectedModel)
  )
    throw new Error("Frozen rubric or model mismatch");
  const frozen = envelope.records;
  for (const pair of pairs) {
    const records = frozen.filter((p) => p.case_id === pair.case_id);
    const first = records.find((p) => p.order === "left_right");
    const stopped = first?.failure && first.failure !== "invalid_output";
    if (
      records.length !== (stopped ? 1 : 2) ||
      new Set(records.map((p) => p.order)).size !== records.length
    )
      throw new Error("Incomplete or duplicate frozen passes");
    for (const record of records)
      if (
        record.prompt_hash !==
        hash(buildJudgePrompt(pair, record.order === "right_left"))
      )
        throw new Error("Frozen prompt mismatch");
  }
  const expected = pairs.flatMap((p) =>
    ["left_right", "right_left"].map((order) => ({
      case_id: p.case_id,
      order,
    })),
  );
  let index = 0;
  return async (prompt) => {
    const target = expected[index++];
    const matches = frozen.filter(
      (p) => p.case_id === target?.case_id && p.order === target?.order,
    );
    if (matches.length !== 1) throw new JudgeModelError("invalid_output");
    const pass = matches[0]!;
    if (pass.prompt_hash !== hash(prompt))
      throw new JudgeModelError("invalid_output");
    // If the first pass aborted live, its second pass was never invoked.
    if (
      pass.failure &&
      pass.order === "left_right" &&
      pass.failure !== "invalid_output"
    )
      index++;
    if (pass.failure) throw new JudgeModelError(pass.failure, pass.invoked);
    return { output: pass.vote, usage: pass.usage };
  };
}

export function captureJudgeVotes(
  pairs: JudgePair[],
  report: Awaited<ReturnType<typeof runJudgeEvaluation>>,
) {
  const records = report.rows.flatMap((row) => {
    const pair = pairs.find((p) => p.case_id === row.case_id)!;
    const passes = row.passes.map((p) => ({
      case_id: row.case_id,
      order: p.order,
      prompt_hash: hash(buildJudgePrompt(pair, p.order === "right_left")),
      invoked: true,
      vote: p.vote,
      usage: p.usage,
      failure: p.vote ? null : p.reason,
    }));
    if (
      row.reason === "cancelled" &&
      row.passes.at(-1)?.reason !== "cancelled"
    ) {
      const order = row.passes.length
        ? ("right_left" as const)
        : ("left_right" as const);
      passes.push({
        case_id: row.case_id,
        order,
        prompt_hash: hash(buildJudgePrompt(pair, order === "right_left")),
        invoked: false,
        vote: null,
        usage: null,
        failure: "cancelled",
      });
    }
    return passes;
  });
  return FrozenVotesSchema.parse({
    schema_version: 1,
    model: report.model,
    rubric_hash: report.rubric_hash,
    records,
  });
}

export function renderJudgeReport(
  report: Awaited<ReturnType<typeof runJudgeEvaluation>>,
) {
  return (
    `# Offline semantic judge\n\nModel: ${report.model}; rubric: ${report.rubric_version}; authority: advisory only.\n\n` +
    `Human-labelled pairs: ${report.calibration.labelled}; conclusive: ${report.calibration.conclusive}; agreements: ${report.calibration.agreements}; agreement rate: ${report.calibration.agreement_rate ?? "unmeasured"}.\n\n` +
    `| Case | Split | Result | Winner | Reason |\n|---|---|---|---|---|\n` +
    report.rows
      .map(
        (r) =>
          `| ${r.case_id} | ${r.split} | ${r.status} | ${r.winner ?? "—"} | ${r.reason} |`,
      )
      .join("\n") +
    `\n\n${report.caveats.map((c) => `- ${c}`).join("\n")}\n`
  );
}

async function main() {
  const { values } = parseArgs({
    options: {
      input: { type: "string" },
      votes: { type: "string" },
      model: { type: "string" },
      output: { type: "string" },
      "live-model": { type: "boolean" },
      "include-held-out": { type: "boolean" },
    },
    strict: true,
  });
  if (
    !values.input ||
    !values.output ||
    !values.model ||
    !!values.votes === !!values["live-model"]
  )
    throw new Error(
      "Use --input --model --output and exactly one of --votes or --live-model",
    );
  const load = async (path: string) => {
    const source = await readFile(resolve(path), "utf8");
    if (source.length > 1_000_000) throw new Error("Input file exceeds budget");
    return JSON.parse(source) as unknown;
  };
  const pairs = JudgeDatasetSchema.parse(await load(values.input));
  const selected = pairs.filter(
    (p) => values["include-held-out"] || p.split === "development",
  );
  const model = values.votes
    ? frozenJudge(selected, await load(values.votes), values.model)
    : createGeminiJudge({
        model: values.model,
        apiKey: process.env.GEMINI_API_KEY ?? "",
      });
  const controller = new AbortController();
  const cancel = () => controller.abort();
  process.once("SIGINT", cancel);
  try {
    const report = await runJudgeEvaluation(
      pairs,
      model,
      { model: values.model, includeHeldOut: !!values["include-held-out"] },
      controller.signal,
    );
    const frozen = captureJudgeVotes(selected, report);
    const output = resolve(values.output);
    await writeFile(
      `${output}.json`,
      JSON.stringify(
        { ...report, execution: values.votes ? "frozen" : "live" },
        null,
        2,
      ) + "\n",
      { flag: "wx" },
    );
    await writeFile(`${output}.md`, renderJudgeReport(report), { flag: "wx" });
    await writeFile(
      `${output}.votes.json`,
      JSON.stringify(frozen, null, 2) + "\n",
      { flag: "wx" },
    );
    if (
      report.rows.some((r) =>
        ["invalid_output", "provider_error", "timeout", "cancelled"].includes(
          r.reason,
        ),
      )
    )
      process.exitCode = 1;
  } finally {
    process.removeListener("SIGINT", cancel);
  }
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch(() => {
    console.error(
      "Judge run failed. Check sanitized input, frozen votes, output paths, and explicit model configuration.",
    );
    process.exitCode = 1;
  });
}
