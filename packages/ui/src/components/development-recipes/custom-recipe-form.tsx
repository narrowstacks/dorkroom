import type { Developer, Film } from '@dorkroom/api';
import {
  buildFilmSlugIndex,
  calculatePushPull,
  type CustomDeveloperData,
  type CustomFilmData,
  type CustomRecipeFormData,
  customRecipeSchema,
  type SelectItem,
} from '@dorkroom/logic';
import { useMemo, useState } from 'react';
import { cn } from '../../lib/cn';
import { optionChangeHandler } from '../../lib/select-options';
import { Select } from '../select';
import { LiveStatusAlert } from '../status-alert';
import { TextInput } from '../text-input';

interface CustomRecipeFormProps {
  initialValue: CustomRecipeFormData;
  onSubmit: (data: CustomRecipeFormData) => void;
  onCancel?: () => void;
  filmOptions: SelectItem[];
  developerOptions: SelectItem[];
  allFilms: Film[];
  allDevelopers: Developer[];
  isSubmitting?: boolean;
}

const defaultCustomFilm = (): CustomFilmData => ({
  brand: '',
  name: '',
  isoSpeed: 400,
  colorType: 'bw',
  grainStructure: '',
  description: '',
});

const defaultCustomDeveloper = (): CustomDeveloperData => ({
  manufacturer: '',
  name: '',
  type: 'powder',
  filmOrPaper: 'film',
  workingLifeHours: undefined,
  stockLifeMonths: undefined,
  notes: '',
  mixingInstructions: '',
  safetyNotes: '',
  dilutions: [{ name: 'Stock', dilution: 'Stock' }],
});

const COLOR_TYPE_OPTIONS = [
  { label: 'Black & White', value: 'bw' },
  { label: 'Color', value: 'color' },
  { label: 'Slide', value: 'slide' },
] as const;

const FILM_OR_PAPER_OPTIONS = [
  { label: 'Film', value: 'film' },
  { label: 'Paper', value: 'paper' },
  { label: 'Both', value: 'both' },
] as const;

type ChangeHandler = <K extends keyof CustomRecipeFormData>(
  key: K,
  value: CustomRecipeFormData[K]
) => void;

type CustomFilmChangeHandler = <K extends keyof CustomFilmData>(
  key: K,
  value: CustomFilmData[K]
) => void;

type CustomDeveloperChangeHandler = <K extends keyof CustomDeveloperData>(
  key: K,
  value: CustomDeveloperData[K]
) => void;

interface FilmSectionProps {
  formData: CustomRecipeFormData;
  selectedFilm: Film | undefined;
  filmOptions: SelectItem[];
  onChange: ChangeHandler;
  onCustomFilmChange: CustomFilmChangeHandler;
  onFilmSelect: (filmId: string) => void;
}

function FilmSection({
  formData,
  selectedFilm,
  filmOptions,
  onChange,
  onCustomFilmChange,
  onFilmSelect,
}: FilmSectionProps) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        borderColor: 'var(--color-border-secondary)',
        backgroundColor: 'var(--color-surface-muted)',
      }}
    >
      <div className="flex items-center justify-between">
        <h3
          className="text-sm font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Film
        </h3>
        <label
          className="flex items-center gap-2 text-xs"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          <input
            type="checkbox"
            aria-label="Use custom film data"
            checked={!formData.useExistingFilm}
            onChange={(event) =>
              onChange('useExistingFilm', !event.target.checked)
            }
          />
          Use custom film data
        </label>
      </div>

      {formData.useExistingFilm ? (
        <Select
          selectedValue={selectedFilm?.uuid ?? formData.selectedFilmId ?? ''}
          onValueChange={onFilmSelect}
          items={filmOptions}
          ariaLabel="Film"
          className="mt-3"
        />
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <TextInput
            label="Brand"
            value={formData.customFilm?.brand || ''}
            onValueChange={(value) => onCustomFilmChange('brand', value)}
            placeholder="Ilford"
          />
          <TextInput
            label="Film name"
            value={formData.customFilm?.name || ''}
            onValueChange={(value) => onCustomFilmChange('name', value)}
            placeholder="HP5 Plus"
          />
          <TextInput
            label="ISO"
            value={String(formData.customFilm?.isoSpeed ?? 400)}
            onValueChange={(value) =>
              onCustomFilmChange('isoSpeed', Number(value) || 0)
            }
            placeholder="400"
          />
          <Select
            label="Color type"
            selectedValue={formData.customFilm?.colorType || 'bw'}
            onValueChange={optionChangeHandler(
              COLOR_TYPE_OPTIONS,
              (colorType) => onCustomFilmChange('colorType', colorType)
            )}
            items={COLOR_TYPE_OPTIONS}
          />
          <TextInput
            label="Grain structure"
            value={formData.customFilm?.grainStructure || ''}
            onValueChange={(value) =>
              onCustomFilmChange('grainStructure', value)
            }
            placeholder="Fine"
          />
          <TextInput
            label="Description"
            value={formData.customFilm?.description || ''}
            onValueChange={(value) => onCustomFilmChange('description', value)}
            placeholder="Optional notes about this film"
          />
        </div>
      )}
    </div>
  );
}

interface DeveloperSectionProps {
  formData: CustomRecipeFormData;
  selectedDeveloper: Developer | undefined;
  developerOptions: SelectItem[];
  workingLifeInput: string;
  stockLifeInput: string;
  onChange: ChangeHandler;
  onCustomDeveloperChange: CustomDeveloperChangeHandler;
  onWorkingLifeInputChange: (value: string) => void;
  onStockLifeInputChange: (value: string) => void;
}

function DeveloperSection({
  formData,
  selectedDeveloper,
  developerOptions,
  workingLifeInput,
  stockLifeInput,
  onChange,
  onCustomDeveloperChange,
  onWorkingLifeInputChange,
  onStockLifeInputChange,
}: DeveloperSectionProps) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        borderColor: 'var(--color-border-secondary)',
        backgroundColor: 'var(--color-surface-muted)',
      }}
    >
      <div className="flex items-center justify-between">
        <h3
          className="text-sm font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Developer
        </h3>
        <label
          className="flex items-center gap-2 text-xs"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          <input
            type="checkbox"
            aria-label="Use custom developer data"
            checked={!formData.useExistingDeveloper}
            onChange={(event) =>
              onChange('useExistingDeveloper', !event.target.checked)
            }
          />
          Use custom developer data
        </label>
      </div>

      {formData.useExistingDeveloper ? (
        <Select
          selectedValue={
            selectedDeveloper?.uuid ?? formData.selectedDeveloperId ?? ''
          }
          onValueChange={(value) => onChange('selectedDeveloperId', value)}
          items={developerOptions}
          ariaLabel="Developer"
          className="mt-3"
        />
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <TextInput
            label="Manufacturer"
            value={formData.customDeveloper?.manufacturer || ''}
            onValueChange={(value) =>
              onCustomDeveloperChange('manufacturer', value)
            }
            placeholder="Kodak"
          />
          <TextInput
            label="Developer name"
            value={formData.customDeveloper?.name || ''}
            onValueChange={(value) => onCustomDeveloperChange('name', value)}
            placeholder="D-76"
          />
          <TextInput
            label="Type"
            value={formData.customDeveloper?.type || ''}
            onValueChange={(value) => onCustomDeveloperChange('type', value)}
            placeholder="Powder"
          />
          <Select
            label="Film or paper"
            selectedValue={formData.customDeveloper?.filmOrPaper || 'film'}
            onValueChange={optionChangeHandler(
              FILM_OR_PAPER_OPTIONS,
              (filmOrPaper) =>
                onCustomDeveloperChange('filmOrPaper', filmOrPaper)
            )}
            items={FILM_OR_PAPER_OPTIONS}
          />
          <TextInput
            label="Working life (hours)"
            value={workingLifeInput}
            onValueChange={onWorkingLifeInputChange}
            inputMode="decimal"
            placeholder="24"
          />
          <TextInput
            label="Stock life (months)"
            value={stockLifeInput}
            onValueChange={onStockLifeInputChange}
            inputMode="decimal"
            placeholder="6"
          />
          <TextInput
            label="Notes"
            value={formData.customDeveloper?.notes || ''}
            onValueChange={(value) => onCustomDeveloperChange('notes', value)}
            placeholder="Optional developer notes"
          />
          <TextInput
            label="Mixing instructions"
            value={formData.customDeveloper?.mixingInstructions || ''}
            onValueChange={(value) =>
              onCustomDeveloperChange('mixingInstructions', value)
            }
            placeholder="e.g. 1+1 from stock"
          />
          <TextInput
            label="Safety notes"
            value={formData.customDeveloper?.safetyNotes || ''}
            onValueChange={(value) =>
              onCustomDeveloperChange('safetyNotes', value)
            }
            placeholder="Wear gloves"
          />
        </div>
      )}
    </div>
  );
}

interface DevelopmentDetailsSectionProps {
  formData: CustomRecipeFormData;
  timeMinutesInput: string;
  shootingIsoInput: string;
  calculatedPushPull: number;
  pushPullDisplay: string;
  boxSpeed: number | null;
  onChange: ChangeHandler;
  onTimeMinutesInputChange: (value: string) => void;
  onShootingIsoInputChange: (value: string) => void;
}

function DevelopmentDetailsSection({
  formData,
  timeMinutesInput,
  shootingIsoInput,
  calculatedPushPull,
  pushPullDisplay,
  boxSpeed,
  onChange,
  onTimeMinutesInputChange,
  onShootingIsoInputChange,
}: DevelopmentDetailsSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <TextInput
        label="Temperature (°F)"
        value={String(formData.temperatureF)}
        onValueChange={(value) => onChange('temperatureF', Number(value) || 0)}
        placeholder="68"
      />
      <TextInput
        label="Development time (minutes)"
        value={timeMinutesInput}
        onValueChange={(value) => {
          onTimeMinutesInputChange(value);
          const numValue = Number(value);
          if (value !== '' && !Number.isNaN(numValue)) {
            onChange('timeMinutes', numValue);
          }
        }}
        inputMode="decimal"
        placeholder="9.75"
      />
      <TextInput
        label="Shooting ISO"
        value={shootingIsoInput}
        onValueChange={(value) => {
          onShootingIsoInputChange(value);
          const numValue = Number(value);
          if (value !== '' && !Number.isNaN(numValue)) {
            onChange('shootingIso', numValue);
          }
        }}
        inputMode="decimal"
        placeholder="400"
      />
      <div className="space-y-2">
        <span
          className="block text-sm font-medium"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Push/Pull
        </span>
        <div
          className={cn(
            'flex h-10 items-center rounded-lg border px-3 text-sm',
            calculatedPushPull !== 0 && 'font-medium'
          )}
          style={{
            borderColor: 'var(--color-border-secondary)',
            backgroundColor: 'var(--color-surface-muted)',
            color:
              calculatedPushPull === 0
                ? 'var(--color-text-primary)'
                : calculatedPushPull > 0
                  ? 'var(--color-semantic-warning)'
                  : 'var(--color-semantic-info, #3b82f6)',
          }}
        >
          {pushPullDisplay}
          {boxSpeed ? (
            <span
              className="ml-auto text-xs"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Box: ISO {boxSpeed}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

interface DilutionSectionProps {
  formData: CustomRecipeFormData;
  dilutionOptions: SelectItem[];
  showDilutionDropdown: boolean;
  showCustomDilutionInput: boolean;
  onChange: ChangeHandler;
}

function DilutionSection({
  formData,
  dilutionOptions,
  showDilutionDropdown,
  showCustomDilutionInput,
  onChange,
}: DilutionSectionProps) {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <TextInput
          label="Agitation schedule"
          value={formData.agitationSchedule}
          onValueChange={(value) => onChange('agitationSchedule', value)}
          placeholder="30s initial, 10s every minute"
        />
        {showDilutionDropdown ? (
          <Select
            label="Dilution"
            selectedValue={formData.selectedDilutionId || ''}
            onValueChange={(value) => onChange('selectedDilutionId', value)}
            items={dilutionOptions}
          />
        ) : (
          <TextInput
            label="Custom dilution"
            value={formData.customDilution}
            onValueChange={(value) => {
              // With no list to pick from, this box is the only way to replace
              // a dilution id the developer no longer has.
              onChange('selectedDilutionId', '');
              onChange('customDilution', value);
            }}
            placeholder="1+1"
          />
        )}
      </div>

      {showDilutionDropdown && showCustomDilutionInput && (
        <TextInput
          label="Custom dilution"
          value={formData.customDilution}
          onValueChange={(value) => onChange('customDilution', value)}
          placeholder="1+1"
        />
      )}
    </>
  );
}

interface FormActionsProps {
  isSubmitting?: boolean;
  onCancel?: () => void;
}

function FormActions({ isSubmitting, onCancel }: FormActionsProps) {
  return (
    <div className="flex flex-col gap-3 pt-2 md:flex-row md:justify-end">
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-primary px-4 py-2 text-sm font-medium text-tertiary transition hover:text-primary"
        >
          Cancel
        </button>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className={cn(
          'rounded-full bg-text-primary px-5 py-2 text-sm font-semibold text-background transition enabled:hover:bg-text-secondary',
          isSubmitting && 'cursor-wait opacity-70'
        )}
      >
        {isSubmitting ? 'Saving…' : 'Save recipe'}
      </button>
    </div>
  );
}

/**
 * These inputs only update the form on a usable number, so a cleared one would
 * otherwise save the number it last held.
 */
const numberInputProblem = (name: string, input: string): string | null =>
  input.trim() === '' || Number.isNaN(Number(input))
    ? `Enter ${name} as a number.`
    : null;

/** The same for an input that may stay blank. */
const optionalNumberInputProblem = (
  name: string,
  input: string
): string | null =>
  input.trim() === '' || Number.isFinite(Number(input))
    ? null
    : `Enter ${name} as a number, or leave it blank.`;

/**
 * What the form saves: resolved ids, no draft left by unticking "use custom",
 * and no custom dilution the form isn't showing. With a list to pick from, the
 * box only shows for `custom`; with no list, the box is the only input.
 */
function cleanSubmission(
  data: CustomRecipeFormData,
  film: Film | undefined,
  developer: Developer | undefined,
  pushPull: number
): CustomRecipeFormData {
  return {
    ...data,
    name: data.name.trim(),
    pushPull,
    customDilution:
      developer?.dilutions?.length && data.selectedDilutionId !== 'custom'
        ? ''
        : data.customDilution,
    selectedFilmId: film?.uuid ?? data.selectedFilmId,
    selectedDeveloperId: developer?.uuid ?? data.selectedDeveloperId,
    customFilm: data.useExistingFilm ? undefined : data.customFilm,
    customDeveloper: data.useExistingDeveloper
      ? undefined
      : data.customDeveloper,
  };
}

/**
 * A blank custom dilution, or an id the developer no longer has, would save and
 * then read as Stock. Having no dilution selected at all really is Stock.
 */
function findDilutionProblem(
  { selectedDilutionId, customDilution }: CustomRecipeFormData,
  developer: Developer
): string | null {
  if (selectedDilutionId === 'custom') {
    return customDilution?.trim() ? null : 'Enter the custom dilution.';
  }
  if (
    selectedDilutionId &&
    !developer.dilutions.some(({ id }) => String(id) === selectedDilutionId)
  ) {
    return "This recipe's dilution is no longer listed for this developer. Choose another, or enter your own.";
  }
  return null;
}

/**
 * The first thing stopping this form from saving, or null. A selected id must
 * still name something: a recipe whose film has left the catalogue keeps the old
 * id, and the schema alone would let it be saved broken again.
 */
function findProblem(
  submission: CustomRecipeFormData,
  film: Film | undefined,
  developer: Developer | undefined
): string | null {
  const parsed = customRecipeSchema.safeParse(submission);
  if (!parsed.success) return parsed.error.issues[0].message;
  if (submission.useExistingFilm && !film) {
    return 'Choose a film, or enter your own.';
  }
  if (submission.useExistingDeveloper && !developer) {
    return 'Choose a developer, or enter your own.';
  }
  return developer ? findDilutionProblem(submission, developer) : null;
}

export function CustomRecipeForm({
  initialValue,
  onSubmit,
  onCancel,
  filmOptions,
  developerOptions,
  allFilms,
  allDevelopers,
  isSubmitting,
}: CustomRecipeFormProps) {
  const [formData, setFormData] = useState<CustomRecipeFormData>(
    () => initialValue
  );

  // Local string state for numeric inputs to allow decimal entry
  const [timeMinutesInput, setTimeMinutesInput] = useState(() =>
    String(initialValue.timeMinutes || '')
  );
  const [shootingIsoInput, setShootingIsoInput] = useState(() =>
    String(initialValue.shootingIso || '')
  );

  const [workingLifeInput, setWorkingLifeInput] = useState(() =>
    String(initialValue.customDeveloper?.workingLifeHours ?? '')
  );
  const [stockLifeInput, setStockLifeInput] = useState(() =>
    String(initialValue.customDeveloper?.stockLifeMonths ?? '')
  );

  const [formError, setFormError] = useState<string | null>(null);

  // A recipe can hold a uuid or a slug, and a slug can be a renamed film's old
  // one: API rows store slugs. Everything below reads the entry, not the id.
  const filmsById = useMemo(() => {
    const index = buildFilmSlugIndex(allFilms);
    for (const film of allFilms) index.set(film.uuid, film);
    return index;
  }, [allFilms]);
  const developersById = useMemo(
    () =>
      new Map(
        allDevelopers.flatMap((developer): [string, Developer][] => [
          [developer.slug, developer],
          [developer.uuid, developer],
        ])
      ),
    [allDevelopers]
  );
  const selectedFilm = formData.useExistingFilm
    ? filmsById.get(formData.selectedFilmId ?? '')
    : undefined;
  const selectedDeveloper = formData.useExistingDeveloper
    ? developersById.get(formData.selectedDeveloperId ?? '')
    : undefined;

  // Get dilution options for the selected developer
  const dilutionOptions = useMemo(() => {
    if (!selectedDeveloper?.dilutions?.length) {
      return [];
    }
    return [
      { label: 'Select dilution', value: '' },
      ...selectedDeveloper.dilutions.map((d) => ({
        label: d.name || d.dilution,
        value: String(d.id),
      })),
      { label: 'Custom dilution', value: 'custom' },
    ];
  }, [selectedDeveloper]);

  // Show dilution dropdown only when using existing developer with dilutions
  const showDilutionDropdown = dilutionOptions.length > 2; // More than just "Select" and "Custom"

  // Show custom dilution input when: custom developer OR "custom" selected in dropdown
  const showCustomDilutionInput =
    !formData.useExistingDeveloper || formData.selectedDilutionId === 'custom';

  // Get the box speed from the selected film or custom film
  const boxSpeed = formData.useExistingFilm
    ? (selectedFilm?.isoSpeed ?? null)
    : (formData.customFilm?.isoSpeed ?? null);

  // Calculate push/pull from box speed and shooting ISO
  const calculatedPushPull = useMemo(() => {
    if (!boxSpeed || !formData.shootingIso) return 0;
    return calculatePushPull(formData.shootingIso, boxSpeed);
  }, [boxSpeed, formData.shootingIso]);

  // Format push/pull for display
  const pushPullDisplay = useMemo(() => {
    if (calculatedPushPull === 0) return 'Box Speed';
    if (calculatedPushPull > 0) return `Push +${calculatedPushPull}`;
    return `Pull ${calculatedPushPull}`;
  }, [calculatedPushPull]);

  const updateRecipeField: ChangeHandler = (key, value) => {
    setFormData((prev) => {
      const next = { ...prev, [key]: value };
      // Dilution ids belong to one developer; a stale one would save a
      // dilution the new developer doesn't have.
      if (
        key === 'selectedDeveloperId' &&
        value !== prev.selectedDeveloperId &&
        prev.selectedDilutionId !== 'custom'
      ) {
        next.selectedDilutionId = '';
      }
      return next;
    });
  };

  const handleCustomFilmChange: CustomFilmChangeHandler = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      customFilm: {
        ...(prev.customFilm || defaultCustomFilm()),
        [key]: value,
      },
    }));
  };

  const handleCustomDeveloperChange: CustomDeveloperChangeHandler = (
    key,
    value
  ) => {
    setFormData((prev) => ({
      ...prev,
      customDeveloper: {
        ...(prev.customDeveloper || defaultCustomDeveloper()),
        [key]: value,
      },
    }));
  };

  const updateOptionalNumber = (
    key: 'workingLifeHours' | 'stockLifeMonths',
    value: string
  ) => {
    if (value.trim() === '') {
      handleCustomDeveloperChange(key, undefined);
    } else if (Number.isFinite(Number(value))) {
      handleCustomDeveloperChange(key, Number(value));
    }
  };

  // Handle film selection - auto-set shooting ISO to film's native ISO
  const handleFilmSelect = (filmId: string) => {
    const film = allFilms.find((f) => f.uuid === filmId);
    const newIso = film?.isoSpeed;
    if (newIso !== undefined) {
      setShootingIsoInput(String(newIso));
    }
    setFormData((prev) => ({
      ...prev,
      selectedFilmId: filmId,
      // Auto-set shooting ISO to film's native ISO when selecting a film
      shootingIso: newIso ?? prev.shootingIso,
    }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const submission = cleanSubmission(
      formData,
      selectedFilm,
      selectedDeveloper,
      calculatedPushPull
    );
    const problem =
      numberInputProblem('a development time', timeMinutesInput) ??
      numberInputProblem('a shooting ISO', shootingIsoInput) ??
      (formData.useExistingDeveloper
        ? null
        : (optionalNumberInputProblem('a working life', workingLifeInput) ??
          optionalNumberInputProblem('a stock life', stockLifeInput))) ??
      findProblem(submission, selectedFilm, selectedDeveloper);
    setFormError(problem);
    if (!problem) onSubmit(submission);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 text-sm"
      style={{ color: 'var(--color-text-secondary)' }}
    >
      <TextInput
        label="Recipe name"
        value={formData.name}
        onValueChange={(value) => updateRecipeField('name', value)}
        placeholder="My HP5+ in D-76 recipe"
      />

      <FilmSection
        formData={formData}
        selectedFilm={selectedFilm}
        filmOptions={filmOptions}
        onChange={updateRecipeField}
        onCustomFilmChange={handleCustomFilmChange}
        onFilmSelect={handleFilmSelect}
      />

      <DeveloperSection
        formData={formData}
        selectedDeveloper={selectedDeveloper}
        developerOptions={developerOptions}
        workingLifeInput={workingLifeInput}
        stockLifeInput={stockLifeInput}
        onChange={updateRecipeField}
        onCustomDeveloperChange={handleCustomDeveloperChange}
        onWorkingLifeInputChange={(value) => {
          setWorkingLifeInput(value);
          updateOptionalNumber('workingLifeHours', value);
        }}
        onStockLifeInputChange={(value) => {
          setStockLifeInput(value);
          updateOptionalNumber('stockLifeMonths', value);
        }}
      />

      <DevelopmentDetailsSection
        formData={formData}
        timeMinutesInput={timeMinutesInput}
        shootingIsoInput={shootingIsoInput}
        calculatedPushPull={calculatedPushPull}
        pushPullDisplay={pushPullDisplay}
        boxSpeed={boxSpeed}
        onChange={updateRecipeField}
        onTimeMinutesInputChange={setTimeMinutesInput}
        onShootingIsoInputChange={setShootingIsoInput}
      />

      <DilutionSection
        formData={formData}
        dilutionOptions={dilutionOptions}
        showDilutionDropdown={showDilutionDropdown}
        showCustomDilutionInput={showCustomDilutionInput}
        onChange={updateRecipeField}
      />

      <TextInput
        label="Notes"
        value={formData.notes}
        onValueChange={(value) => updateRecipeField('notes', value)}
        placeholder="Optional notes about this recipe"
      />

      <label
        className="flex items-center gap-2 text-xs"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        <input
          type="checkbox"
          aria-label="Suggest submitting to the public recipe database"
          checked={formData.isPublic}
          onChange={(event) =>
            updateRecipeField('isPublic', event.target.checked)
          }
        />
        Suggest submitting to the public recipe database
      </label>

      <label
        className="flex items-center gap-2 text-xs"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        <input
          type="checkbox"
          aria-label="Add to favorites after saving"
          checked={!!formData.isFavorite}
          onChange={(event) =>
            updateRecipeField('isFavorite', event.target.checked)
          }
        />
        Add to favorites after saving
      </label>

      <LiveStatusAlert action="error" message={formError} />

      <FormActions isSubmitting={isSubmitting} onCancel={onCancel} />
    </form>
  );
}
