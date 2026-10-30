import { DorkroomApiClient, type RawCombination } from '@dorkroom/api';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  formatTemperature,
  formatTemperatureWithUnit,
  isHigherTemperature,
  isNonStandardTemperature,
  roundTemperature,
  STANDARD_TEMP_C,
  STANDARD_TEMP_F,
  toCelsius,
  toFahrenheit,
} from '../../utils/temperature';

describe('temperature module', () => {
  describe('toFahrenheit / toCelsius', () => {
    it('converts the fixed points exactly', () => {
      expect(toFahrenheit(0)).toBe(32);
      expect(toFahrenheit(100)).toBe(212);
      expect(toFahrenheit(-40)).toBe(-40);
      expect(toFahrenheit(STANDARD_TEMP_C)).toBe(STANDARD_TEMP_F);
      expect(toCelsius(32)).toBe(0);
      expect(toCelsius(212)).toBe(100);
      expect(toCelsius(STANDARD_TEMP_F)).toBe(STANDARD_TEMP_C);
    });

    it('does not round', () => {
      expect(toFahrenheit(24)).toBeCloseTo(75.2, 10);
      expect(toCelsius(75)).toBeCloseTo(23.8889, 4);
    });

    it('round-trips in both directions', () => {
      for (let tenths = -200; tenths <= 1000; tenths++) {
        const value = tenths / 10;
        expect(toCelsius(toFahrenheit(value))).toBeCloseTo(value, 9);
        expect(toFahrenheit(toCelsius(value))).toBeCloseTo(value, 9);
      }
    });

    it('round-trips °C through a stored (rounded) °F', () => {
      // Every 0.1 °C step survives being stored as 0.1 °F and converted back.
      for (let tenths = 0; tenths <= 500; tenths++) {
        const celsius = tenths / 10;
        const storedF = roundTemperature(toFahrenheit(celsius));
        expect(roundTemperature(toCelsius(storedF))).toBeCloseTo(celsius, 9);
      }
    });
  });

  describe('roundTemperature', () => {
    it('rounds to the nearest 0.1°', () => {
      expect(roundTemperature(75.2)).toBe(75.2);
      expect(roundTemperature(70.7)).toBe(70.7);
      expect(roundTemperature(23.8889)).toBe(23.9);
      expect(roundTemperature(21.111)).toBe(21.1);
      expect(roundTemperature(68)).toBe(68);
    });
  });

  describe('isNonStandardTemperature', () => {
    it('treats 68 °F and anything within 0.1 °F as standard', () => {
      expect(isNonStandardTemperature(STANDARD_TEMP_F)).toBe(false);
      expect(isNonStandardTemperature(68.05)).toBe(false);
      expect(isNonStandardTemperature(67.95)).toBe(false);
      expect(isNonStandardTemperature(68.1)).toBe(false);
      expect(isNonStandardTemperature(toFahrenheit(STANDARD_TEMP_C))).toBe(
        false
      );
    });

    it('flags anything further than 0.1 °F away', () => {
      expect(isNonStandardTemperature(68.15)).toBe(true);
      expect(isNonStandardTemperature(68.2)).toBe(true);
      expect(isNonStandardTemperature(75)).toBe(true);
      expect(isNonStandardTemperature(60)).toBe(true);
      expect(isNonStandardTemperature(toFahrenheit(21.5))).toBe(true);
    });

    it('is never true for non-finite input', () => {
      expect(isNonStandardTemperature(Number.NaN)).toBe(false);
      expect(isNonStandardTemperature(Number.POSITIVE_INFINITY)).toBe(false);
    });
  });

  describe('isHigherTemperature', () => {
    it('compares against 68 °F', () => {
      expect(isHigherTemperature(75)).toBe(true);
      expect(isHigherTemperature(68)).toBe(false);
      expect(isHigherTemperature(60)).toBe(false);
    });
  });

  describe('formatTemperature', () => {
    it('formats to one decimal with the unit symbol', () => {
      expect(formatTemperature(20, 'celsius')).toBe('20.0°C');
      expect(formatTemperature(75.2, 'fahrenheit')).toBe('75.2°F');
      expect(formatTemperature(toCelsius(75), 'celsius')).toBe('23.9°C');
    });

    it('drops a trailing .0 when asked', () => {
      const opts = { trimTrailingZero: true };
      expect(formatTemperature(68, 'fahrenheit', opts)).toBe('68°F');
      expect(formatTemperature(20.04, 'celsius', opts)).toBe('20°C');
      expect(formatTemperature(21.5, 'celsius', opts)).toBe('21.5°C');
    });

    it('never renders negative zero', () => {
      expect(formatTemperature(-0.01, 'celsius')).toBe('0.0°C');
      expect(
        formatTemperature(-0.01, 'celsius', { trimTrailingZero: true })
      ).toBe('0°C');
    });

    it('formats negatives', () => {
      expect(formatTemperature(-40, 'fahrenheit')).toBe('-40.0°F');
    });

    it('returns a dash for missing or non-finite values', () => {
      expect(formatTemperature(null, 'celsius')).toBe('—');
      expect(formatTemperature(undefined, 'fahrenheit')).toBe('—');
      expect(formatTemperature(Number.NaN, 'celsius')).toBe('—');
      expect(formatTemperature(Number.POSITIVE_INFINITY, 'celsius')).toBe('—');
    });
  });

  describe('formatTemperatureWithUnit', () => {
    it('formats fahrenheit values', () => {
      expect(formatTemperatureWithUnit(75.5, null, 'fahrenheit')).toEqual({
        text: '75.5°F',
        isNonStandard: true,
        isHigher: true,
      });
      expect(formatTemperatureWithUnit(68, null, 'fahrenheit')).toEqual({
        text: '68.0°F',
        isNonStandard: false,
        isHigher: false,
      });
    });

    it('formats celsius values', () => {
      expect(formatTemperatureWithUnit(null, 25.5, 'celsius')).toEqual({
        text: '25.5°C',
        isNonStandard: true,
        isHigher: true,
      });
      expect(formatTemperatureWithUnit(null, 20, 'celsius')).toEqual({
        text: '20.0°C',
        isNonStandard: false,
        isHigher: false,
      });
    });

    it('derives the missing scale', () => {
      expect(formatTemperatureWithUnit(null, 25, 'fahrenheit').text).toBe(
        '77.0°F'
      );
      expect(formatTemperatureWithUnit(77, null, 'celsius').text).toBe(
        '25.0°C'
      );
      expect(formatTemperatureWithUnit(32, null, 'celsius').text).toBe('0.0°C');
      expect(formatTemperatureWithUnit(100, null, 'celsius').text).toBe(
        '37.8°C'
      );
    });

    it('prefers the provided value of the requested scale', () => {
      expect(formatTemperatureWithUnit(75.2, 24, 'celsius').text).toBe(
        '24.0°C'
      );
    });

    it('judges non-standard from °F even in celsius mode', () => {
      expect(formatTemperatureWithUnit(75, null, 'celsius')).toEqual({
        text: '23.9°C',
        isNonStandard: true,
        isHigher: true,
      });
      expect(formatTemperatureWithUnit(60, null, 'fahrenheit')).toEqual({
        text: '60.0°F',
        isNonStandard: true,
        isHigher: false,
      });
    });

    it('returns a dash with both flags false when nothing is usable', () => {
      const empty = { text: '—', isNonStandard: false, isHigher: false };
      expect(formatTemperatureWithUnit(null, null, 'fahrenheit')).toEqual(
        empty
      );
      expect(formatTemperatureWithUnit(Number.NaN, null, 'fahrenheit')).toEqual(
        empty
      );
      expect(
        formatTemperatureWithUnit(Number.POSITIVE_INFINITY, null, 'celsius')
      ).toEqual(empty);
    });
  });

  // @dorkroom/api cannot import this module (logic depends on api), so its
  // client repeats the 0.1° rule inline. This keeps the two from drifting.
  describe('agreement with the @dorkroom/api client', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('derives temperatureF exactly as roundTemperature(toFahrenheit(c))', async () => {
      const celsiusValues: number[] = [];
      for (let tenths = -50; tenths <= 450; tenths++) {
        celsiusValues.push(tenths / 10);
      }
      const rows: RawCombination[] = celsiusValues.map((celsius, index) => ({
        id: index + 1,
        uuid: `combo-${index}`,
        name: 'Temp',
        film_stock: 'film',
        developer: 'developer',
        shooting_iso: 400,
        dilution_id: null,
        custom_dilution: null,
        temperature_celsius: celsius,
        time_minutes: 10,
        agitation_method: 'continuous',
        push_pull: 0,
        tags: null,
        notes: null,
        info_source: null,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      }));
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => ({ ok: true, json: async () => ({ data: rows }) }))
      );

      const client = new DorkroomApiClient({ baseUrl: 'https://test.local' });
      const combinations = await client.fetchCombinations();

      expect(combinations).toHaveLength(celsiusValues.length);
      for (const combination of combinations) {
        expect(combination.temperatureF).toBe(
          roundTemperature(toFahrenheit(combination.temperatureC))
        );
      }
    });
  });
});
