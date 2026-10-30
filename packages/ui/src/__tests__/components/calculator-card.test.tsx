import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CalculatorCard } from '../../components/calculator/calculator-card';

describe('CalculatorCard', () => {
  it('renders children content', () => {
    render(
      <CalculatorCard>
        <div>Card content</div>
      </CalculatorCard>
    );

    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('renders with title', () => {
    render(
      <CalculatorCard title="Test Calculator">
        <div>Content</div>
      </CalculatorCard>
    );

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Test Calculator'
    );
  });

  it('renders with description', () => {
    render(
      <CalculatorCard description="This is a test description">
        <div>Content</div>
      </CalculatorCard>
    );

    expect(screen.getByText('This is a test description')).toBeInTheDocument();
  });

  it('renders with ReactNode description', () => {
    const description = (
      <div>
        <span>Complex</span> <strong>description</strong>
      </div>
    );

    render(
      <CalculatorCard description={description}>
        <div>Content</div>
      </CalculatorCard>
    );

    expect(screen.getByText('Complex')).toBeInTheDocument();
    expect(screen.getByText('description')).toBeInTheDocument();
  });

  it('renders with actions', () => {
    const actions = <button type="button">Action Button</button>;

    render(
      <CalculatorCard actions={actions}>
        <div>Content</div>
      </CalculatorCard>
    );

    expect(screen.getByText('Action Button')).toBeInTheDocument();
  });

  describe('padding', () => {
    it('applies normal padding by default', () => {
      const { container } = render(
        <CalculatorCard>
          <div>Content</div>
        </CalculatorCard>
      );

      const section = container.querySelector('section');
      expect(section).toHaveClass('p-4', 'sm:p-5');
    });

    it('applies compact padding when specified', () => {
      const { container } = render(
        <CalculatorCard padding="compact">
          <div>Content</div>
        </CalculatorCard>
      );

      const section = container.querySelector('section');
      expect(section).toHaveClass('p-3.5', 'sm:p-4');
    });
  });

  describe('accent variants', () => {
    it('does not render accent overlay by default', () => {
      render(
        <CalculatorCard>
          <div>Content</div>
        </CalculatorCard>
      );

      const accentOverlay = document.querySelector('.absolute.inset-0');
      expect(accentOverlay).not.toBeInTheDocument();
    });

    it('renders accent overlay for emerald', () => {
      render(
        <CalculatorCard accent="emerald">
          <div>Content</div>
        </CalculatorCard>
      );

      const accentOverlay = document.querySelector('.absolute.inset-0');
      expect(accentOverlay).toBeInTheDocument();
      expect(accentOverlay).toHaveClass('pointer-events-none', 'opacity-90');
    });

    it('renders accent overlay for sky', () => {
      render(
        <CalculatorCard accent="sky">
          <div>Content</div>
        </CalculatorCard>
      );

      const accentOverlay = document.querySelector('.absolute.inset-0');
      expect(accentOverlay).toBeInTheDocument();
    });

    it('renders accent overlay for violet', () => {
      render(
        <CalculatorCard accent="violet">
          <div>Content</div>
        </CalculatorCard>
      );

      const accentOverlay = document.querySelector('.absolute.inset-0');
      expect(accentOverlay).toBeInTheDocument();
    });

    it('does not render accent overlay for none', () => {
      render(
        <CalculatorCard accent="none">
          <div>Content</div>
        </CalculatorCard>
      );

      const accentOverlay = document.querySelector('.absolute.inset-0');
      expect(accentOverlay).not.toBeInTheDocument();
    });
  });

  describe('header layout', () => {
    it('does not render header when no title, description, or actions', () => {
      render(
        <CalculatorCard>
          <div>Content</div>
        </CalculatorCard>
      );

      const header = document.querySelector('header');
      expect(header).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('renders as accessible region landmark', () => {
      render(
        <CalculatorCard>
          <div>Content</div>
        </CalculatorCard>
      );

      expect(
        screen.getByRole('region', { name: /calculator card/i })
      ).toBeInTheDocument();
    });

    it('uses title as region name when provided', () => {
      render(
        <CalculatorCard title="Border Calculator">
          <div>Content</div>
        </CalculatorCard>
      );

      expect(
        screen.getByRole('region', { name: /border calculator/i })
      ).toBeInTheDocument();
    });
  });
});
