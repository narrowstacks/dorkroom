import '@testing-library/jest-dom/vitest';
import {
  MAT_CALCULATOR_STORAGE_KEY,
  type MeasurementUnit,
} from '@dorkroom/logic';
import { MeasurementProvider } from '@dorkroom/ui';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import MatCalculatorPage from '../mat-calculator-page';

/** The localStorage key `useMeasurement` reads; set it before mounting. */
const MEASUREMENT_STORAGE_KEY = 'dorkroom-measurement-unit';

function renderPage(unit: MeasurementUnit = 'imperial') {
  window.localStorage.setItem(MEASUREMENT_STORAGE_KEY, unit);
  return render(
    <MeasurementProvider>
      <MatCalculatorPage />
    </MeasurementProvider>
  );
}

/**
 * The persisted outer width once the 300ms debounce has flushed. It stays an
 * inch string whatever unit the page is displaying.
 */
async function persistedOuterWidth(): Promise<string> {
  let stored = '';
  await waitFor(() => {
    const raw = window.localStorage.getItem(MAT_CALCULATOR_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const snapshot = z
      .object({ outerW: z.string() })
      .parse(JSON.parse(raw ?? '{}'));
    stored = snapshot.outerW;
  });
  return stored;
}

describe('MatCalculatorPage', () => {
  beforeEach(() => {
    // Start each test from the built-in defaults, not persisted state.
    window.localStorage.clear();
  });

  it('renders the calculator with its default window opening', () => {
    renderPage();

    expect(
      screen.getByRole('heading', { name: 'Mat Cut Calculator' })
    ).toBeInTheDocument();
    expect(screen.getByText('Window opening')).toBeInTheDocument();

    // 16×20 board with 2¾" sides and 3"/3½" top/bottom → 10½" × 13½" window.
    expect(screen.getAllByText('10 1/2"').length).toBeGreaterThan(0);
    expect(screen.getAllByText('13 1/2"').length).toBeGreaterThan(0);
  });

  it('renders all four guide-bar cut cards', () => {
    renderPage();

    expect(screen.getByText('Cutter guide-bar settings')).toBeInTheDocument();
    expect(screen.getByText('Cut 01 · Top window edge')).toBeInTheDocument();
    expect(screen.getByText('Cut 02 · Bottom window edge')).toBeInTheDocument();
    expect(screen.getByText('Cut 03 · Left window edge')).toBeInTheDocument();
    expect(screen.getByText('Cut 04 · Right window edge')).toBeInTheDocument();

    // Cut 01 stop = outer width − right border = 16 − 2¾ = 13¼".
    expect(screen.getAllByText('13 1/4"').length).toBeGreaterThan(0);
  });

  it('recomputes the window when an input changes', () => {
    renderPage();

    // Outer width 16 → 20 widens the window by 4" (10½" → 14½").
    fireEvent.change(screen.getByTitle('Enter Width'), {
      target: { value: '20' },
    });

    expect(screen.getAllByText('14 1/2"').length).toBeGreaterThan(0);
  });

  it('warns when the borders leave no window', () => {
    renderPage();

    // A left border wider than the whole board collapses the window.
    fireEvent.change(screen.getByTitle('Enter Left'), {
      target: { value: '20' },
    });

    expect(
      screen.getByText(/Check inputs\./i, { exact: false })
    ).toBeInTheDocument();
  });

  it('surfaces the best-fit border preview for the default artwork', () => {
    renderPage();

    // 11×14 art at ¼" reveal inside a 16×20 board centers to these borders.
    expect(
      screen.getByText(/Would set borders to/i, { exact: false })
    ).toBeInTheDocument();
  });

  describe('imperial preference', () => {
    it('labels the fields in inches and steps by 1/16"', () => {
      renderPage('imperial');

      expect(screen.getAllByText('in').length).toBeGreaterThan(0);
      expect(screen.queryAllByText('cm')).toHaveLength(0);
      expect(
        screen.getByLabelText('Increase Width by 1/16 inch')
      ).toBeInTheDocument();
    });

    it('shows the stored inch strings verbatim, fractions included', () => {
      renderPage('imperial');

      expect(screen.getByTitle('Enter Width')).toHaveValue('16');
      expect(screen.getByTitle('Enter Bottom')).toHaveValue('3 1/2');
      expect(
        screen.getByTitle('Enter Reveal (overlap onto art, per side)')
      ).toHaveValue('1/4');
    });

    it('previews the best fit with inch marks', () => {
      renderPage('imperial');

      expect(
        screen.getByText(/Would set borders to 3 1\/4″ T/)
      ).toBeInTheDocument();
    });
  });

  describe('metric preference', () => {
    it('shows the defaults as centimetres, converted from the stored inches', () => {
      renderPage('metric');

      expect(screen.getAllByText('cm').length).toBeGreaterThan(0);
      expect(screen.queryAllByText('in')).toHaveLength(0);
      // 16×20in board → 40.64×50.8cm; 3½" bottom border → 8.89cm.
      expect(screen.getByTitle('Enter Width')).toHaveValue('40.64');
      expect(screen.getByTitle('Enter Height')).toHaveValue('50.8');
      expect(screen.getByTitle('Enter Bottom')).toHaveValue('8.89');
      expect(
        screen.getByLabelText('Increase Width by 1 mm')
      ).toBeInTheDocument();
    });

    it('renders the window opening and cutter settings in centimetres', () => {
      renderPage('metric');

      // 10½" × 13½" window → 26.7cm × 34.3cm at millimetre precision.
      expect(screen.getAllByText('26.7cm').length).toBeGreaterThan(0);
      expect(screen.getAllByText('34.3cm').length).toBeGreaterThan(0);
      // Cut 01 stop = 13¼" → 33.7cm.
      expect(screen.getAllByText('33.7cm').length).toBeGreaterThan(0);
      // …and no inch marks are left in the results.
      expect(screen.queryAllByText('10 1/2"')).toHaveLength(0);
    });

    it('previews the best fit in centimetres', () => {
      renderPage('metric');

      expect(
        screen.getByText(/Would set borders to 8.26cm T/)
      ).toBeInTheDocument();
    });

    it('stores the inch equivalent of a centimetre entry', async () => {
      renderPage('metric');

      // A 50cm board is 19.685in, and the window math keeps using inches.
      fireEvent.change(screen.getByTitle('Enter Width'), {
        target: { value: '50' },
      });

      // Window = 19.685in − two untouched 2¾" borders = 14.185in = 36.0cm.
      expect(screen.getAllByText('36.0cm').length).toBeGreaterThan(0);
      await expect(persistedOuterWidth()).resolves.toBe('19.685');
    });

    it('keeps the typed text while focused and resyncs on blur', async () => {
      renderPage('metric');
      const width = screen.getByTitle('Enter Width');

      fireEvent.focus(width);
      // A half-typed decimal must survive the round trip through inches.
      fireEvent.change(width, { target: { value: '30.' } });
      expect(width).toHaveValue('30.');

      fireEvent.blur(width);
      expect(width).toHaveValue('30');
      await expect(persistedOuterWidth()).resolves.toBe('11.811');
    });

    it('labels the board presets in centimetres', () => {
      renderPage('metric');

      expect(
        screen.getByRole('button', { name: '40.6×50.8cm' })
      ).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '16×20' })).toBeNull();
    });

    it('applies a board preset in inches and displays it in centimetres', async () => {
      renderPage('metric');

      fireEvent.click(screen.getByRole('button', { name: '27.9×35.6cm' }));

      expect(screen.getByTitle('Enter Width')).toHaveValue('27.94');
      expect(screen.getByTitle('Enter Height')).toHaveValue('35.56');
      await expect(persistedOuterWidth()).resolves.toBe('11');
    });

    it('reads state persisted in inches without rewriting it', async () => {
      // State saved by an imperial session, fractions and all.
      window.localStorage.setItem(
        MAT_CALCULATOR_STORAGE_KEY,
        JSON.stringify({ outerW: '16 1/2', outerH: '20' })
      );

      renderPage('metric');

      expect(screen.getByTitle('Enter Width')).toHaveValue('41.91');
      // Re-persisted untouched: still the inch string, not centimetres.
      await expect(persistedOuterWidth()).resolves.toBe('16 1/2');
    });
  });
});
