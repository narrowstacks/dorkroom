import { describe, expect, it } from 'vitest';
import { resolveToolPath, toolIdForPath } from './deep-link';

// Default pins are capped at MAX_PINNED = 1: meter.
const DEFAULT_PINS = ['meter'];

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

  it('leaves the root path alone: it is Home, whatever is pinned', () => {
    expect(resolveToolPath('/', ['border'])).toBe('/');
    expect(resolveToolPath('/', DEFAULT_PINS)).toBe('/');
    expect(resolveToolPath('/?x=1', [])).toBe('/?x=1');
  });

  it('keeps the border calculator reachable at /border', () => {
    expect(resolveToolPath('/border', ['border'])).toBe('/border');
    expect(resolveToolPath('/border', DEFAULT_PINS)).toBe('/more/border');
  });

  it("carries a Home answer's prefill through to the More route", () => {
    expect(resolveToolPath('/lenses?focal=80&to=full-frame', [])).toBe(
      '/more/lens?focal=80&to=full-frame'
    );
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

describe('toolIdForPath', () => {
  it('names the tool for a tab route, its More route and the sections', () => {
    expect(toolIdForPath('/lenses')).toBe('lens');
    expect(toolIdForPath('/border?paper=8x10')).toBe('border');
    expect(toolIdForPath('/more/reciprocity')).toBe('reciprocity');
    expect(toolIdForPath('/film-log/roll/abc')).toBe('film-log');
    expect(toolIdForPath('/development/recipe/abc')).toBe('recipes');
  });

  it('names no tool for Home, the More directory or unknown paths', () => {
    expect(toolIdForPath('/')).toBeUndefined();
    expect(toolIdForPath('/more')).toBeUndefined();
    expect(toolIdForPath('/more/edit')).toBeUndefined();
    expect(toolIdForPath('/nope')).toBeUndefined();
  });
});
