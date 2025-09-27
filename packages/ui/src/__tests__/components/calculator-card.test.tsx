import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    const actions = <button>Action Button</button>;

    render(
      <CalculatorCard actions={actions}>
        <div>Content</div>
      </CalculatorCard>
    );

    expect(screen.getByText('Action Button')).toBeInTheDocument();
  });

  it('renders complete card with all props', () => {
    const actions = <button>Save</button>;

    render(
      <CalculatorCard
        title="Complete Card"
        description="This card has everything"
        actions={actions}
      >
        <div>Main content</div>
      </CalculatorCard>
    );

    expect(screen.getByText('Complete Card')).toBeInTheDocument();
    expect(screen.getByText('This card has everything')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Main content')).toBeInTheDocument();
  });

  describe('styling and layout', () => {
    it('applies base section styling', () => {
      render(
        <CalculatorCard>
          <div>Content</div>
        </CalculatorCard>
      );

      const section = screen.getByRole('region');
      expect(section).toHaveClass(
        'relative',
        'overflow-hidden',
        'rounded-3xl',
        'border'
      );
    });

    it('applies custom className', () => {
      render(
        <CalculatorCard className="custom-card-class">
          <div>Content</div>
        </CalculatorCard>
      );

      const section = screen.getByRole('region');
      expect(section).toHaveClass('custom-card-class');
    });

    it('applies normal padding by default', () => {
      render(
        <CalculatorCard>
          <div>Content</div>
        </CalculatorCard>
      );

      const section = screen.getByRole('region');
      expect(section).toHaveClass('p-6', 'sm:p-8');
    });

    it('applies compact padding when specified', () => {
      render(
        <CalculatorCard padding="compact">
          <div>Content</div>
        </CalculatorCard>
      );

      const section = screen.getByRole('region');
      expect(section).toHaveClass('p-5', 'sm:p-6');
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

    it('renders header when title is provided', () => {
      render(
        <CalculatorCard title="Test">
          <div>Content</div>
        </CalculatorCard>
      );

      const header = document.querySelector('header');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('flex', 'flex-col', 'gap-4');
    });

    it('renders header with proper responsive layout', () => {
      render(
        <CalculatorCard title="Test" actions={<button>Action</button>}>
          <div>Content</div>
        </CalculatorCard>
      );

      const header = document.querySelector('header');
      expect(header).toHaveClass(
        'sm:flex-row',
        'sm:items-start',
        'sm:justify-between'
      );
    });
  });

  describe('accessibility', () => {
    it('uses semantic section element', () => {
      render(
        <CalculatorCard>
          <div>Content</div>
        </CalculatorCard>
      );

      expect(screen.getByRole('region')).toBeInTheDocument();
    });

    it('uses proper heading hierarchy', () => {
      render(
        <CalculatorCard title="Calculator Title">
          <div>Content</div>
        </CalculatorCard>
      );

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Calculator Title');
    });
  });

  describe('content structure', () => {
    it('renders content in proper structure', () => {
      render(
        <CalculatorCard>
          <div data-testid="content-1">Content 1</div>
          <div data-testid="content-2">Content 2</div>
        </CalculatorCard>
      );

      expect(screen.getByTestId('content-1')).toBeInTheDocument();
      expect(screen.getByTestId('content-2')).toBeInTheDocument();

      // Content should be in a flex column with gap
      const contentContainer = screen.getByTestId('content-1').parentElement;
      expect(contentContainer).toHaveClass('flex', 'flex-col', 'gap-5');
    });

    it('maintains z-index layering for accent overlays', () => {
      render(
        <CalculatorCard accent="emerald">
          <div>Content</div>
        </CalculatorCard>
      );

      const contentWrapper = screen
        .getByText('Content')
        .closest('.relative.z-10');
      expect(contentWrapper).toHaveClass('relative', 'z-10');
    });
  });
});
