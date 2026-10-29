import type { AddressInfo } from 'node:net';
import { VersioningType, type INestApplication, type Type } from '@nestjs/common';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { requestLogger } from 'shared';
import { DomainErrorFilter } from '../../../src/common/presentation/http-exception.filter.js';

export interface HttpResult {
  status: number;
  headers: Headers;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- response JSON is asserted field by field
  body: any;
}

export interface HttpApp {
  app: INestApplication;
  baseUrl: string;
  post(path: string, body: unknown, headers?: Record<string, string>): Promise<HttpResult>;
  close(): Promise<void>;
}

/** Boots a module the way main.ts does (prefix, URI versioning, request ids, domain error filter) on a random port. */
export async function startHttpApp(module: Type<unknown>): Promise<HttpApp> {
  const app = await NestFactory.create(module, { logger: false });
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.use(requestLogger);
  // Constructed by hand so the test does not depend on emitted decorator metadata.
  app.useGlobalFilters(new DomainErrorFilter(app.get(HttpAdapterHost)));
  app.enableShutdownHooks();
  await app.listen(0, '127.0.0.1');
  const { port } = app.getHttpServer().address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    app,
    baseUrl,
    async post(path, body, headers = {}) {
      const response = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: typeof body === 'string' ? body : JSON.stringify(body),
      });
      const text = await response.text();
      return { status: response.status, headers: response.headers, body: text ? JSON.parse(text) : undefined };
    },
    close: () => app.close(),
  };
}
