import { useState } from 'react';
import { X, Save, Trash2, Plus } from 'lucide-react';
import { TextInput } from '../../ui/text-input';
import type { BorderPreset, BorderSettings } from '../../../types/border-calculator';
import { DEFAULT_BORDER_PRESETS } from '../../../constants/border-calculator';

interface PresetsSectionProps {
  onClose: () => void;
  presets: BorderPreset[];
  currentPreset: BorderPreset | null;
  onApplyPreset: (preset: BorderPreset) => void;
  onSavePreset: (name: string, settings: BorderSettings) => void;
  onUpdatePreset: (id: string, name: string, settings: BorderSettings) => void;
  onDeletePreset: (id: string) => void;
  getCurrentSettings: () => BorderSettings;
}

export function PresetsSection({
  onClose,
  presets,
  currentPreset,
  onApplyPreset,
  onSavePreset,
  onUpdatePreset,
  onDeletePreset,
  getCurrentSettings,
}: PresetsSectionProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleSaveNew = () => {
    if (!newPresetName.trim()) return;
    onSavePreset(newPresetName.trim(), getCurrentSettings());
    setNewPresetName('');
    setIsCreating(false);
  };

  const handleUpdate = (id: string) => {
    if (!editName.trim()) return;
    onUpdatePreset(id, editName.trim(), getCurrentSettings());
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
        <h3 className="text-lg font-semibold text-white">Presets</h3>
        <button
          onClick={onClose}
          className="rounded-lg border border-white/20 bg-white/5 p-2 text-white transition hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Create new preset */}
        {isCreating ? (
          <div className="rounded-lg border border-white/20 bg-white/5 p-4 space-y-3">
            <TextInput
              value={newPresetName}
              onValueChange={setNewPresetName}
              placeholder="Preset name"
              label="New Preset Name"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveNew}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-green-700"
              >
                <Save className="h-4 w-4" />
                Save
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewPresetName('');
                }}
                className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/30 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
          >
            <Plus className="h-4 w-4" />
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
                    ? 'border-blue-500/50 bg-blue-500/10'
                    : 'border-white/20 bg-white/5 hover:bg-white/10'
                }`}
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
                        onClick={() => handleUpdate(preset.id)}
                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-blue-700"
                      >
                        <Save className="h-3 w-3" />
                        Update
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="rounded-lg border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium text-white transition hover:bg-white/10"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => onApplyPreset(preset)}
                      className="flex-1 text-left"
                    >
                      <div className="text-sm font-medium text-white">
                        {preset.name}
                      </div>
                      {!isUserPreset && (
                        <div className="text-xs text-white/50">Default</div>
                      )}
                    </button>
                    {isUserPreset && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEdit(preset)}
                          className="rounded p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
                        >
                          <Save className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDeletePreset(preset.id)}
                          className="rounded p-1 text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
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