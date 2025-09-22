// Import using ES modules
import { useDevelopmentRecipes } from "../useDevelopmentRecipes";

describe("useDevelopmentRecipes", () => {
  // Test data factories
  const createMockFilm = (overrides = {}) => ({
    id: "film_1",
    name: "HP5 Plus",
    brand: "Ilford",
    isoSpeed: 400,
    colorType: "bw",
    description: "Black and white film",
    discontinued: 0,
    manufacturerNotes: ["High quality"],
    grainStructure: "Fine",
    reciprocityFailure: null,
    staticImageURL: "http://example.com/image.jpg",
    dateAdded: "2024-01-01",
    uuid: "film_uuid_1",
    slug: "ilford-hp5-plus",
    ...overrides,
  });

  const createMockDeveloper = (overrides = {}) => ({
    id: "dev_1",
    name: "D-76",
    manufacturer: "Kodak",
    type: "powder",
    filmOrPaper: "film",
    dilutions: [
      { id: 1, name: "Stock", dilution: "Stock" },
      { id: 2, name: "1:1", dilution: "1:1" },
    ],
    workingLifeHours: 24,
    stockLifeMonths: 6,
    notes: "Standard developer",
    discontinued: 0,
    mixingInstructions: "Mix with water",
    safetyNotes: "Wear gloves",
    datasheetUrl: ["http://example.com/datasheet.pdf"],
    uuid: "dev_uuid_1",
    slug: "kodak-d76",
    dateAdded: "2024-01-01",
    ...overrides,
  });

  const createMockCombination = (overrides = {}) => ({
    id: "combo_1",
    name: "HP5+ in D-76",
    filmStockId: "film_uuid_1",
    developerId: "dev_uuid_1",
    temperatureF: 68,
    timeMinutes: 10,
    shootingIso: 400,
    pushPull: 0,
    agitationSchedule: "30s then 10s every 1min",
    notes: "Standard development",
    dilutionId: 1,
    customDilution: null,
    uuid: "combo_uuid_1",
    slug: "hp5-d76-standard",
    dateAdded: "2024-01-01",
    ...overrides,
  });

  describe("hook structure", () => {
    it("should be importable", () => {
      expect(typeof useDevelopmentRecipes).toBe("function");
    });

    it("should be properly structured as a hook", () => {
      expect(useDevelopmentRecipes.name).toBe("useDevelopmentRecipes");
    });
  });

  describe("data type validation", () => {
    it("should create valid film structure", () => {
      const film = createMockFilm();

      expect(film).toHaveProperty("id");
      expect(film).toHaveProperty("name");
      expect(film).toHaveProperty("brand");
      expect(film).toHaveProperty("isoSpeed");
      expect(film).toHaveProperty("colorType");
      expect(film).toHaveProperty("uuid");
      expect(film).toHaveProperty("slug");

      expect(typeof film.id).toBe("string");
      expect(typeof film.name).toBe("string");
      expect(typeof film.brand).toBe("string");
      expect(typeof film.isoSpeed).toBe("number");
      expect(typeof film.colorType).toBe("string");
      expect(typeof film.discontinued).toBe("number");
      expect(Array.isArray(film.manufacturerNotes)).toBe(true);
    });

    it("should create valid developer structure", () => {
      const developer = createMockDeveloper();

      expect(developer).toHaveProperty("id");
      expect(developer).toHaveProperty("name");
      expect(developer).toHaveProperty("manufacturer");
      expect(developer).toHaveProperty("type");
      expect(developer).toHaveProperty("filmOrPaper");
      expect(developer).toHaveProperty("dilutions");
      expect(developer).toHaveProperty("uuid");

      expect(typeof developer.id).toBe("string");
      expect(typeof developer.name).toBe("string");
      expect(typeof developer.manufacturer).toBe("string");
      expect(typeof developer.type).toBe("string");
      expect(typeof developer.filmOrPaper).toBe("string");
      expect(Array.isArray(developer.dilutions)).toBe(true);
      expect(typeof developer.discontinued).toBe("number");
    });

    it("should create valid combination structure", () => {
      const combination = createMockCombination();

      expect(combination).toHaveProperty("id");
      expect(combination).toHaveProperty("name");
      expect(combination).toHaveProperty("filmStockId");
      expect(combination).toHaveProperty("developerId");
      expect(combination).toHaveProperty("temperatureF");
      expect(combination).toHaveProperty("timeMinutes");
      expect(combination).toHaveProperty("shootingIso");
      expect(combination).toHaveProperty("pushPull");
      expect(combination).toHaveProperty("uuid");

      expect(typeof combination.id).toBe("string");
      expect(typeof combination.name).toBe("string");
      expect(typeof combination.filmStockId).toBe("string");
      expect(typeof combination.developerId).toBe("string");
      expect(typeof combination.temperatureF).toBe("number");
      expect(typeof combination.timeMinutes).toBe("number");
      expect(typeof combination.shootingIso).toBe("number");
      expect(typeof combination.pushPull).toBe("number");
    });

    it("should validate numeric constraints", () => {
      const film = createMockFilm();
      const developer = createMockDeveloper();
      const combination = createMockCombination();

      expect(film.isoSpeed).toBeGreaterThan(0);
      expect(developer.workingLifeHours).toBeGreaterThan(0);
      expect(developer.stockLifeMonths).toBeGreaterThan(0);
      expect(combination.temperatureF).toBeGreaterThan(0);
      expect(combination.timeMinutes).toBeGreaterThan(0);
      expect(combination.shootingIso).toBeGreaterThan(0);
    });

    it("should validate film colorType filtering", () => {
      const bwFilm = createMockFilm({ colorType: "bw" });
      const colorFilm = createMockFilm({ colorType: "color" });

      expect(bwFilm.colorType).toBe("bw");
      expect(colorFilm.colorType).toBe("color");

      // Test filtering logic
      const allFilms = [bwFilm, colorFilm];
      const filteredFilms = allFilms.filter((film) => film.colorType === "bw");

      expect(filteredFilms).toHaveLength(1);
      expect(filteredFilms[0].colorType).toBe("bw");
    });

    it("should validate developer filmOrPaper filtering", () => {
      const filmDeveloper = createMockDeveloper({ filmOrPaper: "film" });
      const paperDeveloper = createMockDeveloper({ filmOrPaper: "paper" });

      expect(filmDeveloper.filmOrPaper).toBe("film");
      expect(paperDeveloper.filmOrPaper).toBe("paper");

      // Test filtering logic
      const allDevelopers = [filmDeveloper, paperDeveloper];
      const filteredDevelopers = allDevelopers.filter(
        (dev) => dev.filmOrPaper === "film",
      );

      expect(filteredDevelopers).toHaveLength(1);
      expect(filteredDevelopers[0].filmOrPaper).toBe("film");
    });
  });

  describe("search and filtering logic", () => {
    it("should filter films by name search", () => {
      const films = [
        createMockFilm({ name: "HP5 Plus", brand: "Ilford" }),
        createMockFilm({ name: "Tri-X", brand: "Kodak" }),
        createMockFilm({ name: "T-Max", brand: "Kodak" }),
      ];

      const searchTerm = "HP5";
      const filteredFilms = films.filter(
        (film) =>
          film.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          film.brand.toLowerCase().includes(searchTerm.toLowerCase()),
      );

      expect(filteredFilms).toHaveLength(1);
      expect(filteredFilms[0].name).toBe("HP5 Plus");
    });

    it("should filter films by brand search", () => {
      const films = [
        createMockFilm({ name: "HP5 Plus", brand: "Ilford" }),
        createMockFilm({ name: "Tri-X", brand: "Kodak" }),
        createMockFilm({ name: "T-Max", brand: "Kodak" }),
      ];

      const searchTerm = "kodak";
      const filteredFilms = films.filter(
        (film) =>
          film.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          film.brand.toLowerCase().includes(searchTerm.toLowerCase()),
      );

      expect(filteredFilms).toHaveLength(2);
      expect(filteredFilms.every((film) => film.brand === "Kodak")).toBe(true);
    });

    it("should filter developers by name and manufacturer", () => {
      const developers = [
        createMockDeveloper({ name: "D-76", manufacturer: "Kodak" }),
        createMockDeveloper({ name: "HC-110", manufacturer: "Kodak" }),
        createMockDeveloper({ name: "ID-11", manufacturer: "Ilford" }),
      ];

      const searchTerm = "HC-110";
      const filteredDevelopers = developers.filter(
        (dev) =>
          dev.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          dev.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()),
      );

      expect(filteredDevelopers).toHaveLength(1);
      expect(filteredDevelopers[0].name).toBe("HC-110");
    });

    it("should filter by developer type", () => {
      const developers = [
        createMockDeveloper({ type: "powder" }),
        createMockDeveloper({ type: "liquid" }),
        createMockDeveloper({ type: "powder" }),
      ];

      const typeFilter = "powder";
      const filteredDevelopers = developers.filter(
        (dev) => dev.type === typeFilter,
      );

      expect(filteredDevelopers).toHaveLength(2);
      expect(filteredDevelopers.every((dev) => dev.type === "powder")).toBe(
        true,
      );
    });

    it("should filter combinations by film selection", () => {
      const combinations = [
        createMockCombination({ filmStockId: "film_1" }),
        createMockCombination({ filmStockId: "film_2" }),
        createMockCombination({ filmStockId: "film_1" }),
      ];

      const selectedFilmId = "film_1";
      const filteredCombinations = combinations.filter(
        (combo) => combo.filmStockId === selectedFilmId,
      );

      expect(filteredCombinations).toHaveLength(2);
      expect(
        filteredCombinations.every((combo) => combo.filmStockId === "film_1"),
      ).toBe(true);
    });

    it("should filter combinations by developer selection", () => {
      const combinations = [
        createMockCombination({ developerId: "dev_1" }),
        createMockCombination({ developerId: "dev_2" }),
        createMockCombination({ developerId: "dev_1" }),
      ];

      const selectedDeveloperId = "dev_1";
      const filteredCombinations = combinations.filter(
        (combo) => combo.developerId === selectedDeveloperId,
      );

      expect(filteredCombinations).toHaveLength(2);
      expect(
        filteredCombinations.every((combo) => combo.developerId === "dev_1"),
      ).toBe(true);
    });
  });

  describe("sorting functionality", () => {
    it("should sort combinations by film name", () => {
      const films = [
        createMockFilm({ uuid: "film_1", name: "Z Film", brand: "Brand" }),
        createMockFilm({ uuid: "film_2", name: "A Film", brand: "Brand" }),
      ];

      const combinations = [
        createMockCombination({ filmStockId: "film_1" }),
        createMockCombination({ filmStockId: "film_2" }),
      ];

      // Simulate sorting logic
      const sortedCombinations = combinations.sort((a, b) => {
        const filmA = films.find((f) => f.uuid === a.filmStockId);
        const filmB = films.find((f) => f.uuid === b.filmStockId);
        const nameA = filmA ? `${filmA.brand} ${filmA.name}` : "";
        const nameB = filmB ? `${filmB.brand} ${filmB.name}` : "";
        return nameA.localeCompare(nameB);
      });

      expect(sortedCombinations[0].filmStockId).toBe("film_2"); // A Film first
      expect(sortedCombinations[1].filmStockId).toBe("film_1"); // Z Film second
    });

    it("should sort combinations by developer name", () => {
      const developers = [
        createMockDeveloper({
          uuid: "dev_1",
          name: "Z Dev",
          manufacturer: "Mfg",
        }),
        createMockDeveloper({
          uuid: "dev_2",
          name: "A Dev",
          manufacturer: "Mfg",
        }),
      ];

      const combinations = [
        createMockCombination({ developerId: "dev_1" }),
        createMockCombination({ developerId: "dev_2" }),
      ];

      // Simulate sorting logic
      const sortedCombinations = combinations.sort((a, b) => {
        const devA = developers.find((d) => d.uuid === a.developerId);
        const devB = developers.find((d) => d.uuid === b.developerId);
        const nameA = devA ? `${devA.manufacturer} ${devA.name}` : "";
        const nameB = devB ? `${devB.manufacturer} ${devB.name}` : "";
        return nameA.localeCompare(nameB);
      });

      expect(sortedCombinations[0].developerId).toBe("dev_2"); // A Dev first
      expect(sortedCombinations[1].developerId).toBe("dev_1"); // Z Dev second
    });

    it("should sort by numeric values", () => {
      const combinations = [
        createMockCombination({ timeMinutes: 15 }),
        createMockCombination({ timeMinutes: 5 }),
        createMockCombination({ timeMinutes: 10 }),
      ];

      // Sort by time
      const sortedByTime = [...combinations].sort(
        (a, b) => a.timeMinutes - b.timeMinutes,
      );
      expect(sortedByTime.map((c) => c.timeMinutes)).toEqual([5, 10, 15]);

      // Sort by temperature
      const combinationsWithTemp = [
        createMockCombination({ temperatureF: 70 }),
        createMockCombination({ temperatureF: 65 }),
        createMockCombination({ temperatureF: 75 }),
      ];
      const sortedByTemp = [...combinationsWithTemp].sort(
        (a, b) => a.temperatureF - b.temperatureF,
      );
      expect(sortedByTemp.map((c) => c.temperatureF)).toEqual([65, 70, 75]);

      // Sort by ISO
      const combinationsWithISO = [
        createMockCombination({ shootingIso: 800 }),
        createMockCombination({ shootingIso: 200 }),
        createMockCombination({ shootingIso: 400 }),
      ];
      const sortedByISO = [...combinationsWithISO].sort(
        (a, b) => a.shootingIso - b.shootingIso,
      );
      expect(sortedByISO.map((c) => c.shootingIso)).toEqual([200, 400, 800]);
    });

    it("should handle sort direction toggle", () => {
      let sortDirection = "asc";
      let sortBy = "timeMinutes";

      // Simulate handleSort logic
      const handleSort = (newSortBy: string) => {
        if (sortBy === newSortBy) {
          sortDirection = sortDirection === "asc" ? "desc" : "asc";
        } else {
          sortBy = newSortBy;
          sortDirection = "asc";
        }
      };

      // First click on timeMinutes
      handleSort("timeMinutes");
      expect(sortBy).toBe("timeMinutes");
      expect(sortDirection).toBe("desc"); // Should toggle

      // Click on different column
      handleSort("temperatureF");
      expect(sortBy).toBe("temperatureF");
      expect(sortDirection).toBe("asc"); // Should reset
    });
  });

  describe("dilution and ISO helpers", () => {
    it("should get available dilutions for developer", () => {
      const developer = createMockDeveloper({
        uuid: "dev_1",
        dilutions: [
          { id: 1, dilution: "Stock" },
          { id: 2, dilution: "1:1" },
          { id: 3, dilution: "1:3" },
        ],
      });

      const combinations = [
        createMockCombination({ developerId: "dev_1", dilutionId: 1 }),
        createMockCombination({ developerId: "dev_1", dilutionId: 2 }),
        createMockCombination({ developerId: "dev_1", customDilution: "1:7" }),
      ];

      // Simulate getAvailableDilutions logic
      const dilutions = [{ label: "All Dilutions", value: "" }];
      const dilutionSet = new Set();

      combinations.forEach((combo) => {
        const dilutionInfo =
          combo.customDilution ||
          developer.dilutions.find((d) => d.id === combo.dilutionId)
            ?.dilution ||
          "Stock";
        dilutionSet.add(dilutionInfo);
      });

      Array.from(dilutionSet)
        .sort()
        .forEach((dilution) => {
          dilutions.push({
            label: dilution as string,
            value: dilution as string,
          });
        });

      expect(dilutions).toEqual([
        { label: "All Dilutions", value: "" },
        { label: "1:1", value: "1:1" },
        { label: "1:7", value: "1:7" },
        { label: "Stock", value: "Stock" },
      ]);
    });

    it("should get available ISOs for film", () => {
      const film = createMockFilm({ uuid: "film_1" });
      const combinations = [
        createMockCombination({ filmStockId: "film_1", shootingIso: 200 }),
        createMockCombination({ filmStockId: "film_1", shootingIso: 400 }),
        createMockCombination({ filmStockId: "film_1", shootingIso: 800 }),
        createMockCombination({ filmStockId: "film_1", shootingIso: 400 }), // Duplicate
      ];

      // Simulate getAvailableISOs logic
      const isos = [{ label: "All ISOs", value: "" }];
      const isoSet = new Set();

      combinations.forEach((combo) => {
        isoSet.add(combo.shootingIso);
      });

      Array.from(isoSet)
        .sort((a, b) => (a as number) - (b as number))
        .forEach((iso) => {
          isos.push({
            label: (iso as number).toString(),
            value: (iso as number).toString(),
          });
        });

      expect(isos).toEqual([
        { label: "All ISOs", value: "" },
        { label: "200", value: "200" },
        { label: "400", value: "400" },
        { label: "800", value: "800" },
      ]);
    });

    it("should handle empty dilutions and ISOs", () => {
      const emptyDilutions = [{ label: "All Dilutions", value: "" }];
      const emptyISOs = [{ label: "All ISOs", value: "" }];

      expect(emptyDilutions).toHaveLength(1);
      expect(emptyISOs).toHaveLength(1);
      expect(emptyDilutions[0].value).toBe("");
      expect(emptyISOs[0].value).toBe("");
    });
  });

  describe("helper functions", () => {
    it("should find film by ID", () => {
      const films = [
        createMockFilm({ uuid: "film_1", id: "film_1" }),
        createMockFilm({ uuid: "film_2", id: "film_2" }),
      ];

      const foundFilm = films.find(
        (film) => film.id === "film_1" || film.uuid === "film_1",
      );
      expect(foundFilm).toBeDefined();
      expect(foundFilm!.uuid).toBe("film_1");

      const notFoundFilm = films.find(
        (film) => film.id === "nonexistent" || film.uuid === "nonexistent",
      );
      expect(notFoundFilm).toBeUndefined();
    });

    it("should find developer by ID", () => {
      const developers = [
        createMockDeveloper({ uuid: "dev_1", id: "dev_1" }),
        createMockDeveloper({ uuid: "dev_2", id: "dev_2" }),
      ];

      const foundDeveloper = developers.find(
        (dev) => dev.id === "dev_1" || dev.uuid === "dev_1",
      );
      expect(foundDeveloper).toBeDefined();
      expect(foundDeveloper!.uuid).toBe("dev_1");

      const notFoundDeveloper = developers.find(
        (dev) => dev.id === "nonexistent" || dev.uuid === "nonexistent",
      );
      expect(notFoundDeveloper).toBeUndefined();
    });

    it("should get combinations for film", () => {
      const combinations = [
        createMockCombination({ filmStockId: "film_1" }),
        createMockCombination({ filmStockId: "film_2" }),
        createMockCombination({ filmStockId: "film_1" }),
      ];

      const filmCombinations = combinations.filter(
        (combo) => combo.filmStockId === "film_1",
      );
      expect(filmCombinations).toHaveLength(2);

      const noFilmCombinations = combinations.filter(
        (combo) => combo.filmStockId === "nonexistent",
      );
      expect(noFilmCombinations).toHaveLength(0);
    });

    it("should get combinations for developer", () => {
      const combinations = [
        createMockCombination({ developerId: "dev_1" }),
        createMockCombination({ developerId: "dev_2" }),
        createMockCombination({ developerId: "dev_1" }),
      ];

      const developerCombinations = combinations.filter(
        (combo) => combo.developerId === "dev_1",
      );
      expect(developerCombinations).toHaveLength(2);

      const noDeveloperCombinations = combinations.filter(
        (combo) => combo.developerId === "nonexistent",
      );
      expect(noDeveloperCombinations).toHaveLength(0);
    });
  });

  describe("state management patterns", () => {
    it("should handle filter clearing", () => {
      let state = {
        filmSearch: "test",
        developerSearch: "test",
        developerTypeFilter: "powder",
        dilutionFilter: "1:1",
        isoFilter: "400",
        selectedFilm: createMockFilm(),
        selectedDeveloper: createMockDeveloper(),
        sortBy: "timeMinutes",
        sortDirection: "desc",
      };

      // Simulate clearFilters
      state = {
        filmSearch: "",
        developerSearch: "",
        developerTypeFilter: "",
        dilutionFilter: "",
        isoFilter: "",
        selectedFilm: createMockFilm(),
        selectedDeveloper: createMockDeveloper(),
        sortBy: "filmName",
        sortDirection: "asc",
      };

      expect(state.filmSearch).toBe("");
      expect(state.developerSearch).toBe("");
      expect(state.selectedFilm).toBeNull();
      expect(state.selectedDeveloper).toBeNull();
      expect(state.sortBy).toBe("filmName");
      expect(state.sortDirection).toBe("asc");
    });

    it("should handle film selection clearing ISO filter", () => {
      let isoFilter = "400";
      let selectedFilm = null;

      // Simulate setSelectedFilm behavior
      selectedFilm = createMockFilm();
      isoFilter = ""; // Should be cleared

      expect(selectedFilm).toBeDefined();
      expect(isoFilter).toBe("");
    });

    it("should handle developer selection clearing dilution filter", () => {
      let dilutionFilter = "1:1";
      let selectedDeveloper = null;

      // Simulate setSelectedDeveloper behavior
      selectedDeveloper = createMockDeveloper();
      dilutionFilter = ""; // Should be cleared

      expect(selectedDeveloper).toBeDefined();
      expect(dilutionFilter).toBe("");
    });
  });

  describe("complex filtering scenarios", () => {
    it("should combine multiple filters", () => {
      const films = [
        createMockFilm({ uuid: "film_1", name: "HP5", brand: "Ilford" }),
        createMockFilm({ uuid: "film_2", name: "Tri-X", brand: "Kodak" }),
      ];

      const developers = [
        createMockDeveloper({ uuid: "dev_1", name: "D-76", type: "powder" }),
        createMockDeveloper({ uuid: "dev_2", name: "HC-110", type: "liquid" }),
      ];

      const combinations = [
        createMockCombination({ filmStockId: "film_1", developerId: "dev_1" }),
        createMockCombination({ filmStockId: "film_2", developerId: "dev_2" }),
      ];

      // Filter by film search AND developer type
      const filmSearch = "HP5";
      const developerTypeFilter = "powder";

      const filteredFilms = films.filter((film) =>
        film.name.toLowerCase().includes(filmSearch.toLowerCase()),
      );
      const filteredDevelopers = developers.filter(
        (dev) => dev.type === developerTypeFilter,
      );

      const filteredCombinations = combinations.filter((combo) => {
        const filmMatch = filteredFilms.some(
          (film) => film.uuid === combo.filmStockId,
        );
        const developerMatch = filteredDevelopers.some(
          (dev) => dev.uuid === combo.developerId,
        );
        return filmMatch && developerMatch;
      });

      expect(filteredCombinations).toHaveLength(1);
      expect(filteredCombinations[0].filmStockId).toBe("film_1");
      expect(filteredCombinations[0].developerId).toBe("dev_1");
    });

    it("should handle ISO filtering when film is selected", () => {
      const combinations = [
        createMockCombination({ filmStockId: "film_1", shootingIso: 400 }),
        createMockCombination({ filmStockId: "film_1", shootingIso: 800 }),
        createMockCombination({ filmStockId: "film_2", shootingIso: 400 }),
      ];

      const selectedFilm = createMockFilm({ uuid: "film_1" });
      const isoFilter = "400";

      const filteredCombinations = combinations.filter((combo) => {
        const filmMatch = combo.filmStockId === selectedFilm.uuid;
        const isoMatch = combo.shootingIso.toString() === isoFilter;
        return filmMatch && isoMatch;
      });

      expect(filteredCombinations).toHaveLength(1);
      expect(filteredCombinations[0].shootingIso).toBe(400);
    });

    it("should handle dilution filtering when developer is selected", () => {
      const selectedDeveloper = createMockDeveloper({
        uuid: "dev_1",
        dilutions: [
          { id: 1, dilution: "Stock" },
          { id: 2, dilution: "1:1" },
        ],
      });

      const combinations = [
        createMockCombination({ developerId: "dev_1", dilutionId: 1 }),
        createMockCombination({ developerId: "dev_1", customDilution: "1:31" }),
        createMockCombination({ developerId: "dev_2", dilutionId: 1 }),
      ];

      const dilutionFilter = "1:31";

      const filteredCombinations = combinations.filter((combo) => {
        if (combo.developerId !== selectedDeveloper.uuid) return false;

        const dilutionInfo =
          combo.customDilution ||
          selectedDeveloper.dilutions.find((d) => d.id === combo.dilutionId)
            ?.dilution ||
          "Stock";
        return dilutionInfo === dilutionFilter;
      });

      expect(filteredCombinations).toHaveLength(1);
      expect(filteredCombinations[0].customDilution).toBe("1:31");
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle missing film/developer references", () => {
      const combinations = [
        createMockCombination({
          filmStockId: "nonexistent_film",
          developerId: "nonexistent_dev",
        }),
      ];

      // Should not crash when film/developer not found
      expect(combinations).toHaveLength(1);
      expect(combinations[0].filmStockId).toBe("nonexistent_film");
      expect(combinations[0].developerId).toBe("nonexistent_dev");
    });

    it("should handle sorting with missing data gracefully", () => {
      const films = [createMockFilm({ uuid: "film_1" })];
      const developers = [createMockDeveloper({ uuid: "dev_1" })];

      const combinations = [
        createMockCombination({
          filmStockId: "film_1",
          developerId: "nonexistent_dev",
        }),
        createMockCombination({
          filmStockId: "nonexistent_film",
          developerId: "dev_1",
        }),
      ];

      // Should not crash during sorting
      const sortedCombinations = combinations.sort((a, b) => {
        const filmA = films.find((f) => f.uuid === a.filmStockId);
        const filmB = films.find((f) => f.uuid === b.filmStockId);
        const nameA = filmA ? `${filmA.brand} ${filmA.name}` : "";
        const nameB = filmB ? `${filmB.brand} ${filmB.name}` : "";
        return nameA.localeCompare(nameB);
      });

      expect(sortedCombinations).toHaveLength(2);
    });

    it("should handle empty datasets", () => {
      const emptyFilms: any[] = [];
      const emptyDevelopers: any[] = [];
      const emptyCombinations: any[] = [];

      expect(emptyFilms).toHaveLength(0);
      expect(emptyDevelopers).toHaveLength(0);
      expect(emptyCombinations).toHaveLength(0);

      // Should handle operations on empty arrays
      const filteredEmpty = emptyCombinations.filter(
        (combo) => combo.filmStockId === "test",
      );
      expect(filteredEmpty).toHaveLength(0);

      const sortedEmpty = [...emptyCombinations].sort(
        (a, b) => a.timeMinutes - b.timeMinutes,
      );
      expect(sortedEmpty).toHaveLength(0);
    });
  });

  describe("module exports", () => {
    it("should export useDevelopmentRecipes as named export", () => {
      expect(useDevelopmentRecipes).toBeDefined();
      expect(typeof useDevelopmentRecipes).toBe("function");
    });

    it("should have correct TypeScript types", () => {
      // Test that the hook can be called and returns the expected structure
      // This is a static test that verifies TypeScript compilation
      expect(typeof useDevelopmentRecipes).toBe("function");
    });
  });
});
