/**
 * OpenAPI 3.1 document builder for the public Dorkroom API.
 *
 * The request/response models are derived from the same Zod schemas the client
 * uses for runtime validation (`./schemas`), so the spec cannot drift from the
 * shapes the API actually returns. OpenAPI 3.1 is a superset of JSON Schema
 * 2020-12, which is exactly what `z.toJSONSchema` emits, so the converted
 * schemas drop straight into `components.schemas`.
 *
 * The emitted document is serialized to `api/openapi.json` by
 * `scripts/generate-openapi.ts` and served by the `/openapi.json` endpoint.
 * Run `bun run openapi:generate` after changing any schema or endpoint.
 */
import { z } from 'zod';
import {
  rawCombinationSchema,
  rawDeveloperSchema,
  rawFilmSchema,
  statsSchema,
} from './schemas';

/** Contract version of the public API surface (independent of package CalVer). */
export const OPENAPI_API_VERSION = '1.0.0';

type JsonSchema = Record<string, unknown>;

/**
 * Convert a Zod schema to a JSON Schema suitable for embedding under
 * `components.schemas`. The top-level `$schema` dialect marker is stripped —
 * the dialect is declared once on the OpenAPI document via `jsonSchemaDialect`.
 */
function toComponentSchema(schema: z.ZodType): JsonSchema {
  const jsonSchema = z.toJSONSchema(schema, {
    target: 'draft-2020-12',
  }) as JsonSchema;
  delete jsonSchema.$schema;
  return jsonSchema;
}

/** A `{ data: [...], count?: number }` envelope referencing an item schema. */
function listEnvelope(itemRef: string, description: string): JsonSchema {
  return {
    type: 'object',
    description,
    properties: {
      data: {
        type: 'array',
        items: { $ref: `#/components/schemas/${itemRef}` },
      },
      count: {
        type: 'integer',
        description: 'Total number of matching records (when available).',
      },
    },
    required: ['data'],
  };
}

/** Reusable JSON error response body returned by the handler wrapper. */
const errorResponseSchema: JsonSchema = {
  type: 'object',
  description:
    'Standard error envelope. `requestId` is always present and should be ' +
    'quoted when reporting issues.',
  properties: {
    error: { type: 'string', description: 'Short, stable error label.' },
    message: {
      type: 'string',
      description: 'Human-readable explanation (omitted for some errors).',
    },
    code: {
      type: 'string',
      description: 'Machine-readable code for auth/rate-limit failures.',
    },
    requestId: {
      type: 'string',
      format: 'uuid',
      description: 'Unique identifier for this request, echoed in server logs.',
    },
  },
  required: ['error', 'requestId'],
};

/** Build the `responses` map for an endpoint, merging a 200 with shared errors. */
function withErrorResponses(ok: JsonSchema): Record<string, JsonSchema> {
  const errorRef = {
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ErrorResponse' },
      },
    },
  };
  return {
    '200': ok,
    '400': { description: 'Invalid request parameter.', ...errorRef },
    '401': {
      description: 'Missing or invalid API key (public host only).',
      ...errorRef,
    },
    '429': {
      description:
        'Rate limit exceeded. Inspect `Retry-After` and `X-RateLimit-*` ' +
        'response headers.',
      ...errorRef,
    },
    '500': { description: 'Server or configuration error.', ...errorRef },
    '502': { description: 'Upstream service returned an error.', ...errorRef },
    '504': { description: 'Upstream service timed out.', ...errorRef },
  };
}

/** Shared query parameter definitions, referenced by `$ref` from the paths. */
const sharedParameters: Record<string, JsonSchema> = {
  Query: {
    name: 'query',
    in: 'query',
    description: 'Free-text search term matched against names and metadata.',
    required: false,
    schema: { type: 'string', maxLength: 200 },
  },
  Fuzzy: {
    name: 'fuzzy',
    in: 'query',
    description: 'Enable fuzzy matching for `query` ("true" or "false").',
    required: false,
    schema: { type: 'string', enum: ['true', 'false'] },
  },
  Limit: {
    name: 'limit',
    in: 'query',
    description: 'Maximum number of records to return (1–1000).',
    required: false,
    schema: { type: 'integer', minimum: 1, maximum: 1000 },
  },
  Slug: {
    name: 'slug',
    in: 'query',
    description: 'Return the single record with this exact slug.',
    required: false,
    schema: { type: 'string' },
  },
};

function ref(name: string): JsonSchema {
  return { $ref: `#/components/parameters/${name}` };
}

/** Build the complete OpenAPI 3.1 document for the public Dorkroom API. */
export function buildOpenApiDocument(): Record<string, unknown> {
  return {
    openapi: '3.1.0',
    jsonSchemaDialect: 'https://json-schema.org/draft/2020-12/schema',
    info: {
      title: 'Dorkroom Developer API',
      version: OPENAPI_API_VERSION,
      description:
        'Read-only access to the Dorkroom analog photography database: film ' +
        'stocks, developers, and development recipe combinations, plus a proxy ' +
        'to filmdev.org recipes.\n\n' +
        'Requests to `https://api.dorkroom.art` require an API key in the ' +
        '`X-API-Key` header. Email aaron+dorkroom@affords.art to request access.',
      license: { name: 'AGPL-3.0-only' },
      contact: {
        name: 'Dorkroom',
        url: 'https://dorkroom.art',
        email: 'aaron+dorkroom@affords.art',
      },
    },
    servers: [
      {
        url: 'https://api.dorkroom.art',
        description: 'Public API (API key required)',
      },
      {
        url: '/api',
        description: 'Same-origin (dorkroom.art, anonymous rate-limited)',
      },
    ],
    security: [{ ApiKeyAuth: [] }],
    tags: [
      { name: 'films', description: 'Film stock database.' },
      { name: 'developers', description: 'Developer / chemistry database.' },
      {
        name: 'combinations',
        description: 'Film + developer development recipes.',
      },
      { name: 'stats', description: 'Database record counts.' },
      { name: 'filmdev', description: 'Proxy to filmdev.org recipes.' },
    ],
    paths: {
      '/films': {
        get: {
          tags: ['films'],
          operationId: 'getFilms',
          summary: 'Search and filter film stocks',
          parameters: [
            ref('Query'),
            ref('Fuzzy'),
            ref('Limit'),
            ref('Slug'),
            {
              name: 'colorType',
              in: 'query',
              description:
                'Filter by color type (e.g. "bw", "color", "slide").',
              required: false,
              schema: { type: 'string' },
            },
            {
              name: 'brand',
              in: 'query',
              description: 'Filter by manufacturer brand.',
              required: false,
              schema: { type: 'string' },
            },
          ],
          responses: withErrorResponses({
            description: 'Matching film stocks.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FilmsResponse' },
              },
            },
          }),
        },
      },
      '/developers': {
        get: {
          tags: ['developers'],
          operationId: 'getDevelopers',
          summary: 'Search and filter developers',
          parameters: [
            ref('Query'),
            ref('Fuzzy'),
            ref('Limit'),
            ref('Slug'),
            {
              name: 'type',
              in: 'query',
              description:
                'Filter by developer type (e.g. "concentrate", "powder").',
              required: false,
              schema: { type: 'string' },
            },
            {
              name: 'manufacturer',
              in: 'query',
              description: 'Filter by manufacturer.',
              required: false,
              schema: { type: 'string' },
            },
          ],
          responses: withErrorResponses({
            description: 'Matching developers.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DevelopersResponse' },
              },
            },
          }),
        },
      },
      '/combinations': {
        get: {
          tags: ['combinations'],
          operationId: 'getCombinations',
          summary: 'Search development recipe combinations',
          parameters: [
            {
              name: 'film',
              in: 'query',
              description: 'Filter by film stock slug.',
              required: false,
              schema: { type: 'string' },
            },
            {
              name: 'developer',
              in: 'query',
              description: 'Filter by developer slug.',
              required: false,
              schema: { type: 'string' },
            },
            {
              name: 'id',
              in: 'query',
              description: 'Return the single combination with this id.',
              required: false,
              schema: { type: 'string' },
            },
            {
              name: 'count',
              in: 'query',
              description: 'Page size for pagination (1–1000).',
              required: false,
              schema: { type: 'integer', minimum: 1, maximum: 1000 },
            },
            {
              name: 'page',
              in: 'query',
              description: 'Page number for pagination (1-based).',
              required: false,
              schema: { type: 'integer', minimum: 1 },
            },
            ref('Query'),
            ref('Fuzzy'),
            ref('Limit'),
          ],
          responses: withErrorResponses({
            description: 'Matching development recipe combinations.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CombinationsResponse' },
              },
            },
          }),
        },
      },
      '/stats': {
        get: {
          tags: ['stats'],
          operationId: 'getStats',
          summary: 'Database record counts',
          parameters: [],
          responses: withErrorResponses({
            description: 'Total record counts per collection.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Stats' },
              },
            },
          }),
        },
      },
      '/filmdev': {
        get: {
          tags: ['filmdev'],
          operationId: 'getFilmdevRecipe',
          summary: 'Look up a filmdev.org recipe',
          description:
            'Proxies the filmdev.org recipe detail endpoint. The response shape ' +
            'is passed through from filmdev.org and is not validated by Dorkroom.',
          parameters: [
            {
              name: 'id',
              in: 'query',
              description: 'filmdev.org recipe id (positive integer).',
              required: true,
              schema: {
                type: 'integer',
                minimum: 1,
                exclusiveMaximum: 10000000,
              },
            },
          ],
          responses: withErrorResponses({
            description: 'The filmdev.org recipe payload (passed through).',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  description: 'Opaque filmdev.org recipe object.',
                  additionalProperties: true,
                },
              },
            },
          }),
        },
      },
    },
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description:
            'API key required on `https://api.dorkroom.art`. Same-origin ' +
            'requests via `dorkroom.art/api` are anonymously rate-limited and ' +
            'do not need a key.',
        },
      },
      parameters: sharedParameters,
      schemas: {
        RawFilm: toComponentSchema(rawFilmSchema),
        RawDeveloper: toComponentSchema(rawDeveloperSchema),
        RawCombination: toComponentSchema(rawCombinationSchema),
        Stats: toComponentSchema(statsSchema),
        FilmsResponse: listEnvelope('RawFilm', 'A page of film stocks.'),
        DevelopersResponse: listEnvelope(
          'RawDeveloper',
          'A page of developers.'
        ),
        CombinationsResponse: listEnvelope(
          'RawCombination',
          'A page of development recipe combinations.'
        ),
        ErrorResponse: errorResponseSchema,
      },
    },
  };
}
