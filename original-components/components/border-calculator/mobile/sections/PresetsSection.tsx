import React, { useState } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  ButtonIcon,
  ButtonText,
  Input,
  InputField,
} from "@gluestack-ui/themed";
import { useThemeColor } from "@/hooks/useThemeColor";
import {
  Save,
  Trash2,
  ArrowUpToLine,
  Plus,
  Edit3,
  Copy,
} from "lucide-react-native";
import { showConfirmAlert } from "@/components/ui/layout/ConfirmAlert";
import { TextInput } from "@/components/ui/forms/TextInput";
import { SectionWrapper } from "./SectionWrapper";
import type {
  BorderPreset,
  BorderPresetSettings,
} from "@/types/borderPresetTypes";

interface PresetsSectionProps {
  onClose: () => void;
  presets: BorderPreset[];
  currentPreset: BorderPreset | null;
  onApplyPreset: (preset: BorderPreset) => void;
  onSavePreset: (name: string, settings: BorderPresetSettings) => void;
  onDeletePreset: (id: string) => void;
  onUpdatePreset: (
    id: string,
    name: string,
    settings: BorderPresetSettings,
  ) => void;
  getCurrentSettings: () => BorderPresetSettings;
}

export const PresetsSection: React.FC<PresetsSectionProps> = ({
  onClose,
  presets,
  currentPreset,
  onApplyPreset,
  onSavePreset,
  onDeletePreset,
  onUpdatePreset,
  getCurrentSettings,
}) => {
  const borderColor = useThemeColor({}, "outline");
  const textColor = useThemeColor({}, "text");
  const cardBackground = useThemeColor({}, "cardBackground");

  const [showSaveForm, setShowSaveForm] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editingPresetName, setEditingPresetName] = useState("");
  const [duplicatingPresetId, setDuplicatingPresetId] = useState<string | null>(
    null,
  );
  const [duplicatePresetName, setDuplicatePresetName] = useState("");

  const handleSavePreset = () => {
    if (presetName.trim()) {
      onSavePreset(presetName.trim(), getCurrentSettings());
      setPresetName("");
      setShowSaveForm(false);
    }
  };

  const handleDeletePreset = (id: string) => {
    showConfirmAlert(
      "Delete Preset",
      "Are you sure you want to delete this preset? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDeletePreset(id),
        },
      ],
    );
  };

  const handleEditPreset = (preset: BorderPreset) => {
    setEditingPresetId(preset.id);
    setEditingPresetName(preset.name);
  };

  const handleConfirmEdit = () => {
    if (editingPresetId && editingPresetName.trim()) {
      const preset = presets.find((p) => p.id === editingPresetId);
      if (preset) {
        onUpdatePreset(
          editingPresetId,
          editingPresetName.trim(),
          preset.settings,
        );
      }
    }
    setEditingPresetId(null);
    setEditingPresetName("");
  };

  const handleCancelEdit = () => {
    setEditingPresetId(null);
    setEditingPresetName("");
  };

  const handleDuplicatePreset = (preset: BorderPreset) => {
    setDuplicatingPresetId(preset.id);
    setDuplicatePresetName(`Duplicate of ${preset.name}`);
  };

  const handleConfirmDuplicate = () => {
    if (duplicatingPresetId && duplicatePresetName.trim()) {
      const preset = presets.find((p) => p.id === duplicatingPresetId);
      if (preset) {
        onSavePreset(duplicatePresetName.trim(), preset.settings);
      }
    }
    setDuplicatingPresetId(null);
    setDuplicatePresetName("");
  };

  const handleCancelDuplicate = () => {
    setDuplicatingPresetId(null);
    setDuplicatePresetName("");
  };

  const handleSaveToExistingPreset = (preset: BorderPreset) => {
    showConfirmAlert(
      "Update Preset",
      `Are you sure you want to update "${preset.name}" with your current settings? This will overwrite the existing preset.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Update",
          style: "default",
          onPress: () =>
            onUpdatePreset(preset.id, preset.name, getCurrentSettings()),
        },
      ],
    );
  };

  return (
    <SectionWrapper title="Presets" onClose={onClose}>
      {/* Save New Preset Section */}
      <Box>
        {!showSaveForm ? (
          <Button
            onPress={() => setShowSaveForm(true)}
            variant="solid"
            action="primary"
            size="md"
          >
            <ButtonIcon as={Plus} />
            <ButtonText style={{ marginLeft: 8 }}>
              Save Current Settings as Preset
            </ButtonText>
          </Button>
        ) : (
          <VStack space="sm">
            <Text style={{ fontSize: 16, fontWeight: "600", color: textColor }}>
              Save New Preset
            </Text>
            <Input variant="outline" size="md">
              <InputField
                placeholder="Enter preset name..."
                value={presetName}
                onChangeText={setPresetName}
              />
            </Input>
            <HStack space="sm">
              <Button
                flex={1}
                onPress={handleSavePreset}
                variant="solid"
                action="positive"
                isDisabled={!presetName.trim()}
              >
                <ButtonIcon as={Save} />
                <ButtonText style={{ marginLeft: 8 }}>Save</ButtonText>
              </Button>
              <Button
                flex={1}
                onPress={() => {
                  setShowSaveForm(false);
                  setPresetName("");
                }}
                variant="outline"
                action="secondary"
              >
                <ButtonText>Cancel</ButtonText>
              </Button>
            </HStack>
          </VStack>
        )}
      </Box>

      {/* Edit Preset Modal */}
      {editingPresetId && (
        <Box
          style={{
            backgroundColor: cardBackground,
            padding: 16,
            borderRadius: 8,
            borderWidth: 2,
            borderColor: "#007AFF",
          }}
        >
          <VStack space="sm">
            <Text style={{ fontSize: 16, fontWeight: "600", color: textColor }}>
              Edit Preset Name
            </Text>
            <TextInput
              value={editingPresetName}
              onChangeText={setEditingPresetName}
              placeholder="Enter preset name..."
              inputTitle="Edit Preset Name"
            />
            <HStack space="sm">
              <Button
                flex={1}
                onPress={handleConfirmEdit}
                variant="solid"
                action="positive"
                isDisabled={!editingPresetName.trim()}
              >
                <ButtonIcon as={Save} />
                <ButtonText style={{ marginLeft: 8 }}>Save</ButtonText>
              </Button>
              <Button
                flex={1}
                onPress={handleCancelEdit}
                variant="outline"
                action="secondary"
              >
                <ButtonText>Cancel</ButtonText>
              </Button>
            </HStack>
          </VStack>
        </Box>
      )}

      {/* Duplicate Preset Modal */}
      {duplicatingPresetId && (
        <Box
          style={{
            backgroundColor: cardBackground,
            padding: 16,
            borderRadius: 8,
            borderWidth: 2,
            borderColor: "#007AFF",
          }}
        >
          <VStack space="sm">
            <Text style={{ fontSize: 16, fontWeight: "600", color: textColor }}>
              Duplicate Preset
            </Text>
            <TextInput
              value={duplicatePresetName}
              onChangeText={setDuplicatePresetName}
              placeholder="Enter new preset name..."
              inputTitle="Duplicate Preset"
            />
            <HStack space="sm">
              <Button
                flex={1}
                onPress={handleConfirmDuplicate}
                variant="solid"
                action="positive"
                isDisabled={!duplicatePresetName.trim()}
              >
                <ButtonIcon as={Save} />
                <ButtonText style={{ marginLeft: 8 }}>Create</ButtonText>
              </Button>
              <Button
                flex={1}
                onPress={handleCancelDuplicate}
                variant="outline"
                action="secondary"
              >
                <ButtonText>Cancel</ButtonText>
              </Button>
            </HStack>
          </VStack>
        </Box>
      )}

      {/* Current Preset Display */}
      {currentPreset && (
        <Box
          style={{
            backgroundColor: cardBackground,
            padding: 12,
            borderRadius: 8,
            borderWidth: 2,
            borderColor: borderColor,
          }}
        >
          <Text style={{ fontSize: 14, color: textColor, opacity: 0.7 }}>
            Current Preset:
          </Text>
          <Text style={{ fontSize: 16, fontWeight: "600", color: textColor }}>
            {currentPreset.name}
          </Text>
        </Box>
      )}

      {/* Presets List */}
      <VStack space="sm">
        <Text style={{ fontSize: 16, fontWeight: "600", color: textColor }}>
          Saved Presets ({presets.length})
        </Text>

        {presets.length === 0 ? (
          <Box
            style={{
              backgroundColor: cardBackground,
              padding: 16,
              borderRadius: 8,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 14,
                color: textColor,
                opacity: 0.7,
                textAlign: "center",
              }}
            >
              No saved presets yet.{"\n"}Save your current settings to create
              your first preset.
            </Text>
          </Box>
        ) : (
          presets.map((preset) => (
            <Box
              key={preset.id}
              style={{
                backgroundColor: cardBackground,
                padding: 12,
                borderRadius: 8,
                borderWidth: currentPreset?.id === preset.id ? 2 : 1,
                borderColor:
                  currentPreset?.id === preset.id ? "#007AFF" : borderColor,
              }}
            >
              <VStack space="sm">
                <HStack
                  style={{
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <VStack style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: textColor,
                      }}
                    >
                      {preset.name}
                    </Text>
                    <Text
                      style={{ fontSize: 12, color: textColor, opacity: 0.7 }}
                    >
                      {preset.settings.aspectRatio} •{" "}
                      {preset.settings.paperSize} • {preset.settings.minBorder}
                      &quot;
                    </Text>
                  </VStack>
                </HStack>

                {/* Action Buttons Row */}
                <HStack space="xs" style={{ justifyContent: "space-between" }}>
                  <Button
                    onPress={() => onApplyPreset(preset)}
                    variant="solid"
                    action="primary"
                    size="xs"
                    flex={1}
                  >
                    <ButtonIcon as={ArrowUpToLine} size="sm" />
                  </Button>

                  <Button
                    onPress={() => handleSaveToExistingPreset(preset)}
                    variant="solid"
                    action="positive"
                    size="xs"
                    flex={1}
                  >
                    <ButtonIcon as={Save} size="sm" />
                  </Button>

                  <Button
                    onPress={() => handleEditPreset(preset)}
                    variant="outline"
                    action="secondary"
                    size="xs"
                    flex={1}
                  >
                    <ButtonIcon as={Edit3} size="sm" />
                  </Button>

                  <Button
                    onPress={() => handleDuplicatePreset(preset)}
                    variant="outline"
                    action="secondary"
                    size="xs"
                    flex={1}
                  >
                    <ButtonIcon as={Copy} size="sm" />
                  </Button>

                  <Button
                    onPress={() => handleDeletePreset(preset.id)}
                    variant="outline"
                    action="negative"
                    size="xs"
                    flex={1}
                  >
                    <ButtonIcon as={Trash2} size="sm" />
                  </Button>
                </HStack>
              </VStack>
            </Box>
          ))
        )}
      </VStack>
    </SectionWrapper>
  );
};
