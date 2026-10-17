"use client";

import { useEffect, useRef, useState } from "react";
import { Inbox, Search, X } from "lucide-react";

import { PaneLoading, PaneNotice } from "./Shell";
import { StatusMark } from "./Marks";
import { ageLabel } from "@/lib/support-copy";
import { moveFocus, tabStopIndex } from "@/lib/support-selection";
import type { SupportTicket } from "@/types/support";

/**
 * The case index shared by all three support surfaces: a searchable, keyboard-navigable list
 * of rows. Arrow keys, Home and End move a roving tab stop inside the list, and the pattern is
 * a list of buttons, so no ARIA listbox emulation is required and a screen reader announces
 * each row as the button it is.
 */

export type IndexState<T> =
  | { kind: "loading"; label: string }
  | { kind: "error"; title: string; detail: string; tone?: "muted" | "alert" }
  | { kind: "empty"; title: string; detail: string }
  | { kind: "ready"; rows: T[] };

export type TicketIndexProps<T> = {
  title: string;
  /** Rendered as the pane's count/state line. */
  count?: string;
  state: IndexState<T>;
  toTicket: (row: T) => SupportTicket;
  onSelect: (row: T) => void;
  selectedCaseId?: string | null;
  search?: {
    label: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    /** Rendered between the search field and the rows. */
    controls?: React.ReactNode;
  };
  /** Rows exist but the current search/filter hides all of them. */
  filteredEmpty?: { title: string; detail: string; onClear: () => void };
  /** Rendered above the rows, e.g. a selected-row-hidden warning. */
  notice?: React.ReactNode;
  emptyIcon?: typeof Inbox;
  /** When true the index is hidden on narrow screens because a case file is open. */
  collapsedOnNarrow?: boolean;
  actions?: React.ReactNode;
};

export function TicketIndex<T>({
  title,
  count,
  state,
  toTicket,
  onSelect,
  selectedCaseId,
  search,
  filteredEmpty,
  notice,
  emptyIcon: EmptyIcon = Inbox,
  collapsedOnNarrow = false,
  actions,
}: TicketIndexProps<T>) {
  const rows = state.kind === "ready" ? state.rows : [];
  const visibleIds = rows.map((row) => toTicket(row).caseId);
  const listRef = useRef<HTMLUListElement>(null);

  // Focus follows the roving tab stop, and it is only applied after a keyboard move: an
  // explicit click already puts focus on the row the user pressed.
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const keyboardMove = useRef(false);
  const stop = tabStopIndex({ count: visibleIds.length, selectedId: selectedCaseId ?? null, focusedIndex, visibleIds });

  useEffect(() => {
    if (!keyboardMove.current) return;
    const row = listRef.current?.querySelector<HTMLElement>(`[data-row-index="${stop}"]`);
    row?.focus();
    keyboardMove.current = false;
  }, [stop, focusedIndex]);

  // Keyboard movement is intentionally not memoised: the React Compiler owns this component's
  // memoisation, and the handler reads the current row count on every key press.
  const onKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
    const target = event.target as HTMLElement;
    const index = Number(target.dataset.rowIndex);
    if (!Number.isInteger(index) || index < 0) return;
    const moves: Record<string, "next" | "previous" | "first" | "last"> = {
      ArrowDown: "next",
      ArrowUp: "previous",
      Home: "first",
      End: "last",
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    const next = moveFocus({ count: visibleIds.length, selectedId: selectedCaseId ?? null, focusedIndex: index }, move);
    keyboardMove.current = true;
    setFocusedIndex(next);
  };

  const hidden = collapsedOnNarrow && Boolean(selectedCaseId);

  return (
    <div
      className={`min-h-0 flex-col ${hidden ? "hidden lg:flex" : "flex"} flex-1`}
      data-index-pane=""
    >
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-zinc-200 px-3">
        <h2 className="truncate text-[13px] font-semibold tracking-tight text-zinc-900">{title}</h2>
        {count ? <span className="shrink-0 text-[11px] tabular-nums text-zinc-500">{count}</span> : null}
        <div className="ml-auto flex shrink-0 items-center gap-1.5">{actions}</div>
      </div>

      {search ? (
        <div className="shrink-0 border-b border-zinc-200 px-3 py-2.5">
          <label className="relative block">
            <span className="sr-only">{search.label}</span>
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              value={search.value}
              maxLength={120}
              placeholder={search.placeholder}
              onChange={(event) => search.onChange(event.target.value)}
              className="w-full rounded-md border border-zinc-200 bg-zinc-50 py-1.5 pr-8 pl-8 text-[13px] text-zinc-900 transition placeholder:text-zinc-400 focus:border-[#FF4F00] focus:bg-white focus:outline-none"
            />
            {search.value ? (
              <button
                type="button"
                onClick={() => search.onChange("")}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X aria-hidden className="h-3.5 w-3.5" />
                <span className="sr-only">Clear search</span>
              </button>
            ) : null}
          </label>
          {search.controls ? <div className="mt-2">{search.controls}</div> : null}
        </div>
      ) : null}

      {notice}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {state.kind === "loading" ? <PaneLoading label={state.label} /> : null}
        {state.kind === "error" ? (
          <PaneNotice tone={state.tone ?? "alert"} title={state.title} detail={state.detail} />
        ) : null}
        {state.kind === "empty" ? (
          <PaneNotice icon={EmptyIcon} title={state.title} detail={state.detail} />
        ) : null}
        {state.kind === "ready" && rows.length === 0 ? (
          filteredEmpty ? (
            <PaneNotice
              icon={EmptyIcon}
              title={filteredEmpty.title}
              detail={filteredEmpty.detail}
              action={
                <button
                  type="button"
                  onClick={filteredEmpty.onClear}
                  className="text-xs font-medium text-[#b33800] underline underline-offset-2"
                >
                  Clear filters
                </button>
              }
            />
          ) : (
            <PaneNotice icon={EmptyIcon} title="Nothing to show" detail="No rows are available in this view." />
          )
        ) : null}
        {state.kind === "ready" && rows.length > 0 ? (
          <ul ref={listRef} onKeyDown={onKeyDown} className="divide-y divide-zinc-100">
            {rows.map((row, index) => {
              const ticket = toTicket(row);
              const selected = ticket.caseId === selectedCaseId;
              return (
                <li key={ticket.caseId}>
                  <button
                    type="button"
                    id={ticket.id ?? `ticket-${ticket.caseId}`}
                    data-row-index={index}
                    tabIndex={index === stop ? 0 : -1}
                    aria-current={selected ? "true" : undefined}
                    onClick={() => onSelect(row)}
                    className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition ${
                      selected ? "bg-orange-50/70" : "hover:bg-zinc-50"
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className="truncate text-[13px] font-semibold text-zinc-900">
                          {ticket.zapName ?? ticket.summary}
                        </span>
                        <span className="ml-auto shrink-0 text-[11px] tabular-nums text-zinc-400">
                          {ageLabel(ticket.observedAt)}
                        </span>
                      </span>
                      {ticket.zapName ? (
                        <span className="mt-0.5 block truncate text-xs text-zinc-500">{ticket.stepLabel ?? ticket.summary}</span>
                      ) : null}
                      <span className="mt-1 flex flex-wrap items-center gap-1.5">
                        <StatusMark label={ticket.status} tone={ticket.tone} />
                        {ticket.ownerLabel ? (
                          <span className="truncate text-[11px] text-zinc-500">{ticket.ownerLabel}</span>
                        ) : null}
                        {ticket.ownerLabel && ticket.safeCode ? (
                          <code className="truncate rounded bg-zinc-100 px-1 py-0.5 font-mono text-[11px] text-zinc-600">
                            {ticket.safeCode}
                          </code>
                        ) : null}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
