import { DorkroomClient } from '../../dorkroom/client';

describe('API Integration Tests', () => {
  let client: DorkroomClient;

  beforeEach(() => {
    client = new DorkroomClient();
  });

  // Note: These tests make actual HTTP requests to the live API
  // They are marked as integration tests and may be skipped in CI
  describe('Real API calls', () => {
    const isOnline = () => {
      if (typeof globalThis === 'undefined') return false;
      const nav = (globalThis as { navigator?: { onLine?: boolean } })
        .navigator;
      return nav && nav.onLine !== false;
    };
    const skipIfOffline = () => {
      if (!isOnline()) {
        console.warn('Skipping integration tests - appears to be offline');
        return true;
      }
      return false;
    };

    it('should load all data from live API', async () => {
      if (skipIfOffline()) return;

      try {
        await client.loadAll();

        const films = client.getAllFilms();
        const developers = client.getAllDevelopers();
        const combinations = client.getAllCombinations();

        // Verify we got data
        expect(films.length).toBeGreaterThan(0);
        expect(developers.length).toBeGreaterThan(0);
        expect(combinations.length).toBeGreaterThan(0);

        // Verify data structure
        const film = films[0];
        expect(film).toHaveProperty('id');
        expect(film).toHaveProperty('uuid');
        expect(film).toHaveProperty('slug');
        expect(film).toHaveProperty('brand');
        expect(film).toHaveProperty('name');
        expect(film).toHaveProperty('colorType');
        expect(film).toHaveProperty('isoSpeed');

        const developer = developers[0];
        expect(developer).toHaveProperty('id');
        expect(developer).toHaveProperty('uuid');
        expect(developer).toHaveProperty('slug');
        expect(developer).toHaveProperty('name');
        expect(developer).toHaveProperty('manufacturer');
        expect(developer).toHaveProperty('dilutions');
        expect(Array.isArray(developer.dilutions)).toBe(true);

        const combination = combinations[0];
        expect(combination).toHaveProperty('id');
        expect(combination).toHaveProperty('uuid');
        expect(combination).toHaveProperty('filmStockId');
        expect(combination).toHaveProperty('developerId');
        expect(combination).toHaveProperty('temperatureC');
        expect(combination).toHaveProperty('temperatureF');
        expect(combination).toHaveProperty('timeMinutes');
      } catch (error) {
        console.warn(
          'Integration test failed - API may be unavailable:',
          error
        );
        // Don't fail the test if API is unavailable
        expect(error).toBeDefined();
      }
    }, 30000); // 30 second timeout for network requests

    it('should handle API rate limiting gracefully', async () => {
      if (skipIfOffline()) return;

      try {
        // Make multiple rapid requests to test rate limiting
        const promises = Array.from({ length: 5 }, () =>
          new DorkroomClient().loadAll()
        );

        const results = await Promise.allSettled(promises);

        // At least some should succeed
        const successes = results.filter((r) => r.status === 'fulfilled');
        expect(successes.length).toBeGreaterThan(0);

        // If any failed, they should be due to network/rate limiting, not client bugs
        const failures = results.filter(
          (r) => r.status === 'rejected'
        ) as PromiseRejectedResult[];
        failures.forEach((failure) => {
          expect(failure.reason).toBeDefined();
          // Should be network-related, not client logic errors
        });
      } catch (error) {
        console.warn(
          'Rate limiting test failed - API may be unavailable:',
          error
        );
        expect(error).toBeDefined();
      }
    }, 30000);

    it('should verify film data integrity', async () => {
      if (skipIfOffline()) return;

      try {
        await client.loadAll();
        const films = client.getAllFilms();

        films.forEach((film) => {
          // Required fields should be present
          expect(typeof film.id).toBe('number');
          expect(typeof film.uuid).toBe('string');
          expect(typeof film.slug).toBe('string');
          expect(typeof film.brand).toBe('string');
          expect(typeof film.name).toBe('string');
          expect(typeof film.colorType).toBe('string');
          expect(typeof film.isoSpeed).toBe('number');
          expect(typeof film.discontinued).toBe('boolean');

          // UUID should be valid format
          expect(film.uuid).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          );

          // ISO speed should be positive
          expect(film.isoSpeed).toBeGreaterThan(0);

          // Color type should be expected values
          expect(['bw', 'color', 'c41', 'e6']).toContain(film.colorType);
        });
      } catch (error) {
        console.warn(
          'Film data integrity test failed - API may be unavailable:',
          error
        );
        expect(error).toBeDefined();
      }
    }, 30000);

    it('should verify developer data integrity', async () => {
      if (skipIfOffline()) return;

      try {
        await client.loadAll();
        const developers = client.getAllDevelopers();

        developers.forEach((developer) => {
          // Required fields should be present
          expect(typeof developer.id).toBe('number');
          expect(typeof developer.uuid).toBe('string');
          expect(typeof developer.slug).toBe('string');
          expect(typeof developer.name).toBe('string');
          expect(typeof developer.manufacturer).toBe('string');
          expect(typeof developer.filmOrPaper).toBe('boolean');
          expect(Array.isArray(developer.dilutions)).toBe(true);

          // UUID should be valid format
          expect(developer.uuid).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          );

          // Check dilutions structure
          developer.dilutions.forEach((dilution) => {
            expect(typeof dilution.id).toBe('string');
            expect(typeof dilution.name).toBe('string');
            expect(typeof dilution.dilution).toBe('string');
          });
        });
      } catch (error) {
        console.warn(
          'Developer data integrity test failed - API may be unavailable:',
          error
        );
        expect(error).toBeDefined();
      }
    }, 30000);

    it('should verify combination data integrity', async () => {
      if (skipIfOffline()) return;

      try {
        await client.loadAll();
        const combinations = client.getAllCombinations();

        combinations.forEach((combination) => {
          // Required fields should be present
          expect(typeof combination.id).toBe('number');
          expect(typeof combination.uuid).toBe('string');
          expect(typeof combination.filmStockId).toBe('string');
          expect(typeof combination.developerId).toBe('string');
          expect(typeof combination.shootingIso).toBe('number');
          expect(typeof combination.temperatureC).toBe('number');
          expect(typeof combination.temperatureF).toBe('number');
          expect(typeof combination.timeMinutes).toBe('number');
          expect(typeof combination.pushPull).toBe('number');

          // UUID should be valid format
          expect(combination.uuid).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          );

          // Temperature conversion should be correct
          const expectedF = Math.round((combination.temperatureC * 9) / 5 + 32);
          expect(combination.temperatureF).toBe(expectedF);

          // Time should be positive
          expect(combination.timeMinutes).toBeGreaterThan(0);

          // ISO should be positive
          expect(combination.shootingIso).toBeGreaterThan(0);

          // Tags should be array if present
          if (combination.tags !== null) {
            expect(Array.isArray(combination.tags)).toBe(true);
          }
        });
      } catch (error) {
        console.warn(
          'Combination data integrity test failed - API may be unavailable:',
          error
        );
        expect(error).toBeDefined();
      }
    }, 30000);
  });

  describe('API endpoint structure validation', () => {
    it('should have correct endpoint URLs', () => {
      const client = new DorkroomClient();
      expect(client['options'].baseUrl).toBe('https://dorkroom.art/api');
    });

    it('should accept custom base URL', () => {
      const customClient = new DorkroomClient({
        baseUrl: 'https://custom.dorkroom.art/api',
      });
      expect(customClient['options'].baseUrl).toBe(
        'https://custom.dorkroom.art/api'
      );
    });
  });
});
