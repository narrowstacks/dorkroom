export interface CustomRecipe {
  id: string;
  name: string;
  filmId: string;
  developerId: string;
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
  isPublic: boolean;
  tags?: string[];
  /** External source URL (e.g., filmdev.org recipe link) */
  sourceUrl?: string;
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

export interface CustomRecipeFormData {
  name: string;
  useExistingFilm: boolean;
  selectedFilmId?: string;
  customFilm?: CustomFilmData;
  useExistingDeveloper: boolean;
  selectedDeveloperId?: string;
  customDeveloper?: CustomDeveloperData;
  temperatureF: number;
  timeMinutes: number;
  shootingIso: number;
  pushPull: number;
  agitationSchedule: string;
  notes: string;
  selectedDilutionId?: string; // dilution ID or 'custom'
  customDilution: string;
  isPublic: boolean;
  tags?: string[];
  /** External source URL (e.g., filmdev.org recipe link) */
  sourceUrl?: string;
  // UI-only helper flag for saving flow
  isFavorite?: boolean;
}

export interface GitHubIssueData {
  title: string;
  body: string;
  labels: string[];
}
