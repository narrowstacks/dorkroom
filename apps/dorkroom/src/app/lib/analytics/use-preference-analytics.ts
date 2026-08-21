import { useMeasurement, useTheme, useVolume } from '@dorkroom/ui';
import { useEffect, useRef } from 'react';
import { type ThemeName, trackEvent } from './events';

// Module-level so their identity is stable across renders and the effect below
// only does work when the value it watches actually moved.
const reportTheme = (theme: ThemeName) => {
  trackEvent('theme_changed', { theme });
};

const reportMeasurementUnit = (unit: string) => {
  trackEvent('units_changed', { context: 'measurement', unit });
};

const reportVolumeUnit = (unit: string) => {
  trackEvent('units_changed', { context: 'volume', unit });
};

/**
 * Fire an event the first time a value differs from what it was on mount.
 *
 * Preferences are read from localStorage during the initial render, so without
 * this guard every returning visitor would report a "change" to whatever they
 * had already chosen and the counts would measure visits, not decisions.
 */
function useChangeEffect<T>(value: T, onChange: (next: T) => void): void {
  const previous = useRef(value);

  useEffect(() => {
    if (previous.current === value) {
      return;
    }
    previous.current = value;
    onChange(value);
  }, [value, onChange]);
}

/**
 * Report deliberate preference changes.
 *
 * Watching the context values rather than instrumenting the controls means the
 * theme picker in /settings and the toggle in the header are both covered, and
 * `@dorkroom/ui` stays free of analytics.
 */
export function usePreferenceAnalytics(): void {
  const { theme } = useTheme();
  const { unit: measurementUnit } = useMeasurement();
  const { unit: volumeUnit } = useVolume();

  useChangeEffect(theme, reportTheme);
  useChangeEffect(measurementUnit, reportMeasurementUnit);
  useChangeEffect(volumeUnit, reportVolumeUnit);
}
