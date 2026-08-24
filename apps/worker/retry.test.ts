import assert from "node:assert";
import { withRetry } from "./retry";

const noSleep = async () => {};

async function main() {
  // succeeds first try -> no retry
  let calls = 0;
  await withRetry(async () => {
    calls++;
  }, 3, noSleep);
  assert.equal(calls, 1, "success should not retry");

  // flaky twice, then succeeds -> no throw
  calls = 0;
  await withRetry(async () => {
    calls++;
    if (calls < 3) throw new Error("flaky");
  }, 3, noSleep);
  assert.equal(calls, 3, "should retry until success");

  // always fails -> stops at the limit and rethrows the last error
  calls = 0;
  await assert.rejects(
    withRetry(async () => {
      calls++;
      throw new Error(`boom ${calls}`);
    }, 3, noSleep),
    /boom 3/,
    "should rethrow the final error"
  );
  assert.equal(calls, 3, "should stop at the attempt limit");

  console.log("retry.test.ts OK");
}

main();
