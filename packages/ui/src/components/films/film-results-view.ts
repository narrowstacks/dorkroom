import type { Film } from '@dorkroom/api';
import { filmSupportsRecipes } from '@dorkroom/logic';

/**
 * How `FilmResults` lays the films out:
 * - `table`: desktop, no film open.
 * - `table-compact`: tablet, no film open.
 * - `list`: desktop or tablet side list, a film open.
 * - `rows`: phone.
 */
export type FilmResultsView = 'table' | 'table-compact' | 'list' | 'rows';

export type FilmTableView = Extract<FilmResultsView, 'table' | 'table-compact'>;

export const isTableView = (view: FilmResultsView): view is FilmTableView =>
  view === 'table' || view === 'table-compact';

/** Row heights in pixels; the rows are fixed height so no measuring is needed. */
export const TABLE_ROW_HEIGHT = 52;
export const LIST_ROW_HEIGHT = 60;

export const rowHeightFor = (view: FilmResultsView): number =>
  isTableView(view) ? TABLE_ROW_HEIGHT : LIST_ROW_HEIGHT;

const SHORT_TYPE_LABELS = new Map([
  ['bw', 'B&W'],
  ['color', 'Color'],
  ['slide', 'Slide'],
]);

const shortTypeLabel = (colorType: string): string =>
  SHORT_TYPE_LABELS.get(colorType.toLowerCase()) ?? colorType;

/**
 * "Brand · Type", plus "N recipes" only where the film can show recipes and has
 * some. Color and slide films never mention recipes.
 */
export function filmMetaLine(film: Film, recipeCount: number): string {
  const parts = [film.brand, shortTypeLabel(film.colorType)];
  if (filmSupportsRecipes(film) && recipeCount > 0) {
    parts.push(recipeCount === 1 ? '1 recipe' : `${recipeCount} recipes`);
  }
  return parts.join(' · ');
}
