import { Module, type Provider } from '@nestjs/common';
import { appConfig } from '../config.js';
import { SCENARIO_CONFIG_READER } from '../scenarios/application/ports/scenario-config.reader.js';
import { GcsScenarioConfigReader } from '../scenarios/infrastructure/gcs-scenario-config.reader.js';
import {
  COMMAND_TOPICS,
  CONFIG_SNAPSHOT_STORE,
  ENGINE_GATE,
  EVENT_SCHEMA_VERSION,
  RUN_TRIGGER_REPOSITORY,
  RUN_UPSTREAM,
} from './application/ports/run-trigger.repository.js';
import { TriggerScenarioUseCase } from './application/use-cases/trigger-scenario.use-case.js';
import { DrizzleRunTriggerRepository } from './infrastructure/drizzle-run-trigger.repository.js';
import {
  GcsConfigSnapshotStore,
  InMemoryConfigSnapshotStore,
  MockRunUpstream,
} from './infrastructure/run-adapters.js';
import { RunsController } from './presentation/runs.controller.js';

const { scenarioConfig, kafka, eventSchemaVersion, engineGate } = appConfig;

/** Snapshots go to the scenario-config bucket when one is configured; otherwise they stay in memory (local dev). */
const snapshotStore: Provider = {
  provide: CONFIG_SNAPSHOT_STORE,
  useFactory: () =>
    scenarioConfig.bucket
      ? new GcsConfigSnapshotStore({ bucket: scenarioConfig.bucket, prefix: scenarioConfig.prefix })
      : new InMemoryConfigSnapshotStore(),
};

@Module({
  controllers: [RunsController],
  providers: [
    TriggerScenarioUseCase,
    { provide: RUN_TRIGGER_REPOSITORY, useClass: DrizzleRunTriggerRepository },
    { provide: SCENARIO_CONFIG_READER, useClass: GcsScenarioConfigReader },
    { provide: RUN_UPSTREAM, useClass: MockRunUpstream },
    snapshotStore,
    { provide: COMMAND_TOPICS, useValue: kafka.topics },
    { provide: EVENT_SCHEMA_VERSION, useValue: eventSchemaVersion },
    { provide: ENGINE_GATE, useValue: { closed: engineGate.closed } },
  ],
})
export class RunsModule {}
