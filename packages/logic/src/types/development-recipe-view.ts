import type { Combination, Developer, Film } from '@dorkroom/api';

/** A recipe with its film and developer resolved, API or custom. */
export interface DevelopmentCombinationView {
  combination: Combination;
  film?: Film;
  developer?: Developer;
  source?: 'api' | 'custom';
  canViewDetails?: boolean;
}
