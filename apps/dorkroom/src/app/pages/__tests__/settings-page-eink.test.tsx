import '@testing-library/jest-dom/vitest';
import { MeasurementProvider, ThemeProvider } from '@dorkroom/ui';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SettingsPage from '../settings-page';

function stubMatchMedia(monochrome: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query === '(monochrome)' ? monochrome : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
}

function renderSettings() {
  render(
    <ThemeProvider>
      <MeasurementProvider>
        <SettingsPage />
      </MeasurementProvider>
    </ThemeProvider>
  );
}

describe('SettingsPage theme section', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('shows only a note on an e-ink screen', () => {
    stubMatchMedia(true);
    renderSettings();

    expect(
      screen.getByText('High contrast is used on e-ink screens.')
    ).toBeInTheDocument();
    for (const label of ['System', 'Dark', 'Light', 'Darkroom']) {
      expect(screen.queryByText(label)).toBeNull();
    }
    expect(screen.queryByText('Animations')).toBeNull();
  });

  it('offers every theme on a color screen', () => {
    stubMatchMedia(false);
    renderSettings();

    for (const label of ['System', 'Dark', 'Light', 'Darkroom']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(
      screen.queryByText('High contrast is used on e-ink screens.')
    ).toBeNull();
  });
});
