import {
  formatClock,
  getKnownCombinationDilution,
  isNonStandardTemperature,
} from '@dorkroom/logic';
import { useTemperature } from '@dorkroom/ui';
import {
  recipeTitle,
  temperatureFlagText,
} from '@dorkroom/ui/development-recipes';
import type { RecipeWorkbench } from '../hooks/useRecipeWorkbench';

/**
 * Says which recipe opened, since most ways of opening one leave focus where it
 * was, and any note about it. Always mounted: a region inserted with its text is
 * often not announced.
 */
export function OpenRecipeAnnouncement({ wb }: { wb: RecipeWorkbench }) {
  const { unit } = useTemperature();
  const { openView, film, hintNote } = wb;
  let text = '';
  if (openView) {
    const { combination, developer } = openView;
    const name = recipeTitle(film?.film ?? openView.film, developer);
    const dilution =
      getKnownCombinationDilution(combination, developer) ??
      'dilution not known';
    const temperature = isNonStandardTemperature(combination.temperatureF)
      ? ` ${temperatureFlagText(combination, unit)}.`
      : '';
    text = `Opened ${name}, ${dilution}, EI ${combination.shootingIso}, ${formatClock(combination.timeMinutes)} minutes.${temperature}${hintNote ? ` ${hintNote}` : ''}`;
  }
  return (
    <p aria-live="polite" className="sr-only">
      {text}
    </p>
  );
}
