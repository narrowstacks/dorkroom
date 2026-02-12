import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomBadge, isOfficialTag, OfficialBadge } from '../official-badge';

// Mock createPortal to render inline
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  };
});

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Check: (props: React.SVGProps<SVGSVGElement>) => (
    <span data-testid="check-icon" {...props} />
  ),
  Beaker: (props: React.SVGProps<SVGSVGElement>) => (
    <span data-testid="beaker-icon" {...props} />
  ),
}));

// Mock utility functions
vi.mock('../../../lib/color', () => ({
  colorMixOr: () => 'mocked-color',
}));

vi.mock('../../../lib/tag-colors', () => ({
  getTagThemeStyle: () => ({
    backgroundColor: '#000000',
    borderColor: '#111111',
    color: '#ffffff',
  }),
}));

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
    it('renders badge with correct structure', () => {
      render(<OfficialBadge tag="official-kodak" />);

      expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    });

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

    it('applies theme styles', () => {
      const { container } = render(<OfficialBadge tag="official-kodak" />);

      const styledElement = container.querySelector('[aria-label]');
      expect(styledElement).toHaveStyle({
        backgroundColor: '#000000',
        borderColor: '#111111',
        color: '#ffffff',
      });
    });

    it('renders Check icon', () => {
      render(<OfficialBadge tag="official-kodak" />);

      expect(screen.getByTestId('check-icon')).toBeInTheDocument();
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

    it('tooltip has correct positioning attributes', () => {
      const { container } = render(<OfficialBadge tag="official-kodak" />);

      const badge = container.querySelector('span');
      expect(badge).toBeTruthy();

      fireEvent.mouseEnter(badge!);

      const tooltip = screen.getByRole('tooltip');
      const style = window.getComputedStyle(tooltip);
      expect(style.top).toBeTruthy();
      expect(style.left).toBeTruthy();
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
    it('has proper aria-label', () => {
      render(<OfficialBadge tag="official-kodak" />);

      expect(
        screen.getByLabelText('Official Kodak Recipe')
      ).toBeInTheDocument();
    });

    it('tooltip has role="tooltip"', () => {
      const { container } = render(<OfficialBadge tag="official-kodak" />);

      const badge = container.querySelector('span');
      fireEvent.mouseEnter(badge!);

      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

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
    it('renders badge with correct structure', () => {
      render(<CustomBadge />);

      expect(screen.getByTestId('beaker-icon')).toBeInTheDocument();
    });

    it('renders with correct aria-label', () => {
      render(<CustomBadge />);

      const badge = screen.getByLabelText('Custom Recipe');
      expect(badge).toBeInTheDocument();
    });

    it('renders Beaker icon', () => {
      render(<CustomBadge />);

      expect(screen.getByTestId('beaker-icon')).toBeInTheDocument();
    });

    it('applies custom styling', () => {
      const { container } = render(<CustomBadge />);

      const styledElement = container.querySelector('[aria-label]');
      expect(styledElement).toHaveStyle({
        backgroundColor: 'mocked-color',
        borderColor: 'mocked-color',
        color: 'mocked-color',
      });
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

    it('tooltip contains correct text', () => {
      const { container } = render(<CustomBadge />);

      const badge = container.querySelector('span');
      expect(badge).toBeTruthy();

      fireEvent.mouseEnter(badge!);

      expect(screen.getByText('Custom Recipe')).toBeInTheDocument();
    });

    it('tooltip has correct positioning attributes', () => {
      const { container } = render(<CustomBadge />);

      const badge = container.querySelector('span');
      expect(badge).toBeTruthy();

      fireEvent.mouseEnter(badge!);

      const tooltip = screen.getByRole('tooltip');
      const style = window.getComputedStyle(tooltip);
      expect(style.top).toBeTruthy();
      expect(style.left).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('has proper aria-label', () => {
      render(<CustomBadge />);

      expect(screen.getByLabelText('Custom Recipe')).toBeInTheDocument();
    });

    it('tooltip has role="tooltip"', () => {
      const { container } = render(<CustomBadge />);

      const badge = container.querySelector('span');
      fireEvent.mouseEnter(badge!);

      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

    it('tooltip is non-interactive', () => {
      const { container } = render(<CustomBadge />);

      const badge = container.querySelector('span');
      fireEvent.mouseEnter(badge!);

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveClass('pointer-events-none');
    });
  });

  describe('default props', () => {
    it('defaults showTooltip to true', () => {
      const { container } = render(<CustomBadge />);

      const badge = container.querySelector('span');
      expect(badge).toBeTruthy();

      fireEvent.mouseEnter(badge!);

      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });
  });
});

describe('OfficialBadge vs CustomBadge', () => {
  it('renders different icons', () => {
    const { container: officialContainer } = render(
      <OfficialBadge tag="official-kodak" />
    );
    const { container: customContainer } = render(<CustomBadge />);

    expect(
      officialContainer.querySelector('[data-testid="check-icon"]')
    ).toBeInTheDocument();
    expect(
      customContainer.querySelector('[data-testid="beaker-icon"]')
    ).toBeInTheDocument();
  });

  it('renders different aria-labels', () => {
    render(
      <>
        <OfficialBadge tag="official-kodak" />
        <CustomBadge />
      </>
    );

    expect(screen.getByLabelText('Official Kodak Recipe')).toBeInTheDocument();
    expect(screen.getByLabelText('Custom Recipe')).toBeInTheDocument();
  });

  it('both support showTooltip prop', () => {
    const { container: officialContainer } = render(
      <OfficialBadge tag="official-kodak" showTooltip={false} />
    );
    const { container: customContainer } = render(
      <CustomBadge showTooltip={false} />
    );

    const officialBadge = officialContainer.querySelector('span');
    const customBadge = customContainer.querySelector('span');

    fireEvent.mouseEnter(officialBadge!);
    fireEvent.mouseEnter(customBadge!);

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});

describe('Tooltip positioning', () => {
  beforeEach(() => {
    // Mock getBoundingClientRect for positioning tests
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      top: 100,
      left: 200,
      width: 18,
      height: 18,
      right: 218,
      bottom: 118,
      x: 200,
      y: 100,
      toJSON: () => ({}),
    }));
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
