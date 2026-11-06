import type { DevelopmentCombinationView } from '@dorkroom/logic';
import { ExternalLink } from 'lucide-react';
import type { FC } from 'react';
import { useState } from 'react';
import { CollapsibleSection } from '../ui/collapsible-section';
import { filmDatabaseUrlFor } from './film-database-url';

export interface RecipeAboutSectionsProps {
  view: DevelopmentCombinationView;
  /** Takes precedence over `view.film`, which can name a rebrand sibling. */
  film?: DevelopmentCombinationView['film'] | null;
  className?: string;
}

/** The Film and Developer sections, collapsed by default, managing their own state. */
export const RecipeAboutSections: FC<RecipeAboutSectionsProps> = ({
  view,
  film,
  className,
}) => {
  const [isFilmExpanded, setIsFilmExpanded] = useState(false);
  const [isDeveloperExpanded, setIsDeveloperExpanded] = useState(false);
  const { developer } = view;
  const shownFilm = film === undefined ? view.film : (film ?? undefined);
  const filmDatabaseUrl = filmDatabaseUrlFor(shownFilm);
  return (
    <div className={className ?? 'space-y-3'}>
      <CollapsibleSection
        title="Film"
        subtitle={
          shownFilm ? `${shownFilm.brand} ${shownFilm.name}` : 'Unknown film'
        }
        isExpanded={isFilmExpanded}
        onToggle={() => setIsFilmExpanded((open) => !open)}
      >
        <div className="space-y-3">
          {shownFilm?.description && (
            <p className="text-sm text-secondary">{shownFilm.description}</p>
          )}
          {filmDatabaseUrl && (
            <a
              href={filmDatabaseUrl}
              className="inline-flex items-center gap-2 text-xs text-tertiary underline-offset-4 hover:text-primary hover:underline"
            >
              <ExternalLink className="size-3" /> View in Film Database
            </a>
          )}
        </div>
      </CollapsibleSection>
      <CollapsibleSection
        title="Developer"
        subtitle={
          developer
            ? `${developer.manufacturer} ${developer.name}`
            : 'Unknown developer'
        }
        isExpanded={isDeveloperExpanded}
        onToggle={() => setIsDeveloperExpanded((open) => !open)}
      >
        {(developer?.description || developer?.notes) && (
          <p className="text-sm text-secondary">
            {developer?.description || developer?.notes}
          </p>
        )}
      </CollapsibleSection>
    </div>
  );
};
