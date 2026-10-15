"use client";

import { useEffect, useState } from "react";

import { readViewerCapabilities } from "@/lib/engineering-client";
import type { ViewerCapabilities } from "@/types/engineering";

/**
 * Current viewer roles as reported by the backend. `null` means "not resolved yet"
 * (still loading, signed out, or the request failed), and role-gated navigation stays
 * hidden until a real answer arrives rather than defaulting to visible.
 */
export function useViewerCapabilities() {
  const [capabilities, setCapabilities] = useState<ViewerCapabilities | null>(null);

  useEffect(() => {
    let active = true;
    readViewerCapabilities().then((result) => {
      if (active) setCapabilities(result);
    });
    return () => {
      active = false;
    };
  }, []);

  return capabilities;
}
