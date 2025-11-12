"use client";
import axios from "axios";
import Appbar from "@/mycomponents/Appbar";
import { PrimaryButton } from "@/mycomponents/buttons/PrimaryButton";

import { Input } from "@/mycomponents/Input";
import { useState } from "react";
import { BACKEND_URL } from "@/config";
import { useRouter } from "next/navigation";
import { CheckFeature } from "@/mycomponents/CheckFeature";
import { toast } from "sonner";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
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
            <Input
              label={"Name"}
              type="text"
              placeholder="Your Name"
              onChange={(e) => {
                setName(e.target.value);
              }}
            ></Input>
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
                size="big"
                onClick={async () => {
                  try {
                    const response = await axios.post(
                      `${BACKEND_URL}/api/v1/user/signup`,
                      {
                        email,
                        password,
                        name,
                      }
                    );
                    console.log(response);
                    router.push("/login");
                  } catch (error: any) {
                    const errorMessage = error.response?.data?.message || error.message || "Signup failed. Please try again.";
                    toast.error(errorMessage);
                  }
                }}
              >
                Get Started Free
              </PrimaryButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}