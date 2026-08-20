"use client";
import Appbar from "@/mycomponents/Appbar";
import { PrimaryButton } from "@/mycomponents/buttons/PrimaryButton";
import { CheckFeature } from "@/mycomponents/CheckFeature";
import { Input } from "@/mycomponents/Input";
import { useState } from "react";
import axios from "axios";
import { BACKEND_URL } from "@/config";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSignIn } from "@clerk/nextjs";

interface LoginResponse {
  token: string;
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const { signIn, isLoaded } = useSignIn();
  return (
    <div>
      <Appbar />
      <div className="flex justify-center">
        <div className="flex pt-8 max-w-4xl">
          <div className="flex-1 pt-20 px-4">
            <div className="font-semibold text-3xl  pb-4">
              Join millions worldwide who automate their work using Zapier.
            </div>
            <div className="pb-6 pt-4">
              <CheckFeature label={"Easy setup, no coding required"} />
            </div>
            <div className="pb-6 pt-4">
              <CheckFeature label={"Free forever for core features"} />
            </div>
            <div className="pb-6 pt-4">
              <CheckFeature label={"14-day trial of premium features & apps"} />
            </div>
          </div>

          <div className="flex-1  pt-6 pb-6 mt-12 px-4 border border-amber-100 hover:shadow-2xl rounded">
            <button
              disabled={!isLoaded}
              onClick={() =>
                signIn?.authenticateWithRedirect({
                  strategy: "oauth_google",
                  redirectUrl: "/sso-callback",
                  redirectUrlComplete: "/auth/callback",
                })
              }
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 disabled:opacity-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.27-4.74 3.27-8.09Z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
                <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.05l3.66 2.84c.87-2.6 3.3-4.51 6.16-4.51Z" />
              </svg>
              Continue with Google
            </button>

            <div className="mb-4 flex items-center gap-3 text-xs text-zinc-400">
              <span className="h-px flex-1 bg-zinc-200" />
              or
              <span className="h-px flex-1 bg-zinc-200" />
            </div>

            <Input
              label={"Email"}
              type="text"
              placeholder="Your Email"
              onChange={(e) => {
                setEmail(e.target.value);
              }}
            ></Input>
            <Input
              label={"Password"}
              type="password"
              placeholder="Password"
              onChange={(e) => {
                setPassword(e.target.value);
              }}
            ></Input>
            <div className="pt-4">
              <PrimaryButton
                onClick={async () => {
                  try {
                    const res = await axios.post<LoginResponse>(
                      `${BACKEND_URL}/api/v1/user/signin`,
                      {
                        email,
                        password,
                      }
                    );
                    localStorage.setItem("token", res.data.token);
                    router.push("/dashboard");
                  } catch (error: any) {
                    const errorMessage = error.response?.data?.message || error.message || "Login failed. Please try again.";
                    toast.error(errorMessage);
                  }
                }}
                size="big"
              >
                Login
              </PrimaryButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}