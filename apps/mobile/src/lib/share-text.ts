function signedStops(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}`;
}

export function buildExposureShare(p: {
  originalTime: string;
  newTime: string;
  stops: number;
  multiplier: number;
  addedTime: string;
  addedLabel: string;
  percentageIncrease: number;
}): string {
  return [
    'Exposure',
    `Original time: ${p.originalTime}s`,
    `Adjustment: ${signedStops(p.stops)} stops (×${p.multiplier.toFixed(3)})`,
    `New time: ${p.newTime}`,
    `${p.addedLabel}: ${p.addedTime} (${p.percentageIncrease.toFixed(0)}%)`,
  ].join('\n');
}

export function buildResizeShare(p: {
  title: string;
  original: string;
  target: string;
  originalTime: string;
  newTime: string;
  stopsDifference: string;
}): string {
  return [
    p.title,
    `Original: ${p.original}`,
    `Target: ${p.target}`,
    `Original time: ${p.originalTime}s`,
    `New time: ${p.newTime}s`,
    `Stops difference: ${p.stopsDifference}`,
  ].join('\n');
}

export function buildReciprocityShare(p: {
  filmName: string;
  meteredTime: string;
  adjustedTime: string;
  addedTime: string;
  percentageIncrease: number;
  factor: number;
}): string {
  return [
    'Reciprocity',
    `Film: ${p.filmName}`,
    `Metered: ${p.meteredTime}`,
    `Adjusted: ${p.adjustedTime}`,
    `Added: ${p.addedTime} (${p.percentageIncrease.toFixed(0)}%)`,
    `Factor: ${p.factor.toFixed(2)}`,
  ].join('\n');
}

export function buildLensShare(p: {
  focalLength: string;
  sourceFormat: string;
  equivalentFocalLength: string;
  targetFormat: string;
  fieldOfView: number;
  sourceCropFactor: number;
  targetCropFactor: number;
}): string {
  return [
    'Lens Equivalency',
    `${p.focalLength} on ${p.sourceFormat} = ${p.equivalentFocalLength} on ${p.targetFormat}`,
    `Field of view: ${p.fieldOfView.toFixed(1)}° diagonal`,
    `Crop factors: ${p.sourceCropFactor.toFixed(2)}× → ${p.targetCropFactor.toFixed(2)}×`,
  ].join('\n');
}
