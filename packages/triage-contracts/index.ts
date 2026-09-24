import { createHmac, timingSafeEqual } from "node:crypto";

export const TRIAGE_SCOPE_ISSUER = "primary-backend";
export const TRIAGE_SCOPE_AUDIENCE = "ai-agent";

export type EvidenceOperation =
  | "failure_context"
  | "execution_evidence"
  | "validate_action_inputs";

export type ServiceScope = {
  version: 1;
  issuer: typeof TRIAGE_SCOPE_ISSUER;
  audience: typeof TRIAGE_SCOPE_AUDIENCE;
  ownerId: number;
  caseId: string;
  investigationId: string;
  correlationId: string;
  operations: EvidenceOperation[];
  issuedAt: number;
  expiresAt: number;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedOperations = new Set<EvidenceOperation>([
  "failure_context",
  "execution_evidence",
  "validate_action_inputs",
]);

function encode(value: string | Uint8Array) {
  return Buffer.from(value).toString("base64url");
}

function sign(content: string, secret: string) {
  return createHmac("sha256", secret).update(content).digest();
}

function validSecret(secret: string) {
  if (secret.length < 32) throw new Error("service scope secret is too short");
}

function parsePayload(value: unknown): ServiceScope {
  if (value === null || typeof value !== "object") throw new Error("invalid service scope");
  const item = value as Record<string, unknown>;
  const keys = Object.keys(item).sort();
  const expectedKeys = [
    "audience", "caseId", "correlationId", "expiresAt", "investigationId",
    "issuedAt", "issuer", "operations", "ownerId", "version",
  ];
  if (
    keys.length !== expectedKeys.length || keys.some((key, index) => key !== expectedKeys[index]) ||
    item.version !== 1 ||
    item.issuer !== TRIAGE_SCOPE_ISSUER ||
    item.audience !== TRIAGE_SCOPE_AUDIENCE ||
    !Number.isSafeInteger(item.ownerId) ||
    Number(item.ownerId) <= 0 ||
    typeof item.caseId !== "string" ||
    !uuid.test(item.caseId) ||
    typeof item.investigationId !== "string" ||
    !uuid.test(item.investigationId) ||
    typeof item.correlationId !== "string" ||
    !uuid.test(item.correlationId) ||
    !Array.isArray(item.operations) ||
    item.operations.length === 0 ||
    item.operations.length > 3 ||
    !item.operations.every((operation) => allowedOperations.has(operation as EvidenceOperation)) ||
    !Number.isSafeInteger(item.issuedAt) ||
    !Number.isSafeInteger(item.expiresAt) ||
    Number(item.expiresAt) <= Number(item.issuedAt) ||
    Number(item.expiresAt) - Number(item.issuedAt) > 300
  ) throw new Error("invalid service scope");
  return item as ServiceScope;
}

export function createServiceScope(input: {
  secret: string;
  ownerId: number;
  caseId: string;
  investigationId: string;
  correlationId: string;
  operations: EvidenceOperation[];
  now?: Date;
  ttlSeconds?: number;
}) {
  validSecret(input.secret);
  const now = Math.floor((input.now ?? new Date()).getTime() / 1_000);
  const ttlSeconds = input.ttlSeconds ?? 60;
  if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > 300)
    throw new Error("invalid service scope lifetime");
  const payload = parsePayload({
    version: 1,
    issuer: TRIAGE_SCOPE_ISSUER,
    audience: TRIAGE_SCOPE_AUDIENCE,
    ownerId: input.ownerId,
    caseId: input.caseId,
    investigationId: input.investigationId,
    correlationId: input.correlationId,
    operations: [...new Set(input.operations)],
    issuedAt: now,
    expiresAt: now + ttlSeconds,
  });
  const body = encode(JSON.stringify(payload));
  return `${body}.${encode(sign(body, input.secret))}`;
}

export function verifyServiceScope(
  token: string,
  input: {
    secret: string;
    operation: EvidenceOperation;
    now?: Date;
  },
) {
  validSecret(input.secret);
  if (token.length > 4_096) throw new Error("invalid service scope");
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw new Error("invalid service scope");
  const expected = sign(parts[0], input.secret);
  let supplied: Buffer;
  try {
    supplied = Buffer.from(parts[1], "base64url");
  } catch {
    throw new Error("invalid service scope");
  }
  if (
    encode(supplied) !== parts[1] ||
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  )
    throw new Error("invalid service scope");
  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
  } catch {
    throw new Error("invalid service scope");
  }
  const scope = parsePayload(decoded);
  const now = Math.floor((input.now ?? new Date()).getTime() / 1_000);
  if (scope.expiresAt <= now || scope.issuedAt > now + 5) throw new Error("service scope expired");
  if (!scope.operations.includes(input.operation)) throw new Error("scope operation not allowed");
  return scope;
}
