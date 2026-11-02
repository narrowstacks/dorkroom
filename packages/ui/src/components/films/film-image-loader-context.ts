import { createContext } from 'react';
import type { FilmImageLoader } from './film-image-sources';

/**
 * The image optimizer {@link FilmImage} requests resized thumbnails from.
 * `null` (the default) means no optimizer: every image loads its original URL.
 * The app decides, since only it knows where it is deployed:
 *
 * ```tsx
 * <FilmImageLoaderContext value={loader}>…</FilmImageLoaderContext>
 * ```
 */
export const FilmImageLoaderContext = createContext<FilmImageLoader | null>(
  null
);
