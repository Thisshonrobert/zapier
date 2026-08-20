"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import { toast } from "sonner";
import { BACKEND_URL } from "@/config";
import { LoaderOne } from "@/components/ui/loader";

/**
 * Trades the Clerk session for this app's own JWT, so the rest of the app
 * keeps reading a single token format out of localStorage.
 */
export default function AuthCallback() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/login");
      return;
    }

    (async () => {
      try {
        const clerkToken = await getToken();
        const res = await axios.post<{ token: string }>(
          `${BACKEND_URL}/api/v1/user/clerk`,
          {},
          { headers: { Authorization: `Bearer ${clerkToken}` } }
        );
        localStorage.setItem("token", res.data.token);
        router.replace("/dashboard");
      } catch {
        toast.error("Could not complete sign in. Please try again.");
        router.replace("/login");
      }
    })();
  }, [isLoaded, isSignedIn, getToken, router]);

  return (
    <div className="grid min-h-screen place-items-center">
      <LoaderOne />
    </div>
  );
}
