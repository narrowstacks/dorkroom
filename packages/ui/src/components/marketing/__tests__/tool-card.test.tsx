import { render, screen } from '@testing-library/react';
import { Calculator } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { ToolCard } from '../tool-card';

describe('ToolCard', () => {
  const defaultProps = {
    title: 'Test Tool',
    description: 'A description of the tool',
    category: 'Category',
    icon: Calculator,
    color: 'text-blue-500',
    bg: 'bg-blue-100',
    border: 'border-blue-200',
    href: '/tool',
  };

  it('renders correctly', () => {
    render(<ToolCard {...defaultProps} />);

    expect(screen.getByText('Test Tool')).toBeInTheDocument();
    expect(screen.getByText('A description of the tool')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
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
});
