import { withEnvelope } from '../utils/requestEnvelope';
import spec from './openapi-spec.json';

/**
 * Serves the OpenAPI 3.1 description of the public Dorkroom API.
 *
 * The document is generated from the Zod schemas by
 * `scripts/generate-openapi.ts` (`bun run openapi:generate`) and committed as
 * `openapi.json`. CORS is permissive so external tooling (Swagger UI, codegen,
 * Postman, etc.) can fetch the spec cross-origin. Method guard, CORS and
 * `nosniff` come from the request envelope.
 */
export default withEnvelope(
  { name: 'openapi', methods: ['GET'], cors: 'any-host' },
  (_req, res, ctx) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    ctx.setCacheControl('public, max-age=300, stale-while-revalidate=600');
    res.status(200).json(spec);
  }
);
