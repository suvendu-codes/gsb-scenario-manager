import { describe, expect, it, vi } from 'vitest';
import { ScenarioConfigRequiredError } from '../../domain/errors.js';
import { CreateScenarioUseCase } from './create-scenario.use-case.js';

const base = { projectId: 'p1', mapId: 'm1', name: 'Peak load', authorId: 'u', createdBy: 'u' };

const setup = () => {
  const create = vi.fn(async (input: unknown) => ({ id: 's1', input }));
  return { useCase: new CreateScenarioUseCase({ create } as never), create };
};

describe('CreateScenarioUseCase', () => {
  it('rejects a draft with neither an inline config nor a configUri', async () => {
    const { useCase, create } = setup();
    await expect(useCase.execute(base)).rejects.toBeInstanceOf(ScenarioConfigRequiredError);
    expect(create).not.toHaveBeenCalled();
  });

  it('accepts an inline config', async () => {
    const { useCase, create } = setup();
    await useCase.execute({ ...base, config: { agent: {} } });
    expect(create).toHaveBeenCalledOnce();
  });

  it('accepts a configUri (clone of a blob-backed scenario)', async () => {
    const { useCase, create } = setup();
    await useCase.execute({ ...base, configUri: 'gs://b/a.json' });
    expect(create).toHaveBeenCalledOnce();
  });
});
