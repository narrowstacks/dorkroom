import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildOpenApiDocument, OPENAPI_API_VERSION } from '../openapi';

const here = dirname(fileURLToPath(import.meta.url));
// packages/api/src/dorkroom/__tests__ -> repo root -> api/openapi-spec.json
const committedSpecPath = join(
  here,
  '..',
  '..',
  '..',
  '..',
  '..',
  'api',
  'openapi-spec.json'
);

describe('buildOpenApiDocument', () => {
  it('produces a valid OpenAPI 3.1 document', () => {
    const doc = buildOpenApiDocument();
    expect(doc.openapi).toBe('3.1.0');
    expect((doc.info as { version: string }).version).toBe(OPENAPI_API_VERSION);
    expect(Object.keys(doc.paths as object)).toEqual([
      '/films',
      '/developers',
      '/combinations',
      '/stats',
      '/filmdev',
    ]);
  });

  it('derives response schemas from the Zod schemas', () => {
    const { components } = buildOpenApiDocument() as {
      components: { schemas: Record<string, { properties: object }> };
    };
    // RawFilm should carry the snake_case fields from rawFilmSchema.
    expect(components.schemas.RawFilm.properties).toHaveProperty('iso_speed');
    expect(components.schemas.RawFilm.properties).toHaveProperty('color_type');
    expect(components.schemas.FilmsResponse.properties).toHaveProperty('data');
  });

  it('matches the committed api/openapi-spec.json (run `bun run openapi:generate`)', () => {
    const committed = JSON.parse(readFileSync(committedSpecPath, 'utf8'));
    expect(buildOpenApiDocument()).toEqual(committed);
  });
});
