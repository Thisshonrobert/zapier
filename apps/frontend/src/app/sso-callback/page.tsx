"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

// Clerk bounces the browser through here mid-OAuth to finish the handshake,
// then forwards to redirectUrlComplete (/auth/callback).
export default function SSOCallback() {
  return <AuthenticateWithRedirectCallback />;
}
