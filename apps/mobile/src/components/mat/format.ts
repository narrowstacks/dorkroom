import type { MatDimensionRow, UseMatCalculatorReturn } from '@dorkroom/logic';

type WarningInput = Pick<
  UseMatCalculatorReturn,
  | 'valid'
  | 'revealValid'
  | 'hasRevealMismatch'
  | 'fmt'
  | 'revVal'
  | 'overlapLeft'
  | 'overlapTop'
>;

export function formatSignedMatFraction(
  fmt: UseMatCalculatorReturn['fmt'],
  value: number
): string {
  const formatted = fmt(Math.abs(value));
  return value < 0 && formatted !== '· · ·' ? `-${formatted}` : formatted;
}

export function buildMobileMatDimensionRows(
  dimensionRows: UseMatCalculatorReturn['dimensionRows'],
  fmt: UseMatCalculatorReturn['fmt'],
  overlapLeft: number,
  overlapTop: number
): MatDimensionRow[] {
  return dimensionRows.map(([label, value, note]) =>
    label === 'Actual reveal'
      ? [
          label,
          `${formatSignedMatFraction(fmt, overlapLeft)} L/R · ${formatSignedMatFraction(fmt, overlapTop)} T/B`,
          note,
        ]
      : [label, value, note]
  );
}

export function buildMatWarnings(calc: WarningInput): string[] {
  const warnings: string[] = [];
  if (!calc.valid) {
    warnings.push(
      calc.revealValid
        ? 'Check inputs. The outer mat must be positive and the borders must leave a window larger than zero on both axes.'
        : 'Check the reveal. Enter a measurement such as 1/8 or 0.125, or leave it empty for no reveal.'
    );
  }
  if (calc.hasRevealMismatch) {
    warnings.push(
      `Window does not match a ${calc.fmt(calc.revVal)} reveal. Actual overlap: ${formatSignedMatFraction(calc.fmt, calc.overlapLeft)} L/R · ${formatSignedMatFraction(calc.fmt, calc.overlapTop)} T/B.`
    );
  }
  return warnings;
}
