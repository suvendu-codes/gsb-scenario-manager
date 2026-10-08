import { ConflictException } from '@nestjs/common';
import { Scenario } from '../../domain/entities/scenario.entity';
import { InMemoryScenarioRepository } from '../../infrastructure/adapters/in-memory-scenario.repository';
import { CreateScenarioUseCase } from './create-scenario.use-case';
import { UpdateScenarioUseCase } from './update-scenario.use-case';

describe('scenario use cases', () => {
  it('rejects a duplicate name on the same map', () => {
    const scenarios = new InMemoryScenarioRepository();
    scenarios.save(Scenario.create('map-1', 'Peak'));
    const create = new CreateScenarioUseCase(scenarios);

    expect(() => create.execute('map-1', 'Peak')).toThrow(ConflictException);
  });

  it('rejects renaming a running scenario', () => {
    const scenarios = new InMemoryScenarioRepository();
    scenarios.save(
      Scenario.restore({
        id: 's1',
        mapId: 'map-1',
        name: 'Night',
        status: 'running',
        createdAt: '2020-01-01T00:00:00.000Z',
        updatedAt: '2020-01-01T00:00:00.000Z',
      }),
    );
    const update = new UpdateScenarioUseCase(scenarios);

    expect(() => update.execute('s1', { name: 'Day' })).toThrow(
      ConflictException,
    );
  });
});
