import type { ActionInputValidationEvidence } from "../contracts.ts";

type ValidationBackend = {
  validateActionInputs(): Promise<ActionInputValidationEvidence | { type: "action_input_validation" }>;
};

export class BackendValidateActionInputsTool {
  constructor(private readonly backend: ValidationBackend) {}

  validate() {
    return this.backend.validateActionInputs();
  }
}
