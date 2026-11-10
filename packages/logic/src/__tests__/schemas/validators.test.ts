import { describe, expect, it } from 'vitest';
import {
  EXPOSURE_TIME_MAX_SECONDS,
  EXPOSURE_TIME_MIN_SECONDS,
  exposureTimeValidator,
  POSITIVE_DIMENSION_MAX,
  POSITIVE_DIMENSION_MIN,
  positiveDimensionValidator,
  RECIPROCITY_FACTOR_MAX,
  RECIPROCITY_FACTOR_MIN,
  reciprocityFactorValidator,
  STOPS_MAX,
  STOPS_MIN,
  stopsValidator,
} from '../../schemas/validators';

describe('exported validator bounds', () => {
  it('match what the validators accept', () => {
    const factor = reciprocityFactorValidator();
    expect(factor.safeParse(RECIPROCITY_FACTOR_MIN).success).toBe(true);
    expect(factor.safeParse(RECIPROCITY_FACTOR_MIN - 0.01).success).toBe(false);
    expect(factor.safeParse(RECIPROCITY_FACTOR_MAX).success).toBe(true);
    expect(factor.safeParse(RECIPROCITY_FACTOR_MAX + 0.01).success).toBe(false);

    const stops = stopsValidator();
    expect(stops.safeParse(STOPS_MIN).success).toBe(true);
    expect(stops.safeParse(STOPS_MIN - 0.01).success).toBe(false);
    expect(stops.safeParse(STOPS_MAX).success).toBe(true);
    expect(stops.safeParse(STOPS_MAX + 0.01).success).toBe(false);

    const time = exposureTimeValidator();
    expect(time.safeParse(EXPOSURE_TIME_MIN_SECONDS).success).toBe(true);
    expect(time.safeParse(EXPOSURE_TIME_MIN_SECONDS - 0.01).success).toBe(
      false
    );
    expect(time.safeParse(EXPOSURE_TIME_MAX_SECONDS).success).toBe(true);
    expect(time.safeParse(EXPOSURE_TIME_MAX_SECONDS + 1).success).toBe(false);

    const dimension = positiveDimensionValidator();
    expect(dimension.safeParse(POSITIVE_DIMENSION_MIN).success).toBe(true);
    expect(dimension.safeParse(POSITIVE_DIMENSION_MIN - 0.01).success).toBe(
      false
    );
    expect(dimension.safeParse(POSITIVE_DIMENSION_MAX).success).toBe(true);
    expect(dimension.safeParse(POSITIVE_DIMENSION_MAX + 1).success).toBe(false);
  });
});
