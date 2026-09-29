import { z } from "zod";

import {
  type DiagnosisPrompt,
  type IntegratedDiagnosisModel,
  type ModelGeneration,
} from "./contracts.ts";

export class ModelProviderError extends Error {}

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

type GeminiDiagnosisModelOptions = {
  apiKey: string;
  model: string;
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
      options.endpoint ??
      "https://generativelanguage.googleapis.com/v1beta/interactions";
    this.fetch = options.fetch ?? globalThis.fetch;
    this.maxOutputTokens = options.maxOutputTokens ?? 1_200;
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
        body: JSON.stringify({
          model: this.options.model,
          store: false,
          system_instruction: prompt.instructions,
          input: prompt.input,
          generation_config: { max_output_tokens: this.maxOutputTokens },
          response_format: {
            type: "text",
            mime_type: "application/json",
            schema: GEMINI_DIAGNOSIS_SCHEMA,
          },
        }),
        signal,
      });
    } catch (error) {
      throw new ModelProviderError("Gemini Interactions request failed", {
        cause: error,
      });
    }

    const text = await response.text();
    if (text.length > 65_536) {
      throw new ModelProviderError("Gemini Interactions response was too large");
    }
    if (!response.ok) {
      throw new ModelProviderError(
        `Gemini Interactions request failed: ${response.status}`,
      );
    }

    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch (error) {
      throw new ModelProviderError(
        "Gemini Interactions returned malformed JSON",
        { cause: error },
      );
    }
    const parsed = ProviderResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new ModelProviderError(
        "Gemini Interactions returned an invalid result",
      );
    }

    const outputText = parsed.data.steps
      .filter((step) => step.type === "model_output")
      .flatMap((step) => step.content ?? [])
      .find((content) => content.type === "text")?.text;
    if (!outputText) {
      throw new ModelProviderError(
        "Gemini Interactions returned an invalid result",
      );
    }

    let output: unknown;
    try {
      output = JSON.parse(outputText);
    } catch (error) {
      throw new ModelProviderError(
        "Gemini Interactions returned malformed structured output",
        { cause: error },
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
