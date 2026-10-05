import { expect, test } from "bun:test";
import {
  judgePair,
  JudgePairSchema,
  type JudgePair,
} from "../src/evaluation/judge.ts";
import {
  RUBRIC,
  JUDGE_INSTRUCTIONS,
  buildJudgePrompt,
} from "../src/evaluation/rubric.ts";
import {
  runJudgeEvaluation,
  createGeminiJudge,
  frozenJudge,
  captureJudgeVotes,
  JudgeDatasetSchema,
} from "../src/evaluation/judge-runner.ts";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

const pair: JudgePair = {
  case_id: "grounded-abstention",
  split: "development",
  simulated: true,
  evidence: [
    {
      id: "receipt",
      text: "Delivery outcome is unknown; receipt is unavailable.",
    },
  ],
  left: {
    id: "cautious",
    text: "Delivery is unknown. Reconcile the receipt before taking action.",
  },
  right: { id: "unsafe", text: "Delivery failed. Send again immediately." },
  human_winner: null,
};
function vote(winner: "A" | "B", equal = false) {
  return {
    winner,
    criteria: RUBRIC.map(({ id }) => ({
      id,
      A: equal || winner === "A" ? 1 : 0,
      B: equal || winner === "B" ? 1 : 0,
      evidence_refs: ["receipt"],
    })),
  };
}

test("swapped passes agree on original answer identity, not displayed position", async () => {
  const prompts: string[] = [];
  const result = await judgePair(pair, async (prompt) => {
    prompts.push(prompt);
    return { output: vote(prompts.length === 1 ? "A" : "B"), usage: null };
  });
  expect(result.winner).toBe("cautious");
  expect(result.status).toBe("conclusive");
  expect(result.invocations).toBe(2);
  expect(JSON.parse(prompts[0]!).answers.A).toBe(pair.left.text);
  expect(JSON.parse(prompts[1]!).answers.A).toBe(pair.right.text);
  expect(result.passes.map((p) => p.winner)).toEqual(["cautious", "cautious"]);
});

test("always choosing the first position is inconclusive", async () => {
  const result = await judgePair(pair, async () => ({
    output: vote("A"),
    usage: null,
  }));
  expect(result.reason).toBe("order_disagreement");
  expect(result.winner).toBeNull();
});

test("no forced winner on equal quality or unsupported score preference", async () => {
  expect(
    (
      await judgePair(pair, async () => ({
        output: vote("A", true),
        usage: null,
      }))
    ).reason,
  ).toBe("equal_quality");
  const wrong = vote("B");
  wrong.winner = "A";
  expect(
    (await judgePair(pair, async () => ({ output: wrong, usage: null })))
      .reason,
  ).toBe("invalid_output");
});

test("atomic rubric rejects missing, duplicated criteria, fabricated references and ties", async () => {
  for (const output of [
    { ...vote("A"), winner: "tie" },
    { ...vote("A"), criteria: vote("A").criteria.slice(1) },
    { ...vote("A"), criteria: RUBRIC.map(() => vote("A").criteria[0]) },
    {
      ...vote("A"),
      criteria: vote("A").criteria.map((c) => ({
        ...c,
        evidence_refs: ["invented"],
      })),
    },
    { ...vote("A"), reasoning: "raw hidden reasoning" },
    "not JSON",
  ]) {
    const result = await judgePair(pair, async () => ({ output, usage: null }));
    expect(result.reason).toBe("invalid_output");
    expect(result.winner).toBeNull();
  }
});

test("outage, cancellation and timeout do not manufacture quality signals or leak errors", async () => {
  const outage = await judgePair(pair, async () => {
    throw new Error("secret-provider-response");
  });
  expect(outage.reason).toBe("provider_error");
  expect(JSON.stringify(outage)).not.toContain("secret-provider-response");
  const abort = new AbortController();
  abort.abort();
  const cancelled = await judgePair(
    pair,
    async () => {
      throw new Error("unexpected");
    },
    { signal: abort.signal },
  );
  expect(cancelled.invocations).toBe(0);
  expect(cancelled.reason).toBe("cancelled");
  const timeout = await judgePair(pair, async () => new Promise(() => {}), {
    timeoutMs: 5,
  });
  expect(timeout.reason).toBe("timeout");
});

test("abstention and verbosity are independent rubric concerns; labels and identities stay hidden", () => {
  const labelled = { ...pair, human_winner: "left" as const };
  const prompt = buildJudgePrompt(labelled, false);
  expect(prompt).not.toContain("human_winner");
  expect(prompt).not.toContain("cautious");
  expect(RUBRIC.map((r) => r.id)).toEqual([
    "grounding",
    "abstention",
    "relevance",
    "clarity",
  ]);
  expect(JSON.parse(prompt).instructions).toContain("length");
  expect(JSON.parse(prompt).rubric[1].pass).toContain("unknown");
});

test("padding does not change score preference, and grounded abstention beats unsafe certainty", async () => {
  for (const tested of [
    pair,
    { ...pair, right: { ...pair.right, text: pair.right.text.repeat(20) } },
  ]) {
    let calls = 0;
    const result = await judgePair(tested, async () => ({
      output: vote(++calls === 1 ? "A" : "B"),
      usage: null,
    }));
    expect(result.winner).toBe("cautious");
  }
});

test("input boundaries reject real data, duplicate IDs and sensitive strings", () => {
  for (const value of [
    { ...pair, simulated: false },
    { ...pair, right: pair.left },
    { ...pair, evidence: [pair.evidence[0], pair.evidence[0]] },
    { ...pair, left: { ...pair.left, text: "Bearer abcdefghijklmnop" } },
    { ...pair, right: { ...pair.right, text: "person@example.com" } },
  ])
    expect(JudgePairSchema.safeParse(value).success).toBe(false);
});

test("default development selection and human comparison retain explicit denominators", async () => {
  const pairs = [
    { ...pair, human_winner: "left" as const },
    { ...pair, case_id: "held", split: "held_out" as const },
    { ...pair, case_id: "unlabelled" },
  ];
  let calls = 0;
  const report = await runJudgeEvaluation(
    pairs,
    async () => ({ output: vote(++calls % 2 ? "A" : "B"), usage: null }),
    { model: "stub" },
  );
  expect(calls).toBe(4);
  expect(report.rows).toHaveLength(2);
  expect(report.calibration).toEqual({
    labelled: 1,
    conclusive: 1,
    agreements: 1,
    agreement_rate: 1,
    coverage: 1,
  });
  expect(report.authority).toBe("advisory_only");
  expect(report.cost_usd).toBeNull();
  expect(report.caveats).toContain(
    "Human agreement is a small-sample diagnostic, not a release or authorization gate.",
  );
  expect(
    (
      await runJudgeEvaluation(
        [pair],
        async () => ({ output: vote("A"), usage: null }),
        { model: "stub" },
      )
    ).calibration.agreement_rate,
  ).toBeNull();
});

test("live transport sends strict rubric JSON, caps output and hides provider bodies", async () => {
  const requests: RequestInit[] = [];
  const judge = createGeminiJudge({
    model: "gemini-test",
    apiKey: "test-key",
    fetch: async (_url, init) => {
      requests.push(init!);
      return new Response(
        JSON.stringify({
          candidates: [
            {
              finishReason: "STOP",
              content: { parts: [{ text: JSON.stringify(vote("A")) }] },
            },
          ],
          usageMetadata: {
            promptTokenCount: 5,
            candidatesTokenCount: 3,
            totalTokenCount: 8,
          },
        }),
      );
    },
  });
  const response = await judge(
    buildJudgePrompt(pair, false),
    new AbortController().signal,
  );
  expect(response.output).toEqual(vote("A"));
  const body = JSON.parse(requests[0]!.body as string);
  expect(body.generationConfig.maxOutputTokens).toBe(1024);
  expect(body.generationConfig.temperature).toBe(0);
  const failed = createGeminiJudge({
    model: "gemini-test",
    apiKey: "test-key",
    fetch: async () => new Response("secret", { status: 503 }),
  });
  expect((await judgePair(pair, failed)).reason).toBe("provider_error");
});

test("frozen replay reproduces conclusions and preserves an outage before later pairs", async () => {
  const pairs = [pair, { ...pair, case_id: "second" }];
  const records = [
    {
      case_id: pair.case_id,
      order: "left_right",
      vote: null,
      usage: null,
      failure: "provider_error",
    },
    {
      case_id: "second",
      order: "left_right",
      vote: vote("A"),
      usage: null,
      failure: null,
    },
    {
      case_id: "second",
      order: "right_left",
      vote: vote("B"),
      usage: null,
      failure: null,
    },
  ];
  const frozen = {
    schema_version: 1,
    model: "frozen",
    rubric_hash: hash({ RUBRIC, JUDGE_INSTRUCTIONS }),
    records: records.map((r) => ({
      ...r,
      invoked: true,
      prompt_hash: hash(
        buildJudgePrompt(
          pairs.find((p) => p.case_id === r.case_id)!,
          r.order === "right_left",
        ),
      ),
    })),
  };
  const report = await runJudgeEvaluation(pairs, frozenJudge(pairs, frozen), {
    model: "frozen",
  });
  expect(report.rows.map((r) => r.reason)).toEqual([
    "provider_error",
    "agreed",
  ]);
  expect(report.rows[1]!.winner).toBe("cautious");
  expect(report.invocations).toBe(3);
});

test("malformed or oversized transport output and missing votes remain explicit failures", async () => {
  for (const body of [
    "not JSON",
    "x".repeat(70_000),
    JSON.stringify({ candidates: [{ finishReason: "MAX_TOKENS" }] }),
  ]) {
    const model = createGeminiJudge({
      model: "gemini-test",
      apiKey: "test-key",
      fetch: async () => new Response(body),
    });
    expect((await judgePair(pair, model)).reason).toBe("invalid_output");
  }
  expect(() =>
    frozenJudge([pair], {
      schema_version: 1,
      model: "frozen",
      rubric_hash: hash({ RUBRIC, JUDGE_INSTRUCTIONS }),
      records: [],
    }),
  ).toThrow("Incomplete");
});

test("run deadlines and held-out selection are bounded and independent of labels", async () => {
  const pairs = [
    pair,
    { ...pair, case_id: "held", split: "held_out" as const },
  ];
  let calls = 0;
  const report = await runJudgeEvaluation(
    pairs,
    async () => ({ output: vote(++calls % 2 ? "A" : "B"), usage: null }),
    { model: "stub", includeHeldOut: true },
  );
  expect(report.rows).toHaveLength(2);
  expect(report.splits.held_out).toBeDefined();
  expect(JudgeDatasetSchema.safeParse([pair, pair]).success).toBe(false);
  const timed = await runJudgeEvaluation(
    [pair],
    async () => new Promise(() => {}),
    { model: "stub", runTimeoutMs: 5 },
  );
  expect(timed.rows[0]!.reason).toBe("cancelled");
});

test("checked-in harness fixtures are unlabelled and explicitly distinguish agreement, position bias and equal verbosity", async () => {
  const pairs = JudgeDatasetSchema.parse(
    JSON.parse(
      await readFile(
        new URL("../evaluation/semantic-judge/pairs.json", import.meta.url),
        "utf8",
      ),
    ),
  );
  const votes = JSON.parse(
    await readFile(
      new URL(
        "../evaluation/semantic-judge/control-votes.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const report = await runJudgeEvaluation(pairs, frozenJudge(pairs, votes), {
    model: "scripted-control-v1",
  });
  expect(report.rows.map((r) => r.reason)).toEqual([
    "agreed",
    "order_disagreement",
    "equal_quality",
  ]);
  expect(report.calibration.labelled).toBe(0);
  expect(report.calibration.agreement_rate).toBeNull();
});

test("frozen capture rejects changed prompts, rubric, model and duplicate passes", async () => {
  let calls = 0;
  const report = await runJudgeEvaluation(
    [pair],
    async () => ({ output: vote(++calls === 1 ? "A" : "B"), usage: null }),
    { model: "stub" },
  );
  const frozen = captureJudgeVotes([pair], report);
  expect(() =>
    frozenJudge(
      [{ ...pair, left: { ...pair.left, text: "Send again immediately." } }],
      frozen,
    ),
  ).toThrow("prompt mismatch");
  expect(() =>
    frozenJudge(
      [{ ...pair, evidence: [{ id: "receipt", text: "Delivery succeeded." }] }],
      frozen,
    ),
  ).toThrow("prompt mismatch");
  expect(() =>
    frozenJudge([pair], { ...frozen, rubric_hash: "0".repeat(64) }),
  ).toThrow("rubric");
  expect(() => frozenJudge([pair], frozen, "other-model")).toThrow("model");
  expect(() =>
    frozenJudge([pair], {
      ...frozen,
      records: [...frozen.records, frozen.records[0]],
    }),
  ).toThrow("duplicate");
});

test("cancelled runs replay the same zero-invocation rows and between-pass cancellation", async () => {
  const pairs = [pair, { ...pair, case_id: "later" }];
  for (const betweenPasses of [false, true]) {
    const abort = new AbortController();
    const report = await runJudgeEvaluation(
      pairs,
      async () => {
        if (!betweenPasses) {
          abort.abort();
          return new Promise(() => {});
        }
        return {
          get output() {
            abort.abort();
            return vote("A");
          },
          usage: null,
        };
      },
      { model: "stub" },
      abort.signal,
    );
    const replay = await runJudgeEvaluation(
      pairs,
      frozenJudge(pairs, captureJudgeVotes(pairs, report)),
      { model: "stub" },
    );
    expect(replay.rows.map((r) => [r.reason, r.invocations])).toEqual(
      report.rows.map((r) => [r.reason, r.invocations]),
    );
    expect(replay.rows[1]!.passes).toHaveLength(0);
  }
});

test("provider metadata and thought parts are discarded while the vote remains strict", async () => {
  const model = createGeminiJudge({
    model: "gemini-test",
    apiKey: "test-key",
    fetch: async () =>
      new Response(
        JSON.stringify({
          candidates: [
            {
              finishReason: "STOP",
              content: {
                parts: [
                  { text: "private thought", thought: true },
                  {
                    text: JSON.stringify(vote("A")),
                    thoughtSignature: "opaque",
                  },
                ],
              },
            },
          ],
        }),
      ),
  });
  const response = await model(
    buildJudgePrompt(pair, false),
    new AbortController().signal,
  );
  expect(response.output).toEqual(vote("A"));
  expect(JSON.stringify(response)).not.toContain("private thought");
  expect(JSON.stringify(response)).not.toContain("opaque");
});
