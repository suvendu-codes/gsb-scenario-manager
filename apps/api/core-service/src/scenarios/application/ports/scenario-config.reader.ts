export interface ScenarioConfigReader {
  /** Loads the JSON config blob at `uri`. @throws ScenarioConfigUnreadableError */
  read(uri: string): Promise<Record<string, unknown>>;
}

export const SCENARIO_CONFIG_READER = Symbol('SCENARIO_CONFIG_READER');
