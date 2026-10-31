import '@testing-library/jest-dom/vitest';
import { MeasurementProvider } from '@dorkroom/ui';
import { render } from '@testing-library/react';
import type { ComponentType } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import CameraExposureCalculatorPage from '../camera-exposure-calculator/camera-exposure-calculator-page';
import ExposureCalculatorPage from '../exposure-calculator/exposure-calculator-page';
import LensCalculatorPage from '../lens-calculator/lens-calculator-page';
import MatCalculatorPage from '../mat-calculator/mat-calculator-page';
import NegativeInverterPage from '../negative-inverter/negative-inverter-page';
import ReciprocityCalculatorPage from '../reciprocity-calculator/reciprocity-calculator-page';
import ResizeCalculatorPage from '../resize-calculator/resize-calculator-page';

// Pins each calculator header's accent tone as it renders today (#455), so
// sourcing the tone from the navigation manifest can't change a page's color.
const PAGES: { route: string; Page: ComponentType; accent: string }[] = [
  { route: '/stops', Page: ExposureCalculatorPage, accent: 'blue' },
  { route: '/resize', Page: ResizeCalculatorPage, accent: 'teal' },
  { route: '/reciprocity', Page: ReciprocityCalculatorPage, accent: 'amber' },
  { route: '/lenses', Page: LensCalculatorPage, accent: 'emerald' },
  { route: '/mat', Page: MatCalculatorPage, accent: 'cyan' },
  { route: '/exposure', Page: CameraExposureCalculatorPage, accent: 'teal' },
  { route: '/negative-inverter', Page: NegativeInverterPage, accent: 'violet' },
];

describe.each(PAGES)('$route header accent', ({ Page, accent }) => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it(`renders the ${accent} tone`, () => {
    const { container } = render(
      <MeasurementProvider>
        <Page />
      </MeasurementProvider>
    );
    // The header icon tile is the first accent-styled element on the page;
    // later ones (e.g. Camera Exposure's mode chips) carry their own tones.
    const tile = Array.from(
      container.querySelectorAll<HTMLElement>('[style]')
    ).find((el) =>
      /--accent-[a-z]+-gradient/.test(el.getAttribute('style') ?? '')
    );
    const style = tile?.getAttribute('style') ?? '';
    expect(style.match(/--accent-([a-z]+)-gradient/)?.[1]).toBe(accent);
    expect(style.match(/--accent-([a-z]+)-border/)?.[1]).toBe(accent);
    expect(tile?.querySelector('svg')).not.toBeNull();
  });
});
