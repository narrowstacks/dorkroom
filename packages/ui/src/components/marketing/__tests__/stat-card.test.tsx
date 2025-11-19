import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Heart } from 'lucide-react';
import { StatCard } from '../stat-card';

describe('StatCard', () => {
  const defaultProps = {
    label: 'Test Stat',
    value: '123',
    icon: Heart,
    iconColor: 'text-red-500',
    iconBg: 'bg-red-100',
    href: '/stats',
  };

  it('renders correctly with vertical variant (default)', () => {
    render(<StatCard {...defaultProps} />);
    
    expect(screen.getByText('Test Stat')).toBeInTheDocument();
    expect(screen.getByText('123')).toBeInTheDocument();
    const card = screen.getByRole('link', { name: 'Test Stat' });
    expect(card).toHaveClass('flex-col');
  });

  it('renders correctly with horizontal variant', () => {
    render(<StatCard {...defaultProps} variant="horizontal" />);
    
    expect(screen.getByText('Test Stat')).toBeInTheDocument();
    expect(screen.getByText('123')).toBeInTheDocument();
    const card = screen.getByRole('link', { name: 'Test Stat' });
    expect(card).toHaveClass('items-center');
  });

  it('has accessible name via aria-label', () => {
    render(<StatCard {...defaultProps} />);
    expect(screen.getByRole('link')).toHaveAttribute('aria-label', 'Test Stat');
  });

  it('renders as a different component when "as" prop is provided', () => {
    render(<StatCard {...defaultProps} as="button" />);
    expect(screen.getByRole('button', { name: 'Test Stat' })).toBeInTheDocument();
  });
});



