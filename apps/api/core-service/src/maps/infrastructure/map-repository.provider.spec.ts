import { describe, expect, it } from 'vitest';
import { createMapRepository } from './map-repository.provider.js';
import { FoundryMapRepository } from './foundry-map.repository.js';
import { InMemoryMapRepository } from './in-memory-map.repository.js';

describe('createMapRepository', () => {
  it('uses Foundry when MAP_API is set', () => {
    expect(createMapRepository('http://foundry.test')).toBeInstanceOf(FoundryMapRepository);
  });

  it('falls back to the in-memory repository when MAP_API is unset', () => {
    expect(createMapRepository(undefined)).toBeInstanceOf(InMemoryMapRepository);
  });
});
