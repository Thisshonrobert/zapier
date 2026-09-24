const secretKey = /(?:authorization|password|secret|token|api[_-]?key|credential|cookie)/i;
const bearer = /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi;
const telegramToken = /\b\d{6,12}:[A-Za-z0-9_-]{20,}\b/g;
const email = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

function redactString(value: string) {
  return value
    .slice(0, 2_000)
    .replace(bearer, "[REDACTED]")
    .replace(telegramToken, "[REDACTED]")
    .replace(email, "[REDACTED]");
}

export function redactEvidence(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[TRUNCATED]";
  if (typeof value === "string") return redactString(value);
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 64).map((item) => redactEvidence(item, depth + 1));
  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value).slice(0, 64)) {
    output[key] = secretKey.test(key) ? "[REDACTED]" : redactEvidence(item, depth + 1);
  }
  return output;
}

function valueType(value: unknown) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

export function summarizeStructure(value: unknown, maximumPaths = 64) {
  const paths: Array<{ path: string; type: string }> = [];
  let truncated = false;
  const visit = (item: unknown, prefix: string, depth: number) => {
    if (paths.length >= maximumPaths || depth > 8) {
      truncated = true;
      return;
    }
    if (item === null || typeof item !== "object") {
      if (prefix) paths.push({ path: prefix, type: valueType(item) });
      return;
    }
    if (Array.isArray(item)) {
      if (prefix) paths.push({ path: prefix, type: "array" });
      for (const [index, child] of item.entries()) {
        if (paths.length >= maximumPaths) {
          truncated = true;
          break;
        }
        visit(child, `${prefix}[${index}]`, depth + 1);
      }
      return;
    }
    for (const [key, child] of Object.entries(item)) {
      if (paths.length >= maximumPaths) {
        truncated = true;
        break;
      }
      visit(child, prefix ? `${prefix}.${key}` : key, depth + 1);
    }
  };
  visit(value, "", 0);
  return { paths, truncated };
}
