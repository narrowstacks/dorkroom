import type { BorderPresetSettings, SelectItem } from '@dorkroom/logic';
import { Save, Share2, Trash2 } from 'lucide-react';
import { CalculatorCard, Select, TextInput } from '../../index';

interface PresetsSectionProps {
  selectedPresetId: string | null;
  presetName: string;
  isEditingPreset: boolean;
  presetItems: SelectItem[];
  isSharing: boolean;
  isGeneratingShareUrl: boolean;
  onSelectPreset: (id: string) => void;
  onPresetNameChange: (name: string) => void;
  onEditingChange: (isEditing: boolean) => void;
  onShareClick: () => void;
  onSavePreset: (name: string) => void;
  onUpdatePreset: (
    id: string,
    data: { name: string; settings: BorderPresetSettings }
  ) => void;
  onDeletePreset: (id: string) => void;
}

/**
 * Section for managing border calculator presets
 * Allows saving, recalling, and sharing presets
 */
export function PresetsSection({
  selectedPresetId,
  presetName,
  isEditingPreset,
  presetItems,
  isSharing,
  isGeneratingShareUrl,
  onSelectPreset,
  onPresetNameChange,
  onEditingChange,
  onShareClick,
  onSavePreset,
  onUpdatePreset,
  onDeletePreset,
}: PresetsSectionProps) {
  return (
    <CalculatorCard title="Presets" description="Save and load border presets.">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Select
            label="Presets"
            selectedValue={selectedPresetId || ''}
            onValueChange={onSelectPreset}
            items={presetItems}
            placeholder="Select preset"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onShareClick}
            disabled={isSharing || isGeneratingShareUrl}
            className="rounded-full border p-2 transition focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:cursor-not-allowed text-[color:var(--color-text-primary)] border-[color:var(--color-border-secondary)] bg-[rgba(var(--color-background-rgb),0.08)] hover:bg-[rgba(var(--color-background-rgb),0.14)] focus-visible:ring-[color:var(--color-border-primary)]"
            title="Share preset"
          >
            {isGeneratingShareUrl ? (
              <svg
                className="animate-spin h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                aria-label="Loading"
                role="img"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <Share2 className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onEditingChange(true)}
            className="rounded-full border p-2 transition focus-visible:outline-none focus-visible:ring-2 text-[color:var(--color-text-primary)] border-[color:var(--color-border-secondary)] bg-[rgba(var(--color-background-rgb),0.08)] hover:bg-[rgba(var(--color-background-rgb),0.14)] focus-visible:ring-[color:var(--color-border-primary)]"
            title="Edit preset"
          >
            <Save className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isEditingPreset && (
        <div className="space-y-3">
          <TextInput
            value={presetName}
            onValueChange={onPresetNameChange}
            placeholder="Preset name"
            label="Preset name"
          />
          <div className="grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => onSavePreset(presetName)}
              disabled={!presetName}
              className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 hover:brightness-110"
              style={{
                color: 'var(--color-primary)',
                borderColor: 'var(--color-primary)',
                borderWidth: 1,
                backgroundColor: 'rgba(var(--color-background-rgb), 0.06)',
              }}
            >
              <Save className="h-4 w-4" />
              Save
            </button>
            <button
              type="button"
              onClick={() =>
                selectedPresetId &&
                onUpdatePreset(selectedPresetId, {
                  name: presetName,
                  settings: {} as BorderPresetSettings,
                })
              }
              disabled={!selectedPresetId}
              className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 hover:brightness-110"
              style={{
                color: 'var(--color-secondary)',
                borderColor: 'var(--color-secondary)',
                borderWidth: 1,
                backgroundColor: 'rgba(var(--color-background-rgb), 0.06)',
              }}
            >
              <Save className="h-4 w-4" />
              Update
            </button>
            <button
              type="button"
              onClick={() =>
                selectedPresetId && onDeletePreset(selectedPresetId)
              }
              disabled={!selectedPresetId}
              className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 hover:brightness-110"
              style={{
                color: 'var(--color-accent)',
                borderColor: 'var(--color-accent)',
                borderWidth: 1,
                backgroundColor: 'rgba(var(--color-background-rgb), 0.06)',
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      )}
    </CalculatorCard>
  );
}
