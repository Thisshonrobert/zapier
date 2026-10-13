import { writeFileSync } from "node:fs";
const destination = `${process.argv[3]}.resources.json`;
const started = performance.now();
process.once("exit", code => {
  writeFileSync(destination, JSON.stringify({ code, elapsedMs: performance.now() - started,
    peakRssKiB: process.resourceUsage().maxRSS, finalMemory: process.memoryUsage(),
    node: process.version, platform: process.platform, architecture: process.arch }, null, 2) + "\n", { flag: "wx" });
});
