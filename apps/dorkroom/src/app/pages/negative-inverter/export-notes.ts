import { type ExportPlan, formatMegapixels } from '@dorkroom/logic';

/** iOS Safari's per-canvas cap, as the page states it. */
const CANVAS_LIMIT = '16.7 MP';

const dimensions = (plan: { width: number; height: number }) =>
  `${plan.width} × ${plan.height} px`;

const sourceMegapixels = (plan: ExportPlan) =>
  formatMegapixels({ width: plan.sourceWidth, height: plan.sourceHeight });

/** The visible note after a download: its size, and why if it shrank. */
export function describeExport(plan: ExportPlan, cropped: boolean): string {
  const exported = formatMegapixels(plan);
  if (!plan.downscaled) {
    return `Saved at full resolution, ${dimensions(plan)} (${exported}).`;
  }
  return cropped
    ? `Exported at ${exported}; the crop is ${sourceMegapixels(plan)} at full resolution, over the ${CANVAS_LIMIT} limit for one browser canvas.`
    : `Exported at ${exported}; original is ${sourceMegapixels(plan)}, over the ${CANVAS_LIMIT} limit for one browser canvas.`;
}

/** The note before a download: what size it will be. */
export function describePlannedExport(
  plan: ExportPlan,
  cropped: boolean
): string {
  if (!plan.downscaled) {
    return `Will save at ${dimensions(plan)}, full resolution.`;
  }
  return `Will save at ${dimensions(plan)} (${formatMegapixels(plan)}). The ${cropped ? 'crop' : 'original'} is ${sourceMegapixels(plan)}, over the ${CANVAS_LIMIT} browser canvas limit.`;
}
