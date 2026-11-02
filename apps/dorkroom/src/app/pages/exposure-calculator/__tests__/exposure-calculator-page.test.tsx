import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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
