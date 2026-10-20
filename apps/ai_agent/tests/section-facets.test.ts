import { expect, test } from "bun:test";
import {
  isProceduralFacet,
  sectionFacet,
} from "../src/tools/section-facets.ts";

test("classifies the nine repeated runbook headings", () => {
  expect(sectionFacet("Symptoms")).toBe("symptoms");
  expect(sectionFacet("Evidence needed")).toBe("evidence");
  expect(sectionFacet("Read-only investigation")).toBe("investigation");
  expect(sectionFacet("Allowed remediation")).toBe("remediation");
  expect(sectionFacet("Forbidden actions")).toBe("forbidden");
  expect(sectionFacet("Replay and approval")).toBe("replay");
  expect(sectionFacet("Verification, rollback, or escalation")).toBe("verification");
  expect(sectionFacet("Simulated example")).toBe("example");
  expect(sectionFacet("Sources")).toBe("sources");
  expect(sectionFacet("Historical snapshots and missing evidence")).toBe("evidence");
});

test("accepts citation slugs as well as display headings", () => {
  expect(sectionFacet("read-only-investigation")).toBe("investigation");
  expect(sectionFacet("verification-rollback-or-escalation")).toBe("verification");
  expect(sectionFacet("historical-snapshots-and-missing-evidence")).toBe("evidence");
  expect(sectionFacet("simulated-example")).toBe("example");
});

test("keeps unknown headings procedural", () => {
  expect(sectionFacet("Failure handling")).toBe("other");
  expect(sectionFacet("Step 3 - Support routing after a restart")).toBe("other");
  for (const facet of ["symptoms", "evidence", "investigation", "remediation", "forbidden", "replay", "verification", "other"] as const)
    expect(isProceduralFacet(facet)).toBe(true);
  for (const facet of ["example", "sources"] as const)
    expect(isProceduralFacet(facet)).toBe(false);
});
