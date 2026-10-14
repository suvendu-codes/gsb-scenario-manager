import { INestApplication, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';

const swaggerConfig = {
  title: 'Core Service API',
  description: 'API documentation for the core service',
  version: '1.0',
  path: process.env.SWAGGER_PATH ?? 'docs',
  enabled: process.env.SWAGGER_ENABLED !== 'false',
};

export function setupSwagger(app: INestApplication): void {
  const { enabled, title, description, version, path } = swaggerConfig;
  if (!enabled || process.env.NODE_ENV === 'production') return;

  const rawDocument = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle(title)
      .setDescription(description)
      .setVersion(version)
      .build(),
  );
  const document = cleanupOpenApiDoc(rawDocument);
  SwaggerModule.setup(path, app, document);

  new Logger('Swagger').log(`Docs available at /${path}`);
}
