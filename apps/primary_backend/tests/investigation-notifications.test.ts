import { expect, test } from "bun:test";
import { InvestigationNotifications } from "../services/investigation-notifications.ts";

const pending = { decisionId: "44444444-4444-4444-8444-444444444444",
  investigationId: "22222222-2222-4222-8222-222222222222",
  caseId: "33333333-3333-4333-8333-333333333333",
  subjectOwnerId: 9, decision: "reject" };

test("failed notification stays pending and a later drain marks it delivered", async () => {
  let delivered = false;
  let attempts = 0;
  const db = {
    $queryRaw: async <T>() => (delivered ? [] : [pending]) as T,
    $executeRaw: async (query: { strings: readonly string[] }) => {
      if (query.strings.join("").includes('"deliveredAt" = now()')) delivered = true;
      return 1;
    },
  };
  const notifications = new InvestigationNotifications(db, async () => {
    attempts++;
    if (attempts === 1) throw new Error("agent unavailable");
  });
  expect(await notifications.deliver(pending.decisionId)).toBe(false);
  expect(delivered).toBe(false);
  expect(await notifications.drain()).toBe(1);
  expect(delivered).toBe(true);
  expect(attempts).toBe(2);
});
