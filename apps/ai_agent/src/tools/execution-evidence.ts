import type { ExecutionEvidence } from "../contracts.ts";

type ExecutionEvidenceBackend = {
  getExecutionEvidence(historyLimit: number): Promise<ExecutionEvidence | { type: "execution_evidence" }>;
};

export class BackendExecutionEvidenceTool {
  constructor(private readonly backend: ExecutionEvidenceBackend) {}

  get(historyLimit = 10) {
    const limit = Math.min(Math.max(Number.isInteger(historyLimit) ? historyLimit : 10, 1), 50);
    return this.backend.getExecutionEvidence(limit);
  }
}
/**It reads:

ZapRunExecution
ZapRunExecutionAttempt
predecessor executions
action ordering

So the AI can understand:

Stage 0 → SUCCESS
Stage 1 → SUCCESS
Stage 2 → FAILED

And also:

Attempt 1 → REJECTED
Attempt 2 → UNKNOWN
Attempt 3 → REJECTED */