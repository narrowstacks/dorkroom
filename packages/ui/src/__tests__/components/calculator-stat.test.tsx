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

  describe('tone variants', () => {
    const statContainer = () => {
      const container = screen.getByText('Test Stat').closest('div');
      if (!container) throw new Error('stat container not found');
      return container;
    };

    it('uses no accent gradient for the default tone', () => {
      render(<CalculatorStat {...defaultProps} />);

      expect(statContainer().style.background).not.toContain('gradient');
    });

    it('uses no accent gradient when tone="default" is explicit', () => {
      render(<CalculatorStat {...defaultProps} tone="default" />);

      expect(statContainer().style.background).not.toContain('gradient');
    });

    it.each(['emerald', 'sky', 'violet'] as const)(
      'uses the %s accent gradient',
      (tone) => {
        render(<CalculatorStat {...defaultProps} tone={tone} />);

        expect(statContainer().style.background).toBe(
          `var(--accent-${tone}-gradient)`
        );
      }
    );
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
});
