import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.TRIAGE_LAB === "true" ? ".next/triage-lab" : ".next",
};

export default nextConfig;
