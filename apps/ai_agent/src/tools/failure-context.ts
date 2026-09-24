import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { EvidenceSchema, type Evidence } from "../contracts.ts";
import type { BackendClient } from "../clients/backend.ts";

export class FixtureNotFound extends Error {}
export class FixtureIdentityMismatch extends Error {}

const fixtureFiles: Readonly<Record<string, string>> = {
  "telegram-rate-limit": "telegram-rate-limit.json",
  "telegram-unknown-delivery": "telegram-unknown-delivery.json",
};
//Abstraction layer so that graph doesnt matter where the evidence comes from. 
// This allows us to swap out the source of evidence without changing the rest of the codebase.
export class FixtureFailureContextTool {
  constructor(private readonly fixtureDirectory: string) {}

  async get(fixtureId: string, signal?: AbortSignal): Promise<Evidence> {
    const filename = fixtureFiles[fixtureId];
    if (!filename) throw new FixtureNotFound(fixtureId);

    let payload: string;  
    try {
      payload = await readFile(join(this.fixtureDirectory, filename), {
        encoding: "utf8",
        signal,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        throw new FixtureNotFound(fixtureId, { cause: error });
      }
      throw error;
    }

    const evidence = EvidenceSchema.parse(JSON.parse(payload));
    if (evidence.fixture_id !== fixtureId) {
      throw new FixtureIdentityMismatch(
        `Fixture identity ${JSON.stringify(evidence.fixture_id)} does not match ${JSON.stringify(fixtureId)}`,
      );
    }
    return evidence;
  }
}

export class BackendFailureContextTool {
  constructor(private readonly backend: BackendClient) {}

  get() {
    return this.backend.getFailureContext();
  }
}
