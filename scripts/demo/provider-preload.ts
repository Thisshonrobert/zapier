import { assertDemoDatabase, demoProviderFetch } from "./scenarios.ts";

if (process.env.TRIAGE_DEMO !== "true") throw new Error("Demo preload requires explicit demo mode");
assertDemoDatabase(process.env.DATABASE_URL ?? "");
// All fetches in this worker are blocked unless the stub handles them.
globalThis.fetch = demoProviderFetch as typeof fetch;
