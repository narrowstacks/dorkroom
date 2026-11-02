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

  it('keeps animations off in a legacy browser, even over a stored opt-in', () => {
    document.documentElement.setAttribute('data-lc-legacy', '');
    try {
      stubReducedMotion(false);
      localStorage.setItem(ANIMATIONS_KEY, 'true');
      const { result } = renderTheme();

      expect(result.current.animationsEnabled).toBe(false);
      expect(document.documentElement).toHaveAttribute(
        'data-animations-disabled',
        'true'
      );
      expect(localStorage.getItem(ANIMATIONS_KEY)).toBe('true');
    } finally {
      document.documentElement.removeAttribute('data-lc-legacy');
    }
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

const KINDLE_SCRIBE_UA =
  'Mozilla/5.0 (Linux; Android 9; Kindle Build/1.0) AppleWebKit/537.36 (KHTML, like Gecko) Silk/80.4.14 like Chrome/80.0.3987.119 Safari/537.36';
const KINDLE_FIRE_UA =
  'Mozilla/5.0 (Linux; U; Android 2.3.4; en-us; Kindle Fire Build/GINGERBREAD) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1';

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

const FIRE_TABLET_SILK_UA =
  'Mozilla/5.0 (Linux; Android 9; KFMAWI) AppleWebKit/537.36 (KHTML, like Gecko) Silk/118.5.1 like Chrome/118.0.0.0 Safari/537.36';

function stubUserAgent(userAgent: string) {
  vi.stubGlobal('navigator', { ...navigator, userAgent });
}

describe('ThemeProvider e-ink lock', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('locks to high contrast on a monochrome screen, saving nothing', () => {
    stubMonochrome(true);
    const { result } = renderTheme();

    expect(result.current.themeLocked).toBe(true);
    expect(result.current.theme).toBe('high-contrast');
    expect(result.current.resolvedTheme).toBe('high-contrast');
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
    expect(document.documentElement).toHaveAttribute(
      'data-theme',
      'high-contrast'
    );
  });

  it('locks in a legacy-path Kindle browser with a color screen', () => {
    stubMonochrome(false);
    stubUserAgent(KINDLE_SCRIBE_UA);
    const { result } = renderTheme();

    expect(result.current.themeLocked).toBe(true);
    expect(result.current.resolvedTheme).toBe('high-contrast');
  });

  it('overrides a stored theme without deleting it', () => {
    stubMonochrome(true);
    localStorage.setItem(THEME_KEY, 'dark');
    const { result } = renderTheme();

    expect(result.current.theme).toBe('high-contrast');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
  });

  it('ignores setTheme', () => {
    stubMonochrome(true);
    localStorage.setItem(THEME_KEY, 'dark');
    const { result } = renderTheme();

    act(() => result.current.setTheme('light'));

    expect(result.current.theme).toBe('high-contrast');
    expect(result.current.resolvedTheme).toBe('high-contrast');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
  });

  it('leaves a Kindle UA alone on a browser with cascade layers', () => {
    stubMonochrome(false);
    stubUserAgent(KINDLE_SCRIBE_UA);
    vi.stubGlobal('CSSLayerBlockRule', function CSSLayerBlockRule() {});
    const { result } = renderTheme();

    expect(result.current.themeLocked).toBe(false);
  });

  it('leaves a color Kindle Fire selectable', () => {
    stubMonochrome(false);
    stubUserAgent(KINDLE_FIRE_UA);
    const { result } = renderTheme();

    expect(result.current.themeLocked).toBe(false);
    expect(result.current.resolvedTheme).toBe('light');
  });

  it('leaves a Fire tablet running Silk selectable', () => {
    stubMonochrome(false);
    stubUserAgent(FIRE_TABLET_SILK_UA);
    const { result } = renderTheme();

    expect(result.current.themeLocked).toBe(false);
    expect(result.current.resolvedTheme).toBe('light');
  });

  it('follows the stored choice on a color screen', () => {
    stubMonochrome(false);
    localStorage.setItem(THEME_KEY, 'dark');
    const { result } = renderTheme();

    act(() => result.current.setTheme('darkroom'));

    expect(result.current.themeLocked).toBe(false);
    expect(result.current.theme).toBe('darkroom');
    expect(localStorage.getItem(THEME_KEY)).toBe('darkroom');
  });

  it('follows the color scheme on a color screen', () => {
    stubMonochrome(false);
    const { result } = renderTheme();

    expect(result.current.theme).toBe('system');
    expect(result.current.resolvedTheme).toBe('light');
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
