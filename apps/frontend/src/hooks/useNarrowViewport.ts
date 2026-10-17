"use client";

import { useEffect, useState } from "react";

/**
 * True when the viewport is too narrow for the three-pane composition. Used only to decide
 * whether a drawer-based affordance is reachable; the layout itself is driven by CSS, so a
 * server render or a missing `matchMedia` degrades to the desktop composition rather than
 * rendering a control that does nothing.
 */
export function useNarrowViewport(query = "(max-width: 1023px)") {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const list = window.matchMedia(query);
    const update = () => setNarrow(list.matches);
    update();
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, [query]);

  return narrow;
}
