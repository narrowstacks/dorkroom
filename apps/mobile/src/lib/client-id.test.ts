import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();
vi.mock('react-native-mmkv', () => ({
  createMMKV: () => ({
    getString(k: string) {
      return store.get(k);
    },
    set(k: string, v: string) {
      store.set(k, v);
    },
    remove(k: string) {
      store.delete(k);
    },
  }),
}));

import { getClientId } from './client-id';

describe('client-id', () => {
  beforeEach(() => store.clear());

  it('mints and persists an id on first call', () => {
    const id = getClientId();
    expect(id).toMatch(/^[0-9a-z]+-[0-9a-z]+$/);
    expect(store.get('clientId')).toBe(id);
  });

  it('returns the same id on subsequent calls (persisted across restarts)', () => {
    const first = getClientId();
    const second = getClientId();
    expect(second).toBe(first);
  });

  it('respects an id already persisted in storage', () => {
    store.set('clientId', 'existing-install-id');
    expect(getClientId()).toBe('existing-install-id');
  });
});
