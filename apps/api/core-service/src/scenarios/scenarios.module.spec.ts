import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { SCENARIO_REPOSITORY, type ScenarioRepository } from './application/ports/scenario.repository.js';
import { InMemoryScenarioRepository } from './infrastructure/in-memory-scenario.repository.js';
import { ScenariosModule } from './scenarios.module.js';

describe('replaceable scenario source', () => {
  it('boots the scenario module with memory storage and no database module', async () => {
    const app = await NestFactory.createApplicationContext(ScenariosModule.register({
      repository: { useClass: InMemoryScenarioRepository },
    }), { logger: false, abortOnError: false });
    try {
      const repository = app.get<ScenarioRepository>(SCENARIO_REPOSITORY);
      expect(repository).toBeInstanceOf(InMemoryScenarioRepository);
      expect(await repository.findById('missing')).toBeNull();
    } finally { await app.close(); }
  });
});
