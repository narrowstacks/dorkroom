import { describe, expect, it } from 'vitest';
import {
  combinationsResponseSchema,
  developersResponseSchema,
  filmsResponseSchema,
  rawCombinationSchema,
  rawDeveloperSchema,
  rawDilutionSchema,
  rawFilmSchema,
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

    it('should reject dilution with missing name', () => {
      const invalidDilution = {
        id: 1,
        // missing name
      };

      const result = rawDilutionSchema.safeParse(invalidDilution);
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

    it('should reject developer with missing dilution name', () => {
      const developerInvalidDilution = {
        ...validDeveloper,
        dilutions: [{ id: 1 }], // missing name
      };

      const result = rawDeveloperSchema.safeParse(developerInvalidDilution);
      expect(result.success).toBe(false);
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
  });

  describe('filmsResponseSchema', () => {
    it('should accept valid films response', () => {
      const validResponse = {
        data: [
          {
            id: 1,
            uuid: '123e4567-e89b-12d3-a456-426614174000',
            slug: 'kodak-tmax-400',
            brand: 'Kodak',
            name: 'T-Max 400',
            color_type: 'bw',
            iso_speed: 400,
            grain_structure: 'Fine',
            description: 'Test',
            manufacturer_notes: null,
            reciprocity_failure: null,
            discontinued: false,
            static_image_url: null,
            date_added: '2024-01-01',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
        count: 1,
      };

      const result = filmsResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('should accept films response without count', () => {
      const responseWithoutCount = {
        data: [],
      };

      const result = filmsResponseSchema.safeParse(responseWithoutCount);
      expect(result.success).toBe(true);
    });

    it('should reject films response with malformed data array', () => {
      const invalidResponse = {
        data: [{ invalid: 'film' }],
        count: 1,
      };

      const result = filmsResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should reject films response without data array', () => {
      const invalidResponse = {
        count: 1,
      };

      const result = filmsResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });
  });

  describe('developersResponseSchema', () => {
    it('should accept valid developers response', () => {
      const validResponse = {
        data: [
          {
            id: 1,
            uuid: '123e4567-e89b-12d3-a456-426614174001',
            slug: 'kodak-hc110',
            name: 'HC-110',
            manufacturer: 'Kodak',
            type: 'Liquid',
            description: 'Test',
            film_or_paper: true,
            dilutions: [],
            mixing_instructions: null,
            storage_requirements: null,
            safety_notes: null,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
        count: 1,
      };

      const result = developersResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('should reject developers response with malformed data', () => {
      const invalidResponse = {
        data: [{ invalid: 'developer' }],
      };

      const result = developersResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });
  });

  describe('combinationsResponseSchema', () => {
    it('should accept valid combinations response', () => {
      const validResponse = {
        data: [
          {
            id: 1,
            uuid: '123e4567-e89b-12d3-a456-426614174002',
            name: null, // Can be null
            film_stock: 'test-film',
            developer: 'test-developer',
            shooting_iso: 400,
            dilution_id: '1', // String
            custom_dilution: null,
            temperature_celsius: 20,
            time_minutes: 8,
            agitation_method: null, // Can be null
            push_pull: 0,
            tags: ['tag1'], // Array
            notes: null,
            info_source: null,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
        count: 1,
      };

      const result = combinationsResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('should reject combinations response with malformed data', () => {
      const invalidResponse = {
        data: [{ invalid: 'combination' }],
      };

      const result = combinationsResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });
  });

  describe('Defense against malformed API responses', () => {
    it('should reject completely invalid JSON structure', () => {
      const invalidStructure = 'not an object';

      expect(filmsResponseSchema.safeParse(invalidStructure).success).toBe(
        false
      );
      expect(developersResponseSchema.safeParse(invalidStructure).success).toBe(
        false
      );
      expect(
        combinationsResponseSchema.safeParse(invalidStructure).success
      ).toBe(false);
    });

    it('should reject null responses', () => {
      expect(filmsResponseSchema.safeParse(null).success).toBe(false);
      expect(developersResponseSchema.safeParse(null).success).toBe(false);
      expect(combinationsResponseSchema.safeParse(null).success).toBe(false);
    });

    it('should reject undefined responses', () => {
      expect(filmsResponseSchema.safeParse(undefined).success).toBe(false);
      expect(developersResponseSchema.safeParse(undefined).success).toBe(false);
      expect(combinationsResponseSchema.safeParse(undefined).success).toBe(
        false
      );
    });

    it('should reject arrays instead of objects', () => {
      const arrayResponse = [{ id: 1 }];

      expect(filmsResponseSchema.safeParse(arrayResponse).success).toBe(false);
      expect(developersResponseSchema.safeParse(arrayResponse).success).toBe(
        false
      );
      expect(combinationsResponseSchema.safeParse(arrayResponse).success).toBe(
        false
      );
    });
  });
});
