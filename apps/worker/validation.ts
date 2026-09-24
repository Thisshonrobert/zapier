import { createHash } from "node:crypto";

import { actionRegistry, getActionHandler } from "./actions/index.ts";
import type { ActionHandler } from "./types.ts";

type ValidationInput = {
  actionType: string;
  actionMetadata: Record<string, unknown>;
  zapRunMetadata: Record<string, unknown>;
};

type ValidationDependencies = {
  getHandler?: (type: string) => ActionHandler | undefined;
  supportedTypes?: ReadonlySet<string>;
};

const fields: Record<string, { required: string[]; optional: string[]; credentials: string[] }> = {
  email: { required: ["to", "subject", "body"], optional: ["from"], credentials: [] },
  telegram: { required: ["channelUserName", "message"], optional: ["botToken"], credentials: ["botToken"] },
};

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;
}

function hasPath(value: Record<string, unknown>, path: string) {
  let current: unknown = value;
  for (const key of path.split(".")) {
    if (current === null || typeof current !== "object" || !(key in current)) return false;
    current = (current as Record<string, unknown>)[key];
  }
  return current !== null && current !== undefined;
}

function templatePaths(value: string) {
  return [...value.matchAll(/\{\{([^}]+)\}\}/g)]
    .map((match) => match[1])
    .filter((path): path is string => Boolean(path));
}

export function validateActionInputs(
  input: ValidationInput,
  dependencies: ValidationDependencies = {},
) {
  const getHandler = dependencies.getHandler ?? getActionHandler;
  const supportedTypes = dependencies.supportedTypes ?? new Set(Object.keys(actionRegistry));
  const supported = supportedTypes.has(input.actionType) && Boolean(getHandler(input.actionType));
  const definition = fields[input.actionType];
  const missingRequiredFields: string[] = [];
  const invalidFieldTypes: Array<{ field: string; expected: "string"; actual: string }> = [];
  const missingTemplatePaths = new Set<string>();

  if (supported && definition) {
    for (const field of [...definition.required, ...definition.optional]) {
      const value = input.actionMetadata[field];
      if (value === undefined || value === null || value === "") {
        if (definition.required.includes(field)) missingRequiredFields.push(field);
        continue;
      }
      if (typeof value !== "string") {
        invalidFieldTypes.push({ field, expected: "string", actual: Array.isArray(value) ? "array" : typeof value });
        continue;
      }
      for (const path of templatePaths(value)) {
        if (!hasPath(input.zapRunMetadata, path)) missingTemplatePaths.add(path);
      }
    }
  }

  const blockedReasons = supported ? [] : ["unsupported_action"];
  const invalid = missingRequiredFields.length > 0 || invalidFieldTypes.length > 0 || missingTemplatePaths.size > 0;
  return {
    validation_status: !supported ? "blocked" as const : invalid ? "invalid" as const : "valid" as const,
    supported,
    missing_required_fields: missingRequiredFields.sort(),
    invalid_field_types: invalidFieldTypes.sort((left, right) => left.field.localeCompare(right.field)),
    missing_template_paths: [...missingTemplatePaths].sort(),
    credential_presence: (definition?.credentials ?? []).map((field) => ({
      field,
      present: typeof input.actionMetadata[field] === "string" && input.actionMetadata[field] !== "",
      source: typeof input.actionMetadata[field] === "string" && input.actionMetadata[field] !== ""
        ? "action_metadata" as const
        : "unknown_worker_environment" as const,
    })),
    blocked_reasons: blockedReasons,
    input_fingerprint: createHash("sha256").update(canonical(input)).digest("hex"),
  };
}
