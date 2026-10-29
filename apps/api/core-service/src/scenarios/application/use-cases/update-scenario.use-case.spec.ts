import { describe, expect, it, vi } from 'vitest';
import { UpdateScenarioUseCase } from './update-scenario.use-case.js';

const scenario = { id: 's1', assertEditable: vi.fn() };

const setup = (current: { configUri: string; config?: Record<string, unknown> }) => {
  const read = vi.fn(async () => ({ agent: { defaults: { outage_pct: 1 } } }));
  const update = vi.fn(async (_id: string, changes: { patchConfig?: (c: undefined) => unknown }) => {
    changes.patchConfig?.(undefined);
    return scenario;
  });
  const repo = { findById: async () => scenario, findCurrentVersion: async () => current, update };
  const useCase = new UpdateScenarioUseCase(repo as never, { read } as never);
  return { useCase, read, update };
};

const patch = { agent: { overrides: { outage_pct: 8 } } };

describe('UpdateScenarioUseCase baseline', () => {
  it('does not read the blob when an inline body is stored and the uri is unchanged', async () => {
    const { useCase, read } = setup({ configUri: 'gs://b/a.json', config: { agent: {} } });
    await useCase.execute({ id: 's1', config: patch, updatedBy: 'u' });
    expect(read).not.toHaveBeenCalled();
  });

  it('reads the blob when no inline body is stored', async () => {
    const { useCase, read } = setup({ configUri: 'gs://b/a.json' });
    await useCase.execute({ id: 's1', config: patch, updatedBy: 'u' });
    expect(read).toHaveBeenCalledWith('gs://b/a.json');
  });

  it('reads the new blob, not the old body, when configUri changes with a config patch', async () => {
    const { useCase, read } = setup({ configUri: 'gs://b/a.json', config: { agent: {} } });
    await useCase.execute({ id: 's1', configUri: 'gs://b/new.json', config: patch, updatedBy: 'u' });
    expect(read).toHaveBeenCalledWith('gs://b/new.json');
  });

  it('does not read anything when only configUri changes', async () => {
    const { useCase, read, update } = setup({ configUri: 'gs://b/a.json', config: { agent: {} } });
    await useCase.execute({ id: 's1', configUri: 'gs://b/new.json', updatedBy: 'u' });
    expect(read).not.toHaveBeenCalled();
    expect(update.mock.calls[0][1]).toMatchObject({ configUri: 'gs://b/new.json' });
  });
});
