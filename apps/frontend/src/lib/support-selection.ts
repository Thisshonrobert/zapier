import type { SupportTicket } from "../types/support";

/**
 * Pure selection logic for a support index, so the keyboard contract is testable without a
 * DOM. One row is authoritative (`selected`); a separate `focused` index exists only for the
 * roving tabindex, and it can never point outside the visible rows.
 */

export type TicketNav = { count: number; selectedId: string | null; focusedIndex: number };

export type TicketMove = "next" | "previous" | "first" | "last";

/** The single row a keyboard move lands on. Invalid input fails closed to no movement. */
export function moveFocus(nav: TicketNav, move: TicketMove): number {
  if (nav.count <= 0) return 0;
  const last = nav.count - 1;
  const current = Math.min(Math.max(nav.focusedIndex, 0), last);
  if (move === "first") return 0;
  if (move === "last") return last;
  const delta = move === "next" ? 1 : -1;
  return Math.min(Math.max(current + delta, 0), last);
}

/**
 * Which row carries the single tab stop. An explicit focus wins; otherwise the tab stop sits
 * on the selected row when it is visible, and on the first row when it is not — so filtering
 * the selected row out of view never leaves the index without a way in.
 */
export function tabStopIndex(nav: TicketNav & { visibleIds: string[] }): number {
  if (nav.visibleIds.length === 0) return -1;
  if (nav.focusedIndex >= 0 && nav.focusedIndex < nav.visibleIds.length) return nav.focusedIndex;
  const selected = nav.selectedId ? nav.visibleIds.indexOf(nav.selectedId) : -1;
  return selected >= 0 ? selected : 0;
}

/** The case a cold load should open: the selected one, else the newest visible row. */
export function initialSelection(rows: Pick<SupportTicket, "caseId">[], requestedId: string | null) {
  if (requestedId && rows.some((row) => row.caseId === requestedId)) return requestedId;
  return rows[0]?.caseId ?? null;
}
