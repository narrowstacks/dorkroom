import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ReciprocityCalculatorPage from '../reciprocity-calculator-page';

/**
 * `@vercel/analytics`'s `track` only forwards to `window.va`, the queue the
 * real script installs in production. Stubbing that global (the same way
 * `test-setup.ts` stubs `localStorage`) lets the event travel through the
 * real `trackEvent` -> `track` call chain instead of replacing the module.
 */
describe('ReciprocityCalculatorPage preset analytics', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.va = vi.fn();
  });

  afterEach(() => {
    delete window.va;
  });

  it('tracks preset_applied with the exposure time in seconds when a preset is tapped', () => {
    render(<ReciprocityCalculatorPage />);

    fireEvent.click(screen.getByRole('button', { name: '8s' }));

    expect(window.va).toHaveBeenCalledWith('event', {
      name: 'preset_applied',
      data: { tool: 'reciprocity', preset: 8 },
      options: undefined,
    });
  });
});
