import { createHash } from "node:crypto";
import { ControlledFixtureEvidenceSchema } from "../contracts.ts";
import type { IntegratedInvestigationTools } from "../graph.ts";
import {
  searchRunbooks,
  type RunbookIndex,
  type RunbookSearchInput,
  type RunbookMatch,
} from "../tools/search-runbooks.ts";
import type { EvaluationCase } from "./checks.ts";

export type FixtureInput = Pick<
  EvaluationCase,
  "case_id" | "source_kind" | "evidence" | "missing_evidence"
>;
export const fixtureInput = (item: EvaluationCase): FixtureInput => ({
  case_id: item.case_id,
  source_kind: item.source_kind,
  evidence: item.evidence,
  missing_evidence: item.missing_evidence,
});
export const fixtureHash = (value: unknown) =>
  createHash("sha256")
    .update(
      JSON.stringify(value, (_key, item) =>
        item && typeof item === "object" && !Array.isArray(item)
          ? Object.fromEntries(
              Object.entries(item).sort(([a], [b]) => a.localeCompare(b)),
            )
          : item,
      ),
    )
    .digest("hex");

// These are input/authority rejections, independent of expected answers and IDs.
export function fixtureRejection(input: FixtureInput) {
  const facts = new Set(input.evidence.observed_facts);
  if (facts.has("owner_mismatch") || facts.has("owner_unresolved"))
    return "owner_context_rejected" as const;
  if (facts.has("envelope_parse_failed") || facts.has("stage_order_gap"))
    return "invalid_envelope_or_stage" as const;
  if (
    facts.has("approval_version_stale") ||
    facts.has("request_fingerprint_changed")
  )
    return "stale_or_changed_authority" as const;
  if (input.source_kind === "quarantine")
    throw new Error("Unrepresentable quarantine fixture");
  return null;
}

// UUIDs/stage are synthetic namespace carriers, never observed live identities.
function fixtureUuid(id: string, kind: string) {
  const hex = fixtureHash(["controlled-fixture", kind, id]);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function createFixtureTools(
  input: FixtureInput,
  index: RunbookIndex,
  observedAt: string,
) {
  if (fixtureRejection(input))
    throw new Error("Rejected fixture has no diagnosis tools");
  const source = {
    case_id: fixtureUuid(input.case_id, "case"),
    zap_run_id: fixtureUuid(input.case_id, "run"),
    stage: 0,
  };
  const common = {
    contract_version: 1 as const,
    fixture_contract_version: 1 as const,
    source_ref: source,
    observed_at: observedAt,
    simulated: true as const,
    complete: false,
  };
  const action = ["telegram", "email"].includes(input.evidence.provider)
    ? input.evidence.provider
    : null;
  const seal = <T extends object>(value: T) => ({
    ...value,
    content_hash: fixtureHash(value),
  });
  const bundle = ControlledFixtureEvidenceSchema.parse({
    failureContext: seal({
      ...common,
      evidence_id: `fixture:failure:${input.case_id}`,
      type: "failure_context",
      fixture_observation: input.evidence,
      fixture_source_kind: input.source_kind,
      facts: {
        source_kind: "controlled_fixture",
        current_action_type: action,
        retry: {
          provider: input.evidence.provider,
          provider_outcome: input.evidence.delivery_outcome,
          requires_human: null,
          final_error: input.evidence.final_error,
        },
        action_metadata: { paths: [], truncated: true },
        payload: { paths: [], truncated: true },
      },
      unavailable: [
        ...new Set([
          ...input.missing_evidence,
          "canonical_source_identity",
          "action_metadata",
          "payload_values",
        ]),
      ],
    }),
    executionEvidence: seal({
      ...common,
      evidence_id: `fixture:execution:${input.case_id}`,
      type: "execution_evidence",
      facts: {
        provenance: "controlled_fixture",
        current_execution: null,
        attempts: [],
        history_limit: 10,
        history_truncated: true,
        predecessors: [],
        ordering: { status: "unknown", missing_predecessor_stages: [] },
      },
      unavailable: [
        "execution_record",
        "attempt_history",
        "execution_ordering",
      ],
    }),
    inputValidation: seal({
      ...common,
      evidence_id: `fixture:validation:${input.case_id}`,
      type: "action_input_validation",
      facts: {
        action_type: action,
        validation_status: "blocked",
        supported: null,
        missing_required_fields: [],
        invalid_field_types: [],
        missing_template_paths: [],
        credential_presence: [],
        blocked_reasons: ["fixture_inputs_unavailable"],
        input_fingerprint: null,
      },
      unavailable: ["action_inputs", "input_fingerprint", "handler_registry"],
    }),
  });
  let retrieval: { input: RunbookSearchInput; matches: RunbookMatch[] } | null =
    null;
  const read = <T>(value: T, signal: AbortSignal) => {
    signal.throwIfAborted();
    return Promise.resolve(structuredClone(value));
  };
  const tools: IntegratedInvestigationTools = {
    getFailureContext: (signal) => read(bundle.failureContext, signal),
    getExecutionEvidence: (limit, signal) => {
      if (limit !== 10) throw new Error("Unexpected fixture history bound");
      return read(bundle.executionEvidence, signal);
    },
    validateActionInputs: (signal) => read(bundle.inputValidation, signal),
    searchRunbooks: (query) => {
      const matches = searchRunbooks(index, query);
      retrieval = structuredClone({ input: query, matches });
      return matches;
    },
  };
  return { tools, bundle, getRetrieval: () => retrieval };
}
