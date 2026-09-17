import { cleanup, render as renderBare, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ShareButton } from '../../components/share-button';
import {
  ThemeContext,
  type ThemeContextValue,
} from '../../contexts/theme-context';

function makeThemeContext(
  resolvedTheme: ThemeContextValue['resolvedTheme']
): ThemeContextValue {
  return {
    theme: resolvedTheme,
    resolvedTheme,
    setTheme: vi.fn(),
    animationsEnabled: true,
    setAnimationsEnabled: vi.fn(),
  };
}

/** Renders inside the real ThemeContext, which ShareButton requires. */
function renderWithTheme(
  ui: ReactElement,
  resolvedTheme: ThemeContextValue['resolvedTheme']
) {
  return renderBare(ui, {
    wrapper: ({ children }) => (
      <ThemeContext value={makeThemeContext(resolvedTheme)}>
        {children}
      </ThemeContext>
    ),
  });
}

describe('ShareButton', () => {
  afterEach(() => {
    cleanup();
  });

  it('applies light-theme outline classes when resolvedTheme is light', () => {
    renderWithTheme(
      <ShareButton variant="outline" onClick={() => undefined} />,
      'light'
    );

    const button = screen.getByRole('button');
    // Light (non-dark, non-darkroom) outline hovers to the secondary border
    // background, which the darkroom variant never sets.
    expect(button.className).toContain(
      'hover:bg-[var(--color-border-secondary)]'
    );
  });

  it('applies darkroom outline classes when resolvedTheme is darkroom', () => {
    renderWithTheme(
      <ShareButton variant="outline" onClick={() => undefined} />,
      'darkroom'
    );

    const button = screen.getByRole('button');
    // Darkroom outline hovers to the semantic-info background instead of the
    // light theme's secondary-border background.
    expect(button.className).toContain('hover:bg-[var(--color-semantic-info)]');
    expect(button.className).not.toContain(
      'hover:bg-[var(--color-border-secondary)]'
    );
  });
});
