"use client";

import { PrimaryButton } from "./buttons/PrimaryButton";
import { FeatureComponent } from "./FeatureComponent";
import { useRouter } from "next/navigation";

const Hero = () => {
  const router = useRouter();

  return (
    <div>
      <div className="flex justify-center">
        <h1 className="max-w-xl pt-8 text-center text-5xl font-semibold">
          Put your workflows to work
        </h1>
      </div>
      <div className="flex justify-center pt-2">
        <p className="max-w-2xl pt-8 text-center text-xl font-normal">
          Zappy connects webhook triggers to automated actions. Build a workflow,
          copy its webhook URL, and track each run from your dashboard.
        </p>
      </div>
      <div className="flex justify-center pt-4">
        <PrimaryButton onClick={() => router.push("/signup")} size="big">
          Get Started
        </PrimaryButton>
      </div>
      <div className="flex flex-wrap justify-center pt-5">
        <FeatureComponent title="Webhook triggers" subtitle="Start workflows from events" />
        <FeatureComponent title="Multi-step workflows" subtitle="Connect your actions" />
        <FeatureComponent title="Run history" subtitle="Track workflow activity" />
      </div>
    </div>
  );
};

export default Hero;
