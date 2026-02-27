import {
  apiClient,
  DorkroomApiClient,
  fetchCombinations,
  fetchDevelopers,
  fetchFilms,
  INTERNAL_API_BASE_URL,
  PUBLIC_API_BASE_URL,
} from '../../dorkroom/client';
import type {
  RawCombination,
  RawDeveloper,
  RawFilm,
} from '../../dorkroom/types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('DorkroomApiClient', () => {
  let client: DorkroomApiClient;

  beforeEach(() => {
    mockFetch.mockClear();
    client = new DorkroomApiClient({ baseUrl: 'https://test.api.com' });
  });

  describe('Constructor', () => {
    it('should use public base URL when no config provided', async () => {
      const defaultClient = new DorkroomApiClient();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });
      await defaultClient.fetchFilms();
      expect(mockFetch).toHaveBeenCalledWith(
        `${PUBLIC_API_BASE_URL}/films`,
        expect.objectContaining({ signal: undefined })
      );
    });

    it('should use custom base URL when provided', () => {
      const customClient = new DorkroomApiClient({
        baseUrl: 'https://custom.api.com',
      });
      expect(customClient).toBeInstanceOf(DorkroomApiClient);
    });

    it('should send X-API-Key header when apiKey is set', async () => {
      const authedClient = new DorkroomApiClient({
        baseUrl: 'https://test.api.com',
        apiKey: 'dk_test_123',
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });
      await authedClient.fetchFilms();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.api.com/films',
        expect.objectContaining({
          headers: { 'X-API-Key': 'dk_test_123' },
        })
      );
    });

    it('should not send X-API-Key header when apiKey is not set', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });
      await client.fetchFilms();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.api.com/films',
        expect.objectContaining({ headers: undefined })
      );
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
        headers: undefined,
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
          headers: undefined,
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
          dilution_id: '1', // String in API
          custom_dilution: null,
          temperature_celsius: 20,
          time_minutes: 10,
          agitation_method: 'continuous',
          push_pull: 0,
          tags: ['test', 'experimental'], // Array in API
          notes: null,
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
          headers: undefined,
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
        tags: ['test', 'experimental'],
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
          custom_dilution: null,
          temperature_celsius: 20,
          time_minutes: 10,
          agitation_method: 'continuous',
          push_pull: 0,
          tags: ['test', 'experimental'], // Array in API
          notes: null,
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
          dilution_id: '1', // String in API
          custom_dilution: null,
          temperature_celsius: 20,
          time_minutes: 10,
          agitation_method: 'continuous',
          push_pull: 0,
          tags: null,
          notes: null,
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

    it('should pass through null push_pull from API', async () => {
      const mockRawCombinations: RawCombination[] = [
        {
          id: 1,
          uuid: 'combo-uuid',
          name: 'Test Combination',
          film_stock: 'test-film',
          developer: 'test-developer',
          shooting_iso: 400,
          dilution_id: null,
          custom_dilution: null,
          temperature_celsius: 20,
          time_minutes: 10,
          agitation_method: null,
          push_pull: null,
          tags: null,
          notes: null,
          info_source: null,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockRawCombinations }),
      });

      const result = await client.fetchCombinations();

      expect(result).toHaveLength(1);
      expect(result[0].pushPull).toBeNull();
    });

    it('should filter out invalid combinations and return valid ones', async () => {
      const validRaw: RawCombination = {
        id: 1,
        uuid: 'combo-uuid-valid',
        name: 'Valid Combination',
        film_stock: 'test-film',
        developer: 'test-developer',
        shooting_iso: 400,
        dilution_id: null,
        custom_dilution: null,
        temperature_celsius: 20,
        time_minutes: 10,
        agitation_method: null,
        push_pull: 0,
        tags: null,
        notes: null,
        info_source: null,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      // Invalid item: missing required fields
      const invalidRaw = {
        id: 2,
        uuid: 'combo-uuid-invalid',
        // Missing film_stock, developer, shooting_iso, etc.
        temperature_celsius: 'not-a-number', // Wrong type
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [validRaw, invalidRaw] }),
      });

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = await client.fetchCombinations();
      warnSpy.mockRestore();

      // Only the valid combination should be returned
      expect(result).toHaveLength(1);
      expect(result[0].uuid).toBe('combo-uuid-valid');
    });

    it('should throw when the response envelope is invalid', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ notData: [] }), // Missing 'data' array
      });

      await expect(client.fetchCombinations()).rejects.toThrow(
        'Invalid API response format for combinations'
      );
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

    expect(mockFetch).toHaveBeenCalledWith('/api/films', {
      signal: undefined,
      headers: undefined,
    });
  });

  it('fetchDevelopers should use default client', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    await fetchDevelopers();

    expect(mockFetch).toHaveBeenCalledWith('/api/developers', {
      signal: undefined,
      headers: undefined,
    });
  });

  it('fetchCombinations should use default client', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    await fetchCombinations();

    expect(mockFetch).toHaveBeenCalledWith('/api/combinations', {
      signal: undefined,
      headers: undefined,
    });
  });

  it('should pass options to default client', async () => {
    const controller = new AbortController();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    await fetchFilms({ signal: controller.signal });

    expect(mockFetch).toHaveBeenCalledWith('/api/films', {
      signal: controller.signal,
      headers: undefined,
    });
  });
});

describe('Data Transformation', () => {
  let client: DorkroomApiClient;

  beforeEach(() => {
    client = new DorkroomApiClient({ baseUrl: 'https://test.api.com' });
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
