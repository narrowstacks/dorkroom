import { DorkroomClient } from '../../dorkroom/client';
import { HttpTransport } from '../../dorkroom/transport';
import { DorkroomApiError } from '../../dorkroom/types';

// Mock the HttpTransport
vi.mock('../../dorkroom/transport');

describe('DorkroomClient', () => {
  let client: DorkroomClient;
  let mockTransport: {
    get: ReturnType<typeof vi.fn>;
  };

  // Sample API response data based on actual API responses
  const mockFilmsResponse = {
    data: [
      {
        id: 3,
        uuid: '30c756e0-b62c-4fb1-a925-aacfbe7ae875',
        slug: 'arista-edu-ultra-200',
        brand: 'Arista',
        name: 'Edu Ultra 200',
        color_type: 'bw',
        iso_speed: 200,
        grain_structure: null,
        description: 'A traditional panchromatic film optimized for use in a range of shooting conditions.',
        manufacturer_notes: ['panchromatic b&w negative film', 'fine grain and sharpness'],
        reciprocity_failure: null,
        discontinued: false,
        static_image_url: 'https://example.com/image.jpg',
        date_added: '2025-06-18T09:12:37.128',
        created_at: '2025-06-19T06:21:11.321245',
        updated_at: '2025-06-19T06:22:05.249969',
      },
    ],
    count: 1,
  };

  const mockDevelopersResponse = {
    data: [
      {
        id: 3,
        uuid: '0fdf0997-e8e6-48ab-a610-3ec29f45062c',
        slug: 'ilford-dd-x',
        name: 'DD-X',
        manufacturer: 'Ilford',
        type: 'concentrate',
        description: 'Ilford ILFOTEC DD-X is a fine grain developer which gives full film speed.',
        mixing_instructions: null,
        storage_requirements: null,
        safety_notes: null,
        dilutions: [
          { id: 1, name: '1+4', dilution: '1+4' },
          { id: 2, name: '1+10', dilution: '1+10' },
        ],
        created_at: '2025-06-19T06:22:10.149846',
        updated_at: '2025-06-19T06:22:10.149846',
        film_or_paper: true,
      },
    ],
    count: 1,
  };

  const mockCombinationsResponse = {
    data: [
      {
        id: 179,
        uuid: 'baf74890-51fb-49da-8197-2ae6494d904e',
        dilution_id: 1,
        custom_dilution: null,
        temperature_celsius: 20,
        time_minutes: 9,
        agitation_method: 'Invert 4x in first 10 sec, then 4x in first 10 sec of each minute',
        notes: null,
        created_at: '2025-06-30T09:01:30.795313',
        updated_at: '2025-07-01T00:42:13.049681',
        film_stock: 'ilford-fp4-plus',
        developer: 'tetenal-ultrafin-plus',
        shooting_iso: 200,
        name: 'Ilford FP4 Plus @ 200 in Ultrafin Plus @ 1+4',
        push_pull: 0.68,
        tags: ['official-ilford'],
        info_source: 'https://www.ilfordphoto.com/test.pdf',
      },
    ],
    count: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockTransport = {
      get: vi.fn(),
    };

    // Treat HttpTransport as a mocked constructor and stub it to return our mock transport
    (HttpTransport as any).mockImplementation(() => mockTransport);

    client = new DorkroomClient();
  });

  describe('constructor', () => {
    it('should use default options', () => {
      const defaultClient = new DorkroomClient();
      expect(defaultClient['options']).toEqual({
        baseUrl: 'https://dorkroom.art/api',
        timeout: 10000,
        retries: 3,
        cacheExpiryMs: 300000, // 5 minutes
      });
    });

    it('should override default options', () => {
      const customClient = new DorkroomClient({
        baseUrl: 'https://custom.api.com',
        timeout: 5000,
      });
      expect(customClient['options']).toEqual({
        baseUrl: 'https://custom.api.com',
        timeout: 5000,
        retries: 3,
        cacheExpiryMs: 300000,
      });
    });
  });

  describe('loadAll', () => {
    it('should load all data from API endpoints', async () => {
      mockTransport.get
        .mockResolvedValueOnce(mockFilmsResponse)
        .mockResolvedValueOnce(mockDevelopersResponse)
        .mockResolvedValueOnce(mockCombinationsResponse);

      await client.loadAll();

      expect(mockTransport.get).toHaveBeenCalledTimes(3);
      expect(mockTransport.get).toHaveBeenCalledWith('/films');
      expect(mockTransport.get).toHaveBeenCalledWith('/developers');
      expect(mockTransport.get).toHaveBeenCalledWith('/combinations');

      // Verify data is cached
      expect(client['filmsCache']).toHaveLength(1);
      expect(client['developersCache']).toHaveLength(1);
      expect(client['combinationsCache']).toHaveLength(1);
      expect(client['lastLoadTime']).toBeGreaterThan(0);
    });

    it('should handle API errors', async () => {
      mockTransport.get.mockRejectedValueOnce(new Error('API Error'));

      try {
        await client.loadAll();
        throw new Error('Expected loadAll to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(DorkroomApiError);
        expect((err as Error).message).toContain('Failed to load data: API Error');
      }
    });
  });

  describe('data transformation', () => {
    beforeEach(async () => {
      mockTransport.get
        .mockResolvedValueOnce(mockFilmsResponse)
        .mockResolvedValueOnce(mockDevelopersResponse)
        .mockResolvedValueOnce(mockCombinationsResponse);

      await client.loadAll();
    });

    describe('film transformation', () => {
      it('should transform film data from snake_case to camelCase', () => {
        const films = client.getAllFilms();
        const film = films[0];

        expect(film).toEqual({
          id: 3,
          uuid: '30c756e0-b62c-4fb1-a925-aacfbe7ae875',
          slug: 'arista-edu-ultra-200',
          brand: 'Arista',
          name: 'Edu Ultra 200',
          colorType: 'bw',
          isoSpeed: 200,
          grainStructure: null,
          description: 'A traditional panchromatic film optimized for use in a range of shooting conditions.',
          manufacturerNotes: ['panchromatic b&w negative film', 'fine grain and sharpness'],
          reciprocityFailure: null,
          discontinued: false,
          staticImageUrl: 'https://example.com/image.jpg',
          dateAdded: '2025-06-18T09:12:37.128',
          createdAt: '2025-06-19T06:21:11.321245',
          updatedAt: '2025-06-19T06:22:05.249969',
        });
      });
    });

    describe('developer transformation', () => {
      it('should transform developer data from snake_case to camelCase', () => {
        const developers = client.getAllDevelopers();
        const developer = developers[0];

        expect(developer).toEqual({
          id: 3,
          uuid: '0fdf0997-e8e6-48ab-a610-3ec29f45062c',
          slug: 'ilford-dd-x',
          name: 'DD-X',
          manufacturer: 'Ilford',
          type: 'concentrate',
          description: 'Ilford ILFOTEC DD-X is a fine grain developer which gives full film speed.',
          filmOrPaper: true,
          dilutions: [
            { id: '1', name: '1+4', dilution: '1+4' },
            { id: '2', name: '1+10', dilution: '1+10' },
          ],
          mixingInstructions: null,
          storageRequirements: null,
          safetyNotes: null,
          notes: null,
          createdAt: '2025-06-19T06:22:10.149846',
          updatedAt: '2025-06-19T06:22:10.149846',
        });
      });

      it('should handle missing dilutions gracefully', async () => {
        const mockDeveloperWithoutDilutions = {
          data: [{ ...mockDevelopersResponse.data[0], dilutions: null }],
          count: 1,
        };

        mockTransport.get
          .mockResolvedValueOnce(mockFilmsResponse)
          .mockResolvedValueOnce(mockDeveloperWithoutDilutions)
          .mockResolvedValueOnce(mockCombinationsResponse);

        await client.forceReload();
        const developers = client.getAllDevelopers();
        expect(developers[0].dilutions).toEqual([]);
      });
    });

    describe('combination transformation', () => {
      it('should transform combination data from snake_case to camelCase', () => {
        const combinations = client.getAllCombinations();
        const combination = combinations[0];

        expect(combination).toEqual({
          id: 179,
          uuid: 'baf74890-51fb-49da-8197-2ae6494d904e',
          name: 'Ilford FP4 Plus @ 200 in Ultrafin Plus @ 1+4',
          filmStockId: 'ilford-fp4-plus',
          filmSlug: 'ilford-fp4-plus',
          developerId: 'tetenal-ultrafin-plus',
          developerSlug: 'tetenal-ultrafin-plus',
          shootingIso: 200,
          dilutionId: '1',
          customDilution: null,
          temperatureC: 20,
          temperatureF: 68, // Converted from 20°C
          timeMinutes: 9,
          agitationMethod: 'Invert 4x in first 10 sec, then 4x in first 10 sec of each minute',
          agitationSchedule: null,
          pushPull: 0.68,
          tags: ['official-ilford'],
          notes: null,
          infoSource: 'https://www.ilfordphoto.com/test.pdf',
          createdAt: '2025-06-30T09:01:30.795313',
          updatedAt: '2025-07-01T00:42:13.049681',
        });
      });

      it('should handle temperature conversion correctly', () => {
        const combinations = client.getAllCombinations();
        const combination = combinations[0];

        // 20°C should convert to 68°F
        expect(combination.temperatureC).toBe(20);
        expect(combination.temperatureF).toBe(68);
      });

      it('should parse tags from string format', async () => {
        const mockCombinationWithStringTags = {
          data: [
            {
              ...mockCombinationsResponse.data[0],
              tags: 'tag1, tag2, tag3',
            },
          ],
          count: 1,
        };

        mockTransport.get
          .mockResolvedValueOnce(mockFilmsResponse)
          .mockResolvedValueOnce(mockDevelopersResponse)
          .mockResolvedValueOnce(mockCombinationWithStringTags);

        await client.forceReload();

        const combinations = client.getAllCombinations();
        expect(combinations[0].tags).toEqual(['tag1', 'tag2', 'tag3']);
      });

      it('should handle null dilution_id', async () => {
        const mockCombinationWithNullDilution = {
          data: [
            {
              ...mockCombinationsResponse.data[0],
              dilution_id: null,
            },
          ],
          count: 1,
        };

        mockTransport.get
          .mockResolvedValueOnce(mockFilmsResponse)
          .mockResolvedValueOnce(mockDevelopersResponse)
          .mockResolvedValueOnce(mockCombinationWithNullDilution);

        await client.forceReload();

        const combinations = client.getAllCombinations();
        expect(combinations[0].dilutionId).toBeNull();
      });
    });
  });

  describe('cache management', () => {
    it('should throw error when accessing data before loading', () => {
      expect(() => client.getAllFilms()).toThrow(DorkroomApiError);
      expect(() => client.getAllFilms()).toThrow('Films data not loaded. Call loadAll() first.');

      expect(() => client.getAllDevelopers()).toThrow(DorkroomApiError);
      expect(() => client.getAllDevelopers()).toThrow('Developers data not loaded. Call loadAll() first.');

      expect(() => client.getAllCombinations()).toThrow(DorkroomApiError);
      expect(() => client.getAllCombinations()).toThrow('Combinations data not loaded. Call loadAll() first.');
    });

    it('should return defensive copies of cached data', async () => {
      mockTransport.get
        .mockResolvedValueOnce(mockFilmsResponse)
        .mockResolvedValueOnce(mockDevelopersResponse)
        .mockResolvedValueOnce(mockCombinationsResponse);

      await client.loadAll();

      const films1 = client.getAllFilms();
      const films2 = client.getAllFilms();

      expect(films1).not.toBe(films2); // Different array instances
      expect(films1).toEqual(films2); // Same content
    });

    it('should check if data is expired', () => {
      expect(client.isDataExpired()).toBe(true); // No data loaded

      client['lastLoadTime'] = Date.now() - 600000; // 10 minutes ago
      expect(client.isDataExpired()).toBe(true); // Expired

      client['lastLoadTime'] = Date.now() - 60000; // 1 minute ago
      expect(client.isDataExpired()).toBe(false); // Not expired
    });

    it('should force reload data ignoring cache', async () => {
      // First load
      mockTransport.get
        .mockResolvedValueOnce(mockFilmsResponse)
        .mockResolvedValueOnce(mockDevelopersResponse)
        .mockResolvedValueOnce(mockCombinationsResponse);

      await client.loadAll();

      // Force reload
      mockTransport.get
        .mockResolvedValueOnce(mockFilmsResponse)
        .mockResolvedValueOnce(mockDevelopersResponse)
        .mockResolvedValueOnce(mockCombinationsResponse);

      await client.forceReload();

      expect(mockTransport.get).toHaveBeenCalledTimes(6); // 3 calls for each load
    });

    it('should clear cache on force reload', async () => {
      mockTransport.get
        .mockResolvedValueOnce(mockFilmsResponse)
        .mockResolvedValueOnce(mockDevelopersResponse)
        .mockResolvedValueOnce(mockCombinationsResponse);

      await client.loadAll();

      expect(client['filmsCache']).not.toBeNull();
      expect(client['lastLoadTime']).not.toBeNull();

      mockTransport.get.mockRejectedValueOnce(new Error('Network error'));

      // Force reload should clear cache even if it fails
      await expect(client.forceReload()).rejects.toThrow();

      expect(client['filmsCache']).toBeNull();
      expect(client['lastLoadTime']).toBeNull();
    });
  });

  describe('integration with real API structure', () => {
    it('should handle actual API response structure for films', async () => {
      // This mimics the actual API response structure
      const realFilmsResponse = {
        data: [
          {
            id: 3,
            uuid: '30c756e0-b62c-4fb1-a925-aacfbe7ae875',
            slug: 'arista-edu-ultra-200',
            brand: 'Arista',
            name: 'Edu Ultra 200',
            color_type: 'bw',
            iso_speed: 200,
            grain_structure: null,
            description: 'Real film description',
            manufacturer_notes: [
              'panchromatic b&w negative film',
              'fine grain and sharpness',
            ],
            reciprocity_failure: null,
            discontinued: false,
            static_image_url: 'https://static.bhphoto.com/images/example.jpg',
            date_added: '2025-06-18T09:12:37.128',
            created_at: '2025-06-19T06:21:11.321245',
            updated_at: '2025-06-19T06:22:05.249969',
          },
        ],
        count: 1,
      };

      mockTransport.get
        .mockResolvedValueOnce(realFilmsResponse)
        .mockResolvedValueOnce(mockDevelopersResponse)
        .mockResolvedValueOnce(mockCombinationsResponse);

      await client.loadAll();

      const films = client.getAllFilms();
      expect(films[0].manufacturerNotes).toEqual([
        'panchromatic b&w negative film',
        'fine grain and sharpness',
      ]);
    });
  });
});
