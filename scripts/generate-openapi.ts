/**
 * Generate the committed OpenAPI document for the public Dorkroom API.
 * Usage: bun run openapi:generate
 *
 * Writes `api/openapi.json` from the Zod-derived builder. The `/openapi.json`
 * endpoint serves this file verbatim, and a vitest drift guard fails if it is
 * out of date — so re-run this whenever a schema or endpoint changes.
 */
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildOpenApiDocument } from '../packages/api/src/dorkroom/openapi';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outFile = join(__dirname, '..', 'api', 'openapi-spec.json');

const document = buildOpenApiDocument();
await writeFile(outFile, `${JSON.stringify(document, null, 2)}\n`, 'utf8');

console.log(`Wrote ${outFile}`);
