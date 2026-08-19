import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CollapsibleSection } from '../../components/ui/collapsible-section';

describe('CollapsibleSection', () => {
  const defaultProps = {
    title: 'Volume Mixer',
    subtitle: 'Ilfotec HC 1+31',
    isExpanded: false,
    onToggle: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title and subtitle', () => {
    render(<CollapsibleSection {...defaultProps} />);

    expect(screen.getByText('Volume Mixer')).toBeInTheDocument();
    expect(screen.getByText('Ilfotec HC 1+31')).toBeInTheDocument();
  });

  it('renders children only when expanded', () => {
    const { rerender } = render(
      <CollapsibleSection {...defaultProps}>
        <div>Mixer contents</div>
      </CollapsibleSection>
    );

    expect(screen.queryByText('Mixer contents')).not.toBeInTheDocument();

    rerender(
      <CollapsibleSection {...defaultProps} isExpanded>
        <div>Mixer contents</div>
      </CollapsibleSection>
    );

    expect(screen.getByText('Mixer contents')).toBeInTheDocument();
  });

  it('calls onToggle when the header button is clicked', () => {
    const onToggle = vi.fn();
    render(<CollapsibleSection {...defaultProps} onToggle={onToggle} />);

    fireEvent.click(screen.getByRole('button'));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('paints the container with class-based tokens and no inline background', () => {
    // Regression guard for the high-contrast theme: the container must use
    // the bg-border-muted / rounded-xl / border classes with NO inline
    // background-color, so the [data-theme="high-contrast"] stylesheet
    // override (theme.css) can win. An inline background would beat the
    // stylesheet and render black-on-black in high-contrast mode.
    const { container } = render(<CollapsibleSection {...defaultProps} />);

    const section = container.firstElementChild;
    expect(section).toHaveClass('bg-border-muted', 'rounded-xl', 'border');
    expect(section).not.toHaveAttribute('style');
  });
});
