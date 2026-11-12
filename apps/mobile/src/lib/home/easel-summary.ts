import {
  borderCalculatorInitialState,
  computeBorderLayout,
  type MeasurementUnit,
  persistedBorderCalculatorSchema,
} from '@dorkroom/logic';
import { formatLength } from '@/components/border/format';

export interface EaselSummary {
  /** "7.5" × 9.5" image on 8×10". */
  title: string;
  /** "Min border 0.5", centred". */
  detail: string;
}

/**
 * The border calculator's last setup, from the snapshot the Border screen
 * persists, as two lines for Home. Null when nothing is stored or the
 * snapshot cannot be read, so Home has nothing to resume.
 */
export function summarizeEasel(
  raw: string | undefined,
  unit: MeasurementUnit
): EaselSummary | null {
  if (!raw) return null;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = persistedBorderCalculatorSchema.safeParse(json);
  if (!parsed.success) return null;
  const state = { ...borderCalculatorInitialState, ...parsed.data };
  const { calculation } = computeBorderLayout(state, {
    unit,
    viewport: { width: 0, height: 0 },
  });
  const paper =
    state.paperSize === 'custom'
      ? `${formatLength(calculation.paperWidth, unit)} × ${formatLength(calculation.paperHeight, unit)}`
      : `${calculation.paperWidth}×${calculation.paperHeight}`;
  return {
    title: `${formatLength(calculation.printWidth, unit)} × ${formatLength(calculation.printHeight, unit)} image on ${paper}`,
    detail: `${state.aspectRatio} print, ${formatLength(state.minBorder, unit)} minimum border${state.enableOffset ? ', offset' : ', centered'}`,
  };
}
