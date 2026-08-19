import { beforeEach, describe, expect, it } from 'vitest';
import { getClientId, KEY, storage } from './client-id';

describe('client-id', () => {
  beforeEach(() => storage.clearAll());

  it('mints and persists an id on first call', () => {
    const id = getClientId();
    expect(id).toMatch(/^[0-9a-z]+-[0-9a-z]+$/);
    expect(storage.getString(KEY)).toBe(id);
  });

  it('returns the same id on subsequent calls (persisted across restarts)', () => {
    const first = getClientId();
    const second = getClientId();
    expect(second).toBe(first);
  });

  it('respects an id already persisted in storage', () => {
    storage.set(KEY, 'existing-install-id');
    expect(getClientId()).toBe('existing-install-id');
  });
});
