import type { BorderPreset, BorderSettings } from '@dorkroom/logic';
import { DEFAULT_BORDER_PRESETS } from '@dorkroom/logic';
import { Plus, Save, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { TextInput } from '../../../components/text-input';
import { useBorderCalculator } from '../border-calculator-context';

interface MobilePresetsSectionProps {
  onClose: () => void;
  currentPreset: BorderPreset | null;
  onApplyPreset: (preset: BorderPreset) => void;
  onSavePreset: (name: string, settings: BorderSettings) => void;
  onUpdatePreset: (id: string, name: string, settings: BorderSettings) => void;
  onDeletePreset: (id: string) => void;
}

export function MobilePresetsSection({
  onClose,
  currentPreset,
  onApplyPreset,
  onSavePreset,
  onUpdatePreset,
  onDeletePreset,
}: MobilePresetsSectionProps) {
  const { presets, currentSettings } = useBorderCalculator();

  const [isCreating, setIsCreating] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleSaveNew = () => {
    if (!newPresetName.trim()) return;
    onSavePreset(newPresetName.trim(), currentSettings);
    setNewPresetName('');
    setIsCreating(false);
  };

  const handleUpdate = (id: string) => {
    if (!editName.trim()) return;
    onUpdatePreset(id, editName.trim(), currentSettings);
    setEditingId(null);
    setEditName('');
  };

  const startEdit = (preset: BorderPreset) => {
    setEditingId(preset.id);
    setEditName(preset.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const allPresets = [...presets, ...DEFAULT_BORDER_PRESETS];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3
          className="text-lg font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Presets
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-primary bg-border-muted p-2 text-primary transition hover:opacity-80"
          aria-label="Close presets"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Create new preset */}
        {isCreating ? (
          <div className="rounded-lg border border-primary bg-border-muted p-4 space-y-3">
            <TextInput
              value={newPresetName}
              onValueChange={setNewPresetName}
              placeholder="Preset name"
              label="New Preset Name"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveNew}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition"
                style={{
                  backgroundColor: 'var(--color-semantic-success)',
                  color: 'var(--color-background)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = 'brightness(0.9)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = 'brightness(1)';
                }}
              >
                <Save className="size-4" />
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setNewPresetName('');
                }}
                className="rounded-lg border border-primary bg-border-muted px-3 py-2 text-sm font-medium text-primary transition hover:opacity-80"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-primary bg-border-muted px-4 py-3 text-sm font-medium text-primary transition"
          >
            <Plus className="size-4" />
            Create New Preset
          </button>
        )}

        {/* Preset list */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {allPresets.map((preset) => {
            const isUserPreset = presets.some((p) => p.id === preset.id);
            const isActive = currentPreset?.id === preset.id;
            const isEditing = editingId === preset.id;

            return (
              <div
                key={preset.id}
                className={`rounded-lg border p-3 transition-colors ${
                  isActive
                    ? ''
                    : 'border-primary bg-border-muted hover:opacity-80'
                }`}
                style={
                  isActive
                    ? {
                        borderColor: 'var(--color-primary)',
                        backgroundColor:
                          'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                      }
                    : undefined
                }
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <TextInput
                      value={editName}
                      onValueChange={setEditName}
                      placeholder="Preset name"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdate(preset.id)}
                        className="flex items-center gap-2 rounded-lg px-3 py-1 text-xs font-medium transition hover:opacity-80 darkroom-invert-icon"
                        style={{
                          backgroundColor: 'var(--color-semantic-info)',
                          color: 'var(--color-background)',
                        }}
                      >
                        <Save className="size-3" />
                        Update
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded-lg border border-primary bg-border-muted px-3 py-1 text-xs font-medium text-primary transition hover:opacity-80"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => onApplyPreset(preset)}
                      className="flex-1 text-left"
                    >
                      <div className="text-sm font-medium text-primary">
                        {preset.name}
                      </div>
                      {!isUserPreset && (
                        <div className="text-xs text-tertiary">Default</div>
                      )}
                    </button>
                    {isUserPreset && (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(preset)}
                          className="rounded p-1 text-secondary transition hover:opacity-80"
                          aria-label={`Edit ${preset.name}`}
                        >
                          <Save className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeletePreset(preset.id)}
                          className="rounded p-1 text-error transition hover:opacity-80"
                          aria-label={`Delete ${preset.name}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
