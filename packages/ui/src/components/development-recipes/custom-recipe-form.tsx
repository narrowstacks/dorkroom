import type { Developer, Film } from '@dorkroom/api';
import type {
  CustomDeveloperData,
  CustomFilmData,
  CustomRecipeFormData,
  SelectItem,
} from '@dorkroom/logic';
import { useMemo, useState } from 'react';
import { cn } from '../../lib/cn';
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
  const [formData, setFormData] = useState<CustomRecipeFormData>(initialValue);

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
  const showDilutionDropdown =
    formData.useExistingDeveloper &&
    formData.selectedDeveloperId &&
    dilutionOptions.length > 2; // More than just "Select" and "Custom"

  // Show custom dilution input when: custom developer OR "custom" selected in dropdown
  const showCustomDilutionInput =
    !formData.useExistingDeveloper || formData.selectedDilutionId === 'custom';

  const handleChange = <K extends keyof CustomRecipeFormData>(
    key: K,
    value: CustomRecipeFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleCustomFilmChange = <K extends keyof CustomFilmData>(
    key: K,
    value: CustomFilmData[K]
  ) => {
    setFormData((prev) => ({
      ...prev,
      customFilm: {
        ...(prev.customFilm || defaultCustomFilm()),
        [key]: value,
      },
    }));
  };

  const handleCustomDeveloperChange = <K extends keyof CustomDeveloperData>(
    key: K,
    value: CustomDeveloperData[K]
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
    setFormData((prev) => ({
      ...prev,
      selectedFilmId: filmId,
      // Auto-set shooting ISO to film's native ISO when selecting a film
      shootingIso: film?.isoSpeed ?? prev.shootingIso,
    }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit(formData);
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
        onValueChange={(value) => handleChange('name', value)}
        placeholder="My HP5+ in D-76 recipe"
      />

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
              checked={!formData.useExistingFilm}
              onChange={(event) =>
                handleChange('useExistingFilm', !event.target.checked)
              }
            />
            Use custom film data
          </label>
        </div>

        {formData.useExistingFilm ? (
          <Select
            selectedValue={formData.selectedFilmId || ''}
            onValueChange={handleFilmSelect}
            items={filmOptions}
            ariaLabel="Film"
            className="mt-3"
          />
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <TextInput
              label="Brand"
              value={formData.customFilm?.brand || ''}
              onValueChange={(value) => handleCustomFilmChange('brand', value)}
              placeholder="Ilford"
            />
            <TextInput
              label="Film name"
              value={formData.customFilm?.name || ''}
              onValueChange={(value) => handleCustomFilmChange('name', value)}
              placeholder="HP5 Plus"
            />
            <TextInput
              label="ISO"
              value={String(formData.customFilm?.isoSpeed ?? 400)}
              onValueChange={(value) =>
                handleCustomFilmChange('isoSpeed', Number(value) || 0)
              }
              placeholder="400"
            />
            <Select
              label="Color type"
              selectedValue={formData.customFilm?.colorType || 'bw'}
              onValueChange={(value) =>
                handleCustomFilmChange(
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
                handleCustomFilmChange('grainStructure', value)
              }
              placeholder="Fine"
            />
            <TextInput
              label="Description"
              value={formData.customFilm?.description || ''}
              onValueChange={(value) =>
                handleCustomFilmChange('description', value)
              }
              placeholder="Optional notes about this film"
            />
          </div>
        )}
      </div>

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
              checked={!formData.useExistingDeveloper}
              onChange={(event) =>
                handleChange('useExistingDeveloper', !event.target.checked)
              }
            />
            Use custom developer data
          </label>
        </div>

        {formData.useExistingDeveloper ? (
          <Select
            selectedValue={formData.selectedDeveloperId || ''}
            onValueChange={(value) =>
              handleChange('selectedDeveloperId', value)
            }
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
                handleCustomDeveloperChange('manufacturer', value)
              }
              placeholder="Kodak"
            />
            <TextInput
              label="Developer name"
              value={formData.customDeveloper?.name || ''}
              onValueChange={(value) =>
                handleCustomDeveloperChange('name', value)
              }
              placeholder="D-76"
            />
            <TextInput
              label="Type"
              value={formData.customDeveloper?.type || ''}
              onValueChange={(value) =>
                handleCustomDeveloperChange('type', value)
              }
              placeholder="Powder"
            />
            <Select
              label="Film or paper"
              selectedValue={formData.customDeveloper?.filmOrPaper || 'film'}
              onValueChange={(value) =>
                handleCustomDeveloperChange(
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
                handleCustomDeveloperChange(
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
                handleCustomDeveloperChange(
                  'stockLifeMonths',
                  value ? Number(value) : undefined
                )
              }
              placeholder="6"
            />
            <TextInput
              label="Notes"
              value={formData.customDeveloper?.notes || ''}
              onValueChange={(value) =>
                handleCustomDeveloperChange('notes', value)
              }
              placeholder="Optional developer notes"
            />
            <TextInput
              label="Mixing instructions"
              value={formData.customDeveloper?.mixingInstructions || ''}
              onValueChange={(value) =>
                handleCustomDeveloperChange('mixingInstructions', value)
              }
              placeholder="e.g. 1+1 from stock"
            />
            <TextInput
              label="Safety notes"
              value={formData.customDeveloper?.safetyNotes || ''}
              onValueChange={(value) =>
                handleCustomDeveloperChange('safetyNotes', value)
              }
              placeholder="Wear gloves"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <TextInput
          label="Temperature (°F)"
          value={String(formData.temperatureF)}
          onValueChange={(value) =>
            handleChange('temperatureF', Number(value) || 0)
          }
          placeholder="68"
        />
        <TextInput
          label="Development time (minutes)"
          value={String(formData.timeMinutes)}
          onValueChange={(value) =>
            handleChange('timeMinutes', Number(value) || 0)
          }
          placeholder="9.75"
        />
        <TextInput
          label="Shooting ISO"
          value={String(formData.shootingIso)}
          onValueChange={(value) =>
            handleChange('shootingIso', Number(value) || 0)
          }
          placeholder="400"
        />
        <Select
          label="Push/Pull"
          selectedValue={String(formData.pushPull)}
          onValueChange={(value) =>
            handleChange('pushPull', Number(value) as number)
          }
          items={[-2, -1, 0, 1, 2].map((value) => ({
            label:
              value === 0
                ? 'Box Speed'
                : value > 0
                  ? `Push +${value}`
                  : `Pull ${Math.abs(value)}`,
            value: String(value),
          }))}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <TextInput
          label="Agitation schedule"
          value={formData.agitationSchedule}
          onValueChange={(value) => handleChange('agitationSchedule', value)}
          placeholder="30s initial, 10s every minute"
        />
        {showDilutionDropdown ? (
          <Select
            label="Dilution"
            selectedValue={formData.selectedDilutionId || ''}
            onValueChange={(value) => handleChange('selectedDilutionId', value)}
            items={dilutionOptions}
          />
        ) : (
          <TextInput
            label="Custom dilution"
            value={formData.customDilution}
            onValueChange={(value) => handleChange('customDilution', value)}
            placeholder="1+1"
          />
        )}
      </div>

      {showDilutionDropdown && showCustomDilutionInput && (
        <TextInput
          label="Custom dilution"
          value={formData.customDilution}
          onValueChange={(value) => handleChange('customDilution', value)}
          placeholder="1+1"
        />
      )}

      <TextInput
        label="Notes"
        value={formData.notes}
        onValueChange={(value) => handleChange('notes', value)}
        placeholder="Optional notes about this recipe"
      />

      <label
        className="flex items-center gap-2 text-xs"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        <input
          type="checkbox"
          checked={formData.isPublic}
          onChange={(event) => handleChange('isPublic', event.target.checked)}
        />
        Suggest submitting to the public recipe database
      </label>

      <label
        className="flex items-center gap-2 text-xs"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        <input
          type="checkbox"
          checked={!!formData.isFavorite}
          onChange={(event) => handleChange('isFavorite', event.target.checked)}
        />
        Add to favorites after saving
      </label>

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
              e.currentTarget.style.borderColor = 'var(--color-border-primary)';
              e.currentTarget.style.color = 'var(--color-text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border-primary)';
              e.currentTarget.style.color = 'var(--color-text-tertiary)';
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
              e.currentTarget.style.backgroundColor =
                'var(--color-text-primary)';
            }
          }}
        >
          {isSubmitting ? 'Saving…' : 'Save recipe'}
        </button>
      </div>
    </form>
  );
}
