import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Greeting } from '../greeting';

describe('Greeting', () => {
  it('renders the greeting text', () => {
    render(<Greeting />);
    expect(screen.getByText('Dorkroom.art')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Greeting className="custom-class" />);
    const container = screen.getByText('Dorkroom.art').closest('div');
    expect(container).toHaveClass('custom-class');
  });
});



