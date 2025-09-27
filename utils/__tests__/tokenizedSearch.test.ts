import {
  extractTokens,
  calculateTokenScore,
  calculateFilmTokenScore,
  calculateDeveloperTokenScore,
  enhanceFilmResults,
  enhanceDeveloperResults,
  DEFAULT_TOKENIZED_CONFIG,
  type TokenizedSearchConfig,
} from "../tokenizedSearch";
import type { Film, Developer } from "../../api/dorkroom/types";

describe("tokenizedSearch", () => {
  describe("extractTokens", () => {
    it("should extract basic tokens from a string", () => {
      const tokens = extractTokens("Tri-X 400");
      expect(tokens).toEqual(["tri", "x", "400"]);
    });

    it("should handle complex punctuation and separators", () => {
      const tokens = extractTokens("HP5 Plus (35mm)");
      expect(tokens).toEqual(["hp5", "plus", "35mm"]);
    });

    it("should filter out stop words", () => {
      const tokens = extractTokens("The best film for photography");
      expect(tokens).toEqual(["best", "film", "photography"]);
    });

    it("should handle empty strings", () => {
      const tokens = extractTokens("");
      expect(tokens).toEqual([]);
    });

    it("should handle strings with only punctuation", () => {
      const tokens = extractTokens("---()[]");
      expect(tokens).toEqual([]);
    });
  });

  describe("calculateTokenScore", () => {
    it("should score exact token matches highly", () => {
      const queryTokens = ["tri", "x"];
      const targetText = "Tri-X 400";
      const result = calculateTokenScore(queryTokens, targetText);

      expect(result.score).toBeGreaterThan(0.5);
      expect(result.matchedTokens).toEqual(["tri", "x"]);
    });

    it("should score partial matches lower than exact matches", () => {
      const queryTokens = ["trix"];
      const exactResult = calculateTokenScore(queryTokens, "Tri-X 400");
      const partialResult = calculateTokenScore(queryTokens, "Trix 400");

      expect(exactResult.score).toBeLessThan(partialResult.score);
    });

    it("should give bonus for matches at the beginning", () => {
      const queryTokens = ["kodak"];
      const startResult = calculateTokenScore(queryTokens, "Kodak Tri-X");
      const endResult = calculateTokenScore(queryTokens, "Film by Kodak");

      expect(startResult.score).toBeGreaterThan(endResult.score);
    });

    it("should handle empty query tokens", () => {
      const result = calculateTokenScore([], "Tri-X 400");
      expect(result.score).toBe(0);
      expect(result.matchedTokens).toEqual([]);
    });

    it("should handle empty target text", () => {
      const queryTokens = ["tri", "x"];
      const result = calculateTokenScore(queryTokens, "");
      expect(result.score).toBe(0);
      expect(result.matchedTokens).toEqual([]);
    });
  });

  describe("calculateFilmTokenScore", () => {
    const mockFilm: Film = {
      id: "1",
      uuid: "uuid-1",
      slug: "tri-x-400",
      name: "Tri-X 400",
      brand: "Kodak",
      isoSpeed: 400,
      colorType: "Black & White",
      description: "Professional black and white film",
      discontinued: 0,
      manufacturerNotes: [],
      dateAdded: "2024-01-01",
    };

    it("should score films based on name, brand, and description", () => {
      const queryTokens = ["tri", "x"];
      const result = calculateFilmTokenScore(queryTokens, mockFilm);

      expect(result.score).toBeGreaterThan(0);
      expect(result.matchedTokens).toContain("tri");
      expect(result.matchedTokens).toContain("x");
    });

    it("should prioritize name matches over brand matches", () => {
      const nameMatchFilm = {
        ...mockFilm,
        name: "Test Film",
        brand: "Other Brand",
      };
      const brandMatchFilm = {
        ...mockFilm,
        name: "Other Film",
        brand: "Test Brand",
      };
      const queryTokens = ["test"];

      const nameResult = calculateFilmTokenScore(queryTokens, nameMatchFilm);
      const brandResult = calculateFilmTokenScore(queryTokens, brandMatchFilm);

      expect(nameResult.score).toBeGreaterThan(brandResult.score);
    });

    it("should handle films without descriptions", () => {
      const filmWithoutDesc = { ...mockFilm, description: undefined };
      const queryTokens = ["tri"];
      const result = calculateFilmTokenScore(queryTokens, filmWithoutDesc);

      expect(result.score).toBeGreaterThan(0);
      expect(result.matchedTokens).toContain("tri");
    });
  });

  describe("calculateDeveloperTokenScore", () => {
    const mockDeveloper: Developer = {
      id: "1",
      uuid: "uuid-1",
      slug: "d76",
      name: "D-76",
      manufacturer: "Kodak",
      type: "concentrate",
      filmOrPaper: "film",
      dilutions: [],
      discontinued: 0,
      dateAdded: "2024-01-01",
      notes: "Standard black and white developer",
    };

    it("should score developers based on name, manufacturer, and notes", () => {
      const queryTokens = ["d76"];
      const result = calculateDeveloperTokenScore(queryTokens, mockDeveloper);

      expect(result.score).toBeGreaterThan(0);
      expect(result.matchedTokens).toContain("d76");
    });

    it("should prioritize name matches over manufacturer matches", () => {
      const nameMatchDev = {
        ...mockDeveloper,
        name: "Test Developer",
        manufacturer: "Other",
      };
      const manufacturerMatchDev = {
        ...mockDeveloper,
        name: "Other Developer",
        manufacturer: "Test",
      };
      const queryTokens = ["test"];

      const nameResult = calculateDeveloperTokenScore(
        queryTokens,
        nameMatchDev,
      );
      const manufacturerResult = calculateDeveloperTokenScore(
        queryTokens,
        manufacturerMatchDev,
      );

      expect(nameResult.score).toBeGreaterThan(manufacturerResult.score);
    });
  });

  describe("enhanceFilmResults", () => {
    const mockFilms: Film[] = [
      {
        id: "1",
        uuid: "uuid-1",
        slug: "tri-x-400",
        name: "Tri-X 400",
        brand: "Kodak",
        isoSpeed: 400,
        colorType: "Black & White",
        description: "Professional black and white film",
        discontinued: 0,
        manufacturerNotes: [],
        dateAdded: "2024-01-01",
      },
      {
        id: "2",
        uuid: "uuid-2",
        slug: "portra-400",
        name: "Portra 400",
        brand: "Kodak",
        isoSpeed: 400,
        colorType: "Color Negative",
        description: "Professional color negative film",
        discontinued: 0,
        manufacturerNotes: [],
        dateAdded: "2024-01-02",
      },
      {
        id: "3",
        uuid: "uuid-3",
        slug: "unrelated-film",
        name: "Unrelated Film",
        brand: "Other Brand",
        isoSpeed: 100,
        colorType: "Black & White",
        description: "Different film entirely",
        discontinued: 0,
        manufacturerNotes: [],
        dateAdded: "2024-01-03",
      },
    ];

    it("should enhance and filter film results based on token matching", () => {
      const query = "tri x";
      const results = enhanceFilmResults(query, mockFilms);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].item.name).toBe("Tri-X 400");
      expect(results[0].tokenScore).toBeGreaterThan(0.5);
      expect(results[0].matchedTokens).toContain("tri");
      expect(results[0].matchedTokens).toContain("x");
    });

    it("should sort results by combined score", () => {
      const query = "kodak 400";
      const results = enhanceFilmResults(query, mockFilms);

      expect(results.length).toBeGreaterThan(1);
      // Results should be sorted by score (descending)
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].combinedScore).toBeGreaterThanOrEqual(
          results[i].combinedScore,
        );
      }
    });

    it("should filter out results below minimum token score", () => {
      const query = "nonexistent terms";
      const results = enhanceFilmResults(query, mockFilms);

      // Should filter out films that don't match the query well
      expect(results.length).toBeLessThan(mockFilms.length);
    });

    it("should handle empty query", () => {
      const query = "";
      const results = enhanceFilmResults(query, mockFilms);

      expect(results).toHaveLength(mockFilms.length);
      results.forEach((result) => {
        expect(result.tokenScore).toBe(0);
        expect(result.combinedScore).toBe(0.5);
      });
    });
  });

  describe("enhanceDeveloperResults", () => {
    const mockDevelopers: Developer[] = [
      {
        id: "1",
        uuid: "uuid-1",
        slug: "d76",
        name: "D-76",
        manufacturer: "Kodak",
        type: "concentrate",
        filmOrPaper: "film",
        dilutions: [],
        discontinued: 0,
        dateAdded: "2024-01-01",
        notes: "Standard black and white developer",
      },
      {
        id: "2",
        uuid: "uuid-2",
        slug: "hc110",
        name: "HC-110",
        manufacturer: "Kodak",
        type: "concentrate",
        filmOrPaper: "film",
        dilutions: [],
        discontinued: 0,
        dateAdded: "2024-01-02",
        notes: "Versatile developer for various films",
      },
    ];

    it("should enhance and filter developer results", () => {
      const query = "d 76";
      const results = enhanceDeveloperResults(query, mockDevelopers);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].item.name).toBe("D-76");
      expect(results[0].tokenScore).toBeGreaterThan(0.5);
    });

    it("should handle manufacturer searches", () => {
      const query = "kodak";
      const results = enhanceDeveloperResults(query, mockDevelopers);

      expect(results.length).toBe(2); // Both developers are Kodak
      results.forEach((result) => {
        expect(result.matchedTokens).toContain("kodak");
      });
    });
  });

  describe("Configuration", () => {
    it("should respect custom tokenization config", () => {
      const strictConfig: TokenizedSearchConfig = {
        ...DEFAULT_TOKENIZED_CONFIG,
        minTokenScore: 0.8,
        minTokenCoverage: 0.9,
      };

      const mockFilms: Film[] = [
        {
          id: "1",
          uuid: "uuid-1",
          slug: "test",
          name: "Test Film",
          brand: "Test Brand",
          isoSpeed: 400,
          colorType: "Black & White",
          description: "Test description",
          discontinued: 0,
          manufacturerNotes: [],
          dateAdded: "2024-01-01",
        },
      ];

      const lenientResults = enhanceFilmResults(
        "partially",
        mockFilms,
        DEFAULT_TOKENIZED_CONFIG,
      );
      const strictResults = enhanceFilmResults(
        "partially",
        mockFilms,
        strictConfig,
      );

      // Strict config should filter out more results
      expect(strictResults.length).toBeLessThanOrEqual(lenientResults.length);
    });

    it("should be more strict for short specific queries like 'tri x'", () => {
      const mockFilms: Film[] = [
        {
          id: "1",
          uuid: "uuid-1",
          slug: "tri-x-400",
          name: "Tri-X 400",
          brand: "Kodak",
          isoSpeed: 400,
          colorType: "Black & White",
          description: "Professional black and white film",
          discontinued: 0,
          manufacturerNotes: [],
          dateAdded: "2024-01-01",
        },
        {
          id: "2",
          uuid: "uuid-2",
          slug: "ultra-100",
          name: "Xtreme 100",
          brand: "Ultrafine",
          isoSpeed: 100,
          colorType: "Black & White",
          description: "Fast film",
          discontinued: 0,
          manufacturerNotes: [],
          dateAdded: "2024-01-02",
        },
        {
          id: "3",
          uuid: "uuid-3",
          slug: "random-film",
          name: "Random Film",
          brand: "Brand",
          isoSpeed: 400,
          colorType: "Color",
          description: "Extra descriptive text",
          discontinued: 0,
          manufacturerNotes: [],
          dateAdded: "2024-01-03",
        },
      ];

      const results = enhanceFilmResults("tri x", mockFilms);

      // Should only return Tri-X 400, filtering out weak matches
      expect(results.length).toBeLessThanOrEqual(1);
      if (results.length > 0) {
        expect(results[0].item.name).toBe("Tri-X 400");
      }
    });
  });
});
