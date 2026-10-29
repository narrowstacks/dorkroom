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
