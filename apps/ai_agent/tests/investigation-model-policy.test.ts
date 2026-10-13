import { afterEach, expect, test } from "bun:test";
import { operationalLimits } from "../src/operational-limits.ts";

const names = ["INVESTIGATION_ENABLED", "INVESTIGATION_INPUT_USD_PER_MILLION_TOKENS",
  "INVESTIGATION_OUTPUT_USD_PER_MILLION_TOKENS"] as const;
const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
afterEach(() => { for (const name of names) {
  const value = previous[name];
  if (value === undefined) delete process.env[name]; else process.env[name] = value;
} });

test("Gemini 3.5 Flash Lite retains the paid-price reservation and other models fail closed", () => {
  process.env.INVESTIGATION_ENABLED = "true";
  process.env.INVESTIGATION_INPUT_USD_PER_MILLION_TOKENS = "0.30";
  process.env.INVESTIGATION_OUTPUT_USD_PER_MILLION_TOKENS = "2.50";
  expect(operationalLimits("gemini-3.5-flash-lite").costCentsPerAttempt).toBe(16);
  expect(() => operationalLimits("gemini-3.5-pro")).toThrow("Unsupported investigation model");
});
