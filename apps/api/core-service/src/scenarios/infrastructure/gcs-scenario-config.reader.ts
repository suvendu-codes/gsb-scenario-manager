import { Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import type { ScenarioConfigReader } from '../application/ports/scenario-config.reader.js';
import { appConfig } from '../../config.js';
import { ScenarioConfigUnreadableError, ScenarioConfigUriInvalidError } from '../domain/errors.js';
import { parseScenarioConfigUri } from '../domain/scenario-config-uri.js';

@Injectable()
export class GcsScenarioConfigReader implements ScenarioConfigReader {
  private readonly storage = new Storage();

  async read(uri: string): Promise<Record<string, unknown>> {
    // Also guards rows stored before the DTO validated configUri.
    const location = parseScenarioConfigUri(uri, appConfig.scenarioConfig);
    if (!location) throw new ScenarioConfigUriInvalidError();
    const { bucket, object } = location;

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
