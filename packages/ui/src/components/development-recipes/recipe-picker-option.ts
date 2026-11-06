import {
  type DevelopmentCombinationView,
  formatClock,
  getKnownCombinationDilution,
  isNonStandardTemperature,
  recipeIdOf,
  type RecipeRow,
  sameDilution,
  type TemperatureUnit,
} from '@dorkroom/logic';
import {
  describeSpeed,
  type RecipeTemperature,
  spokenTime,
  temperatureFlagText,
  temperatureText,
} from './recipe-detail-shared';

/**
 * One row of a recipe list, search result or picker. `value`, `label` and
 * `detail` line up with the logic package's `RecipeOption`, so film and
 * developer options pass straight in.
 */
export interface RecipePickerOption {
  value: string;
  /** Main line. A picker's filter matches this and nothing else. */
  label: string;
  /** Small second line, such as "12 recipes". */
  detail?: string;
  /** Formatted development time, shown at the row's end. */
  time?: string;
  /** Draws the high or low temperature chip when it is not room temperature. */
  temperature?: RecipeTemperature;
  /** Plain text for a room-temperature row that still needs saying, "at 20°C". */
  temperatureNote?: string;
  isCustom?: boolean;
  /** Spoken name. Falls back to the visible lines. */
  accessibleName?: string;
}

export interface RecipeRowOptionSettings {
  unit: TemperatureUnit;
  /** The film's box speed, so a row can read "box speed" or "push +1". */
  boxIso?: number;
}

/** The chip's words for a recipe away from 20°C, for building a spoken name. */
const spokenTemperature = (
  temperature: RecipeTemperature,
  unit: TemperatureUnit
): string =>
  isNonStandardTemperature(temperature.temperatureF)
    ? temperatureFlagText(temperature, unit)
    : temperatureText(temperature, unit);

export const spokenRecipeName = (parts: {
  title: string;
  minutes: number;
  temperature: RecipeTemperature;
  unit: TemperatureUnit;
  isCustom: boolean;
  extra?: string;
}): string =>
  [
    parts.title,
    spokenTime(parts.minutes),
    spokenTemperature(parts.temperature, parts.unit),
    parts.isCustom && 'custom recipe',
    parts.extra,
  ]
    .filter(Boolean)
    .join(', ');

/**
 * A recipe as a row headed by its film and developer. `showRoomTemperature` puts
 * a 20°C recipe's temperature on the second line; anything else gets the chip
 * alone, so it is never said twice.
 */
export function titledRecipeToOption({
  view,
  title,
  dilution,
  unit,
  showRoomTemperature = false,
}: {
  view: DevelopmentCombinationView;
  title: string;
  /** Null when not known: the row then gives the speed alone. */
  dilution: string | null;
  unit: TemperatureUnit;
  showRoomTemperature?: boolean;
}): RecipePickerOption {
  const { combination, source } = view;
  const speed = `EI ${combination.shootingIso}`;
  const recipe = dilution ? `${dilution}, ${speed}` : speed;
  const isCustom = source === 'custom';
  return {
    value: recipeIdOf(view),
    label: title,
    detail:
      showRoomTemperature && !isNonStandardTemperature(combination.temperatureF)
        ? `${recipe}, ${temperatureText(combination, unit)}`
        : recipe,
    time: formatClock(combination.timeMinutes),
    temperature: combination,
    isCustom,
    accessibleName: spokenRecipeName({
      title: `${title}, ${recipe}`,
      minutes: combination.timeMinutes,
      temperature: combination,
      unit,
      isCustom,
    }),
  };
}

/** Each row's place among rows with its dilution and EI: "Listing 1 of 2". */
function listingLabels(rows: readonly RecipeRow[]): (string | undefined)[] {
  const peersOf = (row: RecipeRow) =>
    rows.filter(
      (other) =>
        other.view.combination.shootingIso ===
          row.view.combination.shootingIso &&
        sameDilution(other.dilution, row.dilution)
    );
  return rows.map((row) => {
    const peers = peersOf(row);
    return peers.length > 1
      ? `Listing ${peers.indexOf(row) + 1} of ${peers.length}`
      : undefined;
  });
}

/**
 * `getRecipeRows` output as rows to draw. Rows sharing a dilution and EI are
 * numbered: their times can match, and nothing else on the row would tell them
 * apart. A recipe away from 20°C gets the chip; a 20°C row only says so when the
 * current recipe is at another temperature (`temperatureDiffers`).
 */
export function recipeRowsToPickerOptions(
  rows: readonly RecipeRow[],
  { unit, boxIso }: RecipeRowOptionSettings
): RecipePickerOption[] {
  const listings = listingLabels(rows);
  return rows.map(({ view, temperatureDiffers }, index) => {
    const { combination } = view;
    const label = [
      getKnownCombinationDilution(combination, view.developer) ??
        'Dilution not known',
      `EI ${combination.shootingIso}`,
      describeSpeed(combination.shootingIso, boxIso),
    ]
      .filter(Boolean)
      .join(', ');
    const isCustom = view.source === 'custom';
    const listing = listings[index];
    return {
      value: recipeIdOf(view),
      label,
      detail: listing,
      time: formatClock(combination.timeMinutes),
      temperature: combination,
      temperatureNote:
        temperatureDiffers &&
        !isNonStandardTemperature(combination.temperatureF)
          ? `at ${temperatureText(combination, unit)}`
          : undefined,
      isCustom,
      accessibleName: spokenRecipeName({
        title: label,
        minutes: combination.timeMinutes,
        temperature: combination,
        unit,
        isCustom,
        extra: listing,
      }),
    };
  });
}
