import { afterEach, describe, expect, it } from 'vitest';
import { resolveLegacyPath } from './deep-link';
import {
  clearPendingLink,
  decideHandoff,
  getPendingLink,
  handOffWarmLink,
  PENDING_LINK_TTL_MS,
  phaseOfPath,
  setCurrentPath,
  setPendingLink,
  splitPhaseLink,
  subscribePendingLink,
  takePendingLink,
} from './link-handoff';

afterEach(() => {
  clearPendingLink();
  setCurrentPath(null);
});

describe('splitPhaseLink', () => {
  it('splits a tool, a section and a nested path into hub and target', () => {
    expect(splitPhaseLink('/shoot/film-log')).toEqual({
      hub: '/shoot',
      target: '/shoot/film-log',
    });
    expect(splitPhaseLink('/develop/recipes/timer')).toEqual({
      hub: '/develop',
      target: '/develop/recipes/timer',
    });
    expect(splitPhaseLink('/print/exposure')).toEqual({
      hub: '/print',
      target: '/print/exposure',
    });
  });

  it('keeps the query and hash on the target', () => {
    expect(splitPhaseLink('/develop/recipes/abc?x=1#h')?.target).toBe(
      '/develop/recipes/abc?x=1#h'
    );
  });

  it('needs no second step for a hub, Home or a path outside a phase', () => {
    for (const path of [
      '/shoot',
      '/shoot/',
      '/',
      '/nowhere/x',
      '',
      '/shoot?a=1',
      '/settings',
      '/settings?x=1',
    ]) {
      expect(splitPhaseLink(path)).toBeUndefined();
    }
  });
});

describe('pending link', () => {
  const link = { hub: '/shoot', target: '/shoot/meter' };

  it('is handed over once', () => {
    setPendingLink(link);
    expect(getPendingLink()).toEqual(link);
    expect(takePendingLink()).toBe('/shoot/meter');
    expect(takePendingLink()).toBeNull();
    expect(getPendingLink()).toBeNull();
  });

  it('keeps only the newest link', () => {
    setPendingLink(link);
    setPendingLink({ hub: '/print', target: '/print/mat' });
    expect(takePendingLink()).toBe('/print/mat');
  });

  it('drops a link that waited too long', () => {
    setPendingLink(link, 1000);
    expect(takePendingLink(1000 + PENDING_LINK_TTL_MS + 1)).toBeNull();
    setPendingLink(link, 1000);
    expect(takePendingLink(1000 + PENDING_LINK_TTL_MS)).toBe('/shoot/meter');
  });

  it('can be cleared, and tells subscribers about each change', () => {
    let calls = 0;
    const unsubscribe = subscribePendingLink(() => {
      calls += 1;
    });
    setPendingLink(link);
    clearPendingLink();
    clearPendingLink();
    expect(calls).toBe(2);
    unsubscribe();
    setPendingLink(link);
    expect(calls).toBe(2);
  });
});

describe('phaseOfPath', () => {
  it('names the phase of a route, and none for Home, Search or unknown', () => {
    expect(phaseOfPath('/shoot/film-log/shot')).toBe('shoot');
    expect(phaseOfPath('/develop')).toBe('develop');
    expect(phaseOfPath('/print/mat?x=1')).toBe('print');
    // Settings is in the Search tab's stack, so it belongs to no phase.
    for (const path of ['/', '', '/nowhere', '/settings', null]) {
      expect(phaseOfPath(path)).toBeUndefined();
    }
  });
});

describe('handOffWarmLink', () => {
  it('navigates directly when the target phase is the tab on screen', () => {
    expect(handOffWarmLink('/shoot/meter', '/shoot')).toBeUndefined();
    expect(handOffWarmLink('/shoot/meter', '/shoot/film-log/shot')).toBe(
      undefined
    );
    expect(getPendingLink()).toBeNull();
  });

  it('hands off from another phase, Home, Search or an unknown route', () => {
    for (const current of ['/develop/recipes', '/', '/nowhere', null]) {
      expect(handOffWarmLink('/shoot/meter', current), String(current)).toBe(
        '/shoot'
      );
      expect(takePendingLink()).toBe('/shoot/meter');
    }
  });

  it('uses the route the tabs layout reported by default', () => {
    setCurrentPath('/print/mat');
    expect(handOffWarmLink('/print/exposure')).toBeUndefined();
    expect(handOffWarmLink('/shoot/meter')).toBe('/shoot');
    setCurrentPath(null);
    expect(handOffWarmLink('/print/exposure')).toBe('/print');
  });

  it('leaves a hub or a non-phase path to a direct navigation', () => {
    expect(handOffWarmLink('/shoot', '/develop')).toBeUndefined();
    expect(handOffWarmLink('/', '/develop')).toBeUndefined();
    expect(getPendingLink()).toBeNull();
  });

  it('opens Settings directly, from any tab', () => {
    for (const current of ['/', '/settings', '/shoot/meter', '/print', null]) {
      expect(handOffWarmLink('/settings', current), String(current)).toBe(
        undefined
      );
    }
    expect(getPendingLink()).toBeNull();
  });

  it('treats Home and Settings alike as "not a phase" for a phase link', () => {
    // Home is `/` inside the `(home)` group; Settings is `/settings` there.
    for (const current of ['/', '/settings']) {
      expect(handOffWarmLink('/develop/recipes', current), current).toBe(
        '/develop'
      );
      expect(takePendingLink(), current).toBe('/develop/recipes');
    }
  });

  it('hands off a phase link that arrives while Settings is open', () => {
    setCurrentPath('/settings');
    expect(handOffWarmLink('/shoot/meter')).toBe('/shoot');
    expect(getPendingLink()).toEqual({
      hub: '/shoot',
      target: '/shoot/meter',
    });
  });

  it('splits every quick action href the same way', () => {
    for (const [href, hub] of [
      ['/more/meter', '/shoot'],
      ['/more/border', '/print'],
      ['/more/reciprocity', '/shoot'],
    ]) {
      const path = resolveLegacyPath(href);
      expect(handOffWarmLink(path, '/'), href).toBe(hub);
      expect(takePendingLink(), href).toBe(path);
      expect(handOffWarmLink(path, hub), href).toBeUndefined();
    }
  });
});

describe('decideHandoff', () => {
  const base = { hub: '/shoot', armedPath: '/develop/recipes', ageMs: 0 };

  it('waits until the hub shows, then navigates', () => {
    expect(decideHandoff({ ...base, pathname: '/develop/recipes' })).toBe(
      'wait'
    );
    expect(decideHandoff({ ...base, pathname: '/shoot' })).toBe('navigate');
  });

  it('clears when the user lands somewhere else first', () => {
    expect(decideHandoff({ ...base, pathname: '/print/mat' })).toBe('clear');
  });

  it('clears an expired link even at its hub', () => {
    const ageMs = PENDING_LINK_TTL_MS + 1;
    expect(decideHandoff({ ...base, pathname: '/shoot', ageMs })).toBe('clear');
    expect(
      decideHandoff({ ...base, pathname: '/develop/recipes', ageMs })
    ).toBe('clear');
  });

  it('opens a link handed off from Settings once the hub shows', () => {
    const settings = { hub: '/develop', armedPath: '/settings', ageMs: 0 };
    expect(decideHandoff({ ...settings, pathname: '/settings' })).toBe('wait');
    expect(decideHandoff({ ...settings, pathname: '/develop' })).toBe(
      'navigate'
    );
  });

  it('keeps a newer link armed from the route it arrived on', () => {
    // Link A (to /print/mat) reached /print. Link B (to /shoot/meter) arrives
    // there, so it is armed from /print and waits instead of being cleared.
    expect(
      decideHandoff({
        hub: '/shoot',
        armedPath: '/print',
        pathname: '/print',
        ageMs: 0,
      })
    ).toBe('wait');
    expect(
      decideHandoff({
        hub: '/shoot',
        armedPath: '/print',
        pathname: '/shoot',
        ageMs: 10,
      })
    ).toBe('navigate');
  });
});
