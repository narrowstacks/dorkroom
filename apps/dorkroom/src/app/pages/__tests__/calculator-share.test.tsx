import '@testing-library/jest-dom/vitest';
import {
  type CalculatorLinkSearch,
  cameraExposureLink,
  exposureCalculatorLink,
  lensCalculatorLink,
  matCalculatorLink,
  reciprocityCalculatorLink,
  resizeCalculatorLink,
} from '@dorkroom/logic';
import { MeasurementProvider } from '@dorkroom/ui';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentType } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CameraExposureCalculatorPage from '../camera-exposure-calculator/camera-exposure-calculator-page';
import ExposureCalculatorPage from '../exposure-calculator/exposure-calculator-page';
import LensCalculatorPage from '../lens-calculator/lens-calculator-page';
import MatCalculatorPage from '../mat-calculator/mat-calculator-page';
import ReciprocityCalculatorPage from '../reciprocity-calculator/reciprocity-calculator-page';
import ResizeCalculatorPage from '../resize-calculator/resize-calculator-page';

interface SharedCalculator {
  /** The calculator's route, which is also its analytics tool name. */
  route: string;
  Page: ComponentType<{ linkSearch?: CalculatorLinkSearch }>;
  read: (search: CalculatorLinkSearch) => object;
  /** A link that opens the calculator away from its defaults. */
  linkSearch: CalculatorLinkSearch;
}

const CALCULATORS: SharedCalculator[] = [
  {
    route: '/stops',
    Page: ExposureCalculatorPage,
    read: exposureCalculatorLink.read,
    linkSearch: { time: '42', stops: '-2' },
  },
  {
    route: '/resize',
    Page: ResizeCalculatorPage,
    read: resizeCalculatorLink.read,
    linkSearch: { height: 'true', fromH: '20', toH: '30', time: '12' },
  },
  {
    route: '/reciprocity',
    Page: ReciprocityCalculatorPage,
    read: reciprocityCalculatorLink.read,
    linkSearch: { film: 'tri-x', time: '2m' },
  },
  {
    route: '/lenses',
    Page: LensCalculatorPage,
    read: lensCalculatorLink.read,
    linkSearch: { focal: '80', from: 'film-6x6', to: 'full-frame' },
  },
  {
    route: '/mat',
    Page: MatCalculatorPage,
    read: matCalculatorLink.read,
    // Cleared artwork and reveal must stay cleared for the recipient.
    linkSearch: {
      outerW: '16',
      top: '3 1/2',
      bottomWeight: 'true',
      artW: '',
      artH: '',
      reveal: '',
    },
  },
  {
    route: '/exposure',
    Page: CameraExposureCalculatorPage,
    read: cameraExposureLink.read,
    linkSearch: { aperture: '8', shutter: '1/125', iso: '400' },
  },
];

/**
 * Every calculator's header Share button hands on a link that opens the same
 * calculation: the URL it copies reads back, through the calculator's own
 * link, to the values the page was opened with.
 */
describe.each(CALCULATORS)(
  '$route share button',
  ({ route, Page, read, linkSearch }) => {
    beforeEach(() => {
      window.localStorage.clear();
      window.va = vi.fn();
      // A desktop browser, so the link goes to the clipboard.
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
        maxTouchPoints: 0,
        clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
      });
    });

    afterEach(() => {
      delete window.va;
      vi.unstubAllGlobals();
    });

    it('copies a link that reopens the current calculation', async () => {
      render(
        <MeasurementProvider>
          <Page linkSearch={linkSearch} />
        </MeasurementProvider>
      );

      fireEvent.click(
        screen.getByRole('button', { name: 'Share this calculation' })
      );

      const { writeText } = navigator.clipboard;
      await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
      const url = new URL(vi.mocked(writeText).mock.calls[0][0]);
      expect(url.origin).toBe(window.location.origin);
      expect(url.pathname).toBe(route);
      // The shared-link marker rides along, and the calculator's own link
      // ignores it (`read` below sees it as an unknown param).
      expect(url.searchParams.get('source')).toBe('share');
      expect(read(Object.fromEntries(url.searchParams))).toMatchObject(
        read(linkSearch)
      );
      expect(window.va).toHaveBeenCalledWith('event', {
        name: 'share',
        data: { tool: route.slice(1), method: 'clipboard' },
        options: undefined,
      });
    });
  }
);

/**
 * A field the form rejects would be dropped from the link, so the recipient
 * would see their own value in its place: Share waits until the field is
 * fixed.
 */
describe('share button with an invalid field', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('is disabled while the reciprocity metered time is unparseable', async () => {
    render(
      <MeasurementProvider>
        <ReciprocityCalculatorPage linkSearch={{ time: '2m' }} />
      </MeasurementProvider>
    );
    const shareButton = screen.getByRole('button', {
      name: 'Share this calculation',
    });
    expect(shareButton).toBeEnabled();

    const time = screen.getByPlaceholderText('Try 30s, 1m30s, or 2h');
    fireEvent.change(time, { target: { value: 'abc' } });
    await waitFor(() => expect(shareButton).toBeDisabled());

    fireEvent.change(time, { target: { value: '45s' } });
    await waitFor(() => expect(shareButton).toBeEnabled());
  });
});

/**
 * `share` counts links, not presses: the same inputs shared twice are one
 * share, and a change of inputs makes the next share a new one.
 */
describe('share button analytics', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.va = vi.fn();
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
      maxTouchPoints: 0,
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    delete window.va;
    vi.unstubAllGlobals();
  });

  const shareEvents = () =>
    vi
      .mocked(window.va ?? vi.fn())
      .mock.calls.filter((call) => JSON.stringify(call).includes('"share"'));

  it('counts the same link once and a changed one again', async () => {
    render(
      <MeasurementProvider>
        <LensCalculatorPage linkSearch={{ focal: '80' }} />
      </MeasurementProvider>
    );
    const shareButton = screen.getByRole('button', {
      name: 'Share this calculation',
    });
    const { writeText } = navigator.clipboard;

    fireEvent.click(shareButton);
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    fireEvent.click(shareButton);
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2));
    expect(shareEvents()).toHaveLength(1);

    fireEvent.change(screen.getByRole('spinbutton', { name: /Focal length/ }), {
      target: { value: '50' },
    });
    fireEvent.click(shareButton);
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(3));
    expect(vi.mocked(writeText).mock.calls[2][0]).toContain('focal=50');
    expect(shareEvents()).toHaveLength(2);
  });
});
