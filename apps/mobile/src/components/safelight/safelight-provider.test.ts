import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { getSafelight, setSafelight, storage } from '@/lib/safelight-store';
import { SafelightProvider, useSafelight } from './safelight-provider';

beforeEach(() => {
  storage.clearAll();
});

/** Renders `children` once under the provider, capturing what the hook sees. */
function capture() {
  const seen: ReturnType<typeof useSafelight>[] = [];
  const Probe = () => {
    seen.push(useSafelight());
    return null;
  };
  const tree = (children: ReactNode) =>
    renderToStaticMarkup(createElement(SafelightProvider, null, children));
  tree(createElement(Probe));
  return seen;
}

describe('SafelightProvider', () => {
  it('starts off', () => {
    expect(capture()[0]?.on).toBe(false);
  });

  it('is already on in the first render when the mode was left on', () => {
    setSafelight(true);
    expect(capture()[0]?.on).toBe(true);
  });

  it('toggle and setOn write the persisted store', () => {
    const [state] = capture();
    state?.toggle();
    expect(getSafelight()).toBe(true);
    expect(storage.getBoolean('safelightOn')).toBe(true);
    state?.setOn(false);
    expect(getSafelight()).toBe(false);
  });

  it('useSafelight throws a clear error outside the provider', () => {
    const Probe = () => {
      useSafelight();
      return null;
    };
    expect(() => renderToStaticMarkup(createElement(Probe))).toThrow(
      'useSafelight must be used inside <SafelightProvider>'
    );
  });
});
