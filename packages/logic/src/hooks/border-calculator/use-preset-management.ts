import { useMemo, useState } from 'react';
import type { BorderPresetSettings } from '../../types/border-calculator';

interface PresetWithSettings {
  id: string;
  name: string;
  settings: BorderPresetSettings;
}

interface UsePresetManagementProps {
  presets: PresetWithSettings[];
  defaultPresets: PresetWithSettings[];
  currentSettings: BorderPresetSettings;
  onAddPreset: (preset: PresetWithSettings) => void;
  onUpdatePreset: (
    id: string,
    data: { name: string; settings: BorderPresetSettings }
  ) => void;
  onRemovePreset: (id: string) => void;
  onApplySettings: (settings: BorderPresetSettings) => void;
}

interface UsePresetManagementReturn {
  selectedPresetId: string;
  presetName: string;
  isEditingPreset: boolean;
  presetItems: Array<{ label: string; value: string }>;
  setSelectedPresetId: (id: string) => void;
  setPresetName: (name: string) => void;
  setIsEditingPreset: (isEditing: boolean) => void;
  handleSelectPreset: (id: string) => void;
  savePreset: (name?: string, settings?: BorderPresetSettings) => void;
  updatePresetHandler: (
    id?: string,
    data?: { name?: string; settings?: BorderPresetSettings }
  ) => void;
  deletePresetHandler: (id?: string) => void;
}

/**
 * Hook to manage border calculator presets
 * Handles selection, creation, updating, and deletion of presets
 */
export function usePresetManagement({
  presets,
  defaultPresets,
  currentSettings,
  onAddPreset,
  onUpdatePreset,
  onRemovePreset,
  onApplySettings,
}: UsePresetManagementProps): UsePresetManagementReturn {
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [presetName, setPresetName] = useState('');
  const [isEditingPreset, setIsEditingPreset] = useState(false);

  const presetItems = useMemo(
    () => [
      ...presets.map((p) => ({ label: p.name, value: p.id })),
      { label: '────────', value: '__divider__' },
      ...defaultPresets.map((p) => ({ label: p.name, value: p.id })),
    ],
    [presets, defaultPresets]
  );

  const handleSelectPreset = (id: string) => {
    if (id.startsWith('__divider')) return;
    setSelectedPresetId(id);
    const preset =
      presets.find((p) => p.id === id) ||
      defaultPresets.find((p) => p.id === id);
    if (preset) {
      onApplySettings(preset.settings);
      setPresetName(preset.name);
      setIsEditingPreset(false);
    }
  };

  const savePreset = (name?: string, settings?: BorderPresetSettings) => {
    const finalName = name !== undefined ? name : presetName;
    const finalSettings = settings !== undefined ? settings : currentSettings;

    if (!finalName.trim()) return;
    const newPreset = {
      id: `user-${Date.now()}`,
      name: finalName.trim(),
      settings: finalSettings,
    };
    onAddPreset(newPreset);
    setSelectedPresetId(newPreset.id);
    setIsEditingPreset(false);
  };

  const updatePresetHandler = (
    id?: string,
    data?: { name?: string; settings?: BorderPresetSettings }
  ) => {
    const targetId = id || selectedPresetId;
    if (!targetId) return;

    const finalName = data?.name !== undefined ? data.name : presetName;
    const finalSettings =
      data?.settings !== undefined ? data.settings : currentSettings;

    const updated = { name: finalName.trim(), settings: finalSettings };
    onUpdatePreset(targetId, updated);
    setIsEditingPreset(false);
  };

  const deletePresetHandler = (id?: string) => {
    const targetId = id || selectedPresetId;
    if (!targetId) return;
    onRemovePreset(targetId);
    if (targetId === selectedPresetId) {
      setSelectedPresetId('');
      setPresetName('');
    }
    setIsEditingPreset(false);
  };

  return {
    selectedPresetId,
    presetName,
    isEditingPreset,
    presetItems,
    setSelectedPresetId,
    setPresetName,
    setIsEditingPreset,
    handleSelectPreset,
    savePreset,
    updatePresetHandler,
    deletePresetHandler,
  };
}
