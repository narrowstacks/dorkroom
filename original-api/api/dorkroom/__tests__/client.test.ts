import { DorkroomClient } from "../client";
import type { HTTPTransport } from "../transport";
import { DataFetchError, DataParseError, DataNotLoadedError } from "../errors";
import type { Film, Developer, Combination } from "../types";

// Mock data for testing
const mockFilms: Film[] = [
  {
    id: "1",
    uuid: "097cf2f5-c5f6-45c0-bfb7-28055b829c66",
    slug: "kodak-tri-x-400",
    name: "Tri-X 400",
    brand: "Kodak",
    isoSpeed: 400,
    colorType: "B&W",
    description: "Professional black and white film",
    discontinued: 0,
    manufacturerNotes: ["Classic grain structure"],
    grainStructure: "Fine grain",
    reciprocityFailure: null,
    dateAdded: new Date().toISOString(),
  },
  {
    id: "2",
    uuid: "4d2a60ec-cefe-429b-8171-1f60e97322f7",
    slug: "kodak-portra-400",
    name: "Portra 400",
    brand: "Kodak",
    isoSpeed: 400,
    colorType: "Color",
    description: "Professional color negative film",
    discontinued: 0,
    manufacturerNotes: ["Excellent skin tones"],
    grainStructure: "Ultra-fine grain",
    dateAdded: new Date().toISOString(),
  },
  {
    id: "3",
    uuid: "f8a5c3b9-7b3b-4c4f-8b3a-1b9b3b4c4f8b",
    slug: "fuji-acros-100",
    name: "Acros 100",
    brand: "Fujifilm",
    isoSpeed: 100,
    colorType: "B&W",
    description: "Fine grain black and white film",
    discontinued: 1,
    manufacturerNotes: ["Discontinued 2018"],
    dateAdded: new Date().toISOString(),
  },
];

const mockDevelopers: Developer[] = [
  {
    id: "1",
    uuid: "4b5fd524-b258-40cf-bec3-9d25c880d250",
    slug: "kodak-d-76",
    name: "D-76",
    manufacturer: "Kodak",
    type: "powder",
    filmOrPaper: "Film",
    dilutions: [
      { id: 1, name: "1:1", dilution: "1:1" },
      { id: 2, name: "1:2", dilution: "1:2" },
    ],
    workingLifeHours: 24,
    stockLifeMonths: 6,
    notes: "Classic black and white developer",
    discontinued: 0,
    mixingInstructions: "Mix with water at 68°F",
    safetyNotes: "Wear gloves when handling",
    dateAdded: new Date().toISOString(),
  },
  {
    id: "2",
    uuid: "e5a9c3b9-7b3b-4c4f-8b3a-1b9b3b4c4f8b",
    slug: "ilford-id-11",
    name: "ID-11",
    manufacturer: "Ilford",
    type: "powder",
    filmOrPaper: "Film",
    dilutions: [{ id: 1, name: "1:1", dilution: "1:1" }],
    workingLifeHours: 24,
    discontinued: 0,
    dateAdded: new Date().toISOString(),
  },
];

const mockCombinations: Combination[] = [
  {
    id: "1",
    uuid: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    slug: "tri-x-400-d-76-1-1",
    name: "Tri-X 400 in D-76 (1:1)",
    filmStockId: "097cf2f5-c5f6-45c0-bfb7-28055b829c66",
    developerId: "4b5fd524-b258-40cf-bec3-9d25c880d250",
    temperatureF: 68,
    timeMinutes: 7.5,
    shootingIso: 400,
    pushPull: 0,
    agitationSchedule: "Initial 30s, then 5s every 30s",
    notes: "Standard development",
    dilutionId: 1,
    dateAdded: new Date().toISOString(),
  },
  {
    id: "2",
    uuid: "b2c3d4e5-f6a7-8901-2345-67890abcdef1",
    slug: "tri-x-400-id-11",
    name: "Tri-X 400 in ID-11",
    filmStockId: "097cf2f5-c5f6-45c0-bfb7-28055b829c66",
    developerId: "e5a9c3b9-7b3b-4c4f-8b3a-1b9b3b4c4f8b",
    temperatureF: 68,
    timeMinutes: 8,
    shootingIso: 400,
    pushPull: 0,
    dateAdded: new Date().toISOString(),
  },
  {
    id: "3",
    uuid: "c3d4e5f6-a7b8-9012-3456-7890abcdef2",
    slug: "portra-400-d-76",
    name: "Portra 400 C-41",
    filmStockId: "4d2a60ec-cefe-429b-8171-1f60e97322f7",
    developerId: "4b5fd524-b258-40cf-bec3-9d25c880d250", // Not realistic but for testing
    temperatureF: 100,
    timeMinutes: 3.25,
    shootingIso: 400,
    pushPull: 0,
    dateAdded: new Date().toISOString(),
  },
];

// Mock transport implementation
class MockHTTPTransport implements HTTPTransport {
  private shouldFail: boolean = false;
  private shouldFailJSON: boolean = false;
  private customResponses: Map<string, any> = new Map();

  setFailure(fail: boolean) {
    this.shouldFail = fail;
  }

  setJSONFailure(fail: boolean) {
    this.shouldFailJSON = fail;
  }

  setCustomResponse(resource: string, data: any) {
    this.customResponses.set(resource, data);
  }

  async get(url: string, timeout: number): Promise<Response> {
    if (this.shouldFail) {
      throw new Error("Network error");
    }

    // Extract resource from URL
    const urlObj = new URL(url);
    const resource = urlObj.pathname.split("/").pop() || "";

    let responseData: any;
    if (this.customResponses.has(resource)) {
      responseData = this.customResponses.get(resource);
    } else {
      // Default mock responses
      let data: any;
      switch (resource) {
        case "films":
          data = mockFilms;
          break;
        case "developers":
          data = mockDevelopers;
          break;
        case "combinations":
          data = mockCombinations;
          break;
        default:
          throw new Error(`Unknown resource: ${resource}`);
      }

      // For combinations, check if this is a paginated request
      if (
        resource === "combinations" &&
        (urlObj.searchParams.has("count") || urlObj.searchParams.has("page"))
      ) {
        responseData = {
          data,
          count: data.length,
          page: parseInt(urlObj.searchParams.get("page") || "1"),
          perPage: parseInt(urlObj.searchParams.get("count") || "25"),
        };
      } else {
        responseData = {
          data,
          success: true,
          message: `Found ${data.length} items`,
          total: data.length,
        };
      }
    }

    const responseText = this.shouldFailJSON
      ? "invalid json"
      : JSON.stringify(responseData);

    return new Response(responseText, {
      status: 200,
      statusText: "OK",
      headers: { "Content-Type": "application/json" },
    });
  }
}

describe("DorkroomClient", () => {
  let client: DorkroomClient;
  let mockTransport: MockHTTPTransport;

  beforeEach(async () => {
    mockTransport = new MockHTTPTransport();
    // @ts-ignore - Accessing private property for testing
    client = new DorkroomClient();
    // @ts-ignore - Replacing transport for testing
    client["transport"] = mockTransport;
    await client.loadAll();
  });

  describe("Initialization", () => {
    it("should initialize with default configuration", () => {
      expect(client).toBeInstanceOf(DorkroomClient);
      expect(client.isLoaded()).toBe(true);
    });

    it("should initialize with custom configuration", () => {
      const customClient = new DorkroomClient({
        baseUrl: "https://custom.api.com/",
        timeout: 5000,
        maxRetries: 5,
      });
      expect(customClient).toBeInstanceOf(DorkroomClient);
    });
  });

  describe("Data Loading", () => {
    it("should load all data successfully", async () => {
      expect(client.isLoaded()).toBe(true);

      const stats = client.getStats();
      expect(stats.films).toBe(mockFilms.length);
      expect(stats.developers).toBe(mockDevelopers.length);
      expect(stats.combinations).toBe(mockCombinations.length);
    });

    it("should handle network errors during loading", async () => {
      // Reset client and transport to test failure
      const newClient = new DorkroomClient();
      const newTransport = new MockHTTPTransport();
      // @ts-ignore
      newClient["transport"] = newTransport;
      newTransport.setFailure(true);

      await expect(newClient.loadAll()).rejects.toThrow(DataFetchError);
      expect(newClient.isLoaded()).toBe(false);
    });

    it("should handle JSON parsing errors during loading", async () => {
      // Reset client and transport to test failure
      const newClient = new DorkroomClient();
      const newTransport = new MockHTTPTransport();
      // @ts-ignore
      newClient["transport"] = newTransport;
      newTransport.setJSONFailure(true);

      await expect(newClient.loadAll()).rejects.toThrow(DataParseError);
      expect(newClient.isLoaded()).toBe(false);
    });
  });

  describe("Data Access Before Loading", () => {
    it("should throw DataNotLoadedError when accessing data before loading", () => {
      const newClient = new DorkroomClient();
      expect(() => newClient.getFilm("any-id")).toThrow(DataNotLoadedError);
      expect(() => newClient.getDeveloper("any-id")).toThrow(
        DataNotLoadedError,
      );
      expect(() => newClient.getAllFilms()).toThrow(DataNotLoadedError);
      expect(() => newClient.searchFilms("query")).toThrow(DataNotLoadedError);
    });

    it("should get film by UUID", () => {
      const film = client.getFilm("097cf2f5-c5f6-45c0-bfb7-28055b829c66");
      expect(film).toBeDefined();
      expect(film?.name).toBe("Tri-X 400");
      expect(film?.brand).toBe("Kodak");
    });

    it("should return undefined for non-existent film UUID", () => {
      const film = client.getFilm("non-existent-film");
      expect(film).toBeUndefined();
    });

    it("should get all films", () => {
      const films = client.getAllFilms();
      expect(films).toHaveLength(mockFilms.length);
      expect(films[0].name).toBe("Tri-X 400");
    });

    it("should search films by name", () => {
      const results = client.searchFilms("tri-x");
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Tri-X 400");
    });

    it("should search films by brand", () => {
      const results = client.searchFilms("kodak");
      expect(results).toHaveLength(2);
    });

    it("should search films by name and color type", () => {
      const results = client.searchFilms("400", "Color");
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Portra 400");
    });

    it("should return empty array for non-matching search", () => {
      const results = client.searchFilms("non-existent");
      expect(results).toHaveLength(0);
    });

    it("should fuzzy search films via the API", async () => {
      const results = await client.fuzzySearchFilms("Trix");
      // In a real scenario, the mock transport would check the URL
      // and return a specific subset of data. For this test, we
      // assume the mock returns the full dataset if not customized.
      expect(results).toHaveLength(mockFilms.length);
    });
  });

  describe("Developer Operations", () => {
    it("should get developer by UUID", () => {
      const developer = client.getDeveloper(
        "4b5fd524-b258-40cf-bec3-9d25c880d250",
      );
      expect(developer).toBeDefined();
      expect(developer?.name).toBe("D-76");
    });

    it("should search developers by name", () => {
      const results = client.searchDevelopers("d-76");
      expect(results).toHaveLength(1);
      expect(results[0].manufacturer).toBe("Kodak");
    });

    it("should fuzzy search developers via the API", async () => {
      const results = await client.fuzzySearchDevelopers("D76");
      expect(results).toHaveLength(mockDevelopers.length);
    });
  });

  describe("Combination Operations", () => {
    it("should get combination by UUID", () => {
      const combination = client.getCombination(
        "a1b2c3d4-e5f6-7890-1234-567890abcdef",
      );
      expect(combination).toBeDefined();
      expect(combination?.name).toBe("Tri-X 400 in D-76 (1:1)");
    });

    it("should get combinations for a film", () => {
      const combinations = client.getCombinationsForFilm(
        "097cf2f5-c5f6-45c0-bfb7-28055b829c66",
      );
      expect(combinations).toHaveLength(2);
    });

    it("should get combinations for a developer", () => {
      const combinations = client.getCombinationsForDeveloper(
        "4b5fd524-b258-40cf-bec3-9d25c880d250",
      );
      expect(combinations).toHaveLength(2);
    });
  });

  describe("Client State", () => {
    it("should reset the client state", async () => {
      expect(client.isLoaded()).toBe(true);

      client.reset();

      expect(client.isLoaded()).toBe(false);
      expect(() => client.getStats()).toThrow(DataNotLoadedError);
    });
  });

  describe("Enhanced Server-Side Filtering", () => {
    beforeEach(() => {
      // Set up mock responses for paginated API calls
      const paginatedResponse = {
        data: mockCombinations,
        count: mockCombinations.length,
        page: 1,
        perPage: 25,
      };
      mockTransport.setCustomResponse("combinations", paginatedResponse);
    });

    it("should fetch combinations with default options", async () => {
      const result = await client.fetchCombinations();
      expect(result.data).toHaveLength(mockCombinations.length);
      expect(result.count).toBe(mockCombinations.length);
    });

    it("should fetch combinations filtered by film slug", async () => {
      const filteredCombinations = mockCombinations.filter(
        (c) => c.filmStockId === "097cf2f5-c5f6-45c0-bfb7-28055b829c66",
      );
      mockTransport.setCustomResponse("combinations", {
        data: filteredCombinations,
        count: filteredCombinations.length,
        filters: { film: "kodak-tri-x-400" },
      });

      const result = await client.fetchCombinations({
        filmSlug: "kodak-tri-x-400",
      });
      expect(result.data).toHaveLength(2); // Should match the mock data
      expect(result.filters?.film).toBe("kodak-tri-x-400");
    });

    it("should fetch combinations filtered by developer slug", async () => {
      const filteredCombinations = mockCombinations.filter(
        (c) => c.developerId === "4b5fd524-b258-40cf-bec3-9d25c880d250",
      );
      mockTransport.setCustomResponse("combinations", {
        data: filteredCombinations,
        count: filteredCombinations.length,
        filters: { developer: "kodak-d-76" },
      });

      const result = await client.fetchCombinations({
        developerSlug: "kodak-d-76",
      });
      expect(result.data).toHaveLength(2);
      expect(result.filters?.developer).toBe("kodak-d-76");
    });

    it("should fetch combinations with combined filters", async () => {
      const singleCombination = [mockCombinations[0]];
      mockTransport.setCustomResponse("combinations", {
        data: singleCombination,
        count: 1,
        filters: { film: "kodak-tri-x-400", developer: "kodak-d-76" },
      });

      const result = await client.fetchCombinations({
        filmSlug: "kodak-tri-x-400",
        developerSlug: "kodak-d-76",
      });
      expect(result.data).toHaveLength(1);
      expect(result.filters?.film).toBe("kodak-tri-x-400");
      expect(result.filters?.developer).toBe("kodak-d-76");
    });

    it("should fetch paginated combinations", async () => {
      const paginatedResponse = {
        data: mockCombinations.slice(0, 1),
        count: mockCombinations.length,
        page: 2,
        perPage: 1,
      };
      mockTransport.setCustomResponse("combinations", paginatedResponse);

      const result = await client.getPaginatedCombinations(2, 1);
      expect(result.data).toHaveLength(1);
      expect(result.page).toBe(2);
      expect(result.perPage).toBe(1);
      expect(result.count).toBe(mockCombinations.length);
    });

    it("should get combinations for film slug", async () => {
      const filteredCombinations = mockCombinations.filter(
        (c) => c.filmStockId === "097cf2f5-c5f6-45c0-bfb7-28055b829c66",
      );
      mockTransport.setCustomResponse("combinations", {
        data: filteredCombinations,
        count: filteredCombinations.length,
      });

      const result = await client.getCombinationsForFilmSlug("kodak-tri-x-400");
      expect(result).toHaveLength(2);
    });

    it("should get combinations for developer slug", async () => {
      const filteredCombinations = mockCombinations.filter(
        (c) => c.developerId === "4b5fd524-b258-40cf-bec3-9d25c880d250",
      );
      mockTransport.setCustomResponse("combinations", {
        data: filteredCombinations,
        count: filteredCombinations.length,
      });

      const result = await client.getCombinationsForDeveloperSlug("kodak-d-76");
      expect(result).toHaveLength(2);
    });

    it("should get combinations for film and developer slug", async () => {
      const singleCombination = [mockCombinations[0]];
      mockTransport.setCustomResponse("combinations", {
        data: singleCombination,
        count: 1,
      });

      const result = await client.getCombinationsForFilmAndDeveloper(
        "kodak-tri-x-400",
        "kodak-d-76",
      );
      expect(result).toHaveLength(1);
    });

    it("should get combination by ID", async () => {
      const singleCombination = [mockCombinations[0]];
      mockTransport.setCustomResponse("combinations", {
        data: singleCombination,
        count: 1,
      });

      const result = await client.getCombinationById(
        "a1b2c3d4-e5f6-7890-1234-567890abcdef",
      );
      expect(result).toBeDefined();
      expect(result?.name).toBe("Tri-X 400 in D-76 (1:1)");
    });

    it("should return null for non-existent combination ID", async () => {
      mockTransport.setCustomResponse("combinations", {
        data: [],
        count: 0,
      });

      const result = await client.getCombinationById("non-existent-id");
      expect(result).toBeNull();
    });
  });
});
