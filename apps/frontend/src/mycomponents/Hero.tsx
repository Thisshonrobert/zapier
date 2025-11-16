"use client";

import { PrimaryButton } from "./buttons/PrimaryButton";
import { SecondaryButton } from "./buttons/SecondaryButton";
import { FeatureComponent } from "./FeatureComponent";
import { useRouter } from "next/navigation";

import {  useClerk } from "@clerk/nextjs";

const Hero = () => {
  const router = useRouter();
  const { openSignIn } = useClerk();

  return (
    <div>
      <div className="flex justify-center ">
        <div className="text-5xl font-semibold text-center pt-8 max-w-xl ">
          Automate as fast as you can type
        </div>
      </div>
      <div className="flex justify-center pt-2">
        <div className="text-xl  font-normal text-center pt-8 max-w-2xl">
          AI gives you automation superpowers, and Zapier puts them to work.
          Pairing AI and Zapier helps you turn ideas in to workflows and bots
          that work for you.
        </div>
      </div>
      <div className="flex justify-center pt-4">
        <div className="flex ">
          <PrimaryButton
            onClick={() => {
              router.push("/signup");
            }}
            size="big"
          >
            Get Started Free
          </PrimaryButton>
          <div className="pl-4 ">
            <SecondaryButton
              onClick={() =>
                openSignIn({
                  redirectUrl: "/dashboard", // where to go after login
                })
              }
              size="big"
            >
              Start With Gmail
            </SecondaryButton>
          </div>
        </div>
      </div>
      <div className="flex justify-center pt-5">
        <FeatureComponent
          title={"Free Forever"}
          subtitle={"for core features"}
        ></FeatureComponent>
        <FeatureComponent
          title={"More apps"}
          subtitle={"than any other platform"}
        ></FeatureComponent>
        <FeatureComponent
          title={"Cutting-edge"}
          subtitle={"AI features"}
        ></FeatureComponent>
      </div>
    </div>
  );
};

export default Hero;
