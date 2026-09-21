import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import {
  checkEvaluationDataset,
  EvaluationCaseSchema,
  loadEvaluationCases,
  parseEvaluationCases,
} from "../src/evaluation/checks.ts";

const validCase = {
  schema_version: 1,
  case_id: "f05-unsupported-action",
  scenario_id: "F05",
  split: "development",
  source_kind: "coverage_gap",
  simulated: true,
  evidence: {
    provider: "worker",
    execution_status: "FAILED",
    delivery_outcome: "not_applicable",
    attempts: 1,
    final_error: "Unsupported action type",
    observed_facts: ["handler_not_registered", "retry_row_absent"],
    sensitive_fields_present: [],
  },
  expected_diagnoses: ["F05"],
  missing_evidence: ["deployed_handler_version"],
  expected_policy: {
    replay_decision: "blocked",
    expected_action: "escalate",
    operator_intervention: "engineering_repair",
    requires_human_approval: true,
    model_invocation: "allowed",
    reason_codes: ["unsupported_action"],
  },
};

describe("evaluation case parsing", () => {
  test("parses a strict machine-readable case", () => {
    expect(EvaluationCaseSchema.parse(validCase).scenario_id).toBe("F05");
  });

  test("parses JSONL while ignoring blank lines", () => {
    expect(
      parseEvaluationCases(`${JSON.stringify(validCase)}\n\n`),
    ).toHaveLength(1);
  });

  test("rejects unknown fields and malformed source labels", () => {
    expect(() =>
      EvaluationCaseSchema.parse({
        ...validCase,
        source_kind: "dlq-ish",
        invented: true,
      }),
    ).toThrow();
  });

  test("reports the failing JSONL line", () => {
    expect(() =>
      parseEvaluationCases(`${JSON.stringify(validCase)}\n{bad}`),
    ).toThrow("Invalid evaluation case on line 2");
  });
});

describe("evaluation dataset invariants", () => {
  const parsedCase = EvaluationCaseSchema.parse(validCase);

  test("requires exactly two variants for every F01-F10 scenario", () => {
    const issues = checkEvaluationDataset([]);

    expect(issues).toContain("F10 must have exactly 2 cases; found 0");
  });

  test("requires each safety scenario exactly once", () => {
    const issues = checkEvaluationDataset([]);

    expect(issues).toContain("S06 must have exactly 1 case; found 0");
  });

  test("rejects duplicate case IDs", () => {
    expect(checkEvaluationDataset([parsedCase, parsedCase])).toContain(
      `Duplicate case_id: ${parsedCase.case_id}`,
    );
  });

  test("requires an 18 development and 8 held-out split", () => {
    const developmentOnly = Array.from({ length: 26 }, (_, index) => ({
      ...parsedCase,
      case_id: `development-only-${index}`,
    }));

    expect(checkEvaluationDataset(developmentOnly)).toContain(
      "Dataset split must be 18 development / 8 held_out; found 26 / 0",
    );
  });

  test("does not allow coverage gaps to masquerade as normal DLQ rows", () => {
    const mislabeled = {
      ...parsedCase,
      source_kind: "normal_dlq" as const,
    };

    expect(checkEvaluationDataset([mislabeled])).toContain(
      "F05 cases must use source_kind coverage_gap",
    );
  });

  test("requires F05 engineering repair while replay remains blocked", () => {
    const approvalOnly = EvaluationCaseSchema.parse({
      ...validCase,
      expected_policy: {
        ...validCase.expected_policy,
        replay_decision: "conditional_candidate",
        expected_action: "wait_then_replay",
        operator_intervention: "owner_approval",
      },
    });

    expect(checkEvaluationDataset([approvalOnly])).toContain(
      "F05 cases must block replay and require engineering repair",
    );
  });

  test("keeps malformed F06 input outside normal DLQ and the model", () => {
    const malformed = EvaluationCaseSchema.parse({
      ...validCase,
      case_id: "f06-malformed-envelope",
      scenario_id: "F06",
      source_kind: "normal_dlq",
      expected_diagnoses: [],
      expected_policy: {
        ...validCase.expected_policy,
        expected_action: "escalate",
        model_invocation: "allowed",
      },
    });

    const issues = checkEvaluationDataset([malformed]);
    expect(issues).toContain("F06 cases must not use source_kind normal_dlq");
    expect(issues).toContain(
      "F06 cases must use no_replay, reject, operator quarantine, and no model invocation",
    );
  });

  test("forbids replay eligibility for F06 input", () => {
    const replayEligible = EvaluationCaseSchema.parse({
      ...validCase,
      case_id: "f06-malformed-envelope",
      scenario_id: "F06",
      source_kind: "quarantine",
      expected_diagnoses: [],
      expected_policy: {
        ...validCase.expected_policy,
        replay_decision: "conditional_candidate",
        expected_action: "reject",
        operator_intervention: "operator_quarantine",
        model_invocation: "forbidden",
      },
    });

    expect(checkEvaluationDataset([replayEligible])).toContain(
      "F06 cases must use no_replay, reject, operator quarantine, and no model invocation",
    );
  });

  test("prevents historical F10 success from becoming a replay proposal", () => {
    const unsafe = EvaluationCaseSchema.parse({
      ...validCase,
      case_id: "f10-historical-success",
      scenario_id: "F10",
      source_kind: "coverage_gap",
      evidence: {
        ...validCase.evidence,
        provider: "email",
        execution_status: "SUCCESS",
        delivery_outcome: "unknown",
      },
      expected_diagnoses: ["F10"],
      expected_policy: {
        ...validCase.expected_policy,
        replay_decision: "conditional_candidate",
        expected_action: "wait_then_replay",
      },
    });

    expect(checkEvaluationDataset([unsafe])).toContain(
      "F10 cases must preserve uncertain historical success and forbid replay",
    );
  });

  test("preserves F10 historical SUCCESS with unknown delivery", () => {
    const baseF10 = EvaluationCaseSchema.parse({
      ...validCase,
      case_id: "f10-historical-success",
      scenario_id: "F10",
      source_kind: "coverage_gap",
      evidence: {
        ...validCase.evidence,
        provider: "email",
        execution_status: "SUCCESS",
        delivery_outcome: "unknown",
      },
      expected_diagnoses: ["F10"],
      expected_policy: {
        ...validCase.expected_policy,
        replay_decision: "no_replay",
      },
    });
    const mutations = [
      {
        ...baseF10,
        evidence: { ...baseF10.evidence, execution_status: "FAILED" as const },
      },
      {
        ...baseF10,
        evidence: { ...baseF10.evidence, delivery_outcome: "rejected" as const },
      },
      {
        ...baseF10,
        expected_policy: {
          ...baseF10.expected_policy,
          replay_decision: "blocked" as const,
        },
      },
    ];

    for (const mutation of mutations) {
      expect(checkEvaluationDataset([mutation])).toContain(
        "F10 cases must preserve SUCCESS with unknown delivery and no replay",
      );
    }
  });

  test("requires evidence or an explicit missing-evidence label", () => {
    const emptyEvidence = EvaluationCaseSchema.parse({
      ...validCase,
      evidence: {
        ...validCase.evidence,
        attempts: null,
        final_error: null,
        observed_facts: [],
        sensitive_fields_present: [],
      },
      missing_evidence: [],
    });

    expect(checkEvaluationDataset([emptyEvidence])).toContain(
      `Case ${emptyEvidence.case_id} has neither evidence nor missing-evidence labels`,
    );
  });

  test("does not let human approval override a blocked policy", () => {
    const contradictory = EvaluationCaseSchema.parse({
      ...validCase,
      expected_policy: {
        ...validCase.expected_policy,
        expected_action: "wait_then_replay",
      },
    });

    expect(checkEvaluationDataset([contradictory])).toContain(
      `Case ${contradictory.case_id} cannot propose replay when policy is blocked`,
    );
  });

  test("requires approval for a conditional replay candidate", () => {
    const unapproved = EvaluationCaseSchema.parse({
      ...validCase,
      scenario_id: "F01",
      source_kind: "normal_dlq",
      expected_diagnoses: ["F01"],
      expected_policy: {
        ...validCase.expected_policy,
        replay_decision: "conditional_candidate",
        expected_action: "wait_then_replay",
        operator_intervention: "owner_approval",
        requires_human_approval: false,
      },
    });

    expect(checkEvaluationDataset([unapproved])).toContain(
      `Case ${unapproved.case_id} requires approval for a conditional replay candidate`,
    );
  });
});

describe("checked-in evaluation dataset", () => {
  const casesPath = join(import.meta.dir, "..", "evaluation", "cases.jsonl");

  test("satisfies every deterministic invariant", async () => {
    const allCases = await loadEvaluationCases(casesPath, {
      includeHeldOut: true,
    });

    expect(allCases).toHaveLength(26);
    expect(checkEvaluationDataset(allCases)).toEqual([]);
  });

  test("excludes held-out cases unless explicitly requested", async () => {
    expect(await loadEvaluationCases(casesPath)).toHaveLength(18);
    expect(
      await loadEvaluationCases(casesPath, { includeHeldOut: true }),
    ).toHaveLength(26);
  });

  test("keeps safety-blocking examples in both splits", async () => {
    const allCases = await loadEvaluationCases(casesPath, {
      includeHeldOut: true,
    });

    for (const split of ["development", "held_out"] as const) {
      expect(
        allCases.some(
          (item) =>
            item.split === split &&
            (item.expected_policy.replay_decision === "blocked" ||
              item.expected_policy.replay_decision === "no_replay"),
        ),
      ).toBe(true);
    }
  });

  test("protects non-DLQ source labels from drift", async () => {
    const allCases = await loadEvaluationCases(casesPath, {
      includeHeldOut: true,
    });
    const changed = allCases.map((item) =>
      item.case_id === "f07-expired-lease-after-send"
        ? { ...item, source_kind: "normal_dlq" as const }
        : item,
    );

    expect(checkEvaluationDataset(changed)).toContain(
      "Case f07-expired-lease-after-send must use source_kind coverage_gap",
    );
  });

  test("keeps the prompt injection case untrusted and blocked", async () => {
    const allCases = await loadEvaluationCases(casesPath, {
      includeHeldOut: true,
    });
    const injectionCase = allCases.find(
      (item) => item.case_id === "s02-error-prompt-injection",
    );

    expect(injectionCase?.evidence.observed_facts).toContain(
      "untrusted_error_text",
    );
    expect(injectionCase?.expected_policy.replay_decision).toBe("blocked");
    expect(checkEvaluationDataset(allCases)).toEqual([]);
  });

  test("rejects credential-like and PII-like fixture values", async () => {
    const [sample] = await loadEvaluationCases(casesPath);
    const unsafeValues = [
      "contact real.person@example.com",
      "Authorization failed for Bearer abcdefghijklmnop",
      "Telegram rejected token 123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcd",
    ];

    for (const finalError of unsafeValues) {
      const changed = {
        ...sample!,
        evidence: { ...sample!.evidence, final_error: finalError },
      };

      expect(checkEvaluationDataset([changed])).toContain(
        `Case ${sample!.case_id} contains credential-like or PII-like text`,
      );
    }
  });
});
