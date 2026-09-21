import { fileURLToPath } from "node:url";

export function defaultFixtureDirectory(): string {
  return fileURLToPath(new URL("../tests/fixtures/", import.meta.url));
}
