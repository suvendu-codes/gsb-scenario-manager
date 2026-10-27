import { describe, expect, it } from 'vitest';
import { MapVersionNotFoundError } from '../../../maps/domain/errors.js';
import { InMemoryPpsRepository } from '../../infrastructure/in-memory-pps.repository.js';
import { GetMapPpsUseCase } from './get-map-pps.use-case.js';

const useCase = new GetMapPpsUseCase(new InMemoryPpsRepository());
const input = { projectId: 'p1', mapId: 'm1' };
const ids = (r: { pps: { ppsId: string }[] }) => r.pps.map((p) => p.ppsId);

describe('GetMapPpsUseCase', () => {
  it('returns the stations of the requested map version', async () => {
    const v1 = await useCase.execute({ ...input, mapVersion: 1 });
    expect(v1.mapId).toBe('m1');
    expect(v1.mapVersion).toBe(1);
    expect(ids(v1)).toEqual(['PPS-101', 'PPS-105']);
  });

  it('returns different stations for a different version', async () => {
    const v2 = await useCase.execute({ ...input, mapVersion: 2 });
    expect(v2.mapVersion).toBe(2);
    expect(ids(v2)).toEqual(['PPS-101', 'PPS-105', 'PPS-106']);
  });

  it('keeps mapId and mapVersion independent: a map id that looks like a version is not one', async () => {
    // mapId "2" with version 1 must yield version-1 stations, not version 2's.
    const res = await useCase.execute({ projectId: 'p1', mapId: '2', mapVersion: 1 });
    expect(res.mapId).toBe('2');
    expect(res.mapVersion).toBe(1);
    expect(ids(res)).toEqual(['PPS-101', 'PPS-105']);
  });

  it('echoes the requested map id for every version', async () => {
    for (const mapVersion of [1, 2]) {
      const res = await useCase.execute({ projectId: 'p1', mapId: 'other-map', mapVersion });
      expect(res.mapId).toBe('other-map');
    }
  });

  it.each([3, 0, -1])('rejects unsupported version %i naming map and version', async (mapVersion) => {
    const err = await useCase.execute({ ...input, mapVersion }).catch((e) => e);
    expect(err).toBeInstanceOf(MapVersionNotFoundError);
    expect(err.message).toBe(`Map m1 has no version ${mapVersion}`);
  });

  it('does not leak mutations between calls', async () => {
    const a = await useCase.execute({ ...input, mapVersion: 1 });
    a.pps[0].status = 'mutated';
    const b = await useCase.execute({ ...input, mapVersion: 1 });
    expect(b.pps[0].status).toBe('connected');
  });
});
