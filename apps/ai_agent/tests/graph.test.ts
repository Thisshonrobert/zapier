import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { DiagnosisModel, Evidence } from "../src/contracts.ts";
import { EvidenceSchema } from "../src/contracts.ts";
import {
  GraphStepLimitExceeded,
  InvalidModelOutput,
  ModelTimeout,
  ToolBudgetExceeded,
  buildPreviewService,
} from "../src/graph.ts";
import {
  FixtureFailureContextTool,
  FixtureIdentityMismatch,
  FixtureNotFound,
} from "../src/tools/failure-context.ts";
import { TaxonomyFixtureModel } from "./test-model.ts";

const fixtures = join(import.meta.dir, "fixtures");

function service(model: DiagnosisModel = new TaxonomyFixtureModel()) {
  return buildPreviewService(new FixtureFailureContextTool(fixtures), model);
}

describe("fixture-driven triage graph", () => {
  test("grounds an F01 conditional replay in explicit rejection evidence", async () => {
    const result = await service().preview("telegram-rate-limit");

    expect(result.status).toBe("completed");
    expect(result.diagnosis.taxonomy_id).toBe("F01");
    expect(result.proposal.kind).toBe("wait_then_replay");
    expect(result.proposal.evidence_refs).toEqual(["evidence-rate-limit-001"]);
  });

  test("abstains when external delivery is unknown", async () => {
    const result = await service().preview("telegram-unknown-delivery");

    expect(result.status).toBe("insufficient_evidence");
    expect(result.diagnosis.taxonomy_id).toBe("F07");
    expect(result.proposal.kind).toBe("escalate");
    expect(result.diagnosis.missing_evidence).toContain(
      "provider_delivery_receipt",
    );
  });

  test("rejects structurally invalid model output", async () => {
    const model: DiagnosisModel = {
      diagnose: async () => ({ status: "completed", invented: true }),
      close: async () => {},
    };

    await expect(
      service(model).preview("telegram-rate-limit"),
    ).rejects.toBeInstanceOf(InvalidModelOutput);
  });

  test("times out a slow model", async () => {
    const model: DiagnosisModel = {
      diagnose: async () => {
        await Bun.sleep(50);
        return {};
      },
      close: async () => {},
    };
    const preview = buildPreviewService(
      new FixtureFailureContextTool(fixtures),
      model,
      {
        modelTimeoutMs: 1,
      },
    );

    await expect(preview.preview("telegram-rate-limit")).rejects.toBeInstanceOf(
      ModelTimeout,
    );
  });

  test("enforces the fixture tool budget", async () => {
    const preview = buildPreviewService(
      new FixtureFailureContextTool(fixtures),
      new TaxonomyFixtureModel(),
      { maxToolCalls: 0 },
    );

    await expect(preview.preview("telegram-rate-limit")).rejects.toBeInstanceOf(
      ToolBudgetExceeded,
    );
  });

  test("enforces the graph step limit", async () => {
    const preview = buildPreviewService(
      new FixtureFailureContextTool(fixtures),
      new TaxonomyFixtureModel(),
      { maxGraphSteps: 1 },
    );

    await expect(preview.preview("telegram-rate-limit")).rejects.toBeInstanceOf(
      GraphStepLimitExceeded,
    );
  });

  test("does not share state between repeated previews", async () => {
    const preview = service();

    const first = await preview.preview("telegram-rate-limit");
    const second = await preview.preview("telegram-unknown-delivery");

    expect(first.diagnosis.taxonomy_id).toBe("F01");
    expect(second.diagnosis.taxonomy_id).toBe("F07");
  });

  test("rejects unknown fixture IDs", async () => {
    await expect(service().preview("missing-fixture")).rejects.toBeInstanceOf(
      FixtureNotFound,
    );
  });

  test("requires diagnosis and proposal to cite observed evidence independently", async () => {
    for (const part of ["diagnosis", "proposal"] as const) {
      const base = new TaxonomyFixtureModel();
      const model: DiagnosisModel = {
        diagnose: async (evidence) => {
          const output = (await base.diagnose(evidence)) as Record<
            string,
            Record<string, unknown>
          >;
          output[part]!.evidence_refs = [];
          return output;
        },
        close: async () => {},
      };

      await expect(
        service(model).preview("telegram-rate-limit"),
      ).rejects.toBeInstanceOf(InvalidModelOutput);
    }
  });

  test("rejects citations to unobserved evidence", async () => {
    const base = new TaxonomyFixtureModel();
    const model: DiagnosisModel = {
      diagnose: async (evidence) => {
        const output = (await base.diagnose(evidence)) as Record<
          string,
          Record<string, unknown>
        >;
        output.proposal!.evidence_refs = ["evidence-never-observed"];
        return output;
      },
      close: async () => {},
    };

    await expect(
      service(model).preview("telegram-rate-limit"),
    ).rejects.toBeInstanceOf(InvalidModelOutput);
  });

  test("blocks replay and false completion when delivery is unknown", async () => {
    const base = new TaxonomyFixtureModel();
    for (const unsafe of [
      { status: "completed" },
      { diagnosis: { taxonomy_id: "F01" } },
      { proposal: { kind: "wait_then_replay" } },
    ]) {
      const model: DiagnosisModel = {
        diagnose: async (evidence) => {
          const output = (await base.diagnose(evidence)) as Record<string, any>;
          return {
            ...output,
            ...unsafe,
            diagnosis: { ...output.diagnosis, ...unsafe.diagnosis },
            proposal: { ...output.proposal, ...unsafe.proposal },
          };
        },
        close: async () => {},
      };

      await expect(
        service(model).preview("telegram-unknown-delivery"),
      ).rejects.toBeInstanceOf(InvalidModelOutput);
    }
  });

  test("rejects an oversized model response", async () => {
    const base = new TaxonomyFixtureModel();
    const model: DiagnosisModel = {
      diagnose: async (evidence) => {
        const output = (await base.diagnose(evidence)) as Record<
          string,
          Record<string, unknown>
        >;
        output.diagnosis!.summary = "x".repeat(1_001);
        return output;
      },
      close: async () => {},
    };

    await expect(
      service(model).preview("telegram-rate-limit"),
    ).rejects.toBeInstanceOf(InvalidModelOutput);
  });

  test("rejects oversized and mistyped evidence facts", () => {
    const oversized = {
      fixture_id: "telegram-rate-limit",
      evidence_id: "evidence-rate-limit-001",
      observed_at: "2026-09-18T08:00:00Z",
      facts: {
        provider: "telegram",
        stage: 1,
        attempts: 3,
        final_error: "x".repeat(2_001),
        delivery_outcome: "rejected",
        all_attempts_rejected: true,
        retry_after_seconds: 30,
      },
      unavailable: [],
      simulated: true,
    };
    const mistyped = structuredClone(oversized);
    mistyped.facts.final_error = "rate limited";
    mistyped.facts.retry_after_seconds = "30" as unknown as number;

    expect(EvidenceSchema.safeParse(oversized).success).toBe(false);
    expect(EvidenceSchema.safeParse(mistyped).success).toBe(false);
  });

  test("applies one deadline to tool loading and passes its abort signal", async () => {
    let receivedSignal: AbortSignal | undefined;
    const slowTool = {
      async get(_fixtureId: string, signal?: AbortSignal): Promise<Evidence> {
        receivedSignal = signal;
        await Bun.sleep(30);
        return EvidenceSchema.parse(
          JSON.parse(
            await readFile(join(fixtures, "telegram-rate-limit.json"), "utf8"),
          ),
        );
      },
    };
    const preview = buildPreviewService(
      slowTool as FixtureFailureContextTool,
      new TaxonomyFixtureModel(),
      { investigationTimeoutMs: 1 },
    );

    await expect(preview.preview("telegram-rate-limit")).rejects.toThrow(
      "Investigation timed out",
    );
    expect(receivedSignal).toBeInstanceOf(AbortSignal);
    expect(receivedSignal?.aborted).toBe(true);
  });

  test("requires structured cooldown and approval before suggesting replay", async () => {
    const base = new TaxonomyFixtureModel();
    const model: DiagnosisModel = {
      diagnose: async (evidence) => {
        const output = (await base.diagnose(evidence)) as Record<string, any>;
        return {
          ...output,
          proposal: {
            ...output.proposal,
            preconditions: [],
          },
        };
      },
      close: async () => {},
    };

    await expect(
      service(model).preview("telegram-rate-limit"),
    ).rejects.toBeInstanceOf(InvalidModelOutput);
  });

  test("binds fixture provenance to the requested ID", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ai-agent-fixture-"));
    try {
      const source = await readFile(
        join(fixtures, "telegram-rate-limit.json"),
        "utf8",
      );
      await writeFile(
        join(directory, "telegram-rate-limit.json"),
        source.replace(
          '"fixture_id": "telegram-rate-limit"',
          '"fixture_id": "stale"',
        ),
      );

      await expect(
        new FixtureFailureContextTool(directory).get("telegram-rate-limit"),
      ).rejects.toBeInstanceOf(FixtureIdentityMismatch);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
