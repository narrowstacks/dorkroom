/**
 * Tests for enhanced Dorkroom client with debouncing and better error handling.
 */

import { DorkroomClient } from "../client";

describe("Enhanced DorkroomClient", () => {
  let client: DorkroomClient;

  beforeEach(() => {
    client = new DorkroomClient({
      baseUrl: "https://api.dorkroom.art/api",
      searchDebounceMs: 100, // Fast debounce for testing
      cacheTTL: 1000, // Short cache for testing
      timeout: 5000,
      maxRetries: 2,
    });
  });

  afterEach(() => {
    // Suppress expected cancellation errors
    const originalConsoleError = console.error;
    console.error = jest.fn();

    client.reset();

    // Restore console.error
    console.error = originalConsoleError;
  });

  describe("Debouncing", () => {
    it("should debounce rapid search requests", async () => {
      // Clear cache to ensure fresh requests
      client.clearCache();

      // Mock the transport to track calls
      const transportSpy = jest.spyOn(client["transport"], "get");
      transportSpy.mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [],
            success: true,
            message: "Success",
            total: 0,
          }),
        ),
      );

      // Make rapid search requests (same query to trigger debouncing)
      const promises = [
        client.fuzzySearchFilms("kodak"),
        client.fuzzySearchFilms("kodak"),
        client.fuzzySearchFilms("kodak"),
      ];

      // Wait for debounce + some buffer time
      await new Promise((resolve) => setTimeout(resolve, 150));
      await Promise.all(promises);

      // Should only make one actual API call due to debouncing
      expect(transportSpy).toHaveBeenCalledTimes(1);
    });

    it("should allow manual flushing of pending searches", async () => {
      // Clear cache to ensure fresh requests
      client.clearCache();

      const transportSpy = jest.spyOn(client["transport"], "get");
      transportSpy.mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [],
            success: true,
            message: "Success",
            total: 0,
          }),
        ),
      );

      // Start a search but don't wait for debounce timer
      const promise = client.fuzzySearchFilms("kodak");

      // Flush immediately (this should trigger the debounced function immediately)
      client.flushPendingSearches();

      await promise;

      expect(transportSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("Caching", () => {
    it("should cache search results and return cached data", async () => {
      // Clear cache to start fresh
      client.clearCache();

      const mockData = [{ uuid: "1", name: "Test Film", brand: "Test" }];
      const transportSpy = jest.spyOn(client["transport"], "get");
      transportSpy.mockResolvedValue(
        new Response(
          JSON.stringify({
            data: mockData,
            success: true,
            message: "Success",
            total: 1,
          }),
        ),
      );

      // First request - wait for debounce
      const result1 = await client.fuzzySearchFilms("test");
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Second request should use cache (same query)
      const result2 = await client.fuzzySearchFilms("test");

      expect(transportSpy).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(mockData);
      expect(result2).toEqual(mockData);
    });

    it("should provide cache statistics", async () => {
      await client.loadAll();
      const stats = client.getStats();
      expect(stats).toHaveProperty("cacheSize");
      expect(stats).toHaveProperty("pendingRequests");
    });
  });

  describe("Request Management", () => {
    it("should allow cancellation of specific requests", async () => {
      // Clear cache to ensure fresh requests
      client.clearCache();

      const transportSpy = jest.spyOn(client["transport"], "get");
      transportSpy.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve(
                  new Response(
                    JSON.stringify({
                      data: [],
                      success: true,
                      message: "Success",
                      total: 0,
                    }),
                  ),
                ),
              1000,
            ),
          ),
      );

      // Start a request but don't await it immediately
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _promise = client.fuzzySearchFilms("kodak");

      // Wait a bit then test cancellation functionality
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should be able to cancel all without error
      client.cancelAllRequests();

      // Wait for the mock timeout to complete
      await new Promise((resolve) => setTimeout(resolve, 1100));
    });

    it("should provide transport status information", () => {
      const status = client.getTransportStatus();
      expect(status).toHaveProperty("circuitBreakerState");
    });
  });

  describe("Error Handling", () => {
    it("should handle and classify different error types", async () => {
      const client = new DorkroomClient({
        baseUrl: "https://invalid-url-that-should-fail.invalid",
        maxRetries: 1,
        timeout: 100,
      });

      try {
        await client.loadAll();
        fail("Should have thrown an error");
      } catch (error) {
        // Should be a network or timeout error
        expect(error).toBeDefined();
      }
    });
  });

  describe("Circuit Breaker Integration", () => {
    it("should respect circuit breaker state", () => {
      const status = client.getTransportStatus();
      expect(status.circuitBreakerState).toBeDefined();
    });
  });
});
