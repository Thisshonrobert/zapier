import { buildPreviewService } from "./graph.ts";
import { FixtureDiagnosisModel } from "./fixture-model.ts";
import { defaultFixtureDirectory } from "./paths.ts";
import { FixtureFailureContextTool } from "./tools/failure-context.ts";

const fixtureId = process.argv[2];
if (
  !fixtureId ||
  !["telegram-rate-limit", "telegram-unknown-delivery"].includes(fixtureId)
) {
  console.error(
    "Usage: bun run demo <telegram-rate-limit|telegram-unknown-delivery>",
  );
  process.exitCode = 1;
} else {
  const model = new FixtureDiagnosisModel();
  try {
    const service = buildPreviewService(
      new FixtureFailureContextTool(defaultFixtureDirectory()),
      model,
    );
    console.log(JSON.stringify(await service.preview(fixtureId), null, 2));
  } finally {
    await model.close();
  }
}
