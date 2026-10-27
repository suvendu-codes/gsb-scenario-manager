import { afterEach, describe, expect, it, vi } from 'vitest';

const json = (body: unknown, status = 200) =>
  Promise.resolve({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  });

describe('FoundryMapRepository', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  async function repo() {
    vi.resetModules();
    vi.stubEnv('MAP_API', 'http://foundry.test');
    const { FoundryMapRepository } = await import('./foundry-map.repository.js');
    return new FoundryMapRepository();
  }

  it('reads the map, its versions, and its folders from the foundry paths', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/maps/m1/versions/2')) return json({ version: 2, current: false });
      if (url.endsWith('/maps/m1/versions')) return json([{ version: 1 }, { version: 3 }]);
      if (url.endsWith('/maps/m1/folders/zones')) {
        return json({ id: 'zones', name: 'Zones', path: 'layout/zones', parent_id: 'layout' });
      }
      if (url.endsWith('/maps/m1/folders')) return json({ folders: [] });
      if (url.endsWith('/maps/m1/version')) return json({ version: 3, updated_at: '2026-03-01T00:00:00.000Z' });
      if (url.endsWith('/maps/m1')) return json({ id: 'm1', name: 'Floor', project_id: 'p1' });
      return json(null, 404);
    });
    vi.stubGlobal('fetch', fetchMock);

    const maps = await repo();
    expect(await maps.findById('m1')).toMatchObject({ id: 'm1', projectId: 'p1', name: 'Floor' });
    expect(await maps.findVersion('m1')).toMatchObject({ mapId: 'm1', version: 3, current: true });

    const versions = await maps.listVersions('m1');
    expect(versions?.map((version) => [version.version, version.current])).toEqual([
      [1, false],
      [3, true],
    ]);
    expect(await maps.findVersionAt('m1', 2)).toMatchObject({ version: 2, current: false });
    expect(await maps.listFolders('m1')).toEqual([]);
    expect(await maps.findFolder('m1', 'zones')).toMatchObject({
      id: 'zones',
      parentId: 'layout',
      path: 'layout/zones',
    });

    const urls = fetchMock.mock.calls.map((call) => call[0]);
    expect(urls).toEqual([
      'http://foundry.test/maps/m1',
      'http://foundry.test/maps/m1/version',
      'http://foundry.test/maps/m1/versions',
      'http://foundry.test/maps/m1/versions/2',
      'http://foundry.test/maps/m1/folders',
      'http://foundry.test/maps/m1/folders/zones',
    ]);
  });

  it('returns null on a 404 and throws when the project map list is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ message: 'nope' }, 404)));
    const maps = await repo();
    expect(await maps.findById('missing')).toBeNull();
    expect(await maps.listVersions('missing')).toBeNull();
    await expect(maps.findByProject('p1')).rejects.toThrow('Foundry maps unavailable (404)');
  });
});
