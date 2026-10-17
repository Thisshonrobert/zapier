import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

/**
 * Static server for the inspection harness only. It serves `.impeccable/review` on 127.0.0.1:4173
 * so a browser pass can screenshot the rendered panes with the compiled stylesheet applied, and
 * it wraps JavaScript responses so a module-level throw becomes visible in the page instead of a
 * silently empty box.
 */
const root = join(import.meta.dir, "..", "review");
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".json": "application/json; charset=utf-8",
};

const wrapScript = (source) => `window.__bundleStart = Date.now();
try {
${source}
} catch (error) {
  window.__bundleError = String((error && error.stack) || error);
  var target = document.getElementById("hydrate-error");
  if (target) target.textContent = "bundle error: " + window.__bundleError;
  throw error;
}
`;

createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const path = normalize(join(root, url.pathname === "/" ? "harness.html" : url.pathname.slice(1)));
  if (!path.startsWith(root)) {
    response.writeHead(403).end("forbidden");
    return;
  }
  try {
    const extension = extname(path);
    const body = await readFile(path);
    const payload = extension === ".js" || extension === ".mjs"
      ? Buffer.from(wrapScript(body.toString("utf8")))
      : body;
    response.writeHead(200, { "content-type": types[extension] ?? "application/octet-stream" }).end(payload);
  } catch {
    response.writeHead(404).end("not found");
  }
}).listen(4173, "127.0.0.1", () => console.log("harness on http://127.0.0.1:4173"));
