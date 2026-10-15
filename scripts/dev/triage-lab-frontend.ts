// A single owned process avoids orphaning Next CLI child processes on Windows stop.
import next from "next";
import { createServer } from "node:http";

const port = Number(process.env.PORT);
if (process.env.TRIAGE_LAB !== "true" || port !== 3200) throw new Error("Lab frontend requires its isolated launcher");
// The installed SWC works in the repository build. Do not let a local lab server
// rewrite the unrelated npm lockfile through the mismatched global Yarn installation.
process.env.NEXT_IGNORE_INCORRECT_LOCKFILE = "1";
const app = next({ dev: true, dir: process.cwd(), hostname: "127.0.0.1", port, webpack: true });
console.log("Preparing isolated lab frontend");
await app.prepare();
const handler = app.getRequestHandler();
const server = createServer((req, res) => {
  if (req.url === "/__triage_lab/identity") {
    if (!process.env.TRIAGE_LAB_CONTROL_TOKEN || req.headers.authorization !== `Bearer ${process.env.TRIAGE_LAB_CONTROL_TOKEN}`) {
      res.writeHead(401).end(); return;
    }
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ role: "frontend", labId: process.env.TRIAGE_LAB_ID,
      resourceFingerprint: process.env.TRIAGE_LAB_RESOURCE_FINGERPRINT, mode: "lifecycle-only" }));
    return;
  }
  void handler(req, res);
});
server.listen(port, "127.0.0.1", () => console.log(`Lab frontend listening on ${port}`));
async function shutdown() {
  server.closeAllConnections();
  await new Promise<void>(resolve => server.close(() => resolve()));
  await app.close();
}
process.once("SIGINT", () => { void shutdown(); });
process.once("SIGTERM", () => { void shutdown(); });
