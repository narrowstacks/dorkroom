export interface CustomRecipe {
  id: string;
  name: string;
  filmId: string; // UUID of existing film OR custom film data
  developerId: string; // UUID of existing developer OR custom developer data
  temperatureF: number;
  timeMinutes: number;
  shootingIso: number;
  pushPull: number;
  agitationSchedule?: string;
  notes?: string;
  dilutionId?: number;
  customDilution?: string;
  isCustomFilm: boolean;
  isCustomDeveloper: boolean;
  customFilm?: CustomFilmData;
  customDeveloper?: CustomDeveloperData;
  dateCreated: string;
  dateModified: string;
  isPublic: boolean; // Whether to suggest submitting to GitHub
}

export interface CustomFilmData {
  brand: string;
  name: string;
  isoSpeed: number;
  colorType: 'bw' | 'color' | 'slide';
  grainStructure?: string;
  description?: string;
}

export interface CustomDeveloperData {
  manufacturer: string;
  name: string;
  type: string;
  filmOrPaper: 'film' | 'paper' | 'both';
  workingLifeHours?: number;
  stockLifeMonths?: number;
  notes?: string;
  mixingInstructions?: string;
  safetyNotes?: string;
  dilutions: Array<{
    name: string;
    dilution: string;
  }>;
}

export interface GitHubIssueData {
  title: string;
  body: string;
  labels: string[];
}

export interface CustomRecipeFormData {
  name: string;

  // Film selection
  useExistingFilm: boolean;
  selectedFilmId?: string;
  customFilm?: CustomFilmData;

  // Developer selection
  useExistingDeveloper: boolean;
  selectedDeveloperId?: string;
  customDeveloper?: CustomDeveloperData;

  // Development parameters
  temperatureF: number;
  timeMinutes: number;
  shootingIso: number;
  pushPull: number;
  agitationSchedule: string;
  notes: string;
  customDilution: string;

  // Metadata
  isPublic: boolean;
}
