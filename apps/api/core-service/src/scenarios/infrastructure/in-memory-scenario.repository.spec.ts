import { describe, expect, it } from 'vitest';
import {
  DuplicateScenarioNameError,
  ScenarioLockedError,
  ScenarioNotFoundError,
} from '../domain/errors.js';
import { ScenarioStatus } from '../domain/scenario-status.js';
import { InMemoryScenarioRepository } from './in-memory-scenario.repository.js';

const input = {
  projectId: 'proj-1',
  mapId: 'map-1',
  name: 'Pick path',
  authorId: 'author-1',
  configUri: 'gs://cfg.json',
  createdBy: 'author-1',
};

describe('InMemoryScenarioRepository', () => {
  it('rejects a duplicate name and an unknown scenario', async () => {
    const repo = new InMemoryScenarioRepository();
    const created = await repo.create(input);

    await expect(repo.create({ ...input, projectId: 'other' })).rejects.toBeInstanceOf(
      DuplicateScenarioNameError,
    );

    await expect(
      repo.update(`${created.id}-missing`, {
        configUri: input.configUri,
        updatedBy: 'author-1',
      }),
    ).rejects.toBeInstanceOf(ScenarioNotFoundError);
  });

  it('rejects updates when status is not draft', async () => {
    const repo = new InMemoryScenarioRepository();
    const created = await repo.create(input);
    const rows = Reflect.get(repo, 'rows') as { id: string; status: string }[];
    rows.find((item) => item.id === created.id)!.status = ScenarioStatus.Active;

    await expect(
      repo.update(created.id, { configUri: input.configUri, updatedBy: 'author-1' }),
    ).rejects.toBeInstanceOf(ScenarioLockedError);
  });
});
