import { describe, expect, it } from 'vitest';
import * as app from '../../packages/ui/src/lib/navigation';
import * as edge from '../../utils/routeMetadata';

/**
 * Guards the two copies of the per-route page copy.
 *
 * The edge functions (`api/meta.ts`, `api/og.tsx`) read `utils/routeMetadata.ts`
 * because they cannot import workspace packages. The SPA reads
 * `packages/ui/src/lib/navigation.ts`. The tables are copied verbatim, so a
 * rename in one silently desyncs the page `<title>` from the link-preview card.
 * Update both together; this test fails when they diverge.
 */

describe('route metadata parity (utils/ vs packages/ui)', () => {
  it('has the same set of routes in both copies', () => {
    expect(Object.keys(app.ROUTE_TITLES).sort()).toEqual(
      Object.keys(edge.ROUTE_TITLES).sort()
    );
    expect(Object.keys(app.ROUTE_DESCRIPTIONS).sort()).toEqual(
      Object.keys(edge.ROUTE_DESCRIPTIONS).sort()
    );
  });

  it('has identical titles', () => {
    expect({ ...app.ROUTE_TITLES }).toEqual({ ...edge.ROUTE_TITLES });
  });

  it('has identical descriptions', () => {
    expect({ ...app.ROUTE_DESCRIPTIONS }).toEqual({
      ...edge.ROUTE_DESCRIPTIONS,
    });
  });
});
