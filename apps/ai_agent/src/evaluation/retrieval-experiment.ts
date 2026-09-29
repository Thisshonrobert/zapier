import type { RunbookIndex, RunbookMatch } from "../tools/search-runbooks.ts";
import { searchRunbooks } from "../tools/search-runbooks.ts";

type Split = "development" | "held_out";

type RetrievalExperimentCase = {
  id: string;
  split: Split;
  query: string;
  taxonomy: readonly string[];
  providers: readonly string[];
  relevantCitations: readonly string[];
};

type Metrics = {
  queryCount: number;
  recallAt3: number;
  mrr: number;
  averageLatencyMs: number;
};

type VariantResult = {
  name: "weighted-keyword" | "bm25";
  development: Metrics;
  heldOut: Metrics;
  citationValid: boolean;
  bounded: boolean;
};

export type RetrievalExperimentResult = {
  variants: readonly VariantResult[];
  noMatchPassed: boolean;
  recommendation: "weighted-keyword" | "bm25";
};

const ignoredTerms = new Set([
  "a",
  "an",
  "and",
  "are",
  "for",
  "is",
  "of",
  "or",
  "the",
  "to",
  "with",
]);
const terms = (value: string) =>
  (value.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
    (term) => !ignoredTerms.has(term),
  );

const section = (runbookId: string) => `${runbookId}@1.0.0#symptoms`;

export const retrievalExperimentCases: readonly RetrievalExperimentCase[] = [
  {
    id: "f01-exact",
    split: "development",
    query: "Telegram HTTP 429 retry after cooldown",
    taxonomy: ["F01"],
    providers: ["telegram"],
    relevantCitations: [section("RB-F01-F02")],
  },
  {
    id: "f03-exact",
    split: "development",
    query: "bot token missing destination access denied",
    taxonomy: ["F03"],
    providers: ["telegram"],
    relevantCitations: [section("RB-F03-F04")],
  },
  {
    id: "f04-exact",
    split: "development",
    query: "template path absent unsupported action type",
    taxonomy: ["F04"],
    providers: ["telegram"],
    relevantCitations: [section("RB-F04-F06")],
  },
  {
    id: "f07-exact",
    split: "development",
    query: "provider response lost delivery unknown expired lease",
    taxonomy: ["F07"],
    providers: ["telegram"],
    relevantCitations: [section("RB-F07")],
  },
  {
    id: "f08-exact",
    split: "development",
    query: "duplicate message reset terminal SUCCESS stage",
    taxonomy: ["F08"],
    providers: ["generic"],
    relevantCitations: [section("RB-F08")],
  },
  {
    id: "f09-exact",
    split: "development",
    query: "DLQ publication missing email SDK error hidden",
    taxonomy: ["F09"],
    providers: ["email"],
    relevantCitations: [section("RB-F09-F10")],
  },
  {
    id: "f02-paraphrased",
    split: "held_out",
    query: "remote service could not be reached before any send",
    taxonomy: ["F02"],
    providers: ["telegram"],
    relevantCitations: [section("RB-F01-F02")],
  },
  {
    id: "f03-paraphrased",
    split: "held_out",
    query: "bot login details may be absent and access is denied",
    taxonomy: ["F03"],
    providers: ["telegram"],
    relevantCitations: [section("RB-F03-F04")],
  },
  {
    id: "f05-paraphrased",
    split: "held_out",
    query: "the requested automation action has no registered executor",
    taxonomy: ["F05"],
    providers: ["generic"],
    relevantCitations: [section("RB-F04-F06")],
  },
  {
    id: "f07-paraphrased",
    split: "held_out",
    query: "the call may have succeeded but its response disappeared",
    taxonomy: ["F07"],
    providers: ["telegram"],
    relevantCitations: [section("RB-F07")],
  },
  {
    id: "f08-paraphrased",
    split: "held_out",
    query:
      "a repeated broker event targets an already completed execution stage",
    taxonomy: ["F08"],
    providers: ["generic"],
    relevantCitations: [section("RB-F08")],
  },
  {
    id: "f10-paraphrased",
    split: "held_out",
    query: "an old email error remains while the action is marked successful",
    taxonomy: ["F10"],
    providers: ["email"],
    relevantCitations: [section("RB-F09-F10")],
  },
];

function bm25(
  index: RunbookIndex,
  input: Omit<RetrievalExperimentCase, "id" | "split" | "relevantCitations">,
): RunbookMatch[] {
  const candidates = index.filter(
    (item) =>
      input.taxonomy.some((value) => item.taxonomy.includes(value)) &&
      input.providers.some((value) => item.providers.includes(value)),
  );
  const queryTerms = terms(input.query);
  const documents = candidates.map((item) =>
    terms(`${item.heading} ${item.content}`),
  );
  const averageLength =
    documents.reduce((total, document) => total + document.length, 0) /
    documents.length;
  const scores = candidates.map((item, indexPosition) => {
    const document = documents[indexPosition]!;
    const score = queryTerms.reduce((total, term) => {
      const frequency = document.filter((value) => value === term).length;
      if (frequency === 0) return total;
      const documentFrequency = documents.filter((value) =>
        value.includes(term),
      ).length;
      const inverseDocumentFrequency = Math.log(
        1 +
          (documents.length - documentFrequency + 0.5) /
            (documentFrequency + 0.5),
      );
      return (
        total +
        inverseDocumentFrequency *
          ((frequency * 2.2) /
            (frequency +
              1.2 * (1 - 0.75 + 0.75 * (document.length / averageLength))))
      );
    }, 0);
    return { item, score };
  });

  return scores
    .filter((item) => item.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.item.citation.localeCompare(right.item.citation),
    )
    .slice(0, 3)
    .map(({ item, score }) => ({
      runbookId: item.id,
      version: item.version,
      citation: item.citation,
      heading: item.heading,
      content: item.content,
      contentHash: item.contentHash,
      taxonomy: item.taxonomy,
      providers: item.providers,
      simulated: true,
      authority: "untrusted_procedural_guidance",
      canChangePolicy: false,
      score,
    }));
}

function summarize(
  cases: readonly RetrievalExperimentCase[],
  retrieve: (item: RetrievalExperimentCase) => RunbookMatch[],
): { metrics: Metrics; citationValid: boolean; bounded: boolean } {
  let reciprocalRank = 0;
  let hits = 0;
  let elapsed = 0;
  let citationValid = true;
  let bounded = true;

  for (const item of cases) {
    const start = performance.now();
    const matches = retrieve(item);
    elapsed += performance.now() - start;
    bounded &&= matches.length <= 3;
    citationValid &&= matches.every((match) =>
      /^RB-[A-Z0-9-]+@\d+\.\d+\.\d+#[a-z0-9-]+$/.test(match.citation),
    );
    const position = matches.findIndex((match) =>
      item.relevantCitations.includes(match.citation),
    );
    if (position >= 0) {
      hits++;
      reciprocalRank += 1 / (position + 1);
    }
  }

  return {
    metrics: {
      queryCount: cases.length,
      recallAt3: hits / cases.length,
      mrr: reciprocalRank / cases.length,
      averageLatencyMs: elapsed / cases.length,
    },
    citationValid,
    bounded,
  };
}

export function runRetrievalExperiment(
  index: RunbookIndex,
  cases = retrievalExperimentCases,
): RetrievalExperimentResult {
  const development = cases.filter((item) => item.split === "development");
  const heldOut = cases.filter((item) => item.split === "held_out");
  const variants = (
    [
      [
        "weighted-keyword",
        (item: RetrievalExperimentCase) => searchRunbooks(index, item),
      ],
      ["bm25", (item: RetrievalExperimentCase) => bm25(index, item)],
    ] as const
  ).map(([name, retrieve]) => {
    const developmentResult = summarize(development, retrieve);
    const heldOutResult = summarize(heldOut, retrieve);
    return {
      name,
      development: developmentResult.metrics,
      heldOut: heldOutResult.metrics,
      citationValid:
        developmentResult.citationValid && heldOutResult.citationValid,
      bounded: developmentResult.bounded && heldOutResult.bounded,
    };
  });
  const noMatchPassed = variants.every((variant) => {
    const retrieve =
      variant.name === "weighted-keyword"
        ? (item: RetrievalExperimentCase) => searchRunbooks(index, item)
        : (item: RetrievalExperimentCase) => bm25(index, item);
    return (
      retrieve({
        id: "no-match",
        split: "held_out",
        query: "quantum orchard photosynthesis",
        taxonomy: ["F01"],
        providers: ["telegram"],
        relevantCitations: [],
      }).length === 0
    );
  });
  const [first, second] = variants;
  const recommendation =
    second!.heldOut.recallAt3 > first!.heldOut.recallAt3 ||
    (second!.heldOut.recallAt3 === first!.heldOut.recallAt3 &&
      second!.heldOut.mrr > first!.heldOut.mrr)
      ? "bm25"
      : "weighted-keyword";
  return { variants, noMatchPassed, recommendation };
}
