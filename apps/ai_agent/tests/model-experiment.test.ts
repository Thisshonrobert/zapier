import { expect, test } from "bun:test";
import * as contracts from "../src/contracts.ts";
import { join } from "node:path";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { loadEvaluationCases } from "../src/evaluation/checks.ts";
import {
  createFixtureTools,
  fixtureInput,
  fixtureRejection,
} from "../src/evaluation/fixture-tools.ts";
import { loadRunbooks } from "../src/tools/search-runbooks.ts";
import { buildDiagnosisService, retrievalInput } from "../src/graph.ts";
import { buildDiagnosisPrompt } from "../src/prompts.ts";
import {
  GeminiDiagnosisModel,
  ModelProviderError,
} from "../src/gemini-model.ts";
import type {
  DiagnosisPrompt,
  IntegratedDiagnosisModel,
} from "../src/contracts.ts";
import {
  runModelExperiment,
  saveExperiment,
  loadExperiment,
  evaluateExperiment,
  compareExperiments,
  compareExperimentReports,
  selectCases,
  validateExperiment,
  ExperimentSettingsSchema,
} from "../src/evaluation/model-experiment.ts";

const allCases = await loadEvaluationCases(
  join(import.meta.dir, "../evaluation/cases.jsonl"),
  { includeHeldOut: true },
);
const index = await loadRunbooks(
  join(import.meta.dir, "../../../docs/AI/runbooks"),
);
const unknownCase = allCases.find(
  (item) => item.case_id === "f07-provider-response-lost",
)!;
const timestamp = "2026-10-02T00:00:00.000Z";
function observedOutput(prompt: DiagnosisPrompt) {
  const { evidence, runbooks } = JSON.parse(prompt.input);
  const refs = Object.values(evidence).map(
    (item) => (item as { evidence_id: string }).evidence_id,
  );
  const missing = [
    ...new Set(
      Object.values(evidence).flatMap(
        (item) => (item as { unavailable: string[] }).unavailable,
      ),
    ),
  ];
  return {
    status: "abstained",
    diagnosis: {
      taxonomy_id: "F07",
      summary: "Unknown or incomplete delivery evidence.",
      confidence: "low",
      evidence_refs: refs,
      alternate_explanations: [],
      missing_evidence: missing,
    },
    proposal: {
      disposition: "outcome_unknown",
      kind: "escalate",
      summary: "Request evidence.",
      reasons: ["Delivery is not established."],
      evidence_refs: refs,
      runbook_citations: runbooks
        .slice(0, 1)
        .map((item: { citation: string }) => item.citation),
      preconditions: [],
    },
  };
}
const usage = { input_tokens: 20, output_tokens: 10, total_tokens: 30 };
const model = (
  generate: IntegratedDiagnosisModel["generate"],
): IntegratedDiagnosisModel => ({ generate, close: async () => {} });
const goodModel = () =>
  model(async (prompt) => ({ output: observedOutput(prompt), usage }));
const capture = (
  options: Partial<Parameters<typeof runModelExperiment>[0]> = {},
) =>
  runModelExperiment({
    allCases,
    index,
    model: goodModel(),
    modelId: "offline-stub",
    ...options,
    settings: { minCallIntervalMs: 0, ...options.settings },
  });

test("blocking provider HTTP failures stop subsequent calls while preserving every case and both controls", async () => {
  for (const status of [401, 403, 404, 429] as const) {
    let calls = 0;
    const run = await capture({
      model: model(async () => {
        calls++;
        throw new ModelProviderError("provider unavailable", undefined, null, {
          category: "http_error",
          http_status: status,
        });
      }),
    });
    expect(calls).toBe(1);
    expect(run.invocations).toHaveLength(1);
    expect(run.observations).toHaveLength(18);
    expect(run.manifest.stop_reason).toBe(`provider_http_${status}`);
    expect(run.contexts[0]!.failure).toBe("provider_error");
    expect(
      run.contexts.filter((row) => row.failure === "not_executed"),
    ).toHaveLength(15);
    expect(run.contexts.filter((row) => row.rejection)).toHaveLength(2);
    expect((await evaluateExperiment(run)).safety.complete).toBe(false);
    expect(
      run.observations.filter((row) => row.model_invocations === 0),
    ).toHaveLength(17);
    const tampered = structuredClone(run);
    tampered.manifest.stop_reason =
      status === 401 ? "provider_http_404" : "provider_http_401";
    expect(() => validateExperiment(tampered)).toThrow();
  }
});

test("experiment pacing defaults conservatively and preserves legacy recorded bounds", async () => {
  expect(ExperimentSettingsSchema.parse({}).minCallIntervalMs).toBe(13_000);
  expect(
    ExperimentSettingsSchema.safeParse({ minCallIntervalMs: -1 }).success,
  ).toBe(false);
  const run = await capture({ caseIds: [unknownCase.case_id] });
  const legacy = structuredClone(run);
  delete legacy.manifest.bounds.minCallIntervalMs;
  expect(
    validateExperiment(legacy).manifest.bounds.minCallIntervalMs,
  ).toBeUndefined();
  const comparison = await compareExperiments(validateExperiment(legacy), run);
  expect(comparison.changedSettings).toContain("minCallIntervalMs");
});

test("explicit Gemini protocol is recorded, reproduces offline and cannot mismatch the model", async () => {
  const run = await capture({
    caseIds: [unknownCase.case_id],
    modelId: "gemini-2.5-flash-lite",
    modelApi: "generate-content",
  });
  expect(run.manifest.model_settings.endpoint).toBe(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent",
  );
  const directory = await mkdtemp(
    join(tmpdir(), "generate-content-experiment-"),
  );
  try {
    await saveExperiment(directory, run);
    expect(await evaluateExperiment(await loadExperiment(directory))).toEqual(
      await evaluateExperiment(run),
    );
    const changed = structuredClone(run);
    changed.manifest.model = "gemini-2.5-flash";
    expect(() => validateExperiment(changed)).toThrow();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("pacing spaces consecutive cases and repair requests without consuming call deadlines", async () => {
  const starts: number[] = [];
  const run = await capture({
    allCases: [unknownCase, { ...unknownCase, case_id: "pacing-second-case" }],
    settings: { minCallIntervalMs: 60, callTimeoutMs: 20 },
    model: model(async (prompt) => {
      starts.push(performance.now());
      return {
        output: starts.length === 1 ? {} : observedOutput(prompt),
        usage,
      };
    }),
  });
  expect(starts).toHaveLength(3);
  for (let i = 1; i < starts.length; i++)
    expect(starts[i]! - starts[i - 1]!).toBeGreaterThanOrEqual(60);
  expect(run.invocations[1]!.repair_issue).toBe("schema_validation_failed");
  expect(run.contexts.every((row) => row.failure === null)).toBe(true);
  expect(run.observations[0]!.latency_ms).toBeGreaterThanOrEqual(60);
  expect(run.invocations[1]!.elapsed_ms).toBeLessThan(60);
});

test("cancellation and run deadline interrupt pacing without spending a pending invocation", async () => {
  for (const cancel of [false, true]) {
    const controller = new AbortController();
    const run = await capture({
      allCases: [
        unknownCase,
        { ...unknownCase, case_id: "pacing-second-case" },
      ],
      signal: controller.signal,
      settings: {
        minCallIntervalMs: 1_000,
        runTimeoutMs: cancel ? 5_000 : 40,
        callTimeoutMs: 20,
      },
      model: model(async (prompt) => {
        if (cancel) setTimeout(() => controller.abort(), 10);
        return { output: observedOutput(prompt), usage };
      }),
    });
    expect(run.invocations).toHaveLength(1);
    expect(run.observations[1]!.model_invocations).toBe(0);
    expect(run.observations[1]!.usage).toBeNull();
    expect(run.observations[1]!.cost_usd).toBe(0);
    expect(run.contexts[1]!.failure).toBe(cancel ? "cancelled" : "run_timeout");
  }
});

test("retrieval includes bounded sanitized errors and observed fixture facts without labels", () => {
  const item = structuredClone(unknownCase);
  item.evidence.final_error =
    "Missing template path token=private-token Bearer private-bearer 123456789:abcdefghijklmnopqrstuv user@example.com https://secret.example/key";
  item.evidence.observed_facts = ["template_path_missing"];
  const bundle = createFixtureTools(
    fixtureInput(item),
    index,
    timestamp,
  ).bundle;
  const input = retrievalInput(bundle);
  expect(input.query).toContain("Missing template path");
  expect(input.query).toContain("template_path_missing");
  expect(input.query).not.toMatch(
    /private-token|private-bearer|abcdefghijklmnopqrstuv|user@example|secret.example/,
  );
  expect(input.query.length).toBeLessThanOrEqual(500);
  bundle.failureContext.facts.retry.final_error = "long ".repeat(400);
  expect(retrievalInput(bundle).query.length).toBeLessThanOrEqual(500);
  expect(retrievalInput(bundle).query).toContain("template_path_missing");
  item.expected_diagnoses = ["F10"];
  expect(
    retrievalInput(
      createFixtureTools(fixtureInput(item), index, timestamp).bundle,
    ),
  ).toEqual(input);
});

test("missing replay prerequisites permit advisory diagnosis but never simulated replay", async () => {
  const item = allCases.find(
    (row) => row.case_id === "f05-handler-version-unknown",
  )!;
  const tools = createFixtureTools(fixtureInput(item), index, timestamp);
  const prompt = buildDiagnosisPrompt(tools.bundle, []);
  expect(prompt.instructions).toContain(
    "Missing replay prerequisites do not by themselves require abstention",
  );
  const advisory = model(async (prompt) => {
    const output = observedOutput(prompt);
    output.status = "completed";
    output.diagnosis.taxonomy_id = "F05";
    output.proposal.disposition = "engineering_escalation_required";
    return { output, usage };
  });
  expect(
    (
      await buildDiagnosisService(tools.tools, advisory, {
        allowSimulatedEvidence: true,
      }).diagnose()
    ).status,
  ).toBe("completed");
  const unsafe = model(async (prompt) => {
    const output = observedOutput(prompt);
    output.status = "completed";
    output.proposal.disposition = "replay_candidate";
    output.proposal.kind = "wait_then_replay";
    return { output, usage };
  });
  await expect(
    buildDiagnosisService(tools.tools, unsafe, {
      allowSimulatedEvidence: true,
    }).diagnose(),
  ).rejects.toThrow("invalid output");
});

test("controlled fixture contracts exist separately from production evidence", () => {
  // A missing fixture contract must not be worked around by claiming live evidence.
  expect("ControlledFixtureEvidenceSchema" in contracts).toBe(true);
  expect(
    contracts.ActionInputValidationEvidenceSchema.shape.simulated.safeParse(
      true,
    ).success,
  ).toBe(false);
  expect(
    contracts.ActionInputValidationEvidenceSchema.shape.facts.shape.input_fingerprint.safeParse(
      null,
    ).success,
  ).toBe(false);
});

test("selects 18 development cases by default and isolates explicit held-out runs", () => {
  expect(selectCases(allCases).map((item) => item.split)).toEqual(
    Array(18).fill("development"),
  );
  expect(selectCases(allCases, "held_out")).toHaveLength(8);
  expect(() =>
    selectCases(allCases, "development", ["f02-timeout-ambiguous"]),
  ).toThrow();
});

test("maps aggregate facts faithfully without fabricated history, credentials or fingerprints", () => {
  const tools = createFixtureTools(fixtureInput(unknownCase), index, timestamp);
  expect(tools.bundle.failureContext.fixture_observation).toEqual(
    unknownCase.evidence,
  );
  expect(tools.bundle.executionEvidence.facts).toMatchObject({
    current_execution: null,
    attempts: [],
    history_truncated: true,
    provenance: "controlled_fixture",
  });
  expect(tools.bundle.inputValidation.facts).toMatchObject({
    input_fingerprint: null,
    supported: null,
    credential_presence: [],
  });
  expect(
    Object.values(tools.bundle).every(
      (item) => item.simulated && !item.complete,
    ),
  ).toBe(true);
});

test("production graph rejects fixture evidence unless explicitly enabled", async () => {
  const tools = createFixtureTools(fixtureInput(unknownCase), index, timestamp);
  await expect(
    buildDiagnosisService(tools.tools, goodModel()).diagnose(),
  ).rejects.toThrow();
  expect(
    (
      await buildDiagnosisService(tools.tools, goodModel(), {
        allowSimulatedEvidence: true,
      }).diagnose()
    ).diagnosis.taxonomy_id,
  ).toBe("F07");
});

test("rejection gates ignore expected labels, and graph prompts never receive labels", async () => {
  const relabelled = allCases.map((item) => ({
    ...item,
    expected_diagnoses: ["F10" as const],
    expected_policy: {
      ...item.expected_policy,
      model_invocation: "allowed" as const,
    },
  }));
  const prompts: string[] = [];
  const run = await capture({
    allCases: relabelled,
    model: model(async (prompt) => {
      prompts.push(prompt.input);
      return { output: observedOutput(prompt), usage };
    }),
  });
  expect(run.observations).toHaveLength(18);
  for (const id of ["s01-cross-tenant-case", "f06-malformed-envelope"]) {
    expect(run.observations.find((row) => row.case_id === id)).toMatchObject({
      result: null,
      model_invocations: 0,
    });
  }
  expect(prompts).toHaveLength(16);
  expect(prompts.join("")).not.toMatch(
    /expected_policy|expected_diagnoses|scenario_id|reason_codes|relevantRunbookFamilies/,
  );
  expect(
    fixtureRejection({
      ...fixtureInput(unknownCase),
      case_id: "s01-cross-tenant-case",
    }),
  ).toBeNull();
});

test("scores actual graph evidence references and retrieval, preserving offline reproduction", async () => {
  const run = await capture({ caseIds: [unknownCase.case_id] });
  const report = await evaluateExperiment(run);
  expect(report.measurement).toBe(
    "controlled-fixture-graph-model-observations",
  );
  expect(report.rows[0]!.safetyIssues).toEqual([]);
  expect(report.rows[0]!.query).toBe(run.contexts[0]!.retrieval!.input.query);
  expect(report.rows[0]!.query).toContain("Provider response was lost");
  expect(report.rows[0]!.citations).toEqual(
    run.contexts[0]!.retrieval!.matches.map((item) => item.citation),
  );
  const observation = run.observations[0]!;
  expect(observation).toMatchObject({
    usage,
    model_invocations: 1,
    cost_usd: null,
  });
  expect(observation.latency_ms).toBeGreaterThanOrEqual(0);
  const directory = await mkdtemp(join(tmpdir(), "model-experiment-"));
  try {
    await saveExperiment(directory, run);
    const loaded = await loadExperiment(directory);
    expect(await evaluateExperiment(loaded)).toEqual(report);
    await expect(saveExperiment(directory, run)).rejects.toThrow();
    const path = join(directory, "contexts.json");
    const contexts = JSON.parse(await readFile(path, "utf8"));
    contexts[0].retrieval.matches[0].contentHash = "0".repeat(64);
    await writeFile(path, JSON.stringify(contexts));
    await expect(loadExperiment(directory)).rejects.toThrow();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("offline CLI explicitly re-scores both contracts without replacing frozen artifacts", async () => {
  const run = await capture({ caseIds: [unknownCase.case_id] });
  const directory = await mkdtemp(join(tmpdir(), "model-rescore-"));
  try {
    await saveExperiment(directory, run);
    const before = await readFile(join(directory, "report.json"), "utf8");
    const manifest = await readFile(join(directory, "manifest.json"), "utf8");
    const command = [process.execPath, join(import.meta.dir, "../src/evaluation/model-experiment.ts"),
      "evaluate", "--experiment", directory];
    const original = Bun.spawnSync(command);
    expect(original.exitCode).toBe(0);
    const originalOutput = JSON.parse(original.stdout.toString());
    expect(originalOutput.acceptanceContract).toBe("frozen-v1");
    expect(originalOutput.contractScores).toBeUndefined();
    const rescored = Bun.spawnSync([...command, "--acceptance-contract", "advisory-v2"]);
    expect(rescored.exitCode).toBe(0);
    const output = JSON.parse(rescored.stdout.toString());
    expect(output.reproduced).toBe(true);
    expect(output.recordedAcceptanceContract).toBe("frozen-v1");
    expect(output.acceptanceContract).toBe("advisory-v2");
    expect(Object.keys(output.contractScores)).toEqual(["frozen-v1", "advisory-v2"]);
    expect(await readFile(join(directory, "report.json"), "utf8")).toBe(before);
    expect(await readFile(join(directory, "manifest.json"), "utf8")).toBe(manifest);
    expect(await evaluateExperiment(await loadExperiment(directory))).toEqual(JSON.parse(before));
    expect(Bun.spawnSync([...command, "--acceptance-contract", "unsupported"]).exitCode).not.toBe(0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("counts repairs and rejects malformed model output without storing raw responses", async () => {
  let call = 0;
  const run = await capture({
    caseIds: [unknownCase.case_id],
    model: model(async (prompt) => ({
      output:
        ++call === 1
          ? { secret: "must-not-be-recorded" }
          : observedOutput(prompt),
      usage,
    })),
  });
  expect(run.observations[0]).toMatchObject({
    model_invocations: 2,
    usage: { input_tokens: 40, output_tokens: 20, total_tokens: 60 },
  });
  expect(run.invocations[1]!.repair_issue).toBe("schema_validation_failed");
  expect(JSON.stringify(run)).not.toContain("must-not-be-recorded");
  const failed = await capture({
    caseIds: [unknownCase.case_id],
    model: model(async () => ({ output: {}, usage })),
  });
  expect(failed.contexts[0]!.failure).toBe("invalid_output");
  expect((await evaluateExperiment(failed)).safety.complete).toBe(false);
});

test("provider failures preserve sanitized failure and unknown usage", async () => {
  const run = await capture({
    caseIds: [unknownCase.case_id],
    model: model(async () => {
      throw new Error("Bearer secret-do-not-record");
    }),
  });
  expect(run.observations[0]).toMatchObject({
    result: null,
    model_invocations: 1,
    usage: null,
    cost_usd: null,
  });
  expect(run.contexts[0]!.failure).toBe("provider_error");
  expect(run.invocations[0]!.error_details).toEqual({
    category: "unknown",
    http_status: null,
  });
  const legacy = structuredClone(run);
  delete legacy.invocations[0]!.error_details;
  expect(
    validateExperiment(legacy).invocations[0]!.error_details,
  ).toBeUndefined();
  expect(JSON.stringify(run)).not.toContain("secret-do-not-record");
});

test("provider error categories preserve safe diagnostics without response bodies or credentials", async () => {
  const scenarios = [
    {
      category: "network_error",
      status: null,
      fetch: async () => {
        throw new Error("Bearer secret-do-not-record");
      },
    },
    {
      category: "http_error",
      status: 429,
      fetch: async () => new Response("secret-do-not-record", { status: 429 }),
    },
    {
      category: "malformed_json",
      status: null,
      fetch: async () => new Response("secret-do-not-record"),
    },
    {
      category: "invalid_response",
      status: null,
      fetch: async () =>
        Response.json({ status: "incomplete", secret: "secret-do-not-record" }),
    },
    {
      category: "response_too_large",
      status: null,
      fetch: async () => new Response("secret-do-not-record".repeat(4000)),
    },
    {
      category: "malformed_output",
      status: null,
      fetch: async () =>
        Response.json({
          status: "completed",
          steps: [
            {
              type: "model_output",
              content: [{ type: "text", text: "secret-do-not-record" }],
            },
          ],
          usage: {
            total_input_tokens: 20,
            total_output_tokens: 10,
            total_tokens: 30,
          },
        }),
    },
  ];
  for (const scenario of scenarios) {
    const adapter = new GeminiDiagnosisModel({
      apiKey: "credential-do-not-record",
      model: "offline-stub",
      fetch: scenario.fetch,
    });
    const run = await capture({
      caseIds: [unknownCase.case_id],
      model: adapter,
    });
    expect(run.invocations[0]).toMatchObject({
      outcome: "provider_error",
      error_details: {
        category: scenario.category,
        http_status: scenario.status,
      },
    });
    expect(run.contexts[0]!.failure).toBe("provider_error");
    expect(JSON.stringify(run)).not.toContain("secret-do-not-record");
    expect(JSON.stringify(run)).not.toContain("credential-do-not-record");
    expect(() =>
      validateExperiment({
        ...run,
        invocations: [
          {
            ...run.invocations[0],
            error_details: {
              category: "http_error",
              http_status: 429,
              message: "secret-do-not-record",
            },
          },
        ],
      }),
    ).toThrow();
  }
});

test("Gemini malformed structured output retains billed usage without raw output", async () => {
  const adapter = new GeminiDiagnosisModel({
    apiKey: "offline-only-key",
    model: "offline-stub",
    fetch: async () =>
      Response.json({
        status: "completed",
        steps: [
          {
            type: "model_output",
            content: [{ type: "text", text: "invalid-sensitive-json" }],
          },
        ],
        usage: {
          total_input_tokens: 20,
          total_output_tokens: 10,
          total_tokens: 30,
        },
      }),
  });
  const run = await capture({ caseIds: [unknownCase.case_id], model: adapter });
  expect(run.observations[0]!.usage).toEqual(usage);
  expect(run.invocations[0]!.error_details).toEqual({
    category: "malformed_output",
    http_status: null,
    output_diagnostics: {
      text_length: 22,
      text_block_count: 1,
      supported_fence: false,
      parse_failure: "json_syntax",
    },
  });
  expect(JSON.stringify(run)).not.toContain("invalid-sensitive-json");
  const directory = await mkdtemp(join(tmpdir(), "malformed-diagnostics-"));
  try {
    await saveExperiment(directory, run);
    expect(
      (await loadExperiment(directory)).invocations[0]!.error_details,
    ).toEqual(run.invocations[0]!.error_details);
    const unsafe = structuredClone(run);
    Object.assign(unsafe.invocations[0]!.error_details!.output_diagnostics!, {
      message: "private-provider-text",
    });
    expect(() => validateExperiment(unsafe)).toThrow();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("invocation and token budgets prevent subsequent calls and account for every case", async () => {
  const run = await capture({ settings: { maxInvocations: 1 } });
  expect(run.invocations).toHaveLength(1);
  expect(run.observations).toHaveLength(18);
  expect(run.contexts.some((row) => row.failure === "invocation_budget")).toBe(
    true,
  );
  const tokens = await capture({ settings: { maxTokens: 1 } });
  expect(tokens.invocations).toHaveLength(0);
  expect(
    tokens.contexts.filter((row) => row.failure === "token_budget"),
  ).toHaveLength(16);
});

test("timeouts and cancellation bound even a model stub that ignores its signal", async () => {
  const never = model(async () => await new Promise(() => {}));
  const timeout = await capture({
    caseIds: [unknownCase.case_id],
    model: never,
    settings: { callTimeoutMs: 10 },
  });
  expect(timeout.contexts[0]!.failure).toBe("model_timeout");
  expect(timeout.observations[0]!.model_invocations).toBe(1);
  const controller = new AbortController();
  const pending = capture({ model: never, signal: controller.signal });
  setTimeout(() => controller.abort(), 10);
  const cancelled = await pending;
  expect(cancelled.observations).toHaveLength(18);
  expect(
    cancelled.contexts.filter((row) => row.failure === "cancelled").length,
  ).toBeGreaterThan(0);
  const deadline = await capture({
    model: never,
    settings: { runTimeoutMs: 10, callTimeoutMs: 100 },
  });
  expect(deadline.contexts.some((row) => row.failure === "run_timeout")).toBe(
    true,
  );
});

test("dry capture makes zero calls and comparison discloses incompatible corpus or data", async () => {
  const run = await capture({ model: undefined });
  expect(run.invocations).toEqual([]);
  expect(
    run.contexts.filter((row) => row.failure === "configuration_missing"),
  ).toHaveLength(16);
  const baseline = await capture({ caseIds: [unknownCase.case_id] });
  const changed = await capture({
    caseIds: [unknownCase.case_id],
    model: model(async () => {
      throw new Error("outage");
    }),
    modelId: "other-stub",
  });
  const comparison = await compareExperiments(baseline, changed);
  expect(
    compareExperimentReports(
      baseline,
      changed,
      await evaluateExperiment(baseline),
      await evaluateExperiment(changed),
    ),
  ).toEqual(comparison);
  expect(comparison.comparable).toBe(true);
  expect(comparison.regressions).toEqual([unknownCase.case_id]);
  expect(comparison.changedSettings).toContain("model");
  const different = structuredClone(changed);
  different.manifest.dataset_file_hash = "0".repeat(64);
  expect((await compareExperiments(baseline, different)).comparable).toBe(
    false,
  );
});

test("frozen diagnoses, retrieval and model metadata cannot diverge from the captured calls", async () => {
  const run = await capture({ caseIds: [unknownCase.case_id] });
  const mutations: ((copy: typeof run) => void)[] = [
    (copy) => {
      (
        copy.observations[0]!.result as { diagnosis: { taxonomy_id: string } }
      ).diagnosis.taxonomy_id = "F10";
    },
    (copy) => {
      copy.invocations[0]!.outcome = "provider_error";
    },
    (copy) => {
      copy.invocations[0]!.prompt_hash = "0".repeat(64);
    },
    (copy) => {
      copy.contexts[0]!.retrieval!.input.query = "invented query";
    },
    (copy) => {
      copy.contexts[0]!.retrieval!.matches.reverse();
    },
    (copy) => {
      copy.manifest.source_hashes = {};
    },
    (copy) => {
      copy.manifest.model_settings.max_output_tokens = 1;
    },
  ];
  for (const mutate of mutations) {
    const copy = structuredClone(run);
    mutate(copy);
    expect(() => validateExperiment(copy)).toThrow();
  }
  let call = 0;
  const repaired = await capture({
    caseIds: [unknownCase.case_id],
    model: model(async (prompt) => ({
      output: ++call === 1 ? {} : observedOutput(prompt),
      usage,
    })),
  });
  repaired.invocations[1]!.repair_issue = null;
  expect(() => validateExperiment(repaired)).toThrow();
});

test("an already cancelled run records every case without starting a model request", async () => {
  const run = await capture({ signal: AbortSignal.abort() });
  expect(run.invocations).toHaveLength(0);
  expect(run.observations).toHaveLength(18);
  expect(
    run.contexts.filter((row) => row.failure === "cancelled"),
  ).toHaveLength(16);
});

test("measured token overrun prevents a second model request", async () => {
  const run = await capture({
    settings: { maxTokens: 50_000 },
    model: model(async (prompt) => ({
      output: observedOutput(prompt),
      usage: {
        input_tokens: 60_000,
        output_tokens: 10_000,
        total_tokens: 70_000,
      },
    })),
  });
  expect(run.invocations).toHaveLength(1);
  expect(run.observations[0]!.usage!.total_tokens).toBe(70_000);
  expect(
    run.contexts.filter((row) => row.failure === "token_budget"),
  ).toHaveLength(16);
});

test("incomplete Gemini responses preserve reported usage", async () => {
  const adapter = new GeminiDiagnosisModel({
    apiKey: "offline-only-key",
    model: "offline-stub",
    fetch: async () =>
      Response.json({
        status: "incomplete",
        steps: [],
        usage: {
          total_input_tokens: 20,
          total_output_tokens: 10,
          total_tokens: 30,
        },
      }),
  });
  const run = await capture({ caseIds: [unknownCase.case_id], model: adapter });
  expect(run.observations[0]!.usage).toEqual(usage);
});
