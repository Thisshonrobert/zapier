import { z } from "zod";

import {
  type DiagnosisPrompt,
  type IntegratedDiagnosisModel,
  type ModelGeneration,
  ModelUsageSchema,
  type ModelUsage,
} from "./contracts.ts";

export const ProviderErrorDetailsSchema = z
  .object({
    category: z.enum([
      "network_error",
      "http_error",
      "malformed_json",
      "invalid_response",
      "response_too_large",
      "malformed_output",
      "unknown",
    ]),
    http_status: z.number().int().min(100).max(599).nullable(),
    output_diagnostics: z
      .object({
        text_length: z.number().int().nonnegative().max(32_768),
        text_block_count: z.number().int().positive().max(65_536),
        supported_fence: z.boolean(),
        parse_failure: z.literal("json_syntax"),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine(
    (value) =>
      (value.category === "http_error") === (value.http_status !== null) &&
      (value.output_diagnostics === undefined ||
        value.category === "malformed_output"),
  );

export class ModelProviderError extends Error {
  constructor(
    message: string,
    options?: ErrorOptions,
    readonly usage: ModelUsage | null = null,
    readonly details: z.infer<typeof ProviderErrorDetailsSchema> = {
      category: "unknown",
      http_status: null,
    },
  ) {
    super(message, options);
  }
}

const boundedString = { type: "string", minLength: 1, maxLength: 1_000 };
const evidenceReference = {
  type: "string",
  minLength: 1,
  maxLength: 128,
  pattern: "^[A-Za-z0-9._:-]+$",
};

export const GEMINI_DIAGNOSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string", enum: ["completed", "abstained"] },
    diagnosis: {
      type: "object",
      additionalProperties: false,
      properties: {
        taxonomy_id: {
          type: "string",
          enum: [
            "F01",
            "F02",
            "F03",
            "F04",
            "F05",
            "F06",
            "F07",
            "F08",
            "F09",
            "F10",
            "unknown",
          ],
        },
        summary: boundedString,
        confidence: { type: "string", enum: ["low", "medium", "high"] },
        evidence_refs: {
          type: "array",
          minItems: 1,
          maxItems: 16,
          items: evidenceReference,
        },
        alternate_explanations: {
          type: "array",
          maxItems: 8,
          items: boundedString,
        },
        missing_evidence: {
          type: "array",
          maxItems: 16,
          items: { type: "string", minLength: 1, maxLength: 128 },
        },
      },
      required: [
        "taxonomy_id",
        "summary",
        "confidence",
        "evidence_refs",
        "alternate_explanations",
        "missing_evidence",
      ],
    },
    proposal: {
      type: "object",
      additionalProperties: false,
      properties: {
        disposition: {
          type: "string",
          enum: [
            "replay_candidate",
            "owner_action_required",
            "engineering_escalation_required",
            "insufficient_evidence",
            "outcome_unknown",
            "duplicate_or_stale",
            "resolved_without_replay",
          ],
        },
        kind: {
          type: "string",
          enum: [
            "wait_then_replay",
            "request_manual_fix",
            "escalate",
            "no_action",
          ],
        },
        summary: boundedString,
        reasons: {
          type: "array",
          minItems: 1,
          maxItems: 16,
          items: boundedString,
        },
        evidence_refs: {
          type: "array",
          minItems: 1,
          maxItems: 16,
          items: evidenceReference,
        },
        runbook_citations: {
          type: "array",
          maxItems: 3,
          items: {
            type: "string",
            minLength: 1,
            maxLength: 256,
            pattern: "^RB-[A-Z0-9-]+@\\d+\\.\\d+\\.\\d+#[a-z0-9-]+$",
          },
        },
        preconditions: {
          type: "array",
          maxItems: 16,
          items: boundedString,
        },
      },
      required: [
        "disposition",
        "kind",
        "summary",
        "reasons",
        "evidence_refs",
        "runbook_citations",
        "preconditions",
      ],
    },
  },
  required: ["status", "diagnosis", "proposal"],
} as const;

const ProviderResponseSchema = z
  .object({
    status: z.literal("completed"),
    steps: z.array(
      z
        .object({
          type: z.string(),
          content: z
            .array(
              z
                .object({
                  type: z.string(),
                  text: z.string().max(32_768).optional(),
                })
                .passthrough(),
            )
            .optional(),
        })
        .passthrough(),
    ),
    usage: z.object({
      total_input_tokens: z.number().int().nonnegative(),
      total_output_tokens: z.number().int().nonnegative(),
      total_tokens: z.number().int().nonnegative(),
    }),
  })
  .passthrough();

const GenerateContentUsageSchema = z.object({
  promptTokenCount: z.number().int().nonnegative(),
  candidatesTokenCount: z.number().int().nonnegative().default(0),
  thoughtsTokenCount: z.number().int().nonnegative().default(0),
  totalTokenCount: z.number().int().nonnegative(),
});
const GenerateContentResponseSchema = z
  .object({
    candidates: z
      .array(
        z
          .object({
            finishReason: z.literal("STOP"),
            content: z.object({
              parts: z.array(
                z
                  .object({
                    text: z.string().max(32_768).optional(),
                    thought: z.boolean().optional(),
                  })
                  .passthrough(),
              ),
            }),
          })
          .passthrough(),
      )
      .length(1),
    usageMetadata: GenerateContentUsageSchema,
  })
  .passthrough();

export type GeminiApi = "interactions" | "generate-content";
export function geminiEndpoint(model: string, api: GeminiApi = "interactions") {
  return api === "interactions"
    ? "https://generativelanguage.googleapis.com/v1beta/interactions"
    : `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
}

type GeminiDiagnosisModelOptions = {
  apiKey: string;
  model: string;
  api?: GeminiApi;
  endpoint?: string;
  maxOutputTokens?: number;
  fetch?: FetchLike;
};

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export class GeminiDiagnosisModel implements IntegratedDiagnosisModel {
  private readonly endpoint: string;
  private readonly fetch: FetchLike;
  private readonly maxOutputTokens: number;

  constructor(private readonly options: GeminiDiagnosisModelOptions) {
    if (!options.apiKey) throw new Error("Gemini API key is required");
    if (!options.model) throw new Error("Gemini model is required");
    this.endpoint =
      options.endpoint ?? geminiEndpoint(options.model, options.api);
    this.fetch = options.fetch ?? globalThis.fetch;
    this.maxOutputTokens = options.maxOutputTokens ?? 4_096;
    if (
      !Number.isInteger(this.maxOutputTokens) ||
      this.maxOutputTokens < 1 ||
      this.maxOutputTokens > 4_096
    ) {
      throw new RangeError("maxOutputTokens must be between 1 and 4096");
    }
  }

  async generate(
    prompt: DiagnosisPrompt,
    signal: AbortSignal,
  ): Promise<ModelGeneration> {
    let response: Response;
    try {
      response = await this.fetch(this.endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": this.options.apiKey,
        },
        body: JSON.stringify(
          this.options.api === "generate-content"
            ? {
                systemInstruction: {
                  parts: [
                    {
                      text: `${prompt.instructions}\nReturn JSON matching this exact schema:\n${JSON.stringify(GEMINI_DIAGNOSIS_SCHEMA)}`,
                    },
                  ],
                },
                contents: [{ role: "user", parts: [{ text: prompt.input }] }],
                generationConfig: {
                  maxOutputTokens: this.maxOutputTokens,
                  responseMimeType: "application/json",
                  responseJsonSchema: GEMINI_DIAGNOSIS_SCHEMA,
                },
              }
            : {
                model: this.options.model,
                store: false,
                system_instruction: `${prompt.instructions}\nReturn JSON matching this exact schema:\n${JSON.stringify(GEMINI_DIAGNOSIS_SCHEMA)}`,
                input: prompt.input,
                generation_config: {
                  max_output_tokens: this.maxOutputTokens,
                },
                response_format: [
                  {
                    type: "text",
                    mime_type: "application/json",
                    schema: GEMINI_DIAGNOSIS_SCHEMA,
                  },
                ],
              },
        ),
        signal,
      });
    } catch (error) {
      throw new ModelProviderError(
        "Gemini Interactions request failed",
        {
          cause: error,
        },
        null,
        { category: "network_error", http_status: null },
      );
    }

    if (!response.ok) {
      throw new ModelProviderError(
        `Gemini Interactions request failed: ${response.status}`,
        undefined,
        null,
        { category: "http_error", http_status: response.status },
      );
    }
    let text: string;
    try {
      text = await response.text();
    } catch (error) {
      throw new ModelProviderError(
        "Gemini Interactions response read failed",
        { cause: error },
        null,
        { category: "network_error", http_status: null },
      );
    }
    if (text.length > 65_536) {
      throw new ModelProviderError(
        "Gemini Interactions response was too large",
        undefined,
        null,
        { category: "response_too_large", http_status: null },
      );
    }

    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      throw new ModelProviderError(
        "Gemini Interactions returned malformed JSON",
        undefined,
        null,
        { category: "malformed_json", http_status: null },
      );
    }
    if (this.options.api === "generate-content") {
      const responseData = GenerateContentResponseSchema.safeParse(payload);
      const measuredData = z
        .object({ usageMetadata: GenerateContentUsageSchema })
        .safeParse(payload);
      const metadata = measuredData.success
        ? measuredData.data.usageMetadata
        : null;
      const usage = metadata
        ? {
            total_input_tokens: metadata.promptTokenCount,
            total_output_tokens:
              metadata.candidatesTokenCount + metadata.thoughtsTokenCount,
            total_tokens: metadata.totalTokenCount,
          }
        : null;
      // Normalize the explicit protocol into the shared parser; never retain thought text.
      payload = responseData.success
        ? {
            status: "completed",
            steps: [
              {
                type: "model_output",
                content: responseData.data.candidates[0]!.content.parts.filter(
                  (part) => part.thought !== true && part.text !== undefined,
                ).map((part) => ({ type: "text", text: part.text })),
              },
            ],
            usage,
          }
        : { usage };
    }
    // Usage can be known even when completion/structured output is invalid.
    const providerUsage = z
      .object({
        usage: z.object({
          total_input_tokens: z.number(),
          total_output_tokens: z.number(),
          total_tokens: z.number(),
        }),
      })
      .safeParse(payload);
    const measured = ModelUsageSchema.safeParse(
      providerUsage.success
        ? {
            input_tokens: providerUsage.data.usage.total_input_tokens,
            output_tokens: providerUsage.data.usage.total_output_tokens,
            total_tokens: providerUsage.data.usage.total_tokens,
          }
        : null,
    );
    const usage = measured.success ? measured.data : null;
    const parsed = ProviderResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new ModelProviderError(
        "Gemini Interactions returned an invalid result",
        undefined,
        usage,
        { category: "invalid_response", http_status: null },
      );
    }

    const textBlocks = parsed.data.steps
      .filter((step) => step.type === "model_output")
      .flatMap((step) => step.content ?? [])
      .filter((content) => content.type === "text");
    const outputText = textBlocks[0]?.text;
    if (!outputText) {
      throw new ModelProviderError(
        "Gemini Interactions returned an invalid result",
        undefined,
        usage,
        { category: "invalid_response", http_status: null },
      );
    }

    let output: unknown;
    const fenced = /^```(?:json)?\s*\n([\s\S]*?)\n```\s*$/.exec(outputText);
    try {
      output = JSON.parse(fenced ? fenced[1]! : outputText);
    } catch {
      throw new ModelProviderError(
        "Gemini Interactions returned malformed structured output",
        undefined,
        usage,
        {
          category: "malformed_output",
          http_status: null,
          output_diagnostics: {
            text_length: outputText.length,
            text_block_count: textBlocks.length,
            supported_fence: fenced !== null,
            parse_failure: "json_syntax",
          },
        },
      );
    }
    return {
      output,
      usage: {
        input_tokens: parsed.data.usage.total_input_tokens,
        output_tokens: parsed.data.usage.total_output_tokens,
        total_tokens: parsed.data.usage.total_tokens,
      },
    };
  }

  async close(): Promise<void> {}
}
