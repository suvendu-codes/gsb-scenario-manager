import { type INestApplication, Module, VersioningType } from '@nestjs/common';
import { APP_FILTER, APP_PIPE, NestFactory } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DomainErrorFilter } from '../../common/presentation/http-exception.filter.js';
import { PPS_REPOSITORY } from '../application/ports/pps.repository.js';
import { GetMapPpsUseCase } from '../application/use-cases/get-map-pps.use-case.js';
import { InMemoryPpsRepository } from '../infrastructure/in-memory-pps.repository.js';
import { PpsController } from './pps.controller.js';

@Module({
  controllers: [PpsController],
  providers: [
    GetMapPpsUseCase,
    { provide: PPS_REPOSITORY, useClass: InMemoryPpsRepository },
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: DomainErrorFilter },
  ],
})
class TestModule {}

describe('GET /api/v1/projects/:projectId/maps/:mapId/:mapVersion/pps', () => {
  let app: INestApplication;
  let base: string;

  beforeAll(async () => {
    app = await NestFactory.create(TestModule, { logger: false });
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await app.listen(0);
    base = await app.getUrl();
  });
  afterAll(() => app.close());

  const get = (path: string) => fetch(`${base}/api/v1/projects/p1/maps/m1/${path}`);

  it('returns the stations of the requested version', async () => {
    const res = await get('1/pps');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ mapId: 'm1', mapVersion: 1 });
    expect(body.pps.map((p: { ppsId: string }) => p.ppsId)).toEqual(['PPS-101', 'PPS-105']);
  });

  it('returns version-specific data', async () => {
    const body = await (await get('2/pps')).json();
    expect(body.mapVersion).toBe(2);
    expect(body.pps).toHaveLength(3);
  });

  it('404s with map_version_not_found for an unknown version', async () => {
    const res = await get('99/pps');
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ statusCode: 404, code: 'map_version_not_found' });
  });

  it('uses the path map id for identity and the path version for selection', async () => {
    const res = await fetch(`${base}/api/v1/projects/p1/maps/2/1/pps`);
    expect(await res.json()).toMatchObject({ mapId: '2', mapVersion: 1 });
  });

  it.each(['-1', '0', '1.5', 'abc', '1e2', '2147483648'])('400s for mapVersion %s', async (v) => {
    expect((await get(`${v}/pps`)).status).toBe(400);
  });

  it('no longer serves the unversioned route', async () => {
    expect((await get('pps')).status).toBe(404);
  });
});
