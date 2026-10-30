import '@testing-library/jest-dom/vitest';
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

interface AnnouncementCase {
  route: string;
  Page: ComponentType;
  /** Changes one input the way a user would. */
  act: () => void;
  expected: string | RegExp;
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
    expected: 'New exposure time 40s, +2 stops',
  },
  {
    route: '/exposure',
    Page: CameraExposureCalculatorPage,
    act: () =>
      fireEvent.change(
        first(screen.getAllByRole('combobox', { name: 'Shutter speed' })),
        { target: { value: '1/60' } }
      ),
    expected: /^EV -?\d+(\.\d+)? at f\/[\d.]+, 1\/60, ISO \d+/,
  },
  {
    route: '/reciprocity',
    Page: ReciprocityCalculatorPage,
    act: () => fireEvent.click(screen.getByRole('button', { name: '8s' })),
    expected: /^Adjusted exposure .+ for .+$/,
  },
  {
    route: '/resize',
    Page: ResizeCalculatorPage,
    act: () =>
      fireEvent.change(screen.getByTitle('Enter Time'), {
        target: { value: '20' },
      }),
    expected: /^New time [\d.]+ seconds, -?[\d.]+ stops$/,
  },
  {
    route: '/lenses',
    Page: LensCalculatorPage,
    act: () => fireEvent.click(screen.getByRole('button', { name: '85' })),
    expected: /^Equivalent focal length .+ on .+, field of view [\d.]+°$/,
  },
  {
    route: '/mat',
    Page: MatCalculatorPage,
    act: () =>
      fireEvent.change(screen.getByTitle('Enter Width'), {
        target: { value: '20' },
      }),
    expected: /^Window opening .+ by .+$/,
  },
  {
    route: '/border',
    Page: BorderCalculatorPage,
    act: () =>
      fireEvent.change(
        first(screen.getAllByRole('combobox', { name: 'Paper Size' })),
        { target: { value: '11x14' } }
      ),
    expected: /^Blade readings left .+, top .+, bottom .+, right .+$/,
  },
];

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
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
    ({ Page, act: changeInput, expected }) => {
      render(
        <MeasurementProvider>
          <Page />
        </MeasurementProvider>
      );

      const regions = screen.getAllByRole('status');
      const region = regions.find(
        (element) =>
          element.getAttribute('aria-atomic') === 'true' &&
          element.classList.contains('sr-only')
      );
      expect(region).toBeDefined();
      if (!region) return;
      // Exactly one announcer per page, whichever layout is showing.
      expect(
        regions.filter((element) => element.classList.contains('sr-only'))
      ).toHaveLength(1);

      // Initial result and hydration are never announced.
      advance(RESULT_ANNOUNCEMENT_DELAY_MS * 2);
      expect(region).toHaveTextContent('');

      changeInput();
      advance(RESULT_ANNOUNCEMENT_DELAY_MS - 1);
      expect(region).toHaveTextContent('');

      advance(1);
      expect(region.textContent).toMatch(expected);
    }
  );
});
