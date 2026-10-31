import { withEnvelope } from '../utils/requestEnvelope';
import { serverlessWarn } from '../utils/serverlessLogger';

/**
 * JSON 404 for api.dorkroom.art paths that map to no endpoint. `vercel.json`
 * routes the api host's unmatched paths here instead of the SPA catch-all.
 *
 * The request envelope alone, not `withHandler`: that adds an API-key check on
 * the api host, so a mistyped path would get a 401 (or a 500 when Unkey env is
 * missing) instead of a 404, and every junk request would cost a key check.
 * Every method gets the 404 (`methods: 'any'`): a 405 would claim the path
 * exists.
 */
export default withEnvelope(
  {
    name: 'not-found',
    methods: 'any',
    cors: 'any-host',
    cache: { always: 'no-store' },
  },
  (req, res, ctx) => {
    serverlessWarn('Unknown api path', {
      requestId: ctx.requestId,
      method: req.method ?? 'GET',
      url: req.url ?? '',
    });

    res.status(404).json({
      error: 'Not found',
      message: 'No endpoint exists at this path. See https://api.dorkroom.art/',
      requestId: ctx.requestId,
    });
  }
);
