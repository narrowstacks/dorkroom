import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  catalogueRequest,
  resetCatalogueSourceLog,
} from '../internalDataSource';

const ENDPOINT = 'https://example-ref.supabase.co';
const API_KEY = 'sb_secret_test_value';
const PROXY_SECRET = 'proxy-secret-test-value';

function configure(endpoint = ENDPOINT, key = API_KEY, secret = PROXY_SECRET) {
  vi.stubEnv('SUPABASE_ENDPOINT', endpoint);
  vi.stubEnv('SUPABASE_MASTER_API_KEY', key);
  vi.stubEnv('SUPABASE_PROXY_SECRET', secret);
}

const SLUG = new URLSearchParams({ slug: 'kodak-tri-x-400', limit: '1' });

beforeEach(() => {
  resetCatalogueSourceLog();
  configure('', '', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('catalogueRequest', () => {
  it('targets the Edge Function with the proxy credentials when configured', () => {
    configure();

    const request = catalogueRequest('developers', SLUG);

    expect(request).toEqual({
      url: `${ENDPOINT}/functions/v1/developers?slug=kodak-tri-x-400&limit=1`,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        Accept: 'application/json',
        'x-proxy-secret': PROXY_SECRET,
      },
      redirect: 'error',
      mode: 'direct',
    });
  });

  it.each(['direct', 'public'] as const)(
    'encodes hostile values and keeps the %s host and path fixed',
    (mode) => {
      if (mode === 'direct') configure();
      const hostile = 'a&page=999#x/../';

      const request = catalogueRequest(
        'films',
        new URLSearchParams({ slug: hostile, limit: '1' })
      );

      expect(request.mode).toBe(mode);
      const url = new URL(request.url);
      expect(url.origin).toBe(
        mode === 'direct' ? ENDPOINT : 'https://dorkroom.art'
      );
      expect(url.pathname).toBe(
        mode === 'direct' ? '/functions/v1/films' : '/api/films'
      );
      expect(url.hash).toBe('');
      expect([...url.searchParams]).toEqual([
        ['slug', hostile],
        ['limit', '1'],
      ]);
      expect(url.searchParams.has('page')).toBe(false);
    }
  );

  it('accepts an endpoint with a trailing slash', () => {
    configure(`${ENDPOINT}/`);
    expect(catalogueRequest('films', SLUG).url).toBe(
      `${ENDPOINT}/functions/v1/films?slug=kodak-tri-x-400&limit=1`
    );
  });

  it.each([
    ['endpoint', () => configure('', API_KEY, PROXY_SECRET)],
    ['API key', () => configure(ENDPOINT, '', PROXY_SECRET)],
    ['proxy secret', () => configure(ENDPOINT, API_KEY, '   ')],
  ])('uses the public API when the %s is missing', (_, setUp) => {
    setUp();

    const request = catalogueRequest('films', SLUG);

    expect(request.mode).toBe('public');
    expect(request.url).toBe(
      'https://dorkroom.art/api/films?slug=kodak-tri-x-400&limit=1'
    );
    expect(request.headers).toEqual({ Accept: 'application/json' });
  });

  it.each([
    ['plain http', 'http://example-ref.supabase.co'],
    ['a path', `${ENDPOINT}/somewhere`],
    ['userinfo', 'https://user:pass@example-ref.supabase.co'],
    ['a query', `${ENDPOINT}/?x=1`],
    ['not a URL', 'example-ref.supabase.co'],
  ])('refuses an endpoint with %s and uses the public API', (_, endpoint) => {
    configure(endpoint);

    const request = catalogueRequest('films', SLUG);

    expect(request.mode).toBe('public');
    expect(JSON.stringify(request)).not.toContain(API_KEY);
    expect(JSON.stringify(request)).not.toContain(PROXY_SECRET);
  });

  it('logs the fallback once, naming the variables but never their values', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    configure(ENDPOINT, API_KEY, '');

    catalogueRequest('films', SLUG);
    catalogueRequest('developers', SLUG);

    expect(warn).toHaveBeenCalledTimes(1);
    const logged = String(warn.mock.calls[0]?.[0]);
    expect(logged).toContain('SUPABASE_PROXY_SECRET');
    expect(logged).not.toContain(API_KEY);
    expect(logged).not.toContain(ENDPOINT);
  });

  it('logs nothing on the direct path', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    configure();

    catalogueRequest('films', SLUG);

    expect(warn).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });
});
