import type { Film } from '@dorkroom/api';
import {
  type DevelopmentCombinationView,
  formatClock,
  getCombinationDilution,
  getRecipeAgitation,
  isFilmDevOrgUrl,
  isNonStandardTemperature,
  officialTagMaker,
  recipeIdOf,
  type RecipeSpeedChoice,
  type RecipeTemperatureChoice,
} from '@dorkroom/logic';
import { ExternalLink, Link2, Pencil, Star, Trash2 } from 'lucide-react';
import { type FC, type Ref, useId } from 'react';
import { useTemperature } from '../../contexts/temperature-context';
import { cn } from '../../lib/cn';
import { Tag } from '../ui/tag';
import { RecipeAboutSections } from './recipe-about-sections';
import {
  RecipeChoiceChips,
  type RecipeChoiceOption,
} from './recipe-choice-chips';
import {
  describeSpeed,
  recipeTitle,
  spokenTime,
  temperatureText,
} from './recipe-detail-shared';
import { RecipeTemperatureChip } from './recipe-temperature-chip';
import { TemperatureUnitToggle } from './temperature-unit-toggle';
import { VolumeMixer } from './volume-mixer';

const MIX_PRESETS_ML = [300, 500, 1000] as const;

const ACTION_BUTTON =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-1 border-primary px-4 text-sm font-medium text-primary transition-colors hoverable-action-btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]';

export interface RecipePanelActionsProps {
  isSaved: boolean;
  onToggleSaved: () => void;
  onCopyLink: () => void;
  className?: string;
}

/**
 * Save and Copy link. `RecipePanel` renders them itself on the wide layout;
 * on the phone layout it leaves them out so the page can pin them in a fixed
 * bar with this component.
 */
export const RecipePanelActions: FC<RecipePanelActionsProps> = ({
  isSaved,
  onToggleSaved,
  onCopyLink,
  className,
}) => (
  <div className={cn('flex flex-wrap gap-2', className)}>
    <button
      type="button"
      onClick={onToggleSaved}
      className={cn(ACTION_BUTTON, 'flex-1 sm:flex-none')}
    >
      <Star
        aria-hidden="true"
        className="size-4"
        style={{ fill: isSaved ? 'currentColor' : 'transparent' }}
      />
      {isSaved ? 'Saved' : 'Save'}
    </button>
    <button
      type="button"
      onClick={onCopyLink}
      className={cn(ACTION_BUTTON, 'flex-1 sm:flex-none')}
    >
      <Link2 aria-hidden="true" className="size-4" />
      Copy link
    </button>
  </div>
);

export interface RecipePanelProps {
  view: DevelopmentCombinationView;
  /**
   * The film the picker has open. Wins over `view.film`, which can name a
   * rebrand sibling of the film being looked at.
   */
  film?: Film | null;
  /** Called with the recipe behind a chip. */
  onSelectRecipe: (view: DevelopmentCombinationView) => void;
  /** From `getTemperatureChoices`. Chips show only with two or more. */
  temperatureChoices: readonly RecipeTemperatureChoice[];
  /** From `getSpeedChoices`. Chips show only with two or more. */
  speedChoices: readonly RecipeSpeedChoice[];
  isSaved: boolean;
  onToggleSaved: () => void;
  onCopyLink: () => void;
  /** Custom recipes only: the buttons are not drawn for an official one. */
  onEdit: () => void;
  onDelete: () => void;
  /** `phone` leaves out Save, Copy link and the C/F toggle, for the page to place. */
  layout?: 'wide' | 'phone';
  /** For moving focus to the heading after a search pick. */
  headingRef?: Ref<HTMLHeadingElement>;
  className?: string;
}

/**
 * The recipe workbench's right-hand side: the time first and largest, then
 * agitation and source, the alternatives the source publishes, and a mixer.
 * Every time shown is a published value from the views passed in.
 */
export const RecipePanel: FC<RecipePanelProps> = ({
  view,
  film: filmProp,
  onSelectRecipe,
  temperatureChoices,
  speedChoices,
  isSaved,
  onToggleSaved,
  onCopyLink,
  onEdit,
  onDelete,
  layout = 'wide',
  headingRef,
  className,
}) => {
  const { unit } = useTemperature();
  const mixHeadingId = useId();
  const { combination, developer } = view;
  const film = filmProp === undefined ? view.film : filmProp;
  const isPhone = layout === 'phone';
  const withActions = !isPhone;
  const isCustom = view.source === 'custom';

  const dilution = getCombinationDilution(combination, developer);
  const agitation = getRecipeAgitation(view);

  const { temperatureF, temperatureC } = combination;
  const celsius = temperatureText(combination, 'celsius');
  const fahrenheit = temperatureText(combination, 'fahrenheit');
  const [firstTemperature, secondTemperature] =
    unit === 'celsius' ? [celsius, fahrenheit] : [fahrenheit, celsius];

  const temperatureOptions: RecipeChoiceOption[] = temperatureChoices.map(
    ({ view: choice }) => {
      const label = temperatureText(choice.combination, unit);
      const time = choice.combination.timeMinutes;
      return {
        id: recipeIdOf(choice),
        label,
        detail: formatClock(time),
        accessibleName: `${label}, ${spokenTime(time)}`,
      };
    }
  );

  const speedOptions: RecipeChoiceOption[] = speedChoices.map((choice) => {
    const { view: option } = choice;
    const label = `EI ${option.combination.shootingIso}`;
    const time = option.combination.timeMinutes;
    const notes = [
      ...(choice.isBoxSpeed ? ['box speed'] : []),
      ...(choice.temperatureDiffers
        ? [`at ${temperatureText(option.combination, unit)}`]
        : []),
    ];
    return {
      id: recipeIdOf(option),
      label,
      detail: formatClock(time),
      notes,
      accessibleName: [label, spokenTime(time), ...notes].join(', '),
    };
  });

  const pick =
    (choices: readonly { view: DevelopmentCombinationView }[]) =>
    (id: string) => {
      const chosen = choices.find((choice) => recipeIdOf(choice.view) === id);
      if (chosen) onSelectRecipe(chosen.view);
    };

  const currentId = recipeIdOf(view);
  const idIfListed = (options: readonly RecipeChoiceOption[]) =>
    options.some((option) => option.id === currentId) ? currentId : null;

  // Keep the row's height while the recipe is at room temperature but another
  // temperature is one tap away, so the time does not move as chips change.
  const canChangeTemperature =
    temperatureOptions.length > 1 ||
    speedChoices.some((choice) => choice.temperatureDiffers);
  const showTemperatureRow =
    isNonStandardTemperature(temperatureF) || canChangeTemperature;

  const source = combination.infoSource;
  const speed = describeSpeed(combination.shootingIso, film?.isoSpeed);
  const subtitle = [dilution, `EI ${combination.shootingIso}`, speed]
    .filter(Boolean)
    .join(', ');
  const sourceMaker = combination.tags
    ?.map(officialTagMaker)
    .find((maker) => maker !== null);
  const sourceLabel = isFilmDevOrgUrl(source)
    ? 'FilmDev.org'
    : sourceMaker
      ? `Official ${sourceMaker} source`
      : 'View source';
  const headingId = useId();
  // flex-1 with a basis sizes a column's height, leaving blank gaps on the phone.
  const chipGroupClass = isPhone ? 'min-w-0' : 'min-w-0 flex-1 basis-64';

  return (
    <section
      aria-labelledby={headingId}
      className={cn('flex min-w-0 flex-col gap-6', className)}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            id={headingId}
            ref={headingRef}
            tabIndex={-1}
            className={cn(
              'rounded-lg font-semibold tracking-tight text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]',
              isPhone ? 'text-xl' : 'text-2xl md:text-3xl'
            )}
          >
            {recipeTitle(film, developer)}
          </h2>
          <p className="text-sm text-tertiary">{subtitle}</p>
        </div>
        {withActions && (
          <div className="flex flex-wrap items-center gap-2">
            <TemperatureUnitToggle />
            <RecipePanelActions
              isSaved={isSaved}
              onToggleSaved={onToggleSaved}
              onCopyLink={onCopyLink}
            />
          </div>
        )}
      </header>

      <div className="flex flex-wrap items-end gap-x-12 gap-y-4">
        <p className="m-0">
          <span aria-hidden="true">
            <span
              className={cn(
                'block font-bold leading-none tracking-tight tabular-nums text-primary',
                isPhone ? 'text-7xl' : 'text-7xl lg:text-8xl'
              )}
            >
              {formatClock(combination.timeMinutes)}
            </span>
            <span className="mt-2 block text-base text-secondary">
              minutes at {firstTemperature} ({secondTemperature})
            </span>
          </span>
          <span className="sr-only">
            Development time {spokenTime(combination.timeMinutes)} at {celsius}{' '}
            and {fahrenheit}
          </span>
          {showTemperatureRow && (
            <span className="mt-3 flex min-h-8 items-center">
              <RecipeTemperatureChip
                temperatureC={temperatureC}
                temperatureF={temperatureF}
              />
            </span>
          )}
        </p>
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-tertiary">Agitation</dt>
          <dd className="m-0 text-primary">{agitation ?? 'Not in source'}</dd>
          <dt className="self-center text-tertiary">Source</dt>
          <dd className="m-0 text-primary">
            {source ? (
              <a
                href={source}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center gap-1 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]"
              >
                {sourceLabel}
                <ExternalLink aria-hidden="true" className="size-3" />
              </a>
            ) : isCustom ? (
              'Your recipe'
            ) : (
              'Not in source'
            )}
          </dd>
        </dl>
      </div>

      {(temperatureOptions.length > 1 || speedOptions.length > 1) && (
        <div
          className={cn(
            'flex gap-6',
            isPhone ? 'min-w-0 flex-col' : 'flex-wrap'
          )}
        >
          {temperatureOptions.length > 1 && (
            <RecipeChoiceChips
              className={chipGroupClass}
              label="Temperature"
              options={temperatureOptions}
              value={idIfListed(temperatureOptions)}
              onChange={pick(temperatureChoices)}
              scroll={isPhone}
            />
          )}
          {speedOptions.length > 1 && (
            <RecipeChoiceChips
              className={chipGroupClass}
              label="Speed"
              options={speedOptions}
              value={idIfListed(speedOptions)}
              onChange={pick(speedChoices)}
              scroll={isPhone}
            />
          )}
        </div>
      )}

      <section
        aria-labelledby={mixHeadingId}
        className="border-t border-secondary pt-5"
      >
        <h3
          id={mixHeadingId}
          className="mb-3 text-sm font-semibold text-primary"
        >
          Mix it
        </h3>
        <VolumeMixer dilutionString={dilution} presetsMl={MIX_PRESETS_ML} />
      </section>

      {(combination.notes ||
        (combination.tags && combination.tags.length > 0)) && (
        <div className="space-y-3 rounded-xl border border-secondary bg-border-muted p-4 text-sm">
          {combination.notes && (
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">
                Notes
              </div>
              <p className="mt-1 leading-relaxed text-secondary">
                {combination.notes}
              </p>
            </div>
          )}
          {combination.tags && combination.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {combination.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>
          )}
        </div>
      )}

      <RecipeAboutSections view={view} film={film} />

      {isCustom && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className={cn(ACTION_BUTTON, 'flex-1')}
          >
            <Pencil aria-hidden="true" className="size-4" />
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border-1 border-secondary bg-delete px-4 text-sm font-medium text-delete transition-colors hover:bg-delete-hover hover:text-delete-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Delete
          </button>
        </div>
      )}
    </section>
  );
};
