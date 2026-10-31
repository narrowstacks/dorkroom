import { fetchUpstreamJson } from '../utils/fetchUpstreamJson';
import { serverlessWarn } from '../utils/serverlessLogger';
import { withHandler } from '../utils/withHandler';

const FILMDEV_API_BASE = 'https://filmdev.org/api';
/** Recipes rarely change upstream: cache website responses for an hour. */
const ANONYMOUS_CACHE_CONTROL =
  'public, max-age=3600, stale-while-revalidate=7200';
const MAX_RECIPE_ID = 10_000_000;

function isValidRecipeId(id: string): boolean {
  if (!/^\d+$/.test(id)) {
    return false;
  }

  const numericId = Number.parseInt(id, 10);
  return numericId > 0 && numericId < MAX_RECIPE_ID;
}

export default withHandler({
  name: 'filmdev',
  handler: async (req, res, ctx) => {
    const idParam = req.query.id;
    const recipeId = Array.isArray(idParam) ? idParam[0] : idParam;

    if (!recipeId || !isValidRecipeId(recipeId)) {
      serverlessWarn('Invalid recipe ID', {
        requestId: ctx.requestId,
        recipeId,
      });

      res.status(400).json({
        error: 'Invalid recipe ID',
        message: 'Recipe ID must be a positive integer. Use ?id=12345',
        requestId: ctx.requestId,
      });
      return;
    }

    await fetchUpstreamJson(res, ctx, {
      url: `${FILMDEV_API_BASE}/recipe/${recipeId}`,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Dorkroom-API/1.0',
      },
      label: 'filmdev.org',
      cache: ANONYMOUS_CACHE_CONTROL,
      onUpstreamStatus: async (response) => {
        if (response.status !== 404) {
          return false;
        }
        res.status(404).json({
          error: 'Recipe not found',
          message: `Recipe ${recipeId} not found on filmdev.org`,
          requestId: ctx.requestId,
        });
        return true;
      },
      logFields: { recipeId },
    });
  },
});
