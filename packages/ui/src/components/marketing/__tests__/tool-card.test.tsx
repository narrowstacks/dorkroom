import { render, screen } from '@testing-library/react';
import { Calculator } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { type AccentColor, ToolCard } from '../tool-card';

describe('ToolCard', () => {
  const defaultProps = {
    title: 'Test Tool',
    description: 'A description of the tool',
    category: 'Category',
    icon: Calculator,
    accent: 'blue' as AccentColor,
    href: '/tool',
  };

  it('renders correctly', () => {
    render(<ToolCard {...defaultProps} />);

    expect(screen.getByText('Test Tool')).toBeInTheDocument();
    expect(screen.getByText('A description of the tool')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
  });

  it('omits the category eyebrow when category is not provided', () => {
    const { category: _category, ...withoutCategory } = defaultProps;
    render(<ToolCard {...withoutCategory} />);

    expect(screen.getByText('Test Tool')).toBeInTheDocument();
    expect(screen.queryByText('Category')).not.toBeInTheDocument();
  });

  it('has accessible name via aria-label', () => {
    render(<ToolCard {...defaultProps} />);
    expect(screen.getByRole('link')).toHaveAttribute('aria-label', 'Test Tool');
  });

  it('renders as a different component when "as" prop is provided', () => {
    render(<ToolCard {...defaultProps} as="button" />);
    expect(
      screen.getByRole('button', { name: 'Test Tool' })
    ).toBeInTheDocument();
  });

  it('applies the accent text class for the given accent', () => {
    const { container } = render(<ToolCard {...defaultProps} accent="blue" />);
    expect(
      container.querySelector('.text-\\[color\\:var\\(--accent-blue-text\\)\\]')
    ).toBeInTheDocument();
  });

  it('applies the accent hover-border class for the given accent', () => {
    render(<ToolCard {...defaultProps} accent="rose" />);
    expect(screen.getByRole('link')).toHaveClass(
      'group-hover:border-[color:var(--accent-rose-border)]'
    );
  });
});
