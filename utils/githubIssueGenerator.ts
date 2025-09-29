import type {
  CustomRecipe,
  GitHubIssueData,
  CustomFilmData,
  CustomDeveloperData,
} from '@/types/customRecipeTypes';
import type { Film, Developer } from '@/api/dorkroom/types';

const REPO_URL = 'https://github.com/narrowstacks/dorkroom-static-api';

/**
 * Creates GitHub issue data for a custom recipe
 */
export function createRecipeIssue(
  recipe: CustomRecipe,
  film: Film | CustomFilmData | undefined,
  developer: Developer | CustomDeveloperData | undefined,
  sources: string = ''
): GitHubIssueData {
  // Create title
  const filmName = film ? `${film.brand} ${film.name}`.trim() : 'Unknown Film';
  const developerName = developer
    ? `${developer.manufacturer} ${developer.name}`.trim()
    : 'Unknown Developer';

  const dilutionInfo = recipe.customDilution || 'Stock';
  const title =
    `[COMBO] Add: ${filmName} in ${developerName} ${dilutionInfo}`.trim();

  // Create body using GitHub issue form format
  const bodyParts = [
    '### Combination Name',
    '',
    recipe.name,
    '',
    '### Film Brand',
    '',
    film?.brand || 'Unknown',
    '',
    '### Film Name',
    '',
    film?.name || 'Unknown',
    '',
    '### Developer Manufacturer',
    '',
    developer?.manufacturer || 'Unknown',
    '',
    '### Developer Name',
    '',
    developer?.name || 'Unknown',
    '',
    '### Dilution Name/Ratio',
    '',
    dilutionInfo,
    '',
    '### Temperature (°F)',
    '',
    recipe.temperatureF.toString(),
    '',
    '### Time (minutes)',
    '',
    recipe.timeMinutes.toString(),
    '',
    '### Shooting ISO',
    '',
    recipe.shootingIso.toString(),
    '',
    '### Push/Pull Stops',
    '',
    recipe.pushPull.toString(),
    '',
    '### Agitation Schedule',
    '',
    recipe.agitationSchedule || '',
    '',
    '### Notes',
    '',
    recipe.notes || '',
    '',
    '### Sources',
    '',
    sources,
    '',
    '### Additional Information',
    '',
    `This recipe was created using DorkroomReact mobile app on ${new Date(
      recipe.dateCreated
    ).toLocaleDateString()}.`,
    '',
    '### Submission Guidelines',
    '',
    '- [x] I have verified this combination is not already in the database',
    '- [x] I have confirmed both the film and developer exist in our database (or submitted them separately)',
    '- [x] I have reliable sources for this development data',
    "- [x] I understand this data will be publicly available under the project's license",
  ];

  return {
    title,
    body: bodyParts.join('\n'),
    labels: ['data-submission', 'development-combination', 'mobile-app'],
  };
}

/**
 * Creates GitHub issue data for a custom film
 */
export function createFilmIssue(
  filmData: CustomFilmData,
  sources: string = ''
): GitHubIssueData {
  const title = `[FILM] Add: ${filmData.brand} ${filmData.name}`.trim();

  // Map colorType to GitHub form values
  const colorTypeMap = {
    bw: 'Black & White (bw)',
    color: 'Color Negative (color)',
    slide: 'Color Slide/Transparency (slide)',
  };
  const colorType = colorTypeMap[filmData.colorType] || filmData.colorType;

  const bodyParts = [
    '### Brand/Manufacturer',
    '',
    filmData.brand,
    '',
    '### Film Name',
    '',
    filmData.name,
    '',
    '### ISO Speed',
    '',
    filmData.isoSpeed.toString(),
    '',
    '### Film Type',
    '',
    colorType,
    '',
    '### Grain Structure',
    '',
    filmData.grainStructure || '',
    '',
    '### Reciprocity Failure Characteristics',
    '',
    '', // Not captured in our simplified form
    '',
    '### Current Production Status',
    '',
    'Currently in production', // Default assumption
    '',
    '### Description',
    '',
    filmData.description || '',
    '',
    '### Manufacturer Notes',
    '',
    '', // Not captured in our simplified form
    '',
    '### Static Image URL',
    '',
    '', // Not captured in our simplified form
    '',
    '### Sources',
    '',
    sources,
    '',
    '### Additional Information',
    '',
    'This film was added using DorkroomReact mobile app.',
    '',
    '### Submission Guidelines',
    '',
    '- [x] I have verified this film is not already in the database',
    '- [x] I have reliable sources for this information',
    "- [x] I understand this data will be publicly available under the project's license",
  ];

  return {
    title,
    body: bodyParts.join('\n'),
    labels: ['data-submission', 'film-stock', 'mobile-app'],
  };
}

/**
 * Creates GitHub issue data for a custom developer
 */
export function createDeveloperIssue(
  developerData: CustomDeveloperData,
  sources: string = ''
): GitHubIssueData {
  const title =
    `[DEVELOPER] Add: ${developerData.manufacturer} ${developerData.name}`.trim();

  // Map filmOrPaper values
  let intendedUse = 'film';
  if (developerData.filmOrPaper === 'paper') {
    intendedUse = 'paper';
  } else if (developerData.filmOrPaper === 'both') {
    intendedUse = 'both';
  }

  // Format dilutions
  const dilutionText = developerData.dilutions
    .map((d) => `${d.name}: ${d.dilution}`)
    .join('\n');

  const bodyParts = [
    '### Developer Name',
    '',
    developerData.name,
    '',
    '### Manufacturer',
    '',
    developerData.manufacturer,
    '',
    '### Developer Type',
    '',
    developerData.type,
    '',
    '### Intended Use',
    '',
    intendedUse,
    '',
    '### Working Life (hours)',
    '',
    developerData.workingLifeHours?.toString() || '',
    '',
    '### Stock Life (months)',
    '',
    developerData.stockLifeMonths?.toString() || '',
    '',
    '### Current Production Status',
    '',
    'Currently in production', // Default assumption
    '',
    '### Notes',
    '',
    developerData.notes || '',
    '',
    '### Mixing Instructions',
    '',
    developerData.mixingInstructions || '',
    '',
    '### Safety Notes',
    '',
    developerData.safetyNotes || '',
    '',
    '### Datasheet URLs',
    '',
    '', // Not captured in our simplified form
    '',
    '### Common Dilutions',
    '',
    dilutionText,
    '',
    '### Sources',
    '',
    sources,
    '',
    '### Additional Information',
    '',
    'This developer was added using DorkroomReact mobile app.',
    '',
    '### Submission Guidelines',
    '',
    '- [x] I have verified this developer is not already in the database',
    '- [x] I have reliable sources for this information',
    "- [x] I understand this data will be publicly available under the project's license",
  ];

  return {
    title,
    body: bodyParts.join('\n'),
    labels: ['data-submission', 'developer', 'mobile-app'],
  };
}

/**
 * Creates a GitHub issue URL with pre-filled data
 */
export function createIssueUrl(issueData: GitHubIssueData): string {
  const baseUrl = `${REPO_URL}/issues/new`;

  const params = new URLSearchParams({
    title: issueData.title,
    body: issueData.body,
    labels: issueData.labels.join(','),
  });

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Temperature conversion utilities
 */
export function fahrenheitToCelsius(fahrenheit: number): number {
  return Math.round((((fahrenheit - 32) * 5) / 9) * 10) / 10;
}

export function celsiusToFahrenheit(celsius: number): number {
  return Math.round(((celsius * 9) / 5 + 32) * 10) / 10;
}

/**
 * Format time in minutes to human readable format
 */
export function formatTimeMinutes(minutes: number): string {
  if (minutes < 1) {
    return `${Math.round(minutes * 60)}s`;
  } else if (minutes < 60) {
    return `${minutes}min`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}min`
      : `${hours}h`;
  }
}
