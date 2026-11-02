import { createContext } from 'react';

/**
 * Which film photos load:
 * - `'all'` (the default): card thumbnails and the detail panel's photo;
 * - `'detail-only'`: cards show the film icon and fetch nothing, and only the
 *   photo of a film the user opens loads, with its credit. The web app uses
 *   this on e-ink devices such as the Kindle Scribe, where every thumbnail
 *   costs memory and a slow full-screen refresh (#636);
 * - `'none'`: no photos anywhere, and no credits for them.
 *
 * ```tsx
 * <FilmImageModeContext value="detail-only">…</FilmImageModeContext>
 * ```
 */
export type FilmImageMode = 'all' | 'detail-only' | 'none';

export const FilmImageModeContext = createContext<FilmImageMode>('all');
