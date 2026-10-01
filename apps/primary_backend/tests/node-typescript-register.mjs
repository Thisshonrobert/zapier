import { registerHooks } from "node:module";

// Match the repo's bundler resolution for extensionless relative TypeScript imports.
registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); }
  catch (error) {
    if (!specifier.startsWith(".") || !["ERR_MODULE_NOT_FOUND", "ERR_UNSUPPORTED_DIR_IMPORT"].includes(error.code)) throw error;
    for (const suffix of [".ts", "/index.ts"]) {
      try { return nextResolve(specifier + suffix, context); }
      catch (candidate) { if (candidate.code !== "ERR_MODULE_NOT_FOUND") throw candidate; }
    }
    throw error;
  }
} });
