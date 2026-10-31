import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useBodyScrollLock } from '../../hooks/use-body-scroll-lock';

const lock = (isLocked: boolean) =>
  renderHook(({ locked }) => useBodyScrollLock(locked), {
    initialProps: { locked: isLocked },
  });

describe('useBodyScrollLock', () => {
  beforeEach(() => {
    document.body.style.overflow = 'auto';
  });

  afterEach(() => {
    cleanup();
    document.body.style.overflow = '';
  });

  it('locks while held and restores the original value on release', () => {
    const a = lock(true);
    expect(document.body.style.overflow).toBe('hidden');

    a.rerender({ locked: false });
    expect(document.body.style.overflow).toBe('auto');
  });

  it('restores the original when nested locks release inner first', () => {
    const outer = lock(true);
    const inner = lock(true);

    inner.unmount();
    expect(document.body.style.overflow).toBe('hidden');
    outer.unmount();
    expect(document.body.style.overflow).toBe('auto');
  });

  it('restores the original when nested locks release outer first', () => {
    const outer = lock(true);
    const inner = lock(true);

    outer.rerender({ locked: false });
    expect(document.body.style.overflow).toBe('hidden');
    inner.rerender({ locked: false });
    expect(document.body.style.overflow).toBe('auto');
  });

  it('keeps the original when a new lock is taken just before the last one drops', () => {
    // The drawer hand-off: the detail panel remounts (acquires) in the same
    // commit the form drawer closes (releases).
    const form = lock(true);
    const panel = lock(true);
    form.unmount();
    expect(document.body.style.overflow).toBe('hidden');

    panel.rerender({ locked: false });
    expect(document.body.style.overflow).toBe('auto');
  });

  it('writes nothing when mounted or unmounted unlocked', () => {
    document.body.style.overflow = 'scroll';
    const closed = lock(false);
    expect(document.body.style.overflow).toBe('scroll');

    closed.unmount();
    expect(document.body.style.overflow).toBe('scroll');
  });

  it('does not disturb a held lock when an unlocked user mounts', () => {
    const held = lock(true);
    lock(false);
    expect(document.body.style.overflow).toBe('hidden');

    held.unmount();
    expect(document.body.style.overflow).toBe('auto');
  });
});
