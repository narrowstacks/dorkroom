import '@testing-library/jest-dom/vitest';
import {
  CAMERA_EXPOSURE_STORAGE_KEY,
  EXPOSURE_STORAGE_KEY,
  LENS_STORAGE_KEY,
  MAT_CALCULATOR_STORAGE_KEY,
  RECIPROCITY_STORAGE_KEY,
  RESIZE_STORAGE_KEY,
} from '@dorkroom/logic';
import { MeasurementProvider } from '@dorkroom/ui';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentType } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import CameraExposureCalculatorPage from '../camera-exposure-calculator/camera-exposure-calculator-page';
import ExposureCalculatorPage from '../exposure-calculator/exposure-calculator-page';
import LensCalculatorPage from '../lens-calculator/lens-calculator-page';
import MatCalculatorPage from '../mat-calculator/mat-calculator-page';
import ReciprocityCalculatorPage from '../reciprocity-calculator/reciprocity-calculator-page';
import ResizeCalculatorPage from '../resize-calculator/resize-calculator-page';

interface PersistedCalculator {
  route: string;
  Page: ComponentType;
  storageKey: string;
  /** A stored snapshot that differs from the page's defaults. */
  saved: Record<string, string | number | boolean>;
}

const CALCULATORS: PersistedCalculator[] = [
  {
    route: '/stops',
    Page: ExposureCalculatorPage,
    storageKey: EXPOSURE_STORAGE_KEY,
    saved: { originalTime: 42, stops: -2 },
  },
  {
    route: '/resize',
    Page: ResizeCalculatorPage,
    storageKey: RESIZE_STORAGE_KEY,
    saved: { originalWidth: 9, originalTime: 33 },
  },
  {
    route: '/reciprocity',
    Page: ReciprocityCalculatorPage,
    storageKey: RECIPROCITY_STORAGE_KEY,
    saved: { meteredTime: '2m' },
  },
  {
    route: '/lenses',
    Page: LensCalculatorPage,
    storageKey: LENS_STORAGE_KEY,
    saved: { focalLength: 135 },
  },
  {
    route: '/mat',
    Page: MatCalculatorPage,
    storageKey: MAT_CALCULATOR_STORAGE_KEY,
    saved: { outerW: '11', bottomWeight: true },
  },
  {
    route: '/exposure',
    Page: CameraExposureCalculatorPage,
    storageKey: CAMERA_EXPOSURE_STORAGE_KEY,
    saved: { aperture: 2, iso: 3200 },
  },
];

const renderPage = (Page: ComponentType) =>
  render(
    <MeasurementProvider>
      <Page />
    </MeasurementProvider>
  );

const storedSnapshotSchema = z.record(z.string(), z.json());
type StoredSnapshot = z.infer<typeof storedSnapshotSchema>;

/** The stored snapshot once the persistence hook's debounced write lands. */
async function storedSnapshot(storageKey: string): Promise<StoredSnapshot> {
  let snapshot: StoredSnapshot = {};
  await waitFor(() => {
    const raw = window.localStorage.getItem(storageKey);
    expect(raw).not.toBeNull();
    snapshot = storedSnapshotSchema.parse(JSON.parse(raw ?? '{}'));
  });
  return snapshot;
}

describe.each(CALCULATORS)(
  '$route reset to defaults',
  ({ Page, storageKey, saved }) => {
    beforeEach(() => {
      window.localStorage.clear();
    });

    it('restores the defaults and drops the saved inputs', async () => {
      // What a first-time visitor's page persists is, by definition, its defaults.
      const firstVisit = renderPage(Page);
      const defaults = await storedSnapshot(storageKey);
      firstVisit.unmount();

      window.localStorage.setItem(storageKey, JSON.stringify(saved));
      renderPage(Page);
      expect(await storedSnapshot(storageKey)).not.toEqual(defaults);

      fireEvent.click(
        screen.getByRole('button', { name: 'Reset to defaults' })
      );

      // Cleared at once, so a reload before the debounced write still starts
      // from defaults rather than the discarded inputs.
      expect(window.localStorage.getItem(storageKey)).toBeNull();
      // And the form itself is back on its defaults, which is what lands next.
      expect(await storedSnapshot(storageKey)).toEqual(defaults);
    });
  }
);
