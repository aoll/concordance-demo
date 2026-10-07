import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { cleanupOpenApiDoc } from 'nestjs-zod';

export const API_PREFIX = 'api';

/** Settings shared by the served app, the tests and the contract export. */
export function configureApp(app: INestApplication): OpenAPIObject {
  // /health stays outside the prefix: it is an infra probe, not a contract route.
  app.setGlobalPrefix(API_PREFIX, { exclude: ['health'] });
  // Default security headers (same-origin CSP, nosniff, HSTS, no X-Powered-By).
  app.use(helmet());
  app.use(cookieParser());
  const config = new DocumentBuilder()
    .setTitle('Concordance démo')
    .setDescription('Présence des managers sur les zones du réseau')
    .setVersion('0.1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    // operationId = method name: Orval derives useListZones, useCreatePresence… from it
    operationIdFactory: (_controllerKey, methodKey) => methodKey,
  });
  return renameSchemas(cleanupOpenApiDoc(document));
}

/**
 * `ZoneOccupancyDto_Output` → `ZoneOccupancy`: contract names become the names of the
 * front-end types. The suffixes only serve Nest (DTO class, output schema).
 */
function renameSchemas(document: OpenAPIObject): OpenAPIObject {
  const schemas = document.components?.schemas ?? {};
  const renames = new Map<string, string>();
  for (const name of Object.keys(schemas)) {
    const short = name.replace(/_Output$/, '').replace(/Dto$/, '');
    if ([...renames.values()].includes(short)) {
      throw new Error(`Deux schémas OpenAPI s'appelleraient ${short}`);
    }
    renames.set(name, short);
  }
  let json = JSON.stringify(document);
  for (const [from, to] of renames) {
    json = json.replaceAll(`"#/components/schemas/${from}"`, `"#/components/schemas/${to}"`);
  }
  const renamed = JSON.parse(json) as OpenAPIObject;
  renamed.components = {
    ...renamed.components,
    schemas: Object.fromEntries(
      Object.entries(renamed.components?.schemas ?? {}).map(([name, schema]) => [
        renames.get(name) ?? name,
        schema,
      ]),
    ),
  };
  return renamed;
}
