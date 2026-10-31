import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ANONYMOUS_RATE_LIMIT,
  CLIENT_IP_RATE_LIMIT,
  CLIENT_RATE_LIMIT,
  getRateLimitNamespace,
  KEY_TIERS,
  normalizeResetMs,
} from '../rateLimitPolicy';

describe('getRateLimitNamespace', () => {
  it.each([
    ['anonymous', 'UNKEY_ANON_NAMESPACE'],
    ['client', 'UNKEY_CLIENT_NAMESPACE'],
  ] as const)(
    '%s: explicit %s, then <UNKEY_API_ID>-scope, then dorkroom-scope',
    (scope, envVar) => {
      expect(
        getRateLimitNamespace(scope, {
          [envVar]: '  pinned-ns  ',
          UNKEY_API_ID: 'api_1',
        })
      ).toBe('pinned-ns');
      expect(
        getRateLimitNamespace(scope, { [envVar]: '   ', UNKEY_API_ID: 'api_1' })
      ).toBe(`api_1-${scope}`);
      expect(getRateLimitNamespace(scope, {})).toBe(`dorkroom-${scope}`);
    }
  );

  it("never lets one scope read the other scope's override", () => {
    expect(
      getRateLimitNamespace('client', { UNKEY_ANON_NAMESPACE: 'anon-only' })
    ).toBe('dorkroom-client');
  });
});

describe('normalizeResetMs', () => {
  it('keeps a unix ms timestamp and turns a duration into one', () => {
    expect(normalizeResetMs(1_800_000_000_000, 5)).toBe(1_800_000_000_000);
    expect(normalizeResetMs(60_000, 1_000)).toBe(61_000);
  });
});

/**
 * Prose copies of the limits. The runtime, the edge limiter, the key script
 * and `api/docs.ts` import the numbers; these documents can't, so they are
 * pinned here instead (whitespace-normalized, so rewrapping is fine).
 */
describe('documented limits match the policy', () => {
  const root = join(import.meta.dirname, '..', '..');
  const read = (path: string) =>
    readFileSync(join(root, path), 'utf8').replace(/\s+/g, ' ');

  it.each([
    [
      'docs/API.md',
      [
        `${KEY_TIERS.free.limit}/min free, ${KEY_TIERS.standard.limit}/min standard`,
        `${CLIENT_RATE_LIMIT} req/min per \`X-Client-Id\``,
        `${CLIENT_IP_RATE_LIMIT} req/min per source IP`,
      ],
    ],
    [
      'api/CLAUDE.md',
      [
        `${CLIENT_RATE_LIMIT} req/min for \`client:<id>\``,
        `${CLIENT_IP_RATE_LIMIT} req/min \`ip:<ip>\``,
        `single ${KEY_TIERS.free.limit} req/min budget`,
        `Anonymous rate limiting by client IP (${ANONYMOUS_RATE_LIMIT} req/min)`,
      ],
    ],
    ['packages/api/CLAUDE.md', [`own ${CLIENT_RATE_LIMIT} req/min budget`]],
  ])('%s', (path, phrases) => {
    const text = read(path);
    for (const phrase of phrases) {
      expect(text).toContain(phrase);
    }
  });
});
