import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  abandonPhotoPicker,
  cancelPhotoPicker,
  confirmPhotoPicker,
  DISMISS_WATCHDOG_MS,
  gatePhotoPicker,
  photoPickerDismissed,
} from './photo-picker-gate';
import { setSafelight, storage } from './safelight-store';

beforeEach(() => {
  storage.clearAll();
  vi.useFakeTimers();
});

afterEach(() => {
  abandonPhotoPicker();
  vi.useRealTimers();
});

describe('gatePhotoPicker with the mode off', () => {
  it('opens at once and returns the result', async () => {
    const open = vi.fn(async () => 'picked');
    await expect(gatePhotoPicker(open)).resolves.toBe('picked');
    expect(open).toHaveBeenCalledTimes(1);
  });
});

describe('gatePhotoPicker with the mode on', () => {
  beforeEach(() => setSafelight(true));

  it('waits: confirming alone does not open, the dismissal does, once', async () => {
    const open = vi.fn(async () => 'picked');
    const result = gatePhotoPicker(open);
    expect(open).not.toHaveBeenCalled();
    confirmPhotoPicker();
    // The sheet is still dismissing: the picker must not be presented yet.
    expect(open).not.toHaveBeenCalled();
    photoPickerDismissed();
    await expect(result).resolves.toBe('picked');
    expect(open).toHaveBeenCalledTimes(1);
    photoPickerDismissed();
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('a double confirm opens once', async () => {
    const open = vi.fn(async () => 1);
    const result = gatePhotoPicker(open);
    confirmPhotoPicker();
    confirmPhotoPicker();
    photoPickerDismissed();
    photoPickerDismissed();
    await result;
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('cancel never opens, and settles only after the dismissal', async () => {
    const open = vi.fn(async () => 'picked');
    let settled = false;
    const result = gatePhotoPicker(open).then((v) => {
      settled = true;
      return v;
    });
    cancelPhotoPicker();
    await Promise.resolve();
    expect(settled).toBe(false);
    photoPickerDismissed();
    await expect(result).resolves.toBeUndefined();
    expect(open).not.toHaveBeenCalled();
  });

  it('ignores a dismissal that has no answer yet; a swipe or backdrop answers cancel first', async () => {
    const open = vi.fn(async () => 'picked');
    let settled = false;
    const result = gatePhotoPicker(open).then((v) => {
      settled = true;
      return v;
    });
    photoPickerDismissed();
    await Promise.resolve();
    expect(settled).toBe(false);
    cancelPhotoPicker();
    photoPickerDismissed();
    await expect(result).resolves.toBeUndefined();
    expect(open).not.toHaveBeenCalled();
  });

  it('a dismissal with nothing pending is harmless', () => {
    expect(() => photoPickerDismissed()).not.toThrow();
  });

  it('cancel after confirm does not undo the confirm', async () => {
    const open = vi.fn(async () => 'picked');
    const result = gatePhotoPicker(open);
    confirmPhotoPicker();
    cancelPhotoPicker();
    photoPickerDismissed();
    await expect(result).resolves.toBe('picked');
  });

  it('a second request cancels an unanswered first one', async () => {
    const first = vi.fn(async () => 1);
    const second = vi.fn(async () => 2);
    const a = gatePhotoPicker(first);
    const b = gatePhotoPicker(second);
    await expect(a).resolves.toBeUndefined();
    confirmPhotoPicker();
    photoPickerDismissed();
    await expect(b).resolves.toBe(2);
    expect(first).not.toHaveBeenCalled();
  });

  it('abandoning (unmount, or the mode turned off) settles as cancelled', async () => {
    const open = vi.fn(async () => 1);
    const result = gatePhotoPicker(open);
    abandonPhotoPicker();
    await expect(result).resolves.toBeUndefined();
    expect(open).not.toHaveBeenCalled();
    // And a late dismissal is harmless.
    photoPickerDismissed();
  });

  it('a missing onDismiss does not strand a confirmed request (watchdog)', async () => {
    const open = vi.fn(async () => 'picked');
    const result = gatePhotoPicker(open);
    confirmPhotoPicker();
    vi.advanceTimersByTime(DISMISS_WATCHDOG_MS);
    await expect(result).resolves.toBe('picked');
    expect(open).toHaveBeenCalledTimes(1);
    // The Modal's own dismissal arriving late must not open it a second time.
    photoPickerDismissed();
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('propagates a failure from the picker', async () => {
    const result = gatePhotoPicker(async () => {
      throw new Error('denied');
    });
    confirmPhotoPicker();
    photoPickerDismissed();
    await expect(result).rejects.toThrow('denied');
  });
});
