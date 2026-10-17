import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

/**
 * Compiles the application's real stylesheet for the inspection harness, so the screenshots show
 * the shipped Tailwind output rather than an approximation of it.
 *
 * Run from `apps/frontend`: bun ../../.impeccable/harness/build-css.mjs
 */
const frontend = process.cwd();
const output = join(frontend, "..", "..", ".impeccable", "review");
mkdirSync(output, { recursive: true });

const source = join(frontend, "src", "app", "globals.css");
const result = await postcss([tailwind()]).process(readFileSync(source, "utf8"), { from: source });
writeFileSync(join(output, "tailwind.css"), result.css);
console.log(`wrote ${result.css.length} bytes of css to .impeccable/review/tailwind.css`);
