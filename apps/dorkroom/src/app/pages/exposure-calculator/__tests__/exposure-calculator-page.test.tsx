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
