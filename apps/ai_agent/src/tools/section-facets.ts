// Heading-based guidance facets for top-three packing.
//
// A heading, not a score, tells the packer what kind of guidance a section
// holds. The map is closed on purpose: exact/synonym matches only, so an
// unfamiliar but substantive heading falls through to "other" and is kept.
import type { RequestedFacet } from "./retrieval-profile.ts";

export type SectionFacet =
  | RequestedFacet
  | "example"
  | "sources"
  | "other";

const facetByHeading = new Map<string, SectionFacet>([
  ["symptom", "symptoms"],
  ["symptoms", "symptoms"],
  ["evidence", "evidence"],
  ["evidence needed", "evidence"],
  ["historical snapshots and missing evidence", "evidence"],
  ["investigation", "investigation"],
  ["read only investigation", "investigation"],
  ["remediation", "remediation"],
  ["allowed remediation", "remediation"],
  ["forbidden", "forbidden"],
  ["forbidden actions", "forbidden"],
  ["replay", "replay"],
  ["replay and approval", "replay"],
  ["verification", "verification"],
  ["verification rollback or escalation", "verification"],
  ["example", "example"],
  ["simulated example", "example"],
  ["source", "sources"],
  ["sources", "sources"],
]);

const normalizeHeading = (heading: string) =>
  heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function sectionFacet(heading: string): SectionFacet {
  return facetByHeading.get(normalizeHeading(heading)) ?? "other";
}

// Unknown headings map to "other" and stay procedural: an unrecognized but
// substantive section is better than an empty slot. Only examples and sources
// are non-procedural and never consume one of the three guidance slots.
export function isProceduralFacet(facet: SectionFacet): boolean {
  return facet !== "example" && facet !== "sources";
}
