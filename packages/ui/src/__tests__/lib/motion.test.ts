import { afterEach, describe, expect, it } from 'vitest';
import {
  isLegacyBrowser,
  LEGACY_BROWSER_ATTR,
  scrollBehavior,
} from '../../lib/motion';

describe('legacy browser motion check', () => {
  afterEach(() => {
    document.documentElement.removeAttribute(LEGACY_BROWSER_ATTR);
  });

  it('allows motion in a modern browser', () => {
    expect(isLegacyBrowser()).toBe(false);
    expect(scrollBehavior()).toBe('smooth');
  });

  it('turns motion off when the loader marked the document', () => {
    document.documentElement.setAttribute(LEGACY_BROWSER_ATTR, '');
    expect(isLegacyBrowser()).toBe(true);
    expect(scrollBehavior()).toBe('auto');
  });
});
