import { expect, test } from "bun:test";
import { packByFacet } from "../src/tools/facet-pack.ts";
import type { RunbookMatch } from "../src/tools/search-runbooks.ts";

const sectionMatch = (citation: string, heading: string, score: number): RunbookMatch => ({
  runbookId: "RB-A",
  version: "1.0.0",
  citation,
  heading,
  content: `${heading} content`,
  contentHash: "a".repeat(64),
  taxonomy: ["F01"],
  providers: ["generic"],
  simulated: true,
  authority: "untrusted_procedural_guidance",
  canChangePolicy: false,
  score,
});

test("takes one section per requested facet before filling by score", () => {
  const matches = [
    sectionMatch("RB-A@1.0.0#symptoms", "Symptoms", 0.9),
    sectionMatch("RB-A@1.0.0#evidence", "Evidence needed", 0.8),
    sectionMatch("RB-A@1.0.0#investigation", "Read-only investigation", 0.7),
    sectionMatch("RB-A@1.0.0#verification", "Verification, rollback, or escalation", 0.6),
    sectionMatch("RB-A@1.0.0#sources", "Sources", 0.95),
  ];

  expect(packByFacet(matches, ["evidence", "verification"], 3).map((m) => m.heading)).toEqual([
    "Symptoms",
    "Evidence needed",
    "Verification, rollback, or escalation",
  ]);
  expect(packByFacet(matches, ["symptoms", "evidence", "verification"], 3).map((m) => m.heading))
    .not.toContain("Sources");
});

test("drops examples and sources and keeps unknown headings as fill", () => {
  const matches = [
    sectionMatch("RB-A@1.0.0#example", "Simulated example", 0.99),
    sectionMatch("RB-A@1.0.0#sources", "Sources", 0.98),
    sectionMatch("RB-A@1.0.0#other", "Failure handling", 0.4),
    sectionMatch("RB-A@1.0.0#remediation", "Allowed remediation", 0.3),
  ];

  expect(packByFacet(matches, ["remediation"], 2).map((m) => m.heading)).toEqual([
    "Failure handling",
    "Allowed remediation",
  ]);
});

test("never repeats a citation or exceeds the limit", () => {
  const matches = [
    sectionMatch("RB-A@1.0.0#evidence", "Evidence needed", 0.9),
    sectionMatch("RB-A@1.0.0#evidence", "Evidence needed", 0.9),
    sectionMatch("RB-A@1.0.0#symptoms", "Symptoms", 0.8),
    sectionMatch("RB-A@1.0.0#investigation", "Read-only investigation", 0.7),
  ];

  const packed = packByFacet(matches, ["evidence", "evidence", "verification"], 2);
  expect(packed).toHaveLength(2);
  expect(new Set(packed.map((match) => match.citation)).size).toBe(2);
  expect(packed.map((match) => match.heading)).toEqual(["Evidence needed", "Symptoms"]);
  expect(packByFacet(matches, ["evidence"], 0)).toEqual([]);
});

test("returns score order when no facet is requested", () => {
  const matches = [
    sectionMatch("RB-A@1.0.0#investigation", "Read-only investigation", 0.7),
    sectionMatch("RB-A@1.0.0#evidence", "Evidence needed", 0.9),
    sectionMatch("RB-A@1.0.0#symptoms", "Symptoms", 0.8),
  ];
  expect(packByFacet(matches, [], 3).map((match) => match.heading)).toEqual([
    "Evidence needed",
    "Symptoms",
    "Read-only investigation",
  ]);
});
