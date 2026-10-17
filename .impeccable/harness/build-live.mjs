import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const root = join(import.meta.dir, "..", "review");
const css = readFileSync(join(root, "tailwind.css"), "utf8");
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Phase 16G live harness</title><style>${css}</style>
<style>body{margin:0;font-family:var(--font-inter),ui-sans-serif,system-ui,sans-serif;background:#fffdf9}</style>
</head><body>
<div id="live" style="width:1440px"></div>
<div id="drawer" style="width:390px"></div>
<div id="workbench" style="width:390px;height:844px;display:flex;flex-direction:column"></div>
<pre id="hydrate-error" style="color:#b91c1c;font:12px/1.4 monospace;padding:8px"></pre>
<script>
  // The bundled frontend modules read process.env at import time, so the browser harness gives
  // them the same shape a browser build defines.
  window.process = { env: { NODE_ENV: "production" } };
  window.localStorage.setItem("token", "inspection-token");
</script>
<script src="./hydrate-classic.js"></script>
</body></html>`;
writeFileSync(join(root, "live.html"), html);
console.log("wrote live.html with process shim");
