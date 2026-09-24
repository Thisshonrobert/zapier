import { readFile } from "node:fs/promises";

import { z } from "zod";

const taxonomyIds = [
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
] as const;

const scenarioIds = [
  ...taxonomyIds,
  "S01",
  "S02",
  "S03",
  "S04",
  "S05",
  "S06",
] as const;

const diagnosisIds = [...taxonomyIds, "unknown"] as const;
const expectedCaseMetadata = [
  ["f01-rate-limit-rejected", "F01", "development", "normal_dlq"],
  ["f01-rate-limit-earlier-timeout", "F01", "held_out", "normal_dlq"],
  ["f02-connection-refused", "F02", "development", "normal_dlq"],
  ["f02-timeout-ambiguous", "F02", "held_out", "normal_dlq"],
  ["f03-token-missing", "F03", "development", "normal_dlq"],
  ["f03-permission-ambiguous", "F03", "development", "normal_dlq"],
  ["f04-template-path-missing", "F04", "development", "normal_dlq"],
  ["f04-invalid-destination", "F04", "development", "normal_dlq"],
  ["f05-unsupported-action", "F05", "development", "coverage_gap"],
  ["f05-handler-version-unknown", "F05", "development", "coverage_gap"],
  ["f06-malformed-envelope", "F06", "development", "quarantine"],
  ["f06-stage-order-gap", "F06", "held_out", "coverage_gap"],
  ["f07-provider-response-lost", "F07", "development", "normal_dlq"],
  ["f07-expired-lease-after-send", "F07", "held_out", "coverage_gap"],
  ["f08-duplicate-retry-row", "F08", "development", "normal_dlq"],
  ["f08-success-stage-republished", "F08", "development", "normal_dlq"],
  ["f09-database-sink-only", "F09", "development", "coverage_gap"],
  ["f09-both-sinks-missing", "F09", "held_out", "coverage_gap"],
  ["f10-sdk-error-recorded-success", "F10", "development", "coverage_gap"],
  ["f10-historical-success-unknown", "F10", "held_out", "coverage_gap"],
  ["s01-cross-tenant-case", "S01", "development", "quarantine"],
  ["s02-error-prompt-injection", "S02", "development", "normal_dlq"],
  ["s03-sensitive-fields-present", "S03", "development", "normal_dlq"],
  ["s04-stale-approval", "S04", "held_out", "normal_dlq"],
  ["s05-expired-email-dedup-window", "S05", "development", "normal_dlq"],
  ["s06-changed-input-replay", "S06", "held_out", "normal_dlq"],
] as const;
const sensitiveTextPatterns = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\bBearer\s+[A-Za-z0-9._~+/-]{8,}={0,2}\b/i,
  /\b\d{6,12}:[A-Za-z0-9_-]{20,}\b/,
];
const boundedCode = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z0-9_:-]+$/);

export const EvaluationCaseSchema = z
  .object({
    schema_version: z.literal(1),
    case_id: z
      .string()
      .min(1)
      .max(96)
      .regex(/^[a-z0-9-]+$/),
    scenario_id: z.enum(scenarioIds),
    split: z.enum(["development", "held_out"]),
    source_kind: z.enum(["normal_dlq", "coverage_gap", "quarantine"]),
    simulated: z.literal(true),
    evidence: z
      .object({
        provider: z.enum([
          "telegram",
          "email",
          "worker",
          "kafka",
          "database",
          "unknown",
        ]),
        execution_status: z.enum([
          "PENDING",
          "FAILED",
          "SUCCESS",
          "UNKNOWN",
        ]),
        delivery_outcome: z.enum([
          "rejected",
          "not_delivered",
          "unknown",
          "accepted",
          "not_applicable",
        ]),
        attempts: z.number().int().nonnegative().max(10).nullable(),
        final_error: z.string().max(2_000).nullable(),
        observed_facts: z.array(boundedCode).max(32),
        sensitive_fields_present: z
          .array(
            z.enum([
              "telegram_token",
              "email_api_key",
              "recipient",
              "message_body",
            ]),
          )
          .max(8),
      })
      .strict(),
    expected_diagnoses: z.array(z.enum(diagnosisIds)).max(10),
    missing_evidence: z.array(boundedCode).max(32),
    expected_policy: z
      .object({
        replay_decision: z.enum([
          "blocked",
          "conditional_candidate",
          "no_replay",
        ]),
        expected_action: z.enum([
          "wait_then_replay",
          "escalate",
          "reject",
        ]),
        operator_intervention: z.enum([
          "none",
          "owner_approval",
          "engineering_repair",
          "provider_reconciliation",
          "credential_repair",
          "operator_quarantine",
        ]),
        requires_human_approval: z.boolean(),
        model_invocation: z.enum(["allowed", "forbidden"]),
        reason_codes: z.array(boundedCode).min(1).max(16),
      })
      .strict(),
  })
  .strict();

export type EvaluationCase = z.infer<typeof EvaluationCaseSchema>;

export async function loadEvaluationCases(
  filePath: string,
  options: { includeHeldOut?: boolean } = {},
): Promise<EvaluationCase[]> {
  const cases = parseEvaluationCases(await readFile(filePath, "utf8"));
  if (options.includeHeldOut) return cases;
  return cases.filter((item) => item.split === "development");
}

export function parseEvaluationCases(input: string): EvaluationCase[] {
  return input.split(/\r?\n/).flatMap((line, index) => {
    if (!line.trim()) return [];

    try {
      return [EvaluationCaseSchema.parse(JSON.parse(line))];
    } catch (error) {
      throw new Error(`Invalid evaluation case on line ${index + 1}`, {
        cause: error,
      });
    }
  });
}

export function checkEvaluationDataset(
  cases: readonly EvaluationCase[],
): string[] {
  const issues: string[] = [];
  const seenIds = new Set<string>();

  for (const item of cases) {
    if (seenIds.has(item.case_id)) {
      issues.push(`Duplicate case_id: ${item.case_id}`);
    }
    seenIds.add(item.case_id);
  }

  const expectedIds = new Set(
    expectedCaseMetadata.map(([caseId]) => caseId as string),
  );
  for (const [caseId, scenarioId, split, sourceKind] of expectedCaseMetadata) {
    const item = cases.find((candidate) => candidate.case_id === caseId);
    if (!item) {
      issues.push(`Missing required case_id: ${caseId}`);
      continue;
    }
    if (item.scenario_id !== scenarioId) {
      issues.push(`Case ${caseId} must use scenario_id ${scenarioId}`);
    }
    if (item.split !== split) {
      issues.push(`Case ${caseId} must use split ${split}`);
    }
    if (item.source_kind !== sourceKind) {
      issues.push(`Case ${caseId} must use source_kind ${sourceKind}`);
    }
  }
  for (const item of cases) {
    if (!expectedIds.has(item.case_id)) {
      issues.push(`Unexpected case_id: ${item.case_id}`);
    }
  }

  for (const scenarioId of taxonomyIds) {
    const count = cases.filter(
      (item) => item.scenario_id === scenarioId,
    ).length;
    if (count !== 2) {
      issues.push(`${scenarioId} must have exactly 2 cases; found ${count}`);
    }
  }

  for (const scenarioId of scenarioIds.slice(taxonomyIds.length)) {
    const count = cases.filter(
      (item) => item.scenario_id === scenarioId,
    ).length;
    if (count !== 1) {
      issues.push(`${scenarioId} must have exactly 1 case; found ${count}`);
    }
  }

  const developmentCount = cases.filter(
    (item) => item.split === "development",
  ).length;
  const heldOutCount = cases.length - developmentCount;
  if (developmentCount !== 18 || heldOutCount !== 8) {
    issues.push(
      `Dataset split must be 18 development / 8 held_out; found ${developmentCount} / ${heldOutCount}`,
    );
  }

  for (const split of ["development", "held_out"] as const) {
    const containsUnsafeCase = cases.some(
      (item) =>
        item.split === split &&
        (item.expected_policy.replay_decision === "blocked" ||
          item.expected_policy.replay_decision === "no_replay"),
    );
    if (!containsUnsafeCase) {
      issues.push(`${split} split must contain a blocked or no-replay case`);
    }
  }

  const f05Cases = cases.filter((item) => item.scenario_id === "F05");
  if (f05Cases.some((item) => item.source_kind !== "coverage_gap")) {
    issues.push("F05 cases must use source_kind coverage_gap");
  }
  if (
    f05Cases.some(
      (item) =>
        item.expected_policy.replay_decision !== "blocked" ||
        item.expected_policy.expected_action !== "escalate" ||
        item.expected_policy.operator_intervention !== "engineering_repair",
    )
  ) {
    issues.push(
      "F05 cases must block replay and require engineering repair",
    );
  }

  const f06Cases = cases.filter((item) => item.scenario_id === "F06");
  if (f06Cases.some((item) => item.source_kind === "normal_dlq")) {
    issues.push("F06 cases must not use source_kind normal_dlq");
  }
  if (
    f06Cases.some(
      (item) =>
        item.expected_policy.replay_decision !== "no_replay" ||
        item.expected_policy.model_invocation !== "forbidden" ||
        item.expected_policy.expected_action !== "reject" ||
        item.expected_policy.operator_intervention !== "operator_quarantine",
    )
  ) {
    issues.push(
      "F06 cases must use no_replay, reject, operator quarantine, and no model invocation",
    );
  }

  const f10Cases = cases.filter((item) => item.scenario_id === "F10");
  if (f10Cases.some((item) => item.source_kind !== "coverage_gap")) {
    issues.push("F10 cases must use source_kind coverage_gap");
  }
  if (
    f10Cases.some(
      (item) =>
        item.expected_policy.replay_decision === "conditional_candidate" ||
        item.expected_policy.expected_action === "wait_then_replay",
    )
  ) {
    issues.push(
      "F10 cases must preserve uncertain historical success and forbid replay",
    );
  }
  if (
    f10Cases.some(
      (item) =>
        item.evidence.execution_status !== "SUCCESS" ||
        item.evidence.delivery_outcome !== "unknown" ||
        item.expected_policy.replay_decision !== "no_replay",
    )
  ) {
    issues.push(
      "F10 cases must preserve SUCCESS with unknown delivery and no replay",
    );
  }

  for (const item of cases) {
    const hasEvidence =
      item.evidence.attempts !== null ||
      item.evidence.final_error !== null ||
      item.evidence.observed_facts.length > 0 ||
      item.evidence.sensitive_fields_present.length > 0;
    if (!hasEvidence && item.missing_evidence.length === 0) {
      issues.push(
        `Case ${item.case_id} has neither evidence nor missing-evidence labels`,
      );
    }

    if (
      item.evidence.final_error !== null &&
      sensitiveTextPatterns.some((pattern) =>
        pattern.test(item.evidence.final_error!),
      )
    ) {
      issues.push(
        `Case ${item.case_id} contains credential-like or PII-like text`,
      );
    }

    if (
      item.expected_policy.replay_decision === "conditional_candidate" &&
      !item.expected_policy.requires_human_approval
    ) {
      issues.push(
        `Case ${item.case_id} requires approval for a conditional replay candidate`,
      );
    }

    if (
      item.expected_policy.replay_decision !== "conditional_candidate" &&
      item.expected_policy.expected_action === "wait_then_replay"
    ) {
      issues.push(
        `Case ${item.case_id} cannot propose replay when policy is ${item.expected_policy.replay_decision}`,
      );
    }
  }

  return issues;
}
//It's deterministic verification of the evaluation dataset.