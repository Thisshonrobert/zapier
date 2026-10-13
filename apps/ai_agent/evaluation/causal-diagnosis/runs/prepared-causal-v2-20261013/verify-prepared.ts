import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
const root = join(import.meta.dir, "../../../../../..");
const review = JSON.parse(await readFile(join(import.meta.dir, "offline-review-final-2.json"), "utf8"));
for (const [path, expected] of Object.entries(review.sourceHashes)) {
  const actual = createHash("sha256").update(await readFile(join(root, path), "utf8")).digest("hex");
  if (actual !== expected) throw new Error(`Prepared source changed: ${path}`);
}
const confirmation = join(root, "apps/ai_agent/evaluation/retrieval-investigation/runs/free-oracle-pilot-20261013-v1/free-tier-confirmation.json");
const value = JSON.parse(await readFile(confirmation, "utf8"));
const confirmationHash = createHash("sha256").update(JSON.stringify(value, null, 2) + "\n").digest("hex");
const prior = JSON.parse(await readFile(join(root, "apps/ai_agent/evaluation/causal-diagnosis/runs/free-causal-pilot-20261013-v1/access.json"), "utf8"));
if (confirmationHash !== prior.confirmationHash) throw new Error("Previously confirmed access changed");
await writeFile(join(import.meta.dir, "execution-authorization.json"), JSON.stringify({
  recordedAt: new Date().toISOString(), authorization: "User explicitly requested the prepared six-generation comparison using the same confirmed free-tier Gemini model, with no retries or extra calls.",
  sourceHashesVerified: true, planHash: review.planHash, confirmationHash,
  savedConfirmationReused: true, originalVerifiedAt: value.verifiedAt,
  freeTierReverified: false, availabilityCheck: "First planned generation only",
  maximumGenerations: 6, maximumTokenPreflights: 6,
}, null, 2) + "\n", { flag: "wx" });
console.log("Prepared source hashes and prior confirmation match; no provider calls.");
