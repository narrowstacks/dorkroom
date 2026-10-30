import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BORDER_CALCULATOR_STORAGE_KEY } from '../../constants/storage-keys';
import { removeSupersededStorageKeys } from '../../services/local-storage';

const OLD_KEY = 'borderCalculatorState_v1';

describe('removeSupersededStorageKeys', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('removes the superseded key once the current key holds data', () => {
    window.localStorage.setItem(OLD_KEY, '{"old":true}');
    window.localStorage.setItem(BORDER_CALCULATOR_STORAGE_KEY, '{"new":true}');

    removeSupersededStorageKeys(BORDER_CALCULATOR_STORAGE_KEY);

    expect(window.localStorage.getItem(OLD_KEY)).toBeNull();
    expect(window.localStorage.getItem(BORDER_CALCULATOR_STORAGE_KEY)).toBe(
      '{"new":true}'
    );
  });

  it('keeps the old key when the current key is empty (unmigrated data)', () => {
    window.localStorage.setItem(OLD_KEY, '{"old":true}');

    removeSupersededStorageKeys(BORDER_CALCULATOR_STORAGE_KEY);

    expect(window.localStorage.getItem(OLD_KEY)).toBe('{"old":true}');
  });

  it('does nothing for a key with no superseded entries', () => {
    window.localStorage.setItem('unrelated', 'x');
    removeSupersededStorageKeys('unrelated');
    expect(window.localStorage.getItem('unrelated')).toBe('x');
  });

  it('does not throw when storage access fails', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(() =>
      removeSupersededStorageKeys(BORDER_CALCULATOR_STORAGE_KEY)
    ).not.toThrow();
  });
});
