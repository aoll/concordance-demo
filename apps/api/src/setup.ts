import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { cleanupOpenApiDoc } from 'nestjs-zod';

export const API_PREFIX = 'api';

/** Réglages communs à l'appli servie, aux tests et à l'export du contrat. */
export function configureApp(app: INestApplication): OpenAPIObject {
  // /health reste hors préfixe : c'est une sonde d'infra, pas une route du contrat.
  app.setGlobalPrefix(API_PREFIX, { exclude: ['health'] });
  app.use(cookieParser());
  const config = new DocumentBuilder()
    .setTitle('Concordance démo')
    .setDescription('Présence des managers sur les zones du réseau')
    .setVersion('0.1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    // operationId = nom de la méthode : Orval en tire useListZones, useCreatePresence…
    operationIdFactory: (_controllerKey, methodKey) => methodKey,
  });
  return renameSchemas(cleanupOpenApiDoc(document));
}

/**
 * `ZoneOccupancyDto_Output` → `ZoneOccupancy` : les noms du contrat deviennent les noms des
 * types côté front. Les suffixes ne servent qu'à Nest (classe DTO, schéma de sortie).
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
