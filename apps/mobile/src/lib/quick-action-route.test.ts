import type { Action } from 'expo-quick-actions';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createQuickActionRouter } from './quick-action-route';

const navigate = vi.fn();
const routeQuickAction = createQuickActionRouter(navigate);

const action = (params?: Action['params']): Action => ({
  id: 'a',
  title: 'A',
  params,
});

beforeEach(() => {
  vi.useFakeTimers();
  navigate.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('routeQuickAction', () => {
  it('resolves a legacy href and navigates with the anchor, then claims the action', () => {
    expect(routeQuickAction(action({ href: '/more/meter' }))).toBe(true);
    // Deferred a tick, like the hook's own navigation.
    expect(navigate).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/shoot/meter', {
      withAnchor: true,
    });
  });

  it('resolves every shipped href', () => {
    for (const [href, to] of [
      ['/more/border', '/print/border'],
      ['/more/exposure', '/print/exposure'],
      ['/more/reciprocity', '/shoot/reciprocity'],
    ]) {
      routeQuickAction(action({ href }));
      vi.runAllTimers();
      expect(navigate).toHaveBeenLastCalledWith(to, { withAnchor: true });
    }
  });

  it('passes a canonical or unknown href through unchanged', () => {
    routeQuickAction(action({ href: '/print/mat' }));
    routeQuickAction(action({ href: '/nowhere' }));
    vi.runAllTimers();
    expect(navigate.mock.calls).toEqual([
      ['/print/mat', { withAnchor: true }],
      ['/nowhere', { withAnchor: true }],
    ]);
  });

  it('leaves an action without a string href to the hook', () => {
    expect(routeQuickAction(action())).toBe(false);
    expect(routeQuickAction(action({ href: 5 }))).toBe(false);
    expect(routeQuickAction(action({ other: 'x' }))).toBe(false);
    vi.runAllTimers();
    expect(navigate).not.toHaveBeenCalled();
  });
});
