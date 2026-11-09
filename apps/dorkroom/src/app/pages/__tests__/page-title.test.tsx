import '@testing-library/jest-dom/vitest';
import { MeasurementProvider, ThemeProvider } from '@dorkroom/ui';
import { render, screen } from '@testing-library/react';
import type { ComponentType } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import BorderCalculatorPage from '../border-calculator/border-calculator-page';
import CameraExposureCalculatorPage from '../camera-exposure-calculator/camera-exposure-calculator-page';
import ExposureCalculatorPage from '../exposure-calculator/exposure-calculator-page';
import LensCalculatorPage from '../lens-calculator/lens-calculator-page';
import MatCalculatorPage from '../mat-calculator/mat-calculator-page';
import NegativeInverterPage from '../negative-inverter/negative-inverter-page';
import ReciprocityCalculatorPage from '../reciprocity-calculator/reciprocity-calculator-page';
import ResizeCalculatorPage from '../resize-calculator/resize-calculator-page';

function renderPage(Page: ComponentType) {
  return render(
    <ThemeProvider>
      <MeasurementProvider>
        <Page />
      </MeasurementProvider>
    </ThemeProvider>
  );
}

// Every tool page keeps exactly one h1, whether the title bar sits above the
// first card (the default) or inside it (Border).
const PAGES: { route: string; Page: ComponentType }[] = [
  { route: '/stops', Page: ExposureCalculatorPage },
  { route: '/resize', Page: ResizeCalculatorPage },
  { route: '/reciprocity', Page: ReciprocityCalculatorPage },
  { route: '/lenses', Page: LensCalculatorPage },
  { route: '/mat', Page: MatCalculatorPage },
  { route: '/exposure', Page: CameraExposureCalculatorPage },
  { route: '/negative-inverter', Page: NegativeInverterPage },
];

describe.each(PAGES)('$route title', ({ Page }) => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders exactly one h1 with its description collapsed', () => {
    renderPage(Page);

    const [title, ...rest] = screen.getAllByRole('heading', { level: 1 });
    expect(rest).toHaveLength(0);
    const toggle = screen.getByRole('button', {
      name: `About ${title?.textContent ?? ''}`,
    });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('/border title fused into the preview card', () => {
  const desktopWidth = window.innerWidth;

  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.innerWidth = desktopWidth;
  });

  it('puts the only h1 inside the desktop preview card', () => {
    window.innerWidth = 1280;
    renderPage(BorderCalculatorPage);

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Border Calculator');
    // The preview card is the one holding the flip controls.
    const card = headings[0]?.closest<HTMLElement>('section') ?? null;
    expect(card).not.toBeNull();
    expect(card).toContainElement(
      screen.getByRole('button', { name: 'Flip Paper' })
    );
  });

  it('puts the only h1 inside the mobile preview card and keeps its controls', () => {
    window.innerWidth = 375;
    renderPage(BorderCalculatorPage);

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Border Calculator');
    // The preview card is the rounded panel holding the image size caption.
    const card = headings[0]?.closest<HTMLElement>('.rounded-3xl') ?? null;
    expect(card).not.toBeNull();
    expect(card).toContainElement(screen.getByText(/image on/));
    // The mobile layout's own Share and Reset controls stay where they were.
    expect(
      screen.getByRole('button', { name: 'Share preset' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Reset to Defaults' })
    ).toBeInTheDocument();
  });
});
