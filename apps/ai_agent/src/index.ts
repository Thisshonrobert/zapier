import { FixtureDiagnosisModel } from "./fixture-model.ts";
import { createHttpServer } from "./http.ts";
import { defaultFixtureDirectory } from "./paths.ts";

const port = Number(process.env.PORT ?? 3004);
const running = await createHttpServer({
  fixtureDirectory: defaultFixtureDirectory(),
  model: new FixtureDiagnosisModel(),
}).start(port);

console.log(`ai-agent running at ${running.baseUrl}`);

async function shutdown() {
  await running.close();
  process.exit(0);
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
