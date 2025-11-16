import { useState, useMemo } from 'react';
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
  onUpdatePreset: (id: string, data: { name: string; settings: BorderPresetSettings }) => void;
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
  savePreset: () => void;
  updatePresetHandler: () => void;
  deletePresetHandler: () => void;
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
    if (id === '__divider__') return;
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

  const savePreset = () => {
    if (!presetName.trim()) return;
    const newPreset = {
      id: 'user-' + Date.now(),
      name: presetName.trim(),
      settings: currentSettings,
    };
    onAddPreset(newPreset);
    setSelectedPresetId(newPreset.id);
    setIsEditingPreset(false);
  };

  const updatePresetHandler = () => {
    if (!selectedPresetId) return;
    const updated = { name: presetName.trim(), settings: currentSettings };
    onUpdatePreset(selectedPresetId, updated);
    setIsEditingPreset(false);
  };

  const deletePresetHandler = () => {
    if (!selectedPresetId) return;
    onRemovePreset(selectedPresetId);
    setSelectedPresetId('');
    setPresetName('');
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
