// ponytail: in-process retry only — covers transient failures (network blip,
// rate limit). Attempts that run out are handed to the DLQ by the caller, not
// swallowed here. Upgrade path: a replay consumer reading zap-events-dlq.

/**
 * Executes an async function with exponential backoff and full jitter.
 *
 * Full Jitter prevents the "Thundering Herd" problem by distributing retry
 * wakeups randomly across the backoff window.
 *
 * @param fn Async action to execute
 * @param attempts Total attempts (default 3)
 * @param sleep Injectable sleep function for testing
 * @param random Injectable RNG returning [0, 1) for testing
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  sleep = (ms: number) => new Promise((r) => setTimeout(r, ms)),
  random = () => Math.random(),
): Promise<T> {
  const baseMs = 1000;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === attempts) throw err;
      const maxBackoff = baseMs * 2 ** (i - 1); // 1000ms, 2000ms...
      // Full jitter: random sleep duration in range [0, maxBackoff]
      const wait = Math.floor(random() * maxBackoff);
      console.log(
        `attempt ${i}/${attempts} failed, retrying in ${wait}ms (max backoff: ${maxBackoff}ms)`,
      );
      await sleep(wait);
    }
  }
  throw new Error("Retry loop exhausted without a result");
}
