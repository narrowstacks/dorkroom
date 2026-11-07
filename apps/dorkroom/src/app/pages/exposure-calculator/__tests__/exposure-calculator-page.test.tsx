import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ExposureCalculatorPage from '../exposure-calculator-page';

/**
 * `@vercel/analytics`'s `track` only forwards to `window.va`, the queue the
 * real script installs in production. Stubbing that global lets the event
 * travel through the real `trackEvent` -> `track` call chain instead of
 * replacing the module.
 */
describe('ExposureCalculatorPage preset analytics', () => {
  beforeEach(() => {
    window.va = vi.fn();
  });

  afterEach(() => {
    delete window.va;
  });

  it('tracks preset_applied with the stop increment when a stop button is tapped', () => {
    render(<ExposureCalculatorPage />);

    fireEvent.click(screen.getByRole('button', { name: '+1' }));

    expect(window.va).toHaveBeenCalledWith('event', {
      name: 'preset_applied',
      data: { tool: 'stops', preset: 1 },
      options: undefined,
    });
  });
});

describe('ExposureCalculatorPage exact thirds (#551)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  // The home search links `12s +1/3` here; old shared links carry 0.33.
  it.each(['0.3333', '0.33'])(
    'opens stops=%s as an exact third: 12s gives 15.12s',
    (stops) => {
      render(<ExposureCalculatorPage linkSearch={{ time: '12', stops }} />);

      expect(screen.getAllByText('15.12s').length).toBeGreaterThan(0);
      expect(screen.getByText('×1.260')).toBeInTheDocument();
    }
  );

  it('reaches exactly 24s from 12s with three +1/3 presses', () => {
    render(<ExposureCalculatorPage linkSearch={{ time: '12', stops: '0' }} />);

    const third = screen.getByRole('button', { name: '+1/3' });
    fireEvent.click(third);
    expect(screen.getAllByText('15.12s').length).toBeGreaterThan(0);
    fireEvent.click(third);
    fireEvent.click(third);

    expect(screen.getAllByText('24s').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Stops adjustment')).toHaveValue(1);
  });
});

describe('ExposureCalculatorPage f-stop table', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const getTable = () =>
    screen.getByRole('table', { name: /seconds to dodge or burn/i });

  it('centres the rows on the entered time', () => {
    render(<ExposureCalculatorPage linkSearch={{ time: '16', stops: '0' }} />);

    const table = getTable();
    const base = within(table).getByRole('rowheader', { name: '16.0 yours' });
    const row = base.closest('tr');
    if (!row) throw new Error('base row missing');
    // -1 dodges half of 16s; +1 burns another 16s.
    expect(within(row).getByText('8.0')).toBeInTheDocument();
    expect(within(row).getAllByText('16.0')).toHaveLength(2);
    // Two header rows plus sixth-stop rows from -1 to +1.
    expect(within(table).getAllByRole('row')).toHaveLength(15);
  });

  it('switches to twelfth-stop rows', () => {
    render(<ExposureCalculatorPage linkSearch={{ time: '10', stops: '0' }} />);

    fireEvent.click(screen.getByRole('button', { name: '1/12 stop' }));

    expect(within(getTable()).getAllByRole('row')).toHaveLength(27);
  });

  it('lets keyboard users focus the sideways scroller', () => {
    render(<ExposureCalculatorPage linkSearch={{ time: '16', stops: '0' }} />);

    const scroller = screen.getByRole('region', {
      name: 'Dodge and burn times, scrolls sideways',
    });
    expect(scroller).toHaveAttribute('tabindex', '0');
  });

  it('keeps short exposures readable', () => {
    render(<ExposureCalculatorPage linkSearch={{ time: '0.1', stops: '0' }} />);

    const base = within(getTable()).getByRole('rowheader', {
      name: '0.10 yours',
    });
    const row = base.closest('tr');
    if (!row) throw new Error('base row missing');
    // +1/3 stop on 0.1s burns 0.026s, which must not read as 0.0.
    expect(within(row).getAllByText('0.03').length).toBeGreaterThan(0);
    expect(within(row).queryByText('0.0')).not.toBeInTheDocument();
  });
});
