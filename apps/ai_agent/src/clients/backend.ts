import { verifyServiceScope, type EvidenceOperation } from "../../../../packages/triage-contracts/index.ts";
import {
  FailureContextEvidenceSchema,
  ExecutionEvidenceSchema,
  type ExecutionEvidence,
  ActionInputValidationEvidenceSchema,
  type ActionInputValidationEvidence,
  type FailureContextEvidence,
} from "../contracts.ts";

export class BackendReadTimeout extends Error {}
export class BackendResponseError extends Error {}

type BackendClientOptions = {
  baseUrl: string;
  scopeToken: string;
  serviceSecret: string;
  timeoutMs?: number;
};

export class BackendClient {
  private readonly timeoutMs: number;

  constructor(private readonly options: BackendClientOptions) {
    this.timeoutMs = options.timeoutMs ?? 2_000;
  }

  private scope(operation: EvidenceOperation) {
    return verifyServiceScope(this.options.scopeToken, {
      secret: this.options.serviceSecret,
      operation,
    });
  }

  async getFailureContext(): Promise<FailureContextEvidence> {
    const scope = this.scope("failure_context");
    return this.read(
      `/api/v1/triage/internal/cases/${encodeURIComponent(scope.caseId)}/failure-context`,
      scope.correlationId,
      FailureContextEvidenceSchema.parse,
    );
  }

  async getExecutionEvidence(historyLimit = 10): Promise<ExecutionEvidence> {
    const scope = this.scope("execution_evidence");
    const limit = Math.min(Math.max(Number.isInteger(historyLimit) ? historyLimit : 10, 1), 50);
    return this.read(
      `/api/v1/triage/internal/cases/${encodeURIComponent(scope.caseId)}/execution-evidence?historyLimit=${limit}`,
      scope.correlationId,
      ExecutionEvidenceSchema.parse,
    );
  }

  async validateActionInputs(): Promise<ActionInputValidationEvidence> {
    const scope = this.scope("validate_action_inputs");
    return this.read(
      `/api/v1/triage/internal/cases/${encodeURIComponent(scope.caseId)}/validate-action-inputs`,
      scope.correlationId,
      ActionInputValidationEvidenceSchema.parse,
      "POST",
    );
  }

  private async read<T>(
    path: string,
    correlationId: string,
    parse: (value: unknown) => T,
    method: "GET" | "POST" = "GET",
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(new URL(path, this.options.baseUrl), {
        method,
        headers: {
          authorization: `Bearer ${this.options.scopeToken}`,
          "x-correlation-id": correlationId,
        },
        signal: controller.signal,
      });
      if (!response.ok) throw new BackendResponseError(`backend evidence read failed: ${response.status}`);
      const text = await response.text();
      if (text.length > 32_768) throw new BackendResponseError("backend evidence response too large");
      return parse(JSON.parse(text));
    } catch (error) {
      if (controller.signal.aborted) throw new BackendReadTimeout("backend evidence read timed out", { cause: error });
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
