import { describe, expect, it } from 'vitest';
import { RECIPROCITY_FILM_TYPES } from '../../constants/reciprocity';
import {
  applyReciprocity,
  calculateReciprocity,
  RECIPROCITY_MIN_CORRECTION_SECONDS,
  resolveReciprocityFilm,
} from '../../utils/reciprocity-calculations';

const TRI_X = 1.54;
const HP5 = 1.31;

describe('applyReciprocity', () => {
  it('applies the power law at and above the correction threshold', () => {
    expect(applyReciprocity(30, TRI_X)).toBeCloseTo(30 ** TRI_X, 6);
    expect(applyReciprocity(RECIPROCITY_MIN_CORRECTION_SECONDS, TRI_X)).toBe(1);
  });

  it('never returns less than the metered time', () => {
    // The defect this guard exists for: a fraction raised to a factor > 1
    // shrinks, which would tell the photographer to expose for less time
    // than they metered. Reciprocity failure only ever costs light.
    for (const metered of [0.001, 0.05, 0.125, 0.25, 0.5, 0.75, 0.999]) {
      for (const factor of [HP5, TRI_X, 1.15, 1.43]) {
        expect(applyReciprocity(metered, factor)).toBeGreaterThanOrEqual(
          metered
        );
      }
    }
  });

  it('passes sub-threshold times through unchanged', () => {
    expect(applyReciprocity(0.5, TRI_X)).toBe(0.5);
    expect(applyReciprocity(0.25, HP5)).toBe(0.25);
  });

  it('is the identity when the factor is 1', () => {
    expect(applyReciprocity(30, 1)).toBe(30);
    expect(applyReciprocity(0.5, 1)).toBe(0.5);
  });
});

describe('resolveReciprocityFilm', () => {
  it('resolves a catalogue film to its factor and label', () => {
    expect(resolveReciprocityFilm('tri-x', 1.3)).toEqual({
      factor: TRI_X,
      filmName: 'Kodak Tri-X 400',
    });
  });

  it('uses the supplied factor for a custom film', () => {
    expect(resolveReciprocityFilm('custom', 1.42)).toEqual({
      factor: 1.42,
      filmName: 'Custom',
    });
  });

  it('falls back to no correction rather than guessing a factor', () => {
    // A silently-applied guess would be indistinguishable from a real profile.
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, 0, -1]) {
      expect(resolveReciprocityFilm('custom', bad).factor).toBe(1);
    }
    expect(resolveReciprocityFilm('not-a-film', 1.3)).toEqual({
      factor: 1,
      filmName: '',
    });
  });

  it('resolves every film in the catalogue', () => {
    for (const film of RECIPROCITY_FILM_TYPES) {
      const resolved = resolveReciprocityFilm(film.value, 1.3);
      expect(resolved.factor).toBeGreaterThan(0);
      expect(resolved.filmName).toBe(film.label);
    }
  });
});

describe('calculateReciprocity', () => {
  it('corrects a long exposure', () => {
    const result = calculateReciprocity({
      meteredSeconds: 30,
      filmType: 'tri-x',
      customFactor: 1.3,
    });

    expect(result).not.toBeNull();
    expect(result?.originalTime).toBe(30);
    expect(result?.adjustedTime).toBeCloseTo(30 ** TRI_X, 6);
    expect(result?.factor).toBe(TRI_X);
    expect(result?.filmName).toBe('Kodak Tri-X 400');
    expect(result?.percentageIncrease).toBeGreaterThan(0);
  });

  it('leaves a sub-second exposure alone instead of shortening it', () => {
    const result = calculateReciprocity({
      meteredSeconds: 0.5,
      filmType: 'tri-x',
      customFactor: 1.3,
    });

    expect(result?.adjustedTime).toBe(0.5);
    expect(result?.percentageIncrease).toBe(0);
  });

  it('rejects a metered time that is not a usable duration', () => {
    for (const meteredSeconds of [
      0,
      -1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]) {
      expect(
        calculateReciprocity({
          meteredSeconds,
          filmType: 'tri-x',
          customFactor: 1.3,
        })
      ).toBeNull();
    }
  });

  it('keeps both bar widths within the visualization bounds', () => {
    const result = calculateReciprocity({
      meteredSeconds: 240,
      filmType: 'delta3200',
      customFactor: 1.3,
    });

    expect(result?.timeBarWidth).toBeGreaterThan(0);
    expect(result?.adjustedTimeBarWidth).toBeGreaterThanOrEqual(
      result?.timeBarWidth ?? 0
    );
    expect(result?.adjustedTimeBarWidth).toBeLessThanOrEqual(300);
  });
});
