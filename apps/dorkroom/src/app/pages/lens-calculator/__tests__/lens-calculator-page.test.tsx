import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LensCalculatorPage from '../lens-calculator-page';

/**
 * `@vercel/analytics`'s `track` only forwards to `window.va`, the queue the
 * real script installs in production. Stubbing that global (the same way
 * `test-setup.ts` stubs `localStorage`) lets the event travel through the
 * real `trackEvent` -> `track` call chain instead of replacing the module.
 */
describe('LensCalculatorPage preset analytics', () => {
  beforeEach(() => {
    window.va = vi.fn();
  });

  afterEach(() => {
    delete window.va;
  });

  it('tracks preset_applied with the focal length in mm when a preset is tapped', () => {
    render(<LensCalculatorPage />);

    fireEvent.click(screen.getByRole('button', { name: '85' }));

    expect(window.va).toHaveBeenCalledWith('event', {
      name: 'preset_applied',
      data: { tool: 'lenses', preset: 85 },
      options: undefined,
    });
  });
});
