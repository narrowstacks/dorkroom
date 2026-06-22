import { useCallback, useState } from 'react';
import {
  getCalibrationOffset,
  setCalibrationOffset,
} from '@/lib/meter-calibration';

/**
 * Holds the light-meter calibration offset (in stops) and persists every change.
 * Steps are rounded to tenths so repeated stepping never float-drifts to 0.99.
 */
export function useCalibration() {
  const [offset, setOffset] = useState(getCalibrationOffset);
  const adjust = useCallback((delta: number) => {
    setOffset((prev) => {
      const next = Math.round((prev + delta) * 10) / 10;
      setCalibrationOffset(next);
      return next;
    });
  }, []);
  return { offset, adjust };
}
