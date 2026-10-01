import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * happy-dom drops any `color-mix()` declaration, so the badge's colors are only
 * readable back on `colorMixOr`'s `var(...)` fallback branch. Report no support
 * before `lib/color` is first imported to take it.
 */
Object.defineProperty(globalThis, 'CSS', {
  value: { supports: () => false },
  writable: true,
});

const { CustomBadge, isOfficialTag, OfficialBadge } = await import(
  '../official-badge'
);
const { colorMixOr } = await import('../../../lib/color');
const { getTagThemeStyle } = await import('../../../lib/tag-colors');

describe('isOfficialTag', () => {
  it('returns true for tags starting with official-', () => {
    expect(isOfficialTag('official-kodak')).toBe(true);
    expect(isOfficialTag('official-ilford')).toBe(true);
    expect(isOfficialTag('official-fuji')).toBe(true);
  });

  it('returns false for tags not starting with official-', () => {
    expect(isOfficialTag('kodak')).toBe(false);
    expect(isOfficialTag('custom-recipe')).toBe(false);
    expect(isOfficialTag('my-recipe')).toBe(false);
  });

  it('is case-sensitive', () => {
    expect(isOfficialTag('Official-kodak')).toBe(false);
    expect(isOfficialTag('OFFICIAL-kodak')).toBe(false);
  });

  it('handles empty string', () => {
    expect(isOfficialTag('')).toBe(false);
  });

  it('handles edge cases', () => {
    expect(isOfficialTag('official-')).toBe(true);
    expect(isOfficialTag('official')).toBe(false);
    expect(isOfficialTag('-official-kodak')).toBe(false);
  });
});

describe('OfficialBadge', () => {
  describe('rendering', () => {
    it('renders with correct aria-label based on tag', () => {
      render(<OfficialBadge tag="official-kodak" />);

      const badge = screen.getByLabelText('Official Kodak Recipe');
      expect(badge).toBeInTheDocument();
    });

    it('capitalizes manufacturer name from tag', () => {
      render(<OfficialBadge tag="official-ilford" />);

      const badge = screen.getByLabelText('Official Ilford Recipe');
      expect(badge).toBeInTheDocument();
    });

    it('handles multi-word manufacturer names', () => {
      render(<OfficialBadge tag="official-kodak-tmax" />);

      const badge = screen.getByLabelText('Official Kodak-tmax Recipe');
      expect(badge).toBeInTheDocument();
    });

    it('applies the theme style for its tag', () => {
      render(<OfficialBadge tag="official-kodak" />);

      const badge = screen.getByLabelText('Official Kodak Recipe');
      const themeStyle = getTagThemeStyle('official-kodak');
      expect(badge.style.backgroundColor).toBe(themeStyle.backgroundColor);
      expect(badge.style.borderColor).toBe(themeStyle.borderColor);
      expect(badge.style.color).toBe(themeStyle.color);
    });

    it('renders Check icon', () => {
      const { container } = render(<OfficialBadge tag="official-kodak" />);

      expect(container.querySelector('.lucide-check')).toBeInTheDocument();
    });
  });

  describe('tooltip behavior', () => {
    it('shows tooltip on mouse enter', () => {
      const { container } = render(<OfficialBadge tag="official-kodak" />);

      const badge = container.querySelector('span');
      expect(badge).toBeTruthy();

      fireEvent.mouseEnter(badge!);

      expect(screen.getByRole('tooltip')).toBeInTheDocument();
      expect(screen.getByText('Official Kodak Recipe')).toBeInTheDocument();
    });

    it('hides tooltip on mouse leave', () => {
      const { container } = render(<OfficialBadge tag="official-kodak" />);

      const badge = container.querySelector('span');
      expect(badge).toBeTruthy();

      fireEvent.mouseEnter(badge!);
      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      fireEvent.mouseLeave(badge!);
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('does not show tooltip when showTooltip is false', () => {
      const { container } = render(
        <OfficialBadge tag="official-kodak" showTooltip={false} />
      );

      const badge = container.querySelector('span');
      expect(badge).toBeTruthy();

      fireEvent.mouseEnter(badge!);

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('tooltip contains correct text for different manufacturers', () => {
      const manufacturers = [
        { tag: 'official-kodak', expected: 'Official Kodak Recipe' },
        { tag: 'official-ilford', expected: 'Official Ilford Recipe' },
        { tag: 'official-fuji', expected: 'Official Fuji Recipe' },
      ];

      manufacturers.forEach(({ tag, expected }) => {
        const { container, unmount } = render(<OfficialBadge tag={tag} />);

        const badge = container.querySelector('span');
        expect(badge).toBeTruthy();

        fireEvent.mouseEnter(badge!);
        expect(screen.getByText(expected)).toBeInTheDocument();

        unmount();
      });
    });

    it('tooltip includes visual arrow indicator', () => {
      const { container } = render(<OfficialBadge tag="official-kodak" />);

      const badge = container.querySelector('span');
      expect(badge).toBeTruthy();

      fireEvent.mouseEnter(badge!);

      const tooltip = screen.getByRole('tooltip');
      const arrow = tooltip.querySelector('.border-4');
      expect(arrow).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('tooltip is non-interactive', () => {
      const { container } = render(<OfficialBadge tag="official-kodak" />);

      const badge = container.querySelector('span');
      fireEvent.mouseEnter(badge!);

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveClass('pointer-events-none');
    });
  });

  describe('multiple instances', () => {
    it('handles multiple badges simultaneously', () => {
      render(
        <>
          <OfficialBadge tag="official-kodak" />
          <OfficialBadge tag="official-ilford" />
        </>
      );

      expect(
        screen.getByLabelText('Official Kodak Recipe')
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText('Official Ilford Recipe')
      ).toBeInTheDocument();
    });

    it('shows separate tooltips for each badge', () => {
      const { container } = render(
        <>
          <OfficialBadge tag="official-kodak" />
          <OfficialBadge tag="official-ilford" />
        </>
      );

      const badges = container.querySelectorAll('span[aria-label]');
      expect(badges).toHaveLength(2);

      fireEvent.mouseEnter(badges[0]);
      expect(screen.getByText('Official Kodak Recipe')).toBeInTheDocument();
      expect(
        screen.queryByText('Official Ilford Recipe')
      ).not.toBeInTheDocument();
    });
  });
});

describe('CustomBadge', () => {
  describe('rendering', () => {
    it('renders with correct aria-label', () => {
      render(<CustomBadge />);

      const badge = screen.getByLabelText('Custom Recipe');
      expect(badge).toBeInTheDocument();
    });

    it('renders Beaker icon', () => {
      const { container } = render(<CustomBadge />);

      expect(container.querySelector('.lucide-beaker')).toBeInTheDocument();
    });

    it('applies accent-derived styling', () => {
      render(<CustomBadge />);

      const badge = screen.getByLabelText('Custom Recipe');
      expect(badge.style.backgroundColor).toBe(
        colorMixOr(
          'var(--color-accent)',
          15,
          'transparent',
          'var(--color-border-muted)'
        )
      );
      expect(badge.style.borderColor).toBe(
        colorMixOr(
          'var(--color-accent)',
          30,
          'transparent',
          'var(--color-border-secondary)'
        )
      );
      expect(badge.style.color).toBe(
        colorMixOr(
          'var(--color-accent)',
          80,
          'var(--color-text-primary)',
          'var(--color-text-primary)'
        )
      );
    });
  });

  describe('tooltip behavior', () => {
    it('shows tooltip on mouse enter', () => {
      const { container } = render(<CustomBadge />);

      const badge = container.querySelector('span');
      expect(badge).toBeTruthy();

      fireEvent.mouseEnter(badge!);

      expect(screen.getByRole('tooltip')).toBeInTheDocument();
      expect(screen.getByText('Custom Recipe')).toBeInTheDocument();
    });

    it('hides tooltip on mouse leave', () => {
      const { container } = render(<CustomBadge />);

      const badge = container.querySelector('span');
      expect(badge).toBeTruthy();

      fireEvent.mouseEnter(badge!);
      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      fireEvent.mouseLeave(badge!);
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('does not show tooltip when showTooltip is false', () => {
      const { container } = render(<CustomBadge showTooltip={false} />);

      const badge = container.querySelector('span');
      expect(badge).toBeTruthy();

      fireEvent.mouseEnter(badge!);

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('tooltip is non-interactive', () => {
      const { container } = render(<CustomBadge />);

      const badge = container.querySelector('span');
      fireEvent.mouseEnter(badge!);

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveClass('pointer-events-none');
    });
  });
});

describe('Tooltip positioning', () => {
  beforeEach(() => {
    // Mock getBoundingClientRect for positioning tests
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      left: 200,
      width: 18,
      height: 18,
      right: 218,
      bottom: 118,
      x: 200,
      y: 100,
      toJSON: () => ({}),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('positions tooltip above badge', () => {
    const { container } = render(<OfficialBadge tag="official-kodak" />);

    const badge = container.querySelector('span');
    fireEvent.mouseEnter(badge!);

    const tooltip = screen.getByRole('tooltip');
    // Top should be badge.top - 8 = 100 - 8 = 92
    expect(tooltip).toHaveStyle({ top: '92px' });
  });

  it('centers tooltip horizontally', () => {
    const { container } = render(<OfficialBadge tag="official-kodak" />);

    const badge = container.querySelector('span');
    fireEvent.mouseEnter(badge!);

    const tooltip = screen.getByRole('tooltip');
    // Left should be badge.left + badge.width / 2 = 200 + 9 = 209
    expect(tooltip).toHaveStyle({ left: '209px' });
  });

  it('CustomBadge uses same positioning logic', () => {
    const { container } = render(<CustomBadge />);

    const badge = container.querySelector('span');
    fireEvent.mouseEnter(badge!);

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveStyle({ top: '92px', left: '209px' });
  });
});

describe('edge cases', () => {
  it('handles rapid mouse enter and leave', () => {
    const { container } = render(<OfficialBadge tag="official-kodak" />);

    const badge = container.querySelector('span');
    expect(badge).toBeTruthy();

    fireEvent.mouseEnter(badge!);
    fireEvent.mouseLeave(badge!);
    fireEvent.mouseEnter(badge!);
    fireEvent.mouseLeave(badge!);
    fireEvent.mouseEnter(badge!);

    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('handles unmount with tooltip visible', () => {
    const { container, unmount } = render(
      <OfficialBadge tag="official-kodak" />
    );

    const badge = container.querySelector('span');
    fireEvent.mouseEnter(badge!);

    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    unmount();

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('handles changing showTooltip prop', () => {
    const { container, rerender } = render(
      <OfficialBadge tag="official-kodak" showTooltip={true} />
    );

    const badge = container.querySelector('span');
    fireEvent.mouseEnter(badge!);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.mouseLeave(badge!);
    rerender(<OfficialBadge tag="official-kodak" showTooltip={false} />);

    fireEvent.mouseEnter(badge!);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
