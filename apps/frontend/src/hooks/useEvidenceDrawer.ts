"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Accessibility and focus contract for the narrow-screen evidence drawer.
 *
 * Opening a modal dialog has to move focus into it, or a keyboard and screen-reader user is
 * left behind the overlay. Escape closes it, and focus returns to the control that opened it,
 * so the next Tab press continues from where the reader was rather than the top of the page.
 *
 * The hook is inert when `onClose` is absent, which is exactly the desktop composition where
 * the evidence room is a permanent pane rather than a dialog.
 */
export function useEvidenceDrawer(open: boolean, onClose?: () => void) {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef: RefObject<HTMLButtonElement | null> = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open || !onClose) return;
    // The element that opened the drawer is captured before the effect runs, so focus returns
    // to the control the reader actually used rather than to a ref that has since moved on.
    const opener = triggerRef.current ?? (document.activeElement as HTMLElement | null);
    panelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      opener?.focus();
    };
  }, [open, onClose]);

  return { panelRef, triggerRef };
}
