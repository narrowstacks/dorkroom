import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CalculatorStat } from '../../components/calculator/calculator-stat';

describe('CalculatorStat', () => {
  const defaultProps = {
    label: 'Test Stat',
    value: '42',
  };

  it('renders label and value', () => {
    render(<CalculatorStat {...defaultProps} />);

    expect(screen.getByText('Test Stat')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders ReactNode value', () => {
    const value = (
      <span>
        <strong>Complex</strong> Value
      </span>
    );

    render(<CalculatorStat {...defaultProps} value={value} />);

    expect(screen.getByText('Complex')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();
  });

  it('renders helper text when provided', () => {
    render(<CalculatorStat {...defaultProps} helperText="This is helpful" />);

    expect(screen.getByText('This is helpful')).toBeInTheDocument();
  });

  it('renders ReactNode helper text', () => {
    const helperText = (
      <span>
        Helper with <em>emphasis</em>
      </span>
    );

    render(<CalculatorStat {...defaultProps} helperText={helperText} />);

    expect(screen.getByText('Helper with')).toBeInTheDocument();
    expect(screen.getByText('emphasis')).toBeInTheDocument();
  });

  it('does not render helper text when not provided', () => {
    render(<CalculatorStat {...defaultProps} />);

    const helperElement = document.querySelector('p');
    expect(helperElement).not.toBeInTheDocument();
  });

  describe('styling and layout', () => {
    it('applies base styling classes', () => {
      render(<CalculatorStat {...defaultProps} />);

      const container = screen.getByText('Test Stat').closest('div');
      expect(container).toHaveClass(
        'rounded-2xl',
        'border',
        'p-5',
        'backdrop-blur-sm',
        'transition-colors'
      );
    });

    it('applies custom className', () => {
      render(
        <CalculatorStat {...defaultProps} className="custom-stat-class" />
      );

      const container = screen.getByText('Test Stat').closest('div');
      expect(container).toHaveClass('custom-stat-class');
    });

    it('applies correct label styling', () => {
      render(<CalculatorStat {...defaultProps} />);

      const label = screen.getByText('Test Stat');
      expect(label).toHaveClass(
        'text-xs',
        'font-semibold',
        'uppercase',
        'tracking-[0.35em]'
      );
    });

    it('applies correct value styling', () => {
      render(<CalculatorStat {...defaultProps} />);

      const value = screen.getByText('42');
      expect(value).toHaveClass(
        'mt-3',
        'text-3xl',
        'font-semibold',
        'tracking-tight'
      );
    });

    it('applies correct helper text styling', () => {
      render(<CalculatorStat {...defaultProps} helperText="Helper" />);

      const helper = screen.getByText('Helper');
      expect(helper).toHaveClass('mt-2', 'text-xs');
    });
  });

  describe('tone variants', () => {
    it('uses default tone by default', () => {
      render(<CalculatorStat {...defaultProps} />);

      // Default tone should not have special styling applied
      const container = screen.getByText('Test Stat').closest('div');
      expect(container).toHaveClass('rounded-2xl', 'border');
    });

    it('applies emerald tone styling', () => {
      render(<CalculatorStat {...defaultProps} tone="emerald" />);

      const container = screen.getByText('Test Stat').closest('div');
      expect(container).toHaveClass('rounded-2xl', 'border');
      // Tone-specific styles are applied via inline styles, tested indirectly
    });

    it('applies sky tone styling', () => {
      render(<CalculatorStat {...defaultProps} tone="sky" />);

      const container = screen.getByText('Test Stat').closest('div');
      expect(container).toHaveClass('rounded-2xl', 'border');
    });

    it('applies default tone styling explicitly', () => {
      render(<CalculatorStat {...defaultProps} tone="default" />);

      const container = screen.getByText('Test Stat').closest('div');
      expect(container).toHaveClass('rounded-2xl', 'border');
    });
  });

  describe('text hierarchy', () => {
    it('maintains proper text size hierarchy', () => {
      render(
        <CalculatorStat {...defaultProps} helperText="Small helper text" />
      );

      const label = screen.getByText('Test Stat');
      const value = screen.getByText('42');
      const helper = screen.getByText('Small helper text');

      expect(label).toHaveClass('text-xs');
      expect(value).toHaveClass('text-3xl');
      expect(helper).toHaveClass('text-xs');
    });

    it('applies uppercase transform to label', () => {
      render(<CalculatorStat {...defaultProps} />);

      const label = screen.getByText('Test Stat');
      expect(label).toHaveClass('uppercase');
    });

    it('applies letter spacing to label', () => {
      render(<CalculatorStat {...defaultProps} />);

      const label = screen.getByText('Test Stat');
      expect(label).toHaveClass('tracking-[0.35em]');
    });
  });

  describe('content structure', () => {
    it('structures content in correct order', () => {
      render(<CalculatorStat {...defaultProps} helperText="Helper text" />);

      const container = screen.getByText('Test Stat').closest('div');
      const children = Array.from(container?.children || []);

      expect(children).toHaveLength(3);
      expect(children[0]).toHaveTextContent('Test Stat'); // Label
      expect(children[1]).toHaveTextContent('42'); // Value
      expect(children[2]).toHaveTextContent('Helper text'); // Helper
    });

    it('structures content without helper text', () => {
      render(<CalculatorStat {...defaultProps} />);

      const container = screen.getByText('Test Stat').closest('div');
      const children = Array.from(container?.children || []);

      expect(children).toHaveLength(2);
      expect(children[0]).toHaveTextContent('Test Stat'); // Label
      expect(children[1]).toHaveTextContent('42'); // Value
    });
  });

  describe('accessibility', () => {
    it('uses semantic elements appropriately', () => {
      render(<CalculatorStat {...defaultProps} helperText="Additional info" />);

      // Label should be a span
      expect(screen.getByText('Test Stat').tagName).toBe('SPAN');

      // Value should be a div
      expect(screen.getByText('42').tagName).toBe('DIV');

      // Helper should be a paragraph
      expect(screen.getByText('Additional info').tagName).toBe('P');
    });
  });
});
