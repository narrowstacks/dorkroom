import type {
  MatCalculatorState,
  UseMatCalculatorReturn,
} from '@dorkroom/logic';

const shown = (value: string) => value.trim() || '—';

export function formatMatPair(width: string, height: string): string {
  return `${shown(width)} × ${shown(height)} in`;
}

export function formatBorderSummary(values: MatCalculatorState): string {
  const horizontal =
    values.borderLeft === values.borderRight
      ? `${shown(values.borderLeft)} L/R`
      : `${shown(values.borderLeft)} L · ${shown(values.borderRight)} R`;
  return `${shown(values.borderTop)} T · ${shown(values.borderBottom)} B · ${horizontal} in`;
}

export function formatArtworkSummary(values: MatCalculatorState): string {
  if (!values.artW.trim() || !values.artH.trim()) return 'Not configured';
  return `${shown(values.artW)} × ${shown(values.artH)} · ${shown(values.reveal)} reveal`;
}

type WarningInput = Pick<
  UseMatCalculatorReturn,
  'valid' | 'hasRevealMismatch' | 'fmt' | 'revVal' | 'overlapLeft' | 'overlapTop'
>;

export function buildMatWarnings(calc: WarningInput): string[] {
  const warnings: string[] = [];
  if (!calc.valid) {
    warnings.push(
      'Check inputs. The outer mat must be positive and the borders must leave a window larger than zero on both axes.'
    );
  }
  if (calc.hasRevealMismatch) {
    warnings.push(
      `Window does not match a ${calc.fmt(calc.revVal)} reveal. Actual overlap: ${calc.fmt(calc.overlapLeft)} L/R · ${calc.fmt(calc.overlapTop)} T/B.`
    );
  }
  return warnings;
}
