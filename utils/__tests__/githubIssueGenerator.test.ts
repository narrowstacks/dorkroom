import {
  createRecipeIssue,
  createFilmIssue,
  createDeveloperIssue,
  createIssueUrl,
  fahrenheitToCelsius,
  celsiusToFahrenheit,
  formatTimeMinutes,
} from '../githubIssueGenerator';
import type {
  CustomRecipe,
  GitHubIssueData,
  CustomFilmData,
  CustomDeveloperData,
} from '@/types/customRecipeTypes';
import type { Film, Developer } from '@/api/dorkroom/types';

describe('githubIssueGenerator', () => {
  // Mock data for testing
  const mockCustomRecipe: CustomRecipe = {
    id: 'test-recipe-1',
    name: 'Test Recipe',
    filmId: 'test-film-1',
    developerId: 'test-developer-1',
    customDilution: '1+9',
    temperatureF: 68,
    timeMinutes: 8,
    shootingIso: 400,
    pushPull: 0,
    agitationSchedule: '30s initial, 5s every 30s',
    notes: 'Test notes for recipe',
    dateCreated: '2024-01-15T10:30:00.000Z',
    sources: 'Test source',
  };

  const mockFilm: Film = {
    id: 'test-film-1',
    name: 'HP5 Plus',
    brand: 'Ilford',
    isoSpeed: 400,
    colorType: 'bw',
    grainStructure: 'fine',
    description: 'Classic black and white film',
  };

  const mockDeveloper: Developer = {
    id: 'test-developer-1',
    name: 'D-76',
    manufacturer: 'Kodak',
    type: 'standard',
    filmOrPaper: 'film',
    workingLifeHours: 24,
    stockLifeMonths: 6,
    mixingInstructions: 'Mix with water',
    safetyNotes: 'Use in ventilated area',
    notes: 'Universal developer',
    dilutions: [
      { name: 'Stock', dilution: 'Stock' },
      { name: '1+1', dilution: '1+1' },
    ],
  };

  const mockCustomFilmData: CustomFilmData = {
    brand: 'Test Brand',
    name: 'Test Film',
    isoSpeed: 200,
    colorType: 'bw',
    grainStructure: 'medium',
    description: 'Test film description',
  };

  const mockCustomDeveloperData: CustomDeveloperData = {
    name: 'Test Developer',
    manufacturer: 'Test Manufacturer',
    type: 'custom',
    filmOrPaper: 'film',
    workingLifeHours: 12,
    stockLifeMonths: 3,
    mixingInstructions: 'Custom mixing',
    safetyNotes: 'Safety notes',
    notes: 'Custom notes',
    dilutions: [
      { name: 'Stock', dilution: 'Stock' },
      { name: '1+9', dilution: '1+9' },
    ],
  };

  // --- createRecipeIssue Tests ---
  describe('createRecipeIssue', () => {
    it('should create correct issue data with complete film and developer', () => {
      const result = createRecipeIssue(
        mockCustomRecipe,
        mockFilm,
        mockDeveloper,
        'Test sources'
      );

      expect(result.title).toBe(
        '[COMBO] Add: Ilford HP5 Plus in Kodak D-76 1+9'
      );
      expect(result.labels).toEqual([
        'data-submission',
        'development-combination',
        'mobile-app',
      ]);
      expect(result.body).toContain('### Combination Name');
      expect(result.body).toContain('Test Recipe');
      expect(result.body).toContain('### Film Brand');
      expect(result.body).toContain('Ilford');
      expect(result.body).toContain('### Film Name');
      expect(result.body).toContain('HP5 Plus');
      expect(result.body).toContain('### Developer Manufacturer');
      expect(result.body).toContain('Kodak');
      expect(result.body).toContain('### Developer Name');
      expect(result.body).toContain('D-76');
      expect(result.body).toContain('### Temperature (°F)');
      expect(result.body).toContain('68');
      expect(result.body).toContain('### Time (minutes)');
      expect(result.body).toContain('8');
      expect(result.body).toContain('### Shooting ISO');
      expect(result.body).toContain('400');
      expect(result.body).toContain('### Push/Pull Stops');
      expect(result.body).toContain('0');
      expect(result.body).toContain('Test sources');
    });

    it('should handle undefined film and developer', () => {
      const result = createRecipeIssue(mockCustomRecipe, undefined, undefined);

      expect(result.title).toBe(
        '[COMBO] Add: Unknown Film in Unknown Developer 1+9'
      );
      expect(result.body).toContain('Unknown');
    });

    it('should handle custom film and developer data', () => {
      const result = createRecipeIssue(
        mockCustomRecipe,
        mockCustomFilmData,
        mockCustomDeveloperData
      );

      expect(result.title).toBe(
        '[COMBO] Add: Test Brand Test Film in Test Manufacturer Test Developer 1+9'
      );
      expect(result.body).toContain('Test Brand');
      expect(result.body).toContain('Test Film');
      expect(result.body).toContain('Test Manufacturer');
      expect(result.body).toContain('Test Developer');
    });

    it('should use Stock dilution when customDilution is not provided', () => {
      const recipeWithoutDilution = {
        ...mockCustomRecipe,
        customDilution: undefined,
      };
      const result = createRecipeIssue(
        recipeWithoutDilution,
        mockFilm,
        mockDeveloper
      );

      expect(result.title).toContain('Stock');
      expect(result.body).toContain('Stock');
    });

    it('should handle empty strings in optional fields', () => {
      const recipeWithEmptyFields = {
        ...mockCustomRecipe,
        agitationSchedule: '',
        notes: '',
      };
      const result = createRecipeIssue(
        recipeWithEmptyFields,
        mockFilm,
        mockDeveloper
      );

      expect(result.body).toContain('### Agitation Schedule');
      expect(result.body).toContain('### Notes');
    });

    it('should include date created in additional information', () => {
      const result = createRecipeIssue(
        mockCustomRecipe,
        mockFilm,
        mockDeveloper
      );

      expect(result.body).toContain('1/15/2024');
      expect(result.body).toContain('DorkroomReact mobile app');
    });
  });

  // --- createFilmIssue Tests ---
  describe('createFilmIssue', () => {
    it('should create correct issue data for custom film', () => {
      const result = createFilmIssue(mockCustomFilmData, 'Film sources');

      expect(result.title).toBe('[FILM] Add: Test Brand Test Film');
      expect(result.labels).toEqual([
        'data-submission',
        'film-stock',
        'mobile-app',
      ]);
      expect(result.body).toContain('### Brand/Manufacturer');
      expect(result.body).toContain('Test Brand');
      expect(result.body).toContain('### Film Name');
      expect(result.body).toContain('Test Film');
      expect(result.body).toContain('### ISO Speed');
      expect(result.body).toContain('200');
      expect(result.body).toContain('### Film Type');
      expect(result.body).toContain('Black & White (bw)');
      expect(result.body).toContain('### Grain Structure');
      expect(result.body).toContain('medium');
      expect(result.body).toContain('Film sources');
    });

    it('should map color type correctly', () => {
      const colorFilm = { ...mockCustomFilmData, colorType: 'color' as const };
      const result = createFilmIssue(colorFilm);

      expect(result.body).toContain('Color Negative (color)');
    });

    it('should map slide type correctly', () => {
      const slideFilm = { ...mockCustomFilmData, colorType: 'slide' as const };
      const result = createFilmIssue(slideFilm);

      expect(result.body).toContain('Color Slide/Transparency (slide)');
    });

    it('should handle unknown color type', () => {
      const unknownFilm = {
        ...mockCustomFilmData,
        colorType: 'unknown' as any,
      };
      const result = createFilmIssue(unknownFilm);

      expect(result.body).toContain('unknown');
    });

    it('should handle empty optional fields', () => {
      const filmWithoutOptionals = {
        ...mockCustomFilmData,
        grainStructure: '',
        description: '',
      };
      const result = createFilmIssue(filmWithoutOptionals);

      expect(result.body).toContain('### Grain Structure');
      expect(result.body).toContain('### Description');
    });

    it('should handle missing sources parameter', () => {
      const result = createFilmIssue(mockCustomFilmData);

      expect(result.body).toContain('### Sources');
    });
  });

  // --- createDeveloperIssue Tests ---
  describe('createDeveloperIssue', () => {
    it('should create correct issue data for custom developer', () => {
      const result = createDeveloperIssue(
        mockCustomDeveloperData,
        'Developer sources'
      );

      expect(result.title).toBe(
        '[DEVELOPER] Add: Test Manufacturer Test Developer'
      );
      expect(result.labels).toEqual([
        'data-submission',
        'developer',
        'mobile-app',
      ]);
      expect(result.body).toContain('### Developer Name');
      expect(result.body).toContain('Test Developer');
      expect(result.body).toContain('### Manufacturer');
      expect(result.body).toContain('Test Manufacturer');
      expect(result.body).toContain('### Developer Type');
      expect(result.body).toContain('custom');
      expect(result.body).toContain('### Intended Use');
      expect(result.body).toContain('film');
      expect(result.body).toContain('### Working Life (hours)');
      expect(result.body).toContain('12');
      expect(result.body).toContain('### Stock Life (months)');
      expect(result.body).toContain('3');
      expect(result.body).toContain('Developer sources');
    });

    it('should map filmOrPaper values correctly', () => {
      const paperDeveloper = {
        ...mockCustomDeveloperData,
        filmOrPaper: 'paper' as const,
      };
      const result = createDeveloperIssue(paperDeveloper);

      expect(result.body).toContain('paper');
    });

    it('should handle both filmOrPaper value', () => {
      const bothDeveloper = {
        ...mockCustomDeveloperData,
        filmOrPaper: 'both' as const,
      };
      const result = createDeveloperIssue(bothDeveloper);

      expect(result.body).toContain('both');
    });

    it('should format dilutions correctly', () => {
      const result = createDeveloperIssue(mockCustomDeveloperData);

      expect(result.body).toContain('Stock: Stock');
      expect(result.body).toContain('1+9: 1+9');
    });

    it('should handle undefined optional fields', () => {
      const developerWithoutOptionals = {
        ...mockCustomDeveloperData,
        workingLifeHours: undefined,
        stockLifeMonths: undefined,
        notes: undefined,
        mixingInstructions: undefined,
        safetyNotes: undefined,
      };
      const result = createDeveloperIssue(developerWithoutOptionals);

      expect(result.body).toContain('### Working Life (hours)');
      expect(result.body).toContain('### Stock Life (months)');
    });
  });

  // --- createIssueUrl Tests ---
  describe('createIssueUrl', () => {
    const mockIssueData: GitHubIssueData = {
      title: 'Test Issue Title',
      body: 'Test issue body content\nWith multiple lines',
      labels: ['test-label', 'another-label'],
    };

    it('should create correct GitHub issue URL', () => {
      const result = createIssueUrl(mockIssueData);

      expect(result).toContain(
        'https://github.com/narrowstacks/dorkroom-static-api/issues/new'
      );
      expect(result).toContain('title=Test+Issue+Title');
      expect(result).toContain('labels=test-label%2Canother-label');
    });

    it('should encode special characters in URL parameters', () => {
      const issueWithSpecialChars: GitHubIssueData = {
        title: 'Title with spaces & symbols',
        body: 'Body with\nnewlines',
        labels: ['label-with-dashes'],
      };
      const result = createIssueUrl(issueWithSpecialChars);

      expect(result).toContain('Title+with+spaces+%26+symbols');
      expect(result).toContain('Body+with%0Anewlines');
    });

    it('should handle empty labels array', () => {
      const issueWithNoLabels: GitHubIssueData = {
        title: 'Test',
        body: 'Test',
        labels: [],
      };
      const result = createIssueUrl(issueWithNoLabels);

      expect(result).toContain('labels=');
    });
  });

  // --- Temperature Conversion Tests ---
  describe('fahrenheitToCelsius', () => {
    it('should convert freezing point correctly', () => {
      expect(fahrenheitToCelsius(32)).toBeCloseTo(0.0);
    });

    it('should convert room temperature correctly', () => {
      expect(fahrenheitToCelsius(68)).toBeCloseTo(20.0);
    });

    it('should convert boiling point correctly', () => {
      expect(fahrenheitToCelsius(212)).toBeCloseTo(100.0);
    });

    it('should handle negative temperatures', () => {
      expect(fahrenheitToCelsius(-40)).toBeCloseTo(-40.0);
    });

    it('should round to one decimal place', () => {
      expect(fahrenheitToCelsius(100)).toBe(37.8);
    });

    it('should handle zero', () => {
      expect(fahrenheitToCelsius(0)).toBeCloseTo(-17.8);
    });
  });

  describe('celsiusToFahrenheit', () => {
    it('should convert freezing point correctly', () => {
      expect(celsiusToFahrenheit(0)).toBeCloseTo(32.0);
    });

    it('should convert room temperature correctly', () => {
      expect(celsiusToFahrenheit(20)).toBeCloseTo(68.0);
    });

    it('should convert boiling point correctly', () => {
      expect(celsiusToFahrenheit(100)).toBeCloseTo(212.0);
    });

    it('should handle negative temperatures', () => {
      expect(celsiusToFahrenheit(-40)).toBeCloseTo(-40.0);
    });

    it('should round to one decimal place', () => {
      expect(celsiusToFahrenheit(37.8)).toBe(100.0);
    });

    it('should handle zero', () => {
      expect(celsiusToFahrenheit(0)).toBe(32.0);
    });
  });

  describe('temperature conversion symmetry', () => {
    it('should be symmetric for common temperatures', () => {
      const testTemperatures = [0, 20, 37, 68, 100];

      testTemperatures.forEach((temp) => {
        const converted = fahrenheitToCelsius(celsiusToFahrenheit(temp));
        expect(converted).toBeCloseTo(temp, 1);
      });
    });
  });

  // --- formatTimeMinutes Tests ---
  describe('formatTimeMinutes', () => {
    it('should format seconds correctly', () => {
      expect(formatTimeMinutes(0.5)).toBe('30s');
      expect(formatTimeMinutes(0.25)).toBe('15s');
      expect(formatTimeMinutes(0.75)).toBe('45s');
    });

    it('should format minutes correctly', () => {
      expect(formatTimeMinutes(1)).toBe('1min');
      expect(formatTimeMinutes(5)).toBe('5min');
      expect(formatTimeMinutes(30)).toBe('30min');
      expect(formatTimeMinutes(59)).toBe('59min');
    });

    it('should format hours correctly', () => {
      expect(formatTimeMinutes(60)).toBe('1h');
      expect(formatTimeMinutes(120)).toBe('2h');
      expect(formatTimeMinutes(180)).toBe('3h');
    });

    it('should format hours and minutes correctly', () => {
      expect(formatTimeMinutes(90)).toBe('1h 30min');
      expect(formatTimeMinutes(125)).toBe('2h 5min');
      expect(formatTimeMinutes(150)).toBe('2h 30min');
    });

    it('should handle very small values', () => {
      expect(formatTimeMinutes(0.1)).toBe('6s');
      expect(formatTimeMinutes(0.01)).toBe('1s');
    });

    it('should handle edge cases', () => {
      expect(formatTimeMinutes(0)).toBe('0s');
      expect(formatTimeMinutes(1440)).toBe('24h'); // 24 hours
    });

    it('should round seconds appropriately', () => {
      expect(formatTimeMinutes(0.4)).toBe('24s');
      expect(formatTimeMinutes(0.6)).toBe('36s');
    });
  });
});
