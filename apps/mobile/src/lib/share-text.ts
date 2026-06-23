export function buildExposureShare(p: {
  originalTime: string;
  newTime: string;
  stops: number;
  percentageIncrease: number;
}): string {
  const sign = p.stops >= 0 ? '+' : '';
  return [
    'Dorkroom Exposure',
    `Original: ${p.originalTime}s`,
    `Stops: ${sign}${p.stops}`,
    `New time: ${p.newTime}`,
    `Change: ${p.percentageIncrease.toFixed(0)}%`,
  ].join('\n');
}

export function buildResizeShare(p: {
  newTime: string;
  stopsDifference: string;
}): string {
  return [
    'Dorkroom Resize',
    `New time: ${p.newTime}s`,
    `Stops difference: ${p.stopsDifference}`,
  ].join('\n');
}

export function buildReciprocityShare(p: {
  filmName: string;
  meteredTime: string;
  adjustedTime: string;
  factor: number;
}): string {
  return [
    'Dorkroom Reciprocity',
    `Film: ${p.filmName}`,
    `Metered: ${p.meteredTime}`,
    `Adjusted: ${p.adjustedTime}`,
    `Factor: ${p.factor.toFixed(2)}`,
  ].join('\n');
}
