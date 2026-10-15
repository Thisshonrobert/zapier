import { z } from "zod";

/**
 * Role capabilities of the authenticated viewer for the current server, so navigation
 * and workspace gating reflect the account's current permissions instead of a client
 * guess. These are two booleans about the caller; no directory, owner list or role
 * administration is exposed, and a revoked capability disappears on the next read.
 */
export const ViewerCapabilitiesSchema = z.object({
  isSupportOperator: z.boolean(),
  isEngineer: z.boolean(),
}).strict();
export type ViewerCapabilities = z.infer<typeof ViewerCapabilitiesSchema>;

export const ViewerCapabilitiesResponseSchema = z.object({
  capabilities: ViewerCapabilitiesSchema,
}).strict();
export type ViewerCapabilitiesResponse = z.infer<typeof ViewerCapabilitiesResponseSchema>;
