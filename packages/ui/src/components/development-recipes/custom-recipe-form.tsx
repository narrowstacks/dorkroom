import type { Developer, Film } from '@dorkroom/api';
import {
  type CustomDeveloperData,
  type CustomFilmData,
  type CustomRecipeFormData,
  calculatePushPull,
  type SelectItem,
} from '@dorkroom/logic';
import { useMemo, useState } from 'react';
import { cn } from '../../lib/cn';
import { setStyles } from '../../lib/dom';
import { Select } from '../select';
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
  filmOptions: SelectItem[];
  onChange: ChangeHandler;
  onCustomFilmChange: CustomFilmChangeHandler;
  onFilmSelect: (filmId: string) => void;
}

function FilmSection({
  formData,
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
          selectedValue={formData.selectedFilmId || ''}
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
            onValueChange={(value) =>
              onCustomFilmChange(
                'colorType',
                value as CustomFilmData['colorType']
              )
            }
            items={[
              { label: 'Black & White', value: 'bw' },
              { label: 'Color', value: 'color' },
              { label: 'Slide', value: 'slide' },
            ]}
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
  developerOptions: SelectItem[];
  onChange: ChangeHandler;
  onCustomDeveloperChange: CustomDeveloperChangeHandler;
}

function DeveloperSection({
  formData,
  developerOptions,
  onChange,
  onCustomDeveloperChange,
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
          selectedValue={formData.selectedDeveloperId || ''}
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
            onValueChange={(value) =>
              onCustomDeveloperChange(
                'filmOrPaper',
                value as CustomDeveloperData['filmOrPaper']
              )
            }
            items={[
              { label: 'Film', value: 'film' },
              { label: 'Paper', value: 'paper' },
              { label: 'Both', value: 'both' },
            ]}
          />
          <TextInput
            label="Working life (hours)"
            value={String(formData.customDeveloper?.workingLifeHours ?? '')}
            onValueChange={(value) =>
              onCustomDeveloperChange(
                'workingLifeHours',
                value ? Number(value) : undefined
              )
            }
            placeholder="24"
          />
          <TextInput
            label="Stock life (months)"
            value={String(formData.customDeveloper?.stockLifeMonths ?? '')}
            onValueChange={(value) =>
              onCustomDeveloperChange(
                'stockLifeMonths',
                value ? Number(value) : undefined
              )
            }
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
          {boxSpeed && (
            <span
              className="ml-auto text-xs"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Box: ISO {boxSpeed}
            </span>
          )}
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
            onValueChange={(value) => onChange('customDilution', value)}
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
          className="rounded-full border px-4 py-2 text-sm font-medium transition"
          style={{
            borderColor: 'var(--color-border-primary)',
            color: 'var(--color-text-tertiary)',
          }}
          onMouseEnter={(e) => {
            setStyles(e.currentTarget, {
              borderColor: 'var(--color-border-primary)',
              color: 'var(--color-text-primary)',
            });
          }}
          onMouseLeave={(e) => {
            setStyles(e.currentTarget, {
              borderColor: 'var(--color-border-primary)',
              color: 'var(--color-text-tertiary)',
            });
          }}
        >
          Cancel
        </button>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className={cn(
          'rounded-full px-5 py-2 text-sm font-semibold transition',
          isSubmitting && 'cursor-wait opacity-70'
        )}
        style={{
          backgroundColor: 'var(--color-text-primary)',
          color: 'var(--color-background)',
        }}
        onMouseEnter={(e) => {
          if (!isSubmitting) {
            e.currentTarget.style.backgroundColor =
              'var(--color-text-secondary)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSubmitting) {
            e.currentTarget.style.backgroundColor = 'var(--color-text-primary)';
          }
        }}
      >
        {isSubmitting ? 'Saving…' : 'Save recipe'}
      </button>
    </div>
  );
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

  // Get dilution options for the selected developer
  const dilutionOptions = useMemo(() => {
    if (!formData.useExistingDeveloper || !formData.selectedDeveloperId) {
      return [];
    }
    const developer = allDevelopers.find(
      (d) => d.uuid === formData.selectedDeveloperId
    );
    if (!developer?.dilutions?.length) {
      return [];
    }
    return [
      { label: 'Select dilution', value: '' },
      ...developer.dilutions.map((d) => ({
        label: d.name || d.dilution,
        value: d.id,
      })),
      { label: 'Custom dilution', value: 'custom' },
    ];
  }, [
    formData.useExistingDeveloper,
    formData.selectedDeveloperId,
    allDevelopers,
  ]);

  // Show dilution dropdown only when using existing developer with dilutions
  const showDilutionDropdown = Boolean(
    formData.useExistingDeveloper &&
      formData.selectedDeveloperId &&
      dilutionOptions.length > 2 // More than just "Select" and "Custom"
  );

  // Show custom dilution input when: custom developer OR "custom" selected in dropdown
  const showCustomDilutionInput =
    !formData.useExistingDeveloper || formData.selectedDilutionId === 'custom';

  // Get the box speed from the selected film or custom film
  const boxSpeed = useMemo(() => {
    if (formData.useExistingFilm && formData.selectedFilmId) {
      const film = allFilms.find((f) => f.uuid === formData.selectedFilmId);
      return film?.isoSpeed ?? null;
    }
    return formData.customFilm?.isoSpeed ?? null;
  }, [
    formData.useExistingFilm,
    formData.selectedFilmId,
    formData.customFilm?.isoSpeed,
    allFilms,
  ]);

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
    setFormData((prev) => ({ ...prev, [key]: value }));
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
    // Include the calculated pushPull value in the submission
    onSubmit({ ...formData, pushPull: calculatedPushPull });
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
        filmOptions={filmOptions}
        onChange={updateRecipeField}
        onCustomFilmChange={handleCustomFilmChange}
        onFilmSelect={handleFilmSelect}
      />

      <DeveloperSection
        formData={formData}
        developerOptions={developerOptions}
        onChange={updateRecipeField}
        onCustomDeveloperChange={handleCustomDeveloperChange}
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

      <FormActions isSubmitting={isSubmitting} onCancel={onCancel} />
    </form>
  );
}
