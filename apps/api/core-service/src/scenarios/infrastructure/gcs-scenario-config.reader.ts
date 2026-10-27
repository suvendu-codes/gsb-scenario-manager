import { Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import type { ScenarioConfigReader } from '../application/ports/scenario-config.reader.js';
import { ScenarioConfigUnreadableError } from '../domain/errors.js';

const GCS_URI = /^gs:\/\/([^/]+)\/(.+)$/;

@Injectable()
export class GcsScenarioConfigReader implements ScenarioConfigReader {
  private readonly storage = new Storage();

  async read(uri: string): Promise<Record<string, unknown>> {
    const match = GCS_URI.exec(uri);
    if (!match) throw new ScenarioConfigUnreadableError(uri, 'not a gs://<bucket>/<object> URI');
    const [, bucket, object] = match;

    let parsed: unknown;
    try {
      const [contents] = await this.storage.bucket(bucket).file(object).download();
      parsed = JSON.parse(contents.toString('utf8'));
    } catch (err) {
      throw new ScenarioConfigUnreadableError(uri, err instanceof Error ? err.message : String(err));
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new ScenarioConfigUnreadableError(uri, 'expected a JSON object');
    }
    return parsed as Record<string, unknown>;
  }
}
