export interface ChartPoint {
  x: number;
  y: number;
}

/** Map `value` from a logarithmic domain onto a linear range. */
export function logScale(
  value: number,
  domainMin: number,
  domainMax: number,
  rangeMin: number,
  rangeMax: number
): number {
  if (value <= 0 || domainMin <= 0 || domainMax <= 0) return rangeMin;
  const lo = Math.log(domainMin);
  const hi = Math.log(domainMax);
  if (hi === lo) return rangeMin;
  const t = (Math.log(value) - lo) / (hi - lo);
  return rangeMin + t * (rangeMax - rangeMin);
}

interface CurveParams {
  factor: number;
  minTime: number;
  maxTime: number;
  width: number;
  height: number;
  padding: number;
  samples?: number;
}

/** Sample the reciprocity curve adjusted = metered^factor across a log-log plot. */
export function buildReciprocityCurve(params: CurveParams): ChartPoint[] {
  const {
    factor,
    minTime,
    maxTime,
    width,
    height,
    padding,
    samples = 40,
  } = params;
  if (minTime <= 0 || maxTime <= minTime || factor <= 0) return [];
  const adjMin = minTime ** factor;
  const adjMax = maxTime ** factor;
  const lo = Math.log(minTime);
  const hi = Math.log(maxTime);
  const pts: ChartPoint[] = [];
  for (let i = 0; i <= samples; i++) {
    const time = Math.exp(lo + (i / samples) * (hi - lo));
    const adj = time ** factor;
    pts.push({
      x: logScale(time, minTime, maxTime, padding, width - padding),
      // invert y so larger adjusted times sit higher
      y: logScale(adj, adjMin, adjMax, height - padding, padding),
    });
  }
  return pts;
}

/** Plot coordinate for a single metered time on the same axes. */
export function pointFor(
  time: number,
  params: Omit<CurveParams, 'samples'>
): ChartPoint {
  const { factor, minTime, maxTime, width, height, padding } = params;
  const adjMin = minTime ** factor;
  const adjMax = maxTime ** factor;
  return {
    x: logScale(time, minTime, maxTime, padding, width - padding),
    y: logScale(time ** factor, adjMin, adjMax, height - padding, padding),
  };
}
