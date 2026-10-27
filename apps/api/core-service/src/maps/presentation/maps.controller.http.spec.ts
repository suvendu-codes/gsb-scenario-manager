import type { INestApplication } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { APP_FILTER, APP_PIPE, NestFactory } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DomainErrorFilter } from '../../common/presentation/http-exception.filter.js';
import { MAP_REPOSITORY } from '../application/ports/map.repository.js';
import { GetMapFolderUseCase } from '../application/use-cases/get-map-folder.use-case.js';
import { GetMapVersionAtUseCase } from '../application/use-cases/get-map-version-at.use-case.js';
import { GetMapVersionUseCase } from '../application/use-cases/get-map-version.use-case.js';
import { GetMapUseCase } from '../application/use-cases/get-map.use-case.js';
import { ListMapFoldersUseCase } from '../application/use-cases/list-map-folders.use-case.js';
import { ListMapScenariosUseCase } from '../application/use-cases/list-map-scenarios.use-case.js';
import { ListMapVersionsUseCase } from '../application/use-cases/list-map-versions.use-case.js';
import { InMemoryMapRepository } from '../infrastructure/in-memory-map.repository.js';
import { SCENARIO_REPOSITORY } from '../../scenarios/application/ports/scenario.repository.js';
import { MapsController } from './maps.controller.js';

@Module({
  controllers: [MapsController],
  providers: [
    GetMapUseCase,
    GetMapVersionUseCase,
    ListMapVersionsUseCase,
    GetMapVersionAtUseCase,
    ListMapFoldersUseCase,
    GetMapFolderUseCase,
    ListMapScenariosUseCase,
    { provide: MAP_REPOSITORY, useClass: InMemoryMapRepository },
    { provide: SCENARIO_REPOSITORY, useValue: { listByMap: async () => [] } },
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: DomainErrorFilter },
  ],
})
class TestModule {}

describe('map, map version, and map folder routes', () => {
  let app: INestApplication;
  let base: string;

  beforeAll(async () => {
    app = await NestFactory.create(TestModule, { logger: false });
    await app.listen(0);
    base = await app.getUrl();
  });
  afterAll(() => app.close());

  const get = (path: string) => fetch(`${base}${path}`);

  it('returns the map', async () => {
    const res = await get('/maps/m1');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      id: 'm1',
      projectId: 'p1',
      name: 'Ecom RTP Baseline',
      width: 100,
      height: 40,
    });
  });

  it('returns the current map version', async () => {
    const body = await (await get('/maps/m1/version')).json();
    expect(body).toMatchObject({ mapId: 'm1', version: 2, current: true });
  });

  it('lists versions and keeps the child folder under layout', async () => {
    const versions = await (await get('/maps/m1/versions')).json();
    expect(versions.versions.map((v: { version: number }) => v.version)).toEqual([1, 2]);
    expect(versions.versions.find((v: { version: number }) => v.version === 2).current).toBe(true);

    const folders = await (await get('/maps/m1/folders')).json();
    expect(folders.folders).toEqual([
      expect.objectContaining({ id: 'layout', parentId: null, path: 'layout' }),
      expect.objectContaining({ id: 'zones', parentId: 'layout', path: 'layout/zones' }),
    ]);
  });

  it('returns one version and one folder', async () => {
    expect(await (await get('/maps/m1/versions/1')).json()).toMatchObject({
      mapId: 'm1',
      version: 1,
      current: false,
    });
    expect(await (await get('/maps/m1/folders/zones')).json()).toMatchObject({
      id: 'zones',
      mapId: 'm1',
      parentId: 'layout',
    });
  });

  it('404s with a code when the map, version, or folder is missing', async () => {
    expect(await (await get('/maps/missing')).json()).toMatchObject({ code: 'map_not_found' });
    expect(await (await get('/maps/m1/versions/9')).json()).toMatchObject({
      code: 'map_version_not_found',
    });
    expect(await (await get('/maps/missing/versions/1')).json()).toMatchObject({
      code: 'map_not_found',
    });
    expect(await (await get('/maps/m1/folders/nope')).json()).toMatchObject({
      code: 'map_folder_not_found',
    });
    expect(await (await get('/maps/missing/folders/layout')).json()).toMatchObject({
      code: 'map_not_found',
    });
  });

  it.each(['0', '-1', '1.5', 'abc', '01'])('400s for version %s', async (version) => {
    expect((await get(`/maps/m1/versions/${version}`)).status).toBe(400);
  });
});
