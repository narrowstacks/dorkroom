import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CameraExposureCalculatorPage from '../camera-exposure-calculator-page';

/**
 * Regression coverage for #337: an EV preset that solves to a value outside
 * the standard dial range used to snap silently to the endpoint (30s,
 * f/64, …) with no indication, landing the EV several stops off. The page
 * now shows an inline notice, and the hint inside it must point the right
 * way — the fix for a preset that needs *more* range from a value is never
 * the same as the fix for one that needs *less*.
 */
describe('CameraExposureCalculatorPage preset out-of-range notice', () => {
  it('shows a direction-correct hint for a preset that needs a smaller aperture than the dial supports', () => {
    render(<CameraExposureCalculatorPage />);

    // Issue #337's second repro: 1/30s, ISO 12800, solving for aperture,
    // then "Snow / Sand" (EV 16) — needs roughly f/529, far past f/64.
    fireEvent.click(screen.getAllByLabelText('Expand presets')[0]);
    fireEvent.change(
      screen.getAllByRole('combobox', { name: 'Value to solve for' })[0],
      { target: { value: 'aperture' } }
    );
    // "ISO" (this card) and "Compare ISO" (the comparison card below) share
    // the same visible <label> text, so match by accessible name (which
    // respects aria-label) rather than getByLabelText's looser label-text
    // matching, to avoid an ambiguous "multiple elements" match.
    fireEvent.change(screen.getByRole('combobox', { name: 'Shutter speed' }), {
      target: { value: '1/30' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'ISO' }), {
      target: { value: 'ISO 12800' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: /Snow \/ Sand/ })[0]);

    const message = screen
      .getAllByRole('status')
      .map((node) => node.textContent ?? '')
      .join(' ');

    expect(message).toContain('Snow / Sand (EV 16)');
    expect(message).toContain('smaller than the f/64 limit');
    // The scene is too bright to stop down further: never suggest opening
    // the aperture more, which is backwards and would make it worse.
    expect(message).not.toContain('open the aperture');
    expect(message).toContain('faster shutter speed');
  });

  it('shows no notice for an in-range preset', () => {
    render(<CameraExposureCalculatorPage />);

    fireEvent.click(screen.getAllByLabelText('Expand presets')[0]);
    // Sunny 16 (EV 15) at the defaults (f/8, ISO 100, solving for shutter
    // speed) needs a shutter speed well within the standard dial range.
    fireEvent.click(screen.getAllByRole('button', { name: /Sunny 16/ })[0]);

    const message = screen
      .getAllByRole('status')
      .map((node) => node.textContent ?? '')
      .join(' ');

    expect(message.trim()).toBe('');
  });
});
