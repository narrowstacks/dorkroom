import type { Film } from '@dorkroom/api';
import {
  type DevelopmentCombinationView,
  formatClock,
  getKnownCombinationDilution,
  getRecipeAgitation,
  isFilmDevOrgUrl,
  isHigherTemperature,
  isNonStandardTemperature,
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

/**
 * For the phone's fixed bar: pills the height of the floating buttons beside
 * them, filled so the page does not show through as it scrolls under.
 */
const COMPACT_ACTION_BUTTON =
  'min-h-12 min-w-0 flex-1 gap-1.5 whitespace-nowrap rounded-full bg-[color:var(--color-surface)] px-2';

export interface RecipePanelActionsProps {
  isSaved: boolean;
  onToggleSaved: () => void;
  onCopyLink: () => void;
  /** Share the row with the floating buttons. "Copy link" shows as "Copy" under 375px. */
  compact?: boolean;
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
  compact = false,
  className,
}) => (
  <div className={cn('flex flex-wrap gap-2', className)}>
    <button
      type="button"
      onClick={onToggleSaved}
      className={cn(ACTION_BUTTON, compact && COMPACT_ACTION_BUTTON)}
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
      className={cn(ACTION_BUTTON, compact && COMPACT_ACTION_BUTTON)}
    >
      <Link2 aria-hidden="true" className="size-4" />
      {compact ? (
        <span>
          Copy <span className="sr-only min-[375px]:not-sr-only">link</span>
        </span>
      ) : (
        'Copy link'
      )}
    </button>
  </div>
);

/**
 * The big time with "minutes" on its baseline beside it, so it reads as a
 * duration and not a time of day, then the temperature, as a chip if not 20°C. The phone's
 * sizes fit time and unit together at 320px up to 99:59; only a three-digit time
 * wraps "minutes" under itself there.
 */
const TimeReadout: FC<{
  combination: DevelopmentCombinationView['combination'];
  /** Both units in the user's order: "24°C (75.2°F)". */
  temperature: string;
  spokenTemperature: string;
  isPhone: boolean;
}> = ({ combination, temperature, spokenTemperature, isPhone }) => {
  const { timeMinutes, temperatureC, temperatureF } = combination;
  const isOffRoomTemperature = isNonStandardTemperature(temperatureF);
  const spokenFlag = isHigherTemperature(temperatureF) ? 'high' : 'low';
  return (
    <p>
      <span
        aria-hidden="true"
        className={cn(
          'flex flex-wrap items-baseline',
          isPhone ? 'gap-x-2' : 'gap-x-3'
        )}
      >
        <span
          className={cn(
            'block font-bold leading-none tracking-tight text-primary',
            isPhone ? 'text-6xl min-[375px]:text-7xl' : 'text-7xl lg:text-8xl'
          )}
        >
          {formatClock(timeMinutes)}
        </span>
        <span
          className={cn(
            'font-semibold text-secondary',
            isPhone ? 'text-base min-[375px]:text-xl' : 'text-2xl lg:text-3xl'
          )}
        >
          minutes
        </span>
      </span>
      <span className="sr-only">
        Development time {spokenTime(timeMinutes)} at {spokenTemperature}
        {isOffRoomTemperature && `, ${spokenFlag} temperature`}
      </span>
      {/* One height with or without the chip, so the chips below stay under a finger. */}
      <span aria-hidden="true" className="mt-2 flex min-h-8 items-center">
        {isOffRoomTemperature ? (
          <RecipeTemperatureChip
            bothUnits
            temperatureC={temperatureC}
            temperatureF={temperatureF}
          />
        ) : (
          <span className="text-base text-secondary">at {temperature}</span>
        )}
      </span>
    </p>
  );
};

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
  /**
   * `phone` leaves out Save, Copy link and the C/F toggle for the page to place,
   * and hides the title, which the page's header buttons already say.
   */
  layout?: 'wide' | 'phone';
  /** For moving focus to the heading after a search pick. */
  headingRef?: Ref<HTMLHeadingElement>;
  /** The mixer's total, kept by the page so a layout change does not reset it. */
  mixVolumeMl?: number;
  onMixVolumeMlChange?: (ml: number) => void;
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
  mixVolumeMl,
  onMixVolumeMlChange,
  className,
}) => {
  const { unit } = useTemperature();
  const mixHeadingId = useId();
  const { combination, developer } = view;
  const film = filmProp === undefined ? view.film : filmProp;
  const isPhone = layout === 'phone';
  const isCustom = view.source === 'custom';

  const dilution = getKnownCombinationDilution(combination, developer);
  const agitation = getRecipeAgitation(view);

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

  const source = combination.infoSource;
  const speed = describeSpeed(combination.shootingIso, film?.isoSpeed);
  const subtitle = [
    dilution ?? 'Dilution not known',
    `EI ${combination.shootingIso}`,
    speed,
  ]
    .filter(Boolean)
    .join(', ');
  const temperature = `${firstTemperature} (${secondTemperature})`;
  const sourceLabel = isFilmDevOrgUrl(source) ? 'FilmDev.org' : 'View source';
  const headingId = useId();
  // flex-1 with a basis sizes a column's height, leaving blank gaps on the phone.
  const chipGroupClass = isPhone ? 'min-w-0' : 'min-w-0 flex-1 basis-64';

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        'flex min-w-0 flex-col',
        isPhone ? 'gap-5' : 'gap-6',
        className
      )}
    >
      {isPhone ? (
        // The header's buttons already name all of this on screen. Out of flow, so
        // it takes no gap; still the target for focus after a pick.
        <h2
          id={headingId}
          ref={headingRef}
          tabIndex={-1}
          className="sr-only focus-visible:outline-none"
        >
          {recipeTitle(film, developer)}
        </h2>
      ) : (
        <header className="flex flex-col gap-3">
          <div className="min-w-0">
            <h2
              id={headingId}
              ref={headingRef}
              tabIndex={-1}
              className="rounded-lg text-2xl font-semibold tracking-tight text-primary [overflow-wrap:anywhere] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] md:text-3xl"
            >
              {recipeTitle(film, developer)}
            </h2>
            <p className="text-sm text-tertiary [overflow-wrap:anywhere]">
              {subtitle}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <TemperatureUnitToggle className="min-h-11 shrink-0 whitespace-nowrap" />
            <RecipePanelActions
              isSaved={isSaved}
              onToggleSaved={onToggleSaved}
              onCopyLink={onCopyLink}
            />
          </div>
        </header>
      )}

      <div
        className={cn(
          'flex flex-wrap items-end gap-x-12',
          isPhone ? 'gap-y-3' : 'gap-y-4'
        )}
      >
        <TimeReadout
          combination={combination}
          temperature={temperature}
          spokenTemperature={`${celsius} and ${fahrenheit}`}
          isPhone={isPhone}
        />
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-tertiary">Agitation</dt>
          <dd className="m-0 text-primary">{agitation ?? 'Not in source'}</dd>
          <dt
            className={cn(
              'text-tertiary',
              // Under 375px the source link wraps below the tag.
              isPhone ? 'self-start min-[375px]:self-center' : 'self-center'
            )}
          >
            Source
          </dt>
          <dd className="m-0 flex flex-wrap items-center gap-x-2 text-primary">
            {combination.tags?.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
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
            'flex',
            isPhone ? 'min-w-0 flex-col gap-5' : 'flex-wrap gap-6'
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
        className={cn(!isPhone && 'border-t border-secondary pt-5')}
      >
        <h3
          id={mixHeadingId}
          className="mb-3 text-sm font-semibold text-primary"
        >
          Mix it
        </h3>
        {dilution === null ? (
          <p className="text-sm text-primary">
            Dilution not known: this recipe's developer is gone, so there is
            nothing to mix from. Check where the recipe came from.
          </p>
        ) : (
          <VolumeMixer
            dilutionString={dilution}
            presetsMl={MIX_PRESETS_ML}
            volumeMl={mixVolumeMl}
            onVolumeMlChange={onMixVolumeMlChange}
          />
        )}
      </section>

      {combination.notes && (
        <div className="rounded-xl border border-secondary bg-border-muted p-4 text-sm">
          <div className="text-xs uppercase tracking-wide text-muted">
            Notes
          </div>
          <p className="mt-1 leading-relaxed text-secondary [overflow-wrap:anywhere]">
            {combination.notes}
          </p>
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
