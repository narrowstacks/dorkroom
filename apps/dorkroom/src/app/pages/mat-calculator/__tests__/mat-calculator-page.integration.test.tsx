import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import MatCalculatorPage from '../mat-calculator-page';

describe('MatCalculatorPage', () => {
  beforeEach(() => {
    // Start each test from the built-in defaults, not persisted state.
    window.localStorage.clear();
  });

  it('renders the calculator with its default window opening', () => {
    render(<MatCalculatorPage />);

    expect(
      screen.getByRole('heading', { name: 'Mat Cut Calculator' })
    ).toBeInTheDocument();
    expect(screen.getByText('Window opening')).toBeInTheDocument();

    // 16×20 board with 2¾" sides and 3"/3½" top/bottom → 10½" × 13½" window.
    expect(screen.getAllByText('10 1/2"').length).toBeGreaterThan(0);
    expect(screen.getAllByText('13 1/2"').length).toBeGreaterThan(0);
  });

  it('renders all four guide-bar cut cards', () => {
    render(<MatCalculatorPage />);

    expect(screen.getByText('Cutter guide-bar settings')).toBeInTheDocument();
    expect(screen.getByText('Cut 01 · Top window edge')).toBeInTheDocument();
    expect(screen.getByText('Cut 02 · Bottom window edge')).toBeInTheDocument();
    expect(screen.getByText('Cut 03 · Left window edge')).toBeInTheDocument();
    expect(screen.getByText('Cut 04 · Right window edge')).toBeInTheDocument();

    // Cut 01 stop = outer width − right border = 16 − 2¾ = 13¼".
    expect(screen.getAllByText('13 1/4"').length).toBeGreaterThan(0);
  });

  it('recomputes the window when an input changes', () => {
    render(<MatCalculatorPage />);

    // Outer width 16 → 20 widens the window by 4" (10½" → 14½").
    fireEvent.change(screen.getByTitle('Enter Width'), {
      target: { value: '20' },
    });

    expect(screen.getAllByText('14 1/2"').length).toBeGreaterThan(0);
  });

  it('warns when the borders leave no window', () => {
    render(<MatCalculatorPage />);

    // A left border wider than the whole board collapses the window.
    fireEvent.change(screen.getByTitle('Enter Left'), {
      target: { value: '20' },
    });

    expect(
      screen.getByText(/Check inputs\./i, { exact: false })
    ).toBeInTheDocument();
  });

  it('surfaces the best-fit border preview for the default artwork', () => {
    render(<MatCalculatorPage />);

    // 11×14 art at ¼" reveal inside a 16×20 board centers to these borders.
    expect(
      screen.getByText(/Would set borders to/i, { exact: false })
    ).toBeInTheDocument();
  });
});
