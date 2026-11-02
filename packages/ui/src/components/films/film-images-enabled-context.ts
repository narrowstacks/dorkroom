import { createContext } from 'react';

/**
 * Whether {@link FilmImage} loads its photo. `true` (the default) loads it;
 * `false` shows the film icon placeholder and fetches nothing, which the web
 * app uses on low-memory legacy browsers such as the Kindle (#636):
 *
 * ```tsx
 * <FilmImagesEnabledContext value={false}>…</FilmImagesEnabledContext>
 * ```
 */
export const FilmImagesEnabledContext = createContext(true);
