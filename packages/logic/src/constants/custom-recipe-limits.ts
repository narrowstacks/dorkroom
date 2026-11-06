/**
 * The longest text a custom recipe keeps, in characters. The form refuses
 * anything longer and the store and share links cut to fit, so these are the
 * one place both sides read from.
 */
export const RECIPE_TEXT_LIMITS = {
  recipeName: 200,
  agitationSchedule: 500,
  customDilution: 100,
  dilutionId: 100,
  recipeNotes: 2000,
  tag: 50,
  filmBrand: 100,
  filmName: 100,
  grainStructure: 100,
  filmDescription: 500,
  developerManufacturer: 100,
  developerName: 100,
  developerType: 100,
  developerNotes: 1000,
  mixingInstructions: 2000,
  safetyNotes: 1000,
  dilutionLabel: 50,
} as const;

/**
 * The longest development time the form accepts. The longest published recipe
 * is 480 minutes, and a day leaves room for extreme stand development. Only the
 * form applies this: stored recipes and share links with longer times still load.
 */
export const MAX_RECIPE_TIME_MINUTES = 1440;
