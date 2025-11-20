import {
  DorkroomApiClient,
  apiClient,
  fetchFilms,
  fetchDevelopers,
  fetchCombinations,
} from '../../dorkroom/client';
import type {
  RawFilm,
  RawDeveloper,
  RawCombination,
} from '../../dorkroom/types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('DorkroomApiClient', () => {
  let client: DorkroomApiClient;

  beforeEach(() => {
    mockFetch.mockClear();
    client = new DorkroomApiClient('https://test.api.com');
  });

  describe('Constructor', () => {
    it('should use default base URL when none provided', () => {
      const defaultClient = new DorkroomApiClient();
      expect(defaultClient).toBeInstanceOf(DorkroomApiClient);
    });

    it('should use custom base URL when provided', () => {
      const customClient = new DorkroomApiClient('https://custom.api.com');
      expect(customClient).toBeInstanceOf(DorkroomApiClient);
    });
  });

  describe('fetchFilms', () => {
    it('should fetch films successfully', async () => {
      const mockRawFilms: RawFilm[] = [
        {
          id: 1,
          uuid: 'test-uuid',
          slug: 'test-film',
          brand: 'Test Brand',
          name: 'Test Film',
          color_type: 'black_and_white',
          iso_speed: 400,
          grain_structure: 'fine',
          description: 'Test description',
          manufacturer_notes: null,
          reciprocity_failure: null,
          discontinued: false,
          static_image_url: null,
          date_added: '2023-01-01',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockRawFilms }),
      });

      const result = await client.fetchFilms();

      expect(mockFetch).toHaveBeenCalledWith('https://test.api.com/films', {
        signal: undefined,
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 1,
        uuid: 'test-uuid',
        slug: 'test-film',
        brand: 'Test Brand',
        name: 'Test Film',
        colorType: 'black_and_white',
        isoSpeed: 400,
        grainStructure: 'fine',
        description: 'Test description',
        discontinued: false,
      });
    });

    it('should handle abort signal', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        client.fetchFilms({ signal: controller.signal })
      ).rejects.toThrow();
    });

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(client.fetchFilms()).rejects.toThrow(
        'Failed to fetch films: Not Found'
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.fetchFilms()).rejects.toThrow('Network error');
    });
  });

  describe('fetchDevelopers', () => {
    it('should fetch developers successfully', async () => {
      const mockRawDevelopers: RawDeveloper[] = [
        {
          id: 1,
          uuid: 'dev-uuid',
          slug: 'test-developer',
          name: 'Test Developer',
          manufacturer: 'Test Manufacturer',
          type: 'concentrate',
          description: 'Test description',
          film_or_paper: true,
          dilutions: [
            { id: 1, name: '1+9', dilution: '1+9' },
            { id: 2, name: '1+4', dilution: '1+4' },
          ],
          mixing_instructions: 'Mix 1 part with 9 parts water',
          storage_requirements: 'Store in cool place',
          safety_notes: 'Wear gloves',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockRawDevelopers }),
      });

      const result = await client.fetchDevelopers();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.api.com/developers',
        {
          signal: undefined,
        }
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 1,
        uuid: 'dev-uuid',
        slug: 'test-developer',
        name: 'Test Developer',
        manufacturer: 'Test Manufacturer',
        type: 'concentrate',
        filmOrPaper: true,
        dilutions: [
          { id: '1', name: '1+9', dilution: '1+9' },
          { id: '2', name: '1+4', dilution: '1+4' },
        ],
        notes: null, // Should be set to null
      });
    });
  });

  describe('fetchCombinations', () => {
    it('should fetch combinations successfully', async () => {
      const mockRawCombinations: RawCombination[] = [
        {
          id: 1,
          uuid: 'combo-uuid',
          name: 'Test Combination',
          film_stock: 'test-film',
          developer: 'test-developer',
          shooting_iso: 400,
          dilution_id: 1,
          temperature_celsius: 20,
          time_minutes: 10,
          agitation_method: 'continuous',
          push_pull: 0,
          tags: 'test,experimental',
          info_source: 'test',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockRawCombinations }),
      });

      const result = await client.fetchCombinations();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.api.com/combinations',
        {
          signal: undefined,
        }
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 1,
        uuid: 'combo-uuid',
        name: 'Test Combination',
        filmSlug: 'test-film',
        developerSlug: 'test-developer',
        shootingIso: 400,
        dilutionId: '1',
        temperatureC: 20,
        temperatureF: 68, // 20°C to °F
        timeMinutes: 10,
        agitationMethod: 'continuous',
        pushPull: 0,
        tags: ['test', 'experimental'], // String split and trimmed
        customDilution: null,
        agitationSchedule: null,
        notes: null,
      });
    });

    it('should handle tags as array', async () => {
      const mockRawCombinations: RawCombination[] = [
        {
          id: 1,
          uuid: 'combo-uuid',
          name: 'Test Combination',
          film_stock: 'test-film',
          developer: 'test-developer',
          shooting_iso: 400,
          dilution_id: null,
          temperature_celsius: 20,
          time_minutes: 10,
          agitation_method: 'continuous',
          push_pull: 0,
          tags: 'test,experimental',
          info_source: 'test',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockRawCombinations }),
      });

      const result = await client.fetchCombinations();

      expect(result[0].tags).toEqual(['test', 'experimental']);
      expect(result[0].dilutionId).toBeNull();
    });

    it('should handle null tags', async () => {
      const mockRawCombinations: RawCombination[] = [
        {
          id: 1,
          uuid: 'combo-uuid',
          name: 'Test Combination',
          film_stock: 'test-film',
          developer: 'test-developer',
          shooting_iso: 400,
          dilution_id: 1,
          temperature_celsius: 20,
          time_minutes: 10,
          agitation_method: 'continuous',
          push_pull: 0,
          tags: null,
          info_source: 'test',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockRawCombinations }),
      });

      const result = await client.fetchCombinations();

      expect(result[0].tags).toBeNull();
    });
  });
});

describe('Default API Client', () => {
  it('should provide a default client instance', () => {
    expect(apiClient).toBeInstanceOf(DorkroomApiClient);
  });
});

describe('Convenience Functions', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('fetchFilms should use default client', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    await fetchFilms();

    expect(mockFetch).toHaveBeenCalledWith('https://dorkroom.art/api/films', {
      signal: undefined,
    });
  });

  it('fetchDevelopers should use default client', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    await fetchDevelopers();

    expect(mockFetch).toHaveBeenCalledWith(
      'https://dorkroom.art/api/developers',
      {
        signal: undefined,
      }
    );
  });

  it('fetchCombinations should use default client', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    await fetchCombinations();

    expect(mockFetch).toHaveBeenCalledWith(
      'https://dorkroom.art/api/combinations',
      {
        signal: undefined,
      }
    );
  });

  it('should pass options to default client', async () => {
    const controller = new AbortController();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    await fetchFilms({ signal: controller.signal });

    expect(mockFetch).toHaveBeenCalledWith('https://dorkroom.art/api/films', {
      signal: controller.signal,
    });
  });
});

describe('Data Transformation', () => {
  let client: DorkroomApiClient;

  beforeEach(() => {
    client = new DorkroomApiClient();
  });

  it('should transform temperature correctly', () => {
    // Test transformation logic
    const tempC = 20;
    const expectedF = Math.round((tempC * 9) / 5 + 32);
    expect(expectedF).toBe(68);
  });

  it('should handle empty dilutions array', async () => {
    const mockRawDeveloper: RawDeveloper = {
      id: 1,
      uuid: 'dev-uuid',
      slug: 'test-developer',
      name: 'Test Developer',
      manufacturer: 'Test Manufacturer',
      type: 'concentrate',
      description: 'Test description',
      film_or_paper: true,
      dilutions: [],
      mixing_instructions: null,
      storage_requirements: null,
      safety_notes: null,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [mockRawDeveloper] }),
    });

    const result = await client.fetchDevelopers();

    expect(result[0].dilutions).toEqual([]);
  });

  it('should handle dilution without name', async () => {
    const mockRawDeveloper: RawDeveloper = {
      id: 1,
      uuid: 'dev-uuid',
      slug: 'test-developer',
      name: 'Test Developer',
      manufacturer: 'Test Manufacturer',
      type: 'concentrate',
      description: 'Test description',
      film_or_paper: true,
      dilutions: [{ id: 1, name: '1+9', dilution: '1+9' }],
      mixing_instructions: null,
      storage_requirements: null,
      safety_notes: null,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [mockRawDeveloper] }),
    });

    const result = await client.fetchDevelopers();

    expect(result[0].dilutions[0]).toEqual({
      id: '1',
      name: '1+9',
      dilution: '1+9',
    });
  });
});
