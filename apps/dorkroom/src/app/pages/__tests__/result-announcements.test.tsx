import '@testing-library/jest-dom/vitest';
import { EXPOSURE_STORAGE_KEY, type MeasurementUnit } from '@dorkroom/logic';
import { MeasurementProvider } from '@dorkroom/ui';
import { RESULT_ANNOUNCEMENT_DELAY_MS } from '@dorkroom/ui/calculator';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentType } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BorderCalculatorPage from '../border-calculator/border-calculator-page';
import CameraExposureCalculatorPage from '../camera-exposure-calculator/camera-exposure-calculator-page';
import ExposureCalculatorPage from '../exposure-calculator/exposure-calculator-page';
import LensCalculatorPage from '../lens-calculator/lens-calculator-page';
import MatCalculatorPage from '../mat-calculator/mat-calculator-page';
import ReciprocityCalculatorPage from '../reciprocity-calculator/reciprocity-calculator-page';
import ResizeCalculatorPage from '../resize-calculator/resize-calculator-page';

/** The localStorage key `useMeasurement` reads; set it before mounting. */
const MEASUREMENT_STORAGE_KEY = 'dorkroom-measurement-unit';

/**
 * Well past the announcer's post-mount baseline window, yet well inside the
 * announcement delay: an edit made this soon after load must still be spoken.
 */
const EARLY_EDIT_MS = 200;

interface AnnouncementCase {
  route: string;
  Page: ComponentType;
  unit?: MeasurementUnit;
  /** Changes one input the way a user would. */
  act: () => void;
  expected: string;
}

/** The first match: several pages render a control twice (mobile + desktop). */
const first = <T,>(elements: T[]): T => {
  const [element] = elements;
  if (element === undefined) throw new Error('no matching element');
  return element;
};

const CASES: AnnouncementCase[] = [
  {
    route: '/stops',
    Page: ExposureCalculatorPage,
    act: () => fireEvent.click(screen.getByRole('button', { name: '+1' })),
    expected: 'New exposure time 40 seconds, plus 2 stops',
  },
  {
    route: '/exposure',
    Page: CameraExposureCalculatorPage,
    act: () =>
      fireEvent.change(
        first(screen.getAllByRole('combobox', { name: 'Shutter speed' })),
        { target: { value: '1/60' } }
      ),
    expected:
      'EV 11.9 at f/8, 1/60 second, ISO 100. Stops difference minus 1.06 stops',
  },
  {
    route: '/reciprocity',
    Page: ReciprocityCalculatorPage,
    act: () => fireEvent.click(screen.getByRole('button', { name: '8s' })),
    expected: 'Adjusted exposure 24.6 seconds for Kodak Tri-X 400',
  },
  {
    route: '/resize',
    Page: ResizeCalculatorPage,
    act: () =>
      fireEvent.change(screen.getByTitle('Enter Time'), {
        target: { value: '20' },
      }),
    expected: 'New time 45.0 seconds, plus 1.17 stops',
  },
  {
    route: '/lenses',
    Page: LensCalculatorPage,
    act: () => fireEvent.click(screen.getByRole('button', { name: '85' })),
    expected:
      'Equivalent focal length 55.4 millimeters on APS-C, field of view 28.6 degrees',
  },
  {
    route: '/mat',
    Page: MatCalculatorPage,
    act: () =>
      fireEvent.change(screen.getByTitle('Enter Width'), {
        target: { value: '20' },
      }),
    expected: 'Window opening 14 1/2 inches by 13 1/2 inches',
  },
  {
    route: '/mat (metric)',
    Page: MatCalculatorPage,
    unit: 'metric',
    act: () =>
      fireEvent.change(screen.getByTitle('Enter Width'), {
        target: { value: '50' },
      }),
    expected: 'Window opening 36.0 centimeters by 34.3 centimeters',
  },
  {
    route: '/border (landscape paper)',
    Page: BorderCalculatorPage,
    act: () =>
      fireEvent.change(
        first(screen.getAllByRole('combobox', { name: 'Paper Size' })),
        { target: { value: '11x14' } }
      ),
    expected:
      'Blade readings left 13.00 inches, right 13.00 inches, top 8.67 inches, bottom 8.67 inches',
  },
  {
    // Portrait paper rotates the easel, so the card swaps left/right with
    // top/bottom; the announcement must say what the card says.
    route: '/border (portrait paper)',
    Page: BorderCalculatorPage,
    act: () =>
      fireEvent.click(
        first(screen.getAllByRole('button', { name: 'Flip Paper' }))
      ),
    expected:
      'Blade readings left 4.67 inches, right 4.67 inches, top 7.00 inches, bottom 7.00 inches',
  },
];

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function renderPage(Page: ComponentType) {
  render(
    <MeasurementProvider>
      <Page />
    </MeasurementProvider>
  );
}

/** The page's single visually hidden, atomic status region. */
function getAnnouncer(): HTMLElement {
  const announcers = screen
    .getAllByRole('status')
    .filter(
      (element) =>
        element.getAttribute('aria-atomic') === 'true' &&
        element.classList.contains('sr-only')
    );
  // Exactly one announcer per page, whichever layout is showing.
  expect(announcers).toHaveLength(1);
  return first(announcers);
}

describe('calculator result announcements', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', '/');
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(CASES)(
    '$route announces the new result after an input settles',
    ({ Page, unit, act: changeInput, expected }) => {
      if (unit) window.localStorage.setItem(MEASUREMENT_STORAGE_KEY, unit);
      renderPage(Page);
      const region = getAnnouncer();

      advance(EARLY_EDIT_MS);
      expect(region).toHaveTextContent('');

      changeInput();
      advance(RESULT_ANNOUNCEMENT_DELAY_MS - 1);
      expect(region).toHaveTextContent('');

      advance(1);
      expect(region.textContent).toBe(expected);
    }
  );

  it('does not announce values hydrated from localStorage on load', () => {
    window.localStorage.setItem(
      EXPOSURE_STORAGE_KEY,
      JSON.stringify({ originalTime: 20, stops: 3 })
    );
    renderPage(ExposureCalculatorPage);
    const region = getAnnouncer();

    advance(RESULT_ANNOUNCEMENT_DELAY_MS * 3);

    // Hydration did land, and was still not announced.
    expect(screen.getByLabelText('Stops adjustment')).toHaveValue(3);
    expect(region).toHaveTextContent('');
  });

  it('/border announces the same blade readings the desktop card shows on portrait paper', () => {
    renderPage(BorderCalculatorPage);
    const region = getAnnouncer();
    advance(EARLY_EDIT_MS);

    fireEvent.click(
      first(screen.getAllByRole('button', { name: 'Flip Paper' }))
    );
    advance(RESULT_ANNOUNCEMENT_DELAY_MS);

    const cardValue = (label: string) =>
      screen.getByText(label).nextElementSibling?.textContent ?? '';
    const spoken = (display: string) => display.replace(/in$/, ' inches');
    expect(region.textContent).toBe(
      `Blade readings left ${spoken(cardValue('Left Blade'))}, right ${spoken(cardValue('Right Blade'))}, top ${spoken(cardValue('Top Blade'))}, bottom ${spoken(cardValue('Bottom Blade'))}`
    );
  });
});
