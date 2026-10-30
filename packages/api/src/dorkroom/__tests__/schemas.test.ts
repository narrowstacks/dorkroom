import { describe, expect, it } from 'vitest';
import {
  rawCombinationSchema,
  rawDeveloperSchema,
  rawDilutionSchema,
  rawFilmSchema,
  statsSchema,
} from '../schemas';

describe('API Response Schemas', () => {
  describe('rawDilutionSchema', () => {
    it('should accept valid dilution data with number id', () => {
      const validDilution = {
        id: 1,
        name: 'Stock',
        dilution: '1+0',
      };

      const result = rawDilutionSchema.safeParse(validDilution);
      expect(result.success).toBe(true);
    });

    it('should accept dilution with string id', () => {
      const validDilution = {
        id: '1',
        name: 'Stock',
        dilution: '1+0',
      };

      const result = rawDilutionSchema.safeParse(validDilution);
      expect(result.success).toBe(true);
    });

    it('should accept dilution with ratio instead of dilution', () => {
      const validDilution = {
        id: '1',
        name: 'Stock',
        ratio: '1+0',
      };

      const result = rawDilutionSchema.safeParse(validDilution);
      expect(result.success).toBe(true);
    });

    it('should accept dilution with missing name', () => {
      const result = rawDilutionSchema.safeParse({ id: 1, dilution: '1+0' });
      expect(result.success).toBe(true);
    });

    it('should still reject dilution with missing id', () => {
      const result = rawDilutionSchema.safeParse({ name: 'Stock' });
      expect(result.success).toBe(false);
    });
  });

  describe('rawFilmSchema', () => {
    const validFilm = {
      id: 1,
      uuid: '123e4567-e89b-12d3-a456-426614174000',
      slug: 'kodak-tmax-400',
      brand: 'Kodak',
      name: 'T-Max 400',
      color_type: 'bw',
      iso_speed: 400,
      grain_structure: 'Fine',
      description: 'A versatile black and white film',
      manufacturer_notes: '{"Push to 1600","Great for portraits"}', // PostgreSQL array format
      reciprocity_failure: '1s->2s, 10s->25s',
      discontinued: false,
      static_image_url: 'https://example.com/film.jpg',
      aliases: [],
      base_film_slug: null,
      date_added: '2024-01-01',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('should accept valid film data', () => {
      const result = rawFilmSchema.safeParse(validFilm);
      expect(result.success).toBe(true);
    });

    it('should accept film with null optional fields', () => {
      const filmWithNulls = {
        ...validFilm,
        grain_structure: null,
        manufacturer_notes: null,
        reciprocity_failure: null,
        static_image_url: null,
      };

      const result = rawFilmSchema.safeParse(filmWithNulls);
      expect(result.success).toBe(true);
    });

    it('should reject film with missing required fields', () => {
      const invalidFilm = {
        id: 1,
        uuid: '123e4567-e89b-12d3-a456-426614174000',
        // missing other required fields
      };

      const result = rawFilmSchema.safeParse(invalidFilm);
      expect(result.success).toBe(false);
    });

    it('should reject film with wrong type for iso_speed', () => {
      const invalidFilm = {
        ...validFilm,
        iso_speed: 'not-a-number',
      };

      const result = rawFilmSchema.safeParse(invalidFilm);
      expect(result.success).toBe(false);
    });
  });

  describe('rawDeveloperSchema', () => {
    const validDeveloper = {
      id: 1,
      uuid: '123e4567-e89b-12d3-a456-426614174001',
      slug: 'kodak-hc110',
      name: 'HC-110',
      manufacturer: 'Kodak',
      type: 'Liquid',
      description: 'Versatile liquid developer',
      film_or_paper: true,
      dilutions: [
        { id: 1, name: 'Dilution A', dilution: '1+15' },
        { id: 2, name: 'Dilution B', dilution: '1+31' },
      ],
      mixing_instructions: 'Mix 1:31 for dilution B',
      storage_requirements: 'Store in dark place',
      safety_notes: 'Wear gloves',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('should accept valid developer data', () => {
      const result = rawDeveloperSchema.safeParse(validDeveloper);
      expect(result.success).toBe(true);
    });

    it('should accept developer with null optional fields', () => {
      const developerWithNulls = {
        ...validDeveloper,
        mixing_instructions: null,
        storage_requirements: null,
        safety_notes: null,
      };

      const result = rawDeveloperSchema.safeParse(developerWithNulls);
      expect(result.success).toBe(true);
    });

    it('should accept developer with empty dilutions array', () => {
      const developerNoDilutions = {
        ...validDeveloper,
        dilutions: [],
      };

      const result = rawDeveloperSchema.safeParse(developerNoDilutions);
      expect(result.success).toBe(true);
    });

    it('should accept developer with string dilution ids', () => {
      const developerStringIds = {
        ...validDeveloper,
        dilutions: [{ id: '1', name: 'A', dilution: '1+15' }],
      };

      const result = rawDeveloperSchema.safeParse(developerStringIds);
      expect(result.success).toBe(true);
    });

    it('should accept developer with ratio field in dilution', () => {
      const developerWithRatio = {
        ...validDeveloper,
        dilutions: [{ id: '1', name: 'Stock', ratio: '1+0' }],
      };

      const result = rawDeveloperSchema.safeParse(developerWithRatio);
      expect(result.success).toBe(true);
    });

    it('should accept developer with a dilution that has no name', () => {
      const developerUnnamedDilution = {
        ...validDeveloper,
        dilutions: [{ id: 1, dilution: '1+15' }], // missing name
      };

      const result = rawDeveloperSchema.safeParse(developerUnnamedDilution);
      expect(result.success).toBe(true);
    });
  });

  describe('rawCombinationSchema', () => {
    const validCombination = {
      id: 1,
      uuid: '123e4567-e89b-12d3-a456-426614174002',
      name: 'T-Max 400 in HC-110 B',
      film_stock: 'kodak-tmax-400',
      developer: 'kodak-hc110',
      shooting_iso: 400,
      dilution_id: '2', // String in API
      custom_dilution: null,
      temperature_celsius: 20,
      time_minutes: 8,
      agitation_method: 'Continuous first 30s, then 10s every minute',
      push_pull: 0,
      tags: ['standard', 'push-process'], // Array in API
      notes: null,
      info_source: 'Massive Dev Chart',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('should accept valid combination data', () => {
      const result = rawCombinationSchema.safeParse(validCombination);
      expect(result.success).toBe(true);
    });

    it('should accept combination with null optional fields', () => {
      const combinationWithNulls = {
        ...validCombination,
        name: null,
        dilution_id: null,
        custom_dilution: null,
        agitation_method: null,
        tags: null,
        notes: null,
        info_source: null,
      };

      const result = rawCombinationSchema.safeParse(combinationWithNulls);
      expect(result.success).toBe(true);
    });

    it('should reject combination with wrong type for time_minutes', () => {
      const invalidCombination = {
        ...validCombination,
        time_minutes: 'not-a-number',
      };

      const result = rawCombinationSchema.safeParse(invalidCombination);
      expect(result.success).toBe(false);
    });

    it('should reject combination with wrong type for tags (string instead of array)', () => {
      const invalidCombination = {
        ...validCombination,
        tags: 'not-an-array',
      };

      const result = rawCombinationSchema.safeParse(invalidCombination);
      expect(result.success).toBe(false);
    });

    it('should accept combination with null push_pull (DB column is nullable)', () => {
      const combinationWithNullPushPull = {
        ...validCombination,
        push_pull: null,
      };

      const result = rawCombinationSchema.safeParse(
        combinationWithNullPushPull
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.push_pull).toBeNull();
      }
    });
  });

  describe('statsSchema', () => {
    it('should accept valid stats data', () => {
      const validStats = { films: 50, developers: 20, combinations: 1020 };
      const result = statsSchema.safeParse(validStats);
      expect(result.success).toBe(true);
    });

    it('should accept stats with zero values', () => {
      const zeroStats = { films: 0, developers: 0, combinations: 0 };
      const result = statsSchema.safeParse(zeroStats);
      expect(result.success).toBe(true);
    });

    it('should reject stats with missing fields', () => {
      const incomplete = { films: 50 };
      const result = statsSchema.safeParse(incomplete);
      expect(result.success).toBe(false);
    });

    it('should reject stats with string values', () => {
      const wrongTypes = {
        films: '50',
        developers: '20',
        combinations: '1020',
      };
      const result = statsSchema.safeParse(wrongTypes);
      expect(result.success).toBe(false);
    });

    it('should reject null', () => {
      expect(statsSchema.safeParse(null).success).toBe(false);
    });
  });
});
