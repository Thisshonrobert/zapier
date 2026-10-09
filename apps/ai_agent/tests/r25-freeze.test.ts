import { expect, test } from "bun:test";
import { hash } from "../src/evaluation/retrieval-r21.ts";
import { validateFreezeEvidenceR25 } from "../src/evaluation/r25-freeze.ts";
test("freeze rejects representation, source and configuration changes after development", () => {
  const descriptions = { a: "Evidence" };
  const payload = { config: { cutoff: .001 }, descriptionsHash: hash(descriptions) };
  const input = { ...payload, inputHash: hash(payload) };
  const report = { inputHash: input.inputHash, descriptionsHash: hash(descriptions), sourceHashes: { "r25-models.mjs": "evaluated" } };
  const validate = (description: unknown, sources: Record<string, string>, other = input) => validateFreezeEvidenceR25(report, report, input, other, description, sources);
  expect(() => validate(descriptions, { "r25-models.mjs": "evaluated" })).not.toThrow();
  expect(() => validate({ a: "Changed" }, { "r25-models.mjs": "evaluated" })).toThrow();
  expect(() => validate(descriptions, { "r25-models.mjs": "changed" })).toThrow();
  expect(() => validate(descriptions, { "r25-models.mjs": "evaluated" }, { ...input, config: { cutoff: 0 } })).toThrow();
});
