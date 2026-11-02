import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTheme } from '../../contexts/theme-context';
import { ThemeProvider } from '../../contexts/theme-provider';

const ANIMATIONS_KEY = 'dorkroom-animations-enabled';

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? reduce : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
}

function renderTheme() {
  return renderHook(() => useTheme(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    ),
  });
}

describe('ThemeProvider animations default', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('disables animations by default when the OS prefers reduced motion', () => {
    stubReducedMotion(true);
    const { result } = renderTheme();

    expect(result.current.animationsEnabled).toBe(false);
    expect(document.documentElement).toHaveAttribute(
      'data-animations-disabled',
      'true'
    );
  });

  it('enables animations by default otherwise', () => {
    stubReducedMotion(false);
    const { result } = renderTheme();

    expect(result.current.animationsEnabled).toBe(true);
  });

  it('does not persist the default, only an explicit toggle', () => {
    stubReducedMotion(true);
    const { result } = renderTheme();
    expect(localStorage.getItem(ANIMATIONS_KEY)).toBeNull();

    act(() => result.current.setAnimationsEnabled(true));
    expect(localStorage.getItem(ANIMATIONS_KEY)).toBe('true');
    expect(result.current.animationsEnabled).toBe(true);
  });

  it('prefers a stored choice over the OS setting', () => {
    stubReducedMotion(true);
    localStorage.setItem(ANIMATIONS_KEY, 'true');
    const { result } = renderTheme();

    expect(result.current.animationsEnabled).toBe(true);
  });
});

const THEME_KEY = 'dorkroom-theme';

function stubMonochrome(monochrome: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query === '(monochrome)' ? monochrome : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
}

describe('ThemeProvider monochrome (e-ink) default', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('starts a first-time visitor on a monochrome screen in high contrast', () => {
    stubMonochrome(true);
    const { result } = renderTheme();

    expect(result.current.theme).toBe('high-contrast');
    expect(localStorage.getItem(THEME_KEY)).toBe('high-contrast');
    expect(document.documentElement).toHaveAttribute(
      'data-theme',
      'high-contrast'
    );
  });

  it('keeps a stored theme on a monochrome screen', () => {
    stubMonochrome(true);
    localStorage.setItem(THEME_KEY, 'light');
    const { result } = renderTheme();

    expect(result.current.theme).toBe('light');
  });

  it('defaults to system on a color screen', () => {
    stubMonochrome(false);
    const { result } = renderTheme();

    expect(result.current.theme).toBe('system');
    expect(localStorage.getItem(THEME_KEY)).toBe('system');
  });
});

describe('ThemeProvider on engines without MediaQueryList.addEventListener', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('follows the system theme through addListener', () => {
    const addListener = vi.fn();
    const removeListener = vi.fn();
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: false,
        media: query,
        addListener,
        removeListener,
      }))
    );

    const { unmount } = renderTheme();
    expect(addListener).toHaveBeenCalledTimes(1);

    unmount();
    expect(removeListener).toHaveBeenCalledWith(addListener.mock.calls[0][0]);
  });
});
