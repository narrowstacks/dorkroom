import { useSafelight } from '@/components/safelight/safelight-provider';
import { SAFELIGHT } from '@/theme/safelight';

export interface ChartLineProps {
  stroke: string;
  strokeOpacity: number;
}

export interface ChartTickProps {
  fill: string;
  opacity: number;
}

export interface ChartInk {
  /** A white line at `alpha`; under safelight a red line stepped by weight. */
  line: (alpha: number) => ChartLineProps;
  /** Axis tick text: white at `alpha`; under safelight tertiary red or better. */
  tick: (alpha: number) => ChartTickProps;
}

const NORMAL: ChartInk = {
  line: (alpha) => ({ stroke: '#ffffff', strokeOpacity: alpha }),
  tick: (alpha) => ({ fill: '#ffffff', opacity: alpha }),
};

const SAFELIGHT_INK: ChartInk = {
  // The faint grid stays a dim hairline; axes and markers step up.
  line: (alpha) =>
    alpha <= 0.15
      ? { stroke: SAFELIGHT.outline, strokeOpacity: 0.5 }
      : alpha <= 0.25
        ? { stroke: SAFELIGHT.outline, strokeOpacity: 1 }
        : { stroke: SAFELIGHT.outlineSelected, strokeOpacity: 1 },
  tick: () => ({ fill: SAFELIGHT.textTertiary, opacity: 1 }),
};

/** Chart line and tick colours for the current mode, from the theme levels. */
export function useChartInk(): ChartInk {
  const { on } = useSafelight();
  return on ? SAFELIGHT_INK : NORMAL;
}
