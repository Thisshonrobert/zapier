import { FixtureDiagnosisModel } from "../src/fixture-model.ts";

export class TaxonomyFixtureModel extends FixtureDiagnosisModel {
  closed = false;

  override async close(): Promise<void> {
    this.closed = true;
  }
}
