import { fileURLToPath } from "node:url";

export function defaultFixtureDirectory(): string {
  return fileURLToPath(new URL("../tests/fixtures/", import.meta.url));
}

export function defaultRunbookDirectory(): string {
  return fileURLToPath(new URL("../../../docs/AI/runbooks/", import.meta.url));
}
