// Fixed ceilings keep a bad deployment value from silently removing a safety bound.
function bounded(name: string, fallback: number, maximum: number) {
  const raw = process.env[name];
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > maximum)
    throw new Error(`${name} must be an integer from 1 to ${maximum}`);
  return value;
}

export const investigationEnabled = () => process.env.INVESTIGATION_ENABLED === "true";

function positiveMoney(name: string) {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value) || value <= 0 || value > 100000)
    throw new Error(`${name} must be a positive finite amount`);
  return value;
}

export function operationalLimits() {
  const tokensPerAttempt = 64000;
  const enabled = investigationEnabled();
  const inputRate = enabled ? positiveMoney("INVESTIGATION_INPUT_USD_PER_MILLION_TOKENS") : 0;
  const outputRate = enabled ? positiveMoney("INVESTIGATION_OUTPUT_USD_PER_MILLION_TOKENS") : 0;
  if (enabled && (inputRate < 0.30 || outputRate < 2.50))
    throw new Error("Investigation rates must cover gemini-2.5-flash standard pricing");
  return {
    ownerRequestsPerDay: bounded("INVESTIGATION_OWNER_REQUESTS_PER_DAY", 20, 1000),
    operatorRequestsPerDay: bounded("INVESTIGATION_OPERATOR_REQUESTS_PER_DAY", 20, 1000),
    ownerConcurrency: bounded("INVESTIGATION_OWNER_CONCURRENCY", 2, 10),
    operatorConcurrency: bounded("INVESTIGATION_OPERATOR_CONCURRENCY", 2, 10),
    ownerTokenBudgetPerDay: bounded("INVESTIGATION_OWNER_TOKEN_BUDGET_PER_DAY", 256000, 1000000),
    operatorTokenBudgetPerDay: bounded("INVESTIGATION_OPERATOR_TOKEN_BUDGET_PER_DAY", 256000, 1000000),
    // Reserve the entire possible model budget before each attempt, including repair.
    tokensPerAttempt,
    // Charge a conservative full-attempt ceiling before dispatch; never refund a failed call.
    costCentsPerAttempt: enabled ? Math.max(1, Math.ceil(tokensPerAttempt * Math.max(inputRate, outputRate) / 10000)) : 0,
    ownerSpendCentsPerDay: enabled ? bounded("INVESTIGATION_OWNER_SPEND_CENTS_PER_DAY", 100, 1000000) : 0,
    operatorSpendCentsPerDay: enabled ? bounded("INVESTIGATION_OPERATOR_SPEND_CENTS_PER_DAY", 100, 1000000) : 0,
  };
}
