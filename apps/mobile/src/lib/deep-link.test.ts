import { describe, expect, it } from 'vitest';
import { resolveToolPath } from './deep-link';

// Post-006 default pins are capped at MAX_PINNED = 2: meter, border.
const DEFAULT_PINS = ['meter', 'border'];

describe('resolveToolPath', () => {
  it('leaves a pinned tool tab path unchanged', () => {
    expect(resolveToolPath('/exposure', ['exposure', 'border'])).toBe(
      '/exposure'
    );
  });

  it('rewrites an unpinned tool tab path to the More-stack detail route', () => {
    expect(resolveToolPath('/exposure', DEFAULT_PINS)).toBe('/more/exposure');
  });

  it('rewrites reciprocity to More when unpinned (broken quick action, pre-fix)', () => {
    expect(resolveToolPath('/reciprocity', DEFAULT_PINS)).toBe(
      '/more/reciprocity'
    );
  });

  it('leaves the border root path unchanged when border is pinned', () => {
    expect(resolveToolPath('/', ['border', 'meter'])).toBe('/');
  });

  it('rewrites the border root path to /more/border when border is unpinned', () => {
    expect(resolveToolPath('/', ['meter', 'exposure'])).toBe('/more/border');
  });

  it('rewrites /lenses (route name) to /more/lens (tool id) when unpinned', () => {
    expect(resolveToolPath('/lenses', DEFAULT_PINS)).toBe('/more/lens');
  });

  it('leaves /lenses unchanged when lens is pinned', () => {
    expect(resolveToolPath('/lenses', ['lens', 'border'])).toBe('/lenses');
  });

  it('passes through the permanent film-log tab unchanged', () => {
    expect(resolveToolPath('/film-log', DEFAULT_PINS)).toBe('/film-log');
  });

  it('passes through a film-log sub-path unchanged', () => {
    expect(resolveToolPath('/film-log/roll/abc', DEFAULT_PINS)).toBe(
      '/film-log/roll/abc'
    );
  });

  it('passes through the More tab root unchanged', () => {
    expect(resolveToolPath('/more', DEFAULT_PINS)).toBe('/more');
  });

  it('passes through an existing More-stack detail path unchanged', () => {
    expect(resolveToolPath('/more/anything', DEFAULT_PINS)).toBe(
      '/more/anything'
    );
  });

  it('passes through an unknown path unchanged', () => {
    expect(resolveToolPath('/does-not-exist', DEFAULT_PINS)).toBe(
      '/does-not-exist'
    );
  });

  it('passes through the permanent development tab unchanged', () => {
    expect(resolveToolPath('/development', DEFAULT_PINS)).toBe('/development');
  });

  it('passes through a development recipe sub-path unchanged', () => {
    expect(resolveToolPath('/development/recipe/abc', DEFAULT_PINS)).toBe(
      '/development/recipe/abc'
    );
  });

  it('preserves a query string when rewriting to More', () => {
    expect(resolveToolPath('/exposure?x=1', DEFAULT_PINS)).toBe(
      '/more/exposure?x=1'
    );
  });
});
