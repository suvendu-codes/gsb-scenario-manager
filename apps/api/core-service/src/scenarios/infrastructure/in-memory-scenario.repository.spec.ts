import { describe, expect, it } from 'vitest';
import { DuplicateScenarioNameError, ScenarioVersionConflictError } from '../domain/errors';
import { InMemoryScenarioRepository } from './in-memory-scenario.repository';

const input = {
  projectId: 'proj-1',
  mapId: 'map-1',
  name: 'Pick path',
  authorId: 'author-1',
  configUri: 'gs://cfg.json',
  createdBy: 'author-1',
};

describe('InMemoryScenarioRepository', () => {
  it('rejects a duplicate name and a stale version', async () => {
    const repo = new InMemoryScenarioRepository();
    const created = await repo.create(input);

    await expect(repo.create({ ...input, projectId: 'other' })).rejects.toBeInstanceOf(
      DuplicateScenarioNameError,
    );

    await expect(
      repo.update(created.id, {
        configUri: input.configUri,
        updatedBy: 'author-1',
        expectedVersion: created.version + 1,
      }),
    ).rejects.toBeInstanceOf(ScenarioVersionConflictError);
  });
});
