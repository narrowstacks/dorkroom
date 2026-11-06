import type { DevelopmentCombinationView } from '@dorkroom/logic';
import { ExternalLink } from 'lucide-react';
import type { FC } from 'react';
import { useState } from 'react';
import { CollapsibleSection } from '../ui/collapsible-section';
import { filmDatabaseUrlFor } from './film-database-url';

export interface FilmCollapsibleSectionProps {
  view: DevelopmentCombinationView;
  filmDatabaseUrl: string | null;
  isExpanded: boolean;
  onToggle: () => void;
}

/** Collapsible "Film" section shared by sidebar and expanded layouts. */
export const FilmCollapsibleSection: FC<FilmCollapsibleSectionProps> = ({
  view,
  filmDatabaseUrl,
  isExpanded,
  onToggle,
}) => {
  const { film } = view;
  return (
    <CollapsibleSection
      title="Film"
      subtitle={film ? `${film.brand} ${film.name}` : 'Unknown film'}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div className="space-y-3">
        {film?.description && (
          <p className="text-sm text-secondary">{film.description}</p>
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
  );
};

export interface DeveloperCollapsibleSectionProps {
  view: DevelopmentCombinationView;
  isExpanded: boolean;
  onToggle: () => void;
}

/** Collapsible "Developer" section shared by sidebar and expanded layouts. */
export const DeveloperCollapsibleSection: FC<
  DeveloperCollapsibleSectionProps
> = ({ view, isExpanded, onToggle }) => {
  const { developer } = view;
  return (
    <CollapsibleSection
      title="Developer"
      subtitle={
        developer
          ? `${developer.manufacturer} ${developer.name}`
          : 'Unknown developer'
      }
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      {(developer?.description || developer?.notes) && (
        <p className="text-sm text-secondary">
          {developer?.description || developer?.notes}
        </p>
      )}
    </CollapsibleSection>
  );
};

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
  const shown =
    film === undefined ? view : { ...view, film: film ?? undefined };
  return (
    <div className={className ?? 'space-y-3'}>
      <FilmCollapsibleSection
        view={shown}
        filmDatabaseUrl={filmDatabaseUrlFor(shown.film)}
        isExpanded={isFilmExpanded}
        onToggle={() => setIsFilmExpanded((open) => !open)}
      />
      <DeveloperCollapsibleSection
        view={shown}
        isExpanded={isDeveloperExpanded}
        onToggle={() => setIsDeveloperExpanded((open) => !open)}
      />
    </div>
  );
};
