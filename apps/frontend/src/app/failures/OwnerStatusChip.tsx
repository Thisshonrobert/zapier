"use client";

import { StatusMark } from "@/mycomponents/support/Marks";
import { ownerWorkflowMark } from "@/lib/support-copy";
import type { WorkflowStatus } from "@/types/owner";

/** The owner's own status mark, sharing the tone vocabulary of every other support surface. */
export function StatusChip({ status }: { status: WorkflowStatus }) {
  const mark = ownerWorkflowMark(status);
  return <StatusMark label={mark.label} tone={mark.tone} />;
}
