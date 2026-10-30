import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CalculatorLayout } from '../../components/calculator/calculator-layout';
import { CalculatorPageHeader } from '../../components/calculator/calculator-page-header';
import { CalculatorResetButton } from '../../components/calculator/calculator-reset-button';

describe('CalculatorResetButton', () => {
  it('calls onReset when clicked', () => {
    const onReset = vi.fn();
    render(<CalculatorResetButton onReset={onReset} />);

    fireEvent.click(screen.getByRole('button', { name: 'Reset to defaults' }));

    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('blurs a focused field before resetting, so its draft commits first', () => {
    const calls: string[] = [];
    render(
      <>
        <input aria-label="Width" onBlur={() => calls.push('blur')} />
        <CalculatorResetButton onReset={() => calls.push('reset')} />
      </>
    );
    const input = screen.getByRole('textbox', { name: 'Width' });
    input.focus();

    fireEvent.click(screen.getByRole('button', { name: 'Reset to defaults' }));

    expect(calls).toEqual(['blur', 'reset']);
    expect(input).not.toHaveFocus();
  });

  it('keeps keyboard focus on the button itself', () => {
    render(<CalculatorResetButton onReset={() => undefined} />);
    const button = screen.getByRole('button', { name: 'Reset to defaults' });
    button.focus();

    fireEvent.click(button);

    expect(button).toHaveFocus();
  });

  it('is a plain button, never a form submit', () => {
    render(<CalculatorResetButton onReset={() => undefined} />);

    expect(
      screen.getByRole('button', { name: 'Reset to defaults' })
    ).toHaveAttribute('type', 'button');
  });
});

describe('reset slot', () => {
  it('CalculatorPageHeader renders the control only when onReset is passed', () => {
    const { rerender } = render(
      <CalculatorPageHeader title="Tool" description="About" />
    );
    expect(
      screen.queryByRole('button', { name: 'Reset to defaults' })
    ).not.toBeInTheDocument();

    const onReset = vi.fn();
    rerender(
      <CalculatorPageHeader
        title="Tool"
        description="About"
        onReset={onReset}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reset to defaults' }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('CalculatorLayout forwards onReset to its header', () => {
    const onReset = vi.fn();
    render(
      <CalculatorLayout title="Tool" description="About" onReset={onReset}>
        <div>inputs</div>
      </CalculatorLayout>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reset to defaults' }));

    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
