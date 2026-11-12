import { describe, expect, it } from 'vitest';
import { type AppStateSource, createFirstActive } from './first-active';

function source(initial: string) {
  let listener: ((state: string) => void) | null = null;
  const src: AppStateSource = {
    currentState: initial,
    addEventListener: (_type, fn) => {
      listener = fn;
      return {
        remove: () => {
          listener = null;
        },
      };
    },
  };
  return {
    src,
    emit: (state: string) => listener?.(state),
    listening: () => listener !== null,
  };
}

describe('first active', () => {
  it('runs at once when the app starts in front', () => {
    const s = source('active');
    const first = createFirstActive(s.src);
    let ran = 0;
    first.onFirstActive(() => (ran += 1));
    expect(ran).toBe(1);
    expect(first.hasBeenActive()).toBe(true);
    expect(s.listening()).toBe(false);
  });

  it('waits through a background launch, then runs once when it first comes to the front', () => {
    const s = source('background');
    const first = createFirstActive(s.src);
    let ran = 0;
    first.onFirstActive(() => (ran += 1));
    expect(ran).toBe(0);
    expect(first.hasBeenActive()).toBe(false);
    s.emit('inactive');
    expect(ran).toBe(0);
    s.emit('active');
    s.emit('background');
    s.emit('active');
    expect(ran).toBe(1);
    expect(first.hasBeenActive()).toBe(true);
    expect(s.listening()).toBe(false);
  });

  it('lets a waiting callback be cancelled', () => {
    const s = source('background');
    const first = createFirstActive(s.src);
    let ran = 0;
    const cancel = first.onFirstActive(() => (ran += 1));
    cancel();
    s.emit('active');
    expect(ran).toBe(0);
  });
});
