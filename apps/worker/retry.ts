// ponytail: in-process retry only — covers transient failures (network blip,
// rate limit). Attempts that run out are handed to the DLQ by the caller, not
// swallowed here. Upgrade path: a replay consumer reading zap-events-dlq.
export async function withRetry(
  fn: () => Promise<void>,
  attempts = 3,
  sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
) {
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === attempts) throw err;
      const wait = 1000 * 2 ** (i - 1); // 1s, 2s
      console.log(`attempt ${i}/${attempts} failed, retrying in ${wait}ms`);
      await sleep(wait);
    }
  }
}
