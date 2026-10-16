import { Prisma } from "../../../packages/db/generated/prisma/client.ts";
import {
  replayReasons,
  type ReplayEligibility,
  type ReplayReason,
} from "../../../packages/triage-contracts/replay.ts";
import type { SqlClient } from "./investigation-authority.ts";

type StoredPolicy = { status?: unknown; reasons?: unknown; notBefore?: unknown; candidateGrounded?: unknown };

/**
 * Grounding is decided at submission and recorded there. A proposal stored before that
 * marker existed is read from what it does record: a durable `requires_approval` is itself
 * evidence that the policy resolved candidacy on complete facts, and an explicit
 * `ungrounded_candidate` reason is definitive. Anything else must not be assumed grounded.
 */
function candidateGrounded(stored: StoredPolicy, status: string, reasons: readonly string[]): boolean {
  if (typeof stored.candidateGrounded === "boolean") return stored.candidateGrounded;
  if (reasons.includes("ungrounded_candidate")) return false;
  return status === "requires_approval";
}

/**
 * Adapts the deterministic policy that was computed and persisted for a proposal into the
 * bounded eligibility summary shown beside the AI advice. It recomputes nothing: the
 * stored `requires_approval`/`blocked`/`no_action` status is the application's answer, and
 * the facts behind it were already evaluated against the live database at submission and
 * are re-evaluated again by every decision, request and worker claim.
 */
export function buildReplayEligibility(policy: unknown): ReplayEligibility {
  if (!policy || typeof policy !== "object") {
    return { status: "unknown", reasons: ["missing_evidence"], notBefore: null,
      requiresOperatorApproval: false, candidateGrounded: false };
  }
  const stored = policy as StoredPolicy;
  const reasons = replayReasons(Array.isArray(stored.reasons) ? stored.reasons as string[] : []);
  const status = stored.status;
  if (status !== "requires_approval" && status !== "blocked" && status !== "no_action") {
    return { status: "unknown", reasons: reasons.length ? reasons : ["missing_evidence"], notBefore: null,
      requiresOperatorApproval: false, candidateGrounded: false };
  }
  const notBefore = typeof stored.notBefore === "string" && Number.isFinite(Date.parse(stored.notBefore))
    ? stored.notBefore : null;
  return {
    status: status === "requires_approval" ? "eligible" : status,
    reasons,
    notBefore,
    requiresOperatorApproval: status === "requires_approval",
    candidateGrounded: candidateGrounded(stored, status, reasons),
  };
}

/**
 * Reads the newest proposal for a case and investigation and projects its policy as
 * evidence. A missing proposal or unreadable policy fails closed to `unknown`.
 */
export class ReplayEligibilityService {
  constructor(private readonly db: SqlClient) {}

  async read(caseId: string, investigationId: string): Promise<ReplayEligibility> {
    const [proposal] = await this.db.$queryRaw<{ policy: unknown }[]>(Prisma.sql`
      SELECT policy FROM "TriageProposal"
      WHERE "caseId" = ${caseId} AND "investigationId" = ${investigationId}
      ORDER BY version DESC LIMIT 1`);
    return buildReplayEligibility(proposal?.policy);
  }
}

export type { ReplayReason };
