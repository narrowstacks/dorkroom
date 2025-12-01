import { describe, expect, it } from 'vitest';
import type { CustomRecipe } from '../../types/custom-recipes';
import {
  createCombinationFromCustomRecipe,
  createTemporaryCombination,
} from '../combination-factory';

describe('combination-factory', () => {
  const validRecipe: CustomRecipe = {
    id: 'recipe-1',
    name: 'Test Recipe',
    filmId: 'film-1',
    developerId: 'dev-1',
    temperatureF: 68,
    timeMinutes: 10,
    shootingIso: 400,
    pushPull: 0,
    isCustomFilm: false,
    isCustomDeveloper: false,
    isPublic: false,
    dateCreated: '2024-01-01T00:00:00.000Z',
    dateModified: '2024-01-01T00:00:00.000Z',
  };

  describe('createCombinationFromCustomRecipe', () => {
    it('creates a valid combination from a valid recipe', () => {
      const result = createCombinationFromCustomRecipe(validRecipe);
      expect(result.temperatureF).toBe(68);
      expect(result.temperatureC).toBe(20);
      expect(result.timeMinutes).toBe(10);
      expect(result.shootingIso).toBe(400);
    });

    it('throws error for invalid temperature (too low)', () => {
      const invalidRecipe = { ...validRecipe, temperatureF: 30 };
      expect(() => createCombinationFromCustomRecipe(invalidRecipe)).toThrow(
        'Temperature must be at least 32°F (freezing point)'
      );
    });

    it('throws error for invalid temperature (too high)', () => {
      const invalidRecipe = { ...validRecipe, temperatureF: 213 };
      expect(() => createCombinationFromCustomRecipe(invalidRecipe)).toThrow(
        'Temperature must be at most 212°F (boiling point)'
      );
    });

    it('throws error for invalid time (negative)', () => {
      const invalidRecipe = { ...validRecipe, timeMinutes: -1 };
      expect(() => createCombinationFromCustomRecipe(invalidRecipe)).toThrow(
        'Time must be positive'
      );
    });

    it('throws error for invalid time (zero)', () => {
      const invalidRecipe = { ...validRecipe, timeMinutes: 0 };
      expect(() => createCombinationFromCustomRecipe(invalidRecipe)).toThrow(
        'Time must be positive'
      );
    });

    it('throws error for invalid ISO (negative)', () => {
      const invalidRecipe = { ...validRecipe, shootingIso: -100 };
      expect(() => createCombinationFromCustomRecipe(invalidRecipe)).toThrow(
        'ISO must be positive'
      );
    });

    it('throws error for NaN values', () => {
      const invalidRecipe = { ...validRecipe, temperatureF: NaN };
      expect(() => createCombinationFromCustomRecipe(invalidRecipe)).toThrow(
        'Invalid numeric values provided'
      );
    });

    it('throws error for Infinity values', () => {
      const invalidRecipe = { ...validRecipe, timeMinutes: Infinity };
      expect(() => createCombinationFromCustomRecipe(invalidRecipe)).toThrow(
        'Invalid numeric values provided'
      );
    });

    it('accepts boundary temperature (32°F)', () => {
      const boundaryRecipe = { ...validRecipe, temperatureF: 32 };
      const result = createCombinationFromCustomRecipe(boundaryRecipe);
      expect(result.temperatureF).toBe(32);
      expect(result.temperatureC).toBe(0);
    });

    it('accepts boundary temperature (212°F)', () => {
      const boundaryRecipe = { ...validRecipe, temperatureF: 212 };
      const result = createCombinationFromCustomRecipe(boundaryRecipe);
      expect(result.temperatureF).toBe(212);
      expect(result.temperatureC).toBe(100);
    });

    it('accepts very small positive time', () => {
      const smallTimeRecipe = { ...validRecipe, timeMinutes: 0.001 };
      const result = createCombinationFromCustomRecipe(smallTimeRecipe);
      expect(result.timeMinutes).toBe(0.001);
    });

    it('accepts high ISO values', () => {
      const highIsoRecipe = { ...validRecipe, shootingIso: 12800 };
      const result = createCombinationFromCustomRecipe(highIsoRecipe);
      expect(result.shootingIso).toBe(12800);
    });

    it('accepts very high ISO values', () => {
      const veryHighIsoRecipe = { ...validRecipe, shootingIso: 102400 };
      const result = createCombinationFromCustomRecipe(veryHighIsoRecipe);
      expect(result.shootingIso).toBe(102400);
    });
  });

  describe('createTemporaryCombination', () => {
    const validData = {
      name: 'Test',
      filmStockId: 'film-1',
      developerId: 'dev-1',
      temperatureF: 68,
      timeMinutes: 10,
      shootingIso: 400,
    };

    it('creates a valid temporary combination', () => {
      const result = createTemporaryCombination(validData);
      expect(result.temperatureF).toBe(68);
      expect(result.timeMinutes).toBe(10);
    });

    it('validates inputs similar to createCombinationFromCustomRecipe', () => {
      expect(() =>
        createTemporaryCombination({ ...validData, temperatureF: 0 })
      ).toThrow('Temperature must be at least 32°F (freezing point)');

      expect(() =>
        createTemporaryCombination({ ...validData, timeMinutes: -5 })
      ).toThrow('Time must be positive');
    });
  });
});
