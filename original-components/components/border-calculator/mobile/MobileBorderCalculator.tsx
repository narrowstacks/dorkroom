import React, { useState, useEffect, useMemo } from "react";
import { Platform, TouchableOpacity } from "react-native";
import {
  Box,
  ScrollView,
  VStack,
  HStack,
  Button,
  ButtonText,
  ButtonIcon,
  useToast,
  Toast,
  ToastTitle,
  VStack as ToastVStack,
} from "@gluestack-ui/themed";
import {
  Drawer,
  DrawerContent,
  DrawerBody,
} from "@/components/ui/drawer/index";
import { useThemeColor } from "@/hooks/useThemeColor";
import { WarningAlert } from "@/components/ui/feedback";
import { useAnimationExperiment } from "@/hooks/useAnimationExperiment";
import { debugLog } from "@/utils/debugLogger";

// Mobile components
import { BladeResultsDisplay, CompactPreview, SettingsButton } from "./index";
import { ShareModal } from "./ShareModal";
import { SaveBeforeShareModal } from "./SaveBeforeShareModal";

// Inline sections instead of modals
import {
  PaperSizeSection,
  BorderSizeSection,
  PositionOffsetsSection,
  PresetsSection,
} from "./sections";

// Icons
import {
  ImageIcon,
  RulerIcon,
  MoveIcon,
  RotateCcw,
  Eye,
  EyeOff,
  BookOpen,
  Share,
  Zap,
  Crop,
} from "lucide-react-native";

// Border calculator functionality
import {
  useBorderCalculator,
  useBorderPresets,
} from "@/hooks/borderCalculator";
import type { BorderPreset } from "@/types/borderPresetTypes";

// Debug helper (dev only)
if (__DEV__) {
  import("@/utils/deepLinkDebug");
}

// Active section type
type ActiveSection = "paperSize" | "borderSize" | "positionOffsets" | "presets";

interface MobileBorderCalculatorProps {
  loadedPresetFromUrl?: {
    name: string;
    settings: any;
    isFromUrl?: boolean;
  } | null;
  clearLoadedPreset?: () => void;
}

export const MobileBorderCalculator: React.FC<MobileBorderCalculatorProps> = ({
  loadedPresetFromUrl,
  clearLoadedPreset,
}) => {
  const backgroundColor = useThemeColor({}, "background");
  const toast = useToast();

  // Animation experiment hook for A/B testing
  const {
    engine,
    setEngine,
    isLoading: isAnimationLoading,
  } = useAnimationExperiment();

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeSection, setActiveSection] =
    useState<ActiveSection>("paperSize");
  const [currentPreset, setCurrentPreset] = useState<BorderPreset | null>(null);

  // Share modal state
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [isSaveBeforeShareModalVisible, setIsSaveBeforeShareModalVisible] =
    useState(false);

  // Track loaded preset to prevent infinite re-application
  const [hasAppliedLoadedPreset, setHasAppliedLoadedPreset] = useState(false);
  const [lastAppliedPresetId, setLastAppliedPresetId] = useState<string | null>(
    null,
  );

  // Border calculator hooks
  const {
    aspectRatio,
    setAspectRatio,
    paperSize,
    setPaperSize,
    customAspectWidth,
    setCustomAspectWidth,
    customAspectHeight,
    setCustomAspectHeight,
    customPaperWidth,
    setCustomPaperWidth,
    customPaperHeight,
    setCustomPaperHeight,
    minBorder,
    setMinBorder,
    enableOffset,
    setEnableOffset,
    ignoreMinBorder,
    setIgnoreMinBorder,
    horizontalOffset,
    setHorizontalOffset,
    verticalOffset,
    setVerticalOffset,
    showBlades,
    setShowBlades,
    isLandscape,
    setIsLandscape,
    isRatioFlipped,
    setIsRatioFlipped,
    offsetWarning,
    bladeWarning,
    calculation,
    minBorderWarning,
    paperSizeWarning,
    resetToDefaults,
    applyPreset,
  } = useBorderCalculator();

  const { presets, addPreset, updatePreset, removePreset } = useBorderPresets();

  // Ultra-optimized settings comparison using concatenation for better performance
  const currentSettingsHash = useMemo(() => {
    // Use direct string concatenation for maximum performance
    return `${aspectRatio}|${paperSize}|${customAspectWidth}|${customAspectHeight}|${customPaperWidth}|${customPaperHeight}|${minBorder}|${enableOffset}|${ignoreMinBorder}|${horizontalOffset}|${verticalOffset}|${showBlades}|${isLandscape}|${isRatioFlipped}`;
  }, [
    aspectRatio,
    paperSize,
    customAspectWidth,
    customAspectHeight,
    customPaperWidth,
    customPaperHeight,
    minBorder,
    enableOffset,
    ignoreMinBorder,
    horizontalOffset,
    verticalOffset,
    showBlades,
    isLandscape,
    isRatioFlipped,
  ]);

  const presetSettingsHash = useMemo(() => {
    if (!currentPreset) return null;
    const s = currentPreset.settings;
    return `${s.aspectRatio}|${s.paperSize}|${s.customAspectWidth}|${s.customAspectHeight}|${s.customPaperWidth}|${s.customPaperHeight}|${s.minBorder}|${s.enableOffset}|${s.ignoreMinBorder}|${s.horizontalOffset}|${s.verticalOffset}|${s.showBlades}|${s.isLandscape}|${s.isRatioFlipped}`;
  }, [currentPreset]);

  // Reset current preset when settings change (much faster than deep object comparison)
  useEffect(() => {
    if (currentPreset && currentSettingsHash !== presetSettingsHash) {
      setCurrentPreset(null);
    }
  }, [currentSettingsHash, presetSettingsHash, currentPreset]);

  // Handle loaded preset from URL
  useEffect(() => {
    if (!loadedPresetFromUrl) {
      setHasAppliedLoadedPreset(false);
      setLastAppliedPresetId(null);
      return;
    }

    // Create a unique ID for this preset based on its content
    const presetId = `${loadedPresetFromUrl.name}-${JSON.stringify(loadedPresetFromUrl.settings)}`;

    // Check if this is a new preset (different from the last applied one)
    if (presetId !== lastAppliedPresetId) {
      applyPreset(loadedPresetFromUrl.settings);
      // Create a temporary preset object to indicate it's loaded
      const tempPreset = {
        id: "shared-" + Date.now(),
        name: loadedPresetFromUrl.name,
        settings: loadedPresetFromUrl.settings,
      };
      setCurrentPreset(tempPreset);
      setHasAppliedLoadedPreset(true);
      setLastAppliedPresetId(presetId);

      // Determine the appropriate toast message
      const isFromUrl = loadedPresetFromUrl.isFromUrl;
      const toastTitle = isFromUrl
        ? `Shared preset "${loadedPresetFromUrl.name}" loaded!`
        : `Last settings "${loadedPresetFromUrl.name}" loaded`;

      toast.show({
        placement: "top",
        render: ({ id }) => (
          <Toast nativeID={`toast-${id}`} action="success" variant="solid">
            <ToastVStack space="xs">
              <ToastTitle>{toastTitle}</ToastTitle>
            </ToastVStack>
          </Toast>
        ),
      });

      // Clear the preset after processing to prevent it from persisting
      if (clearLoadedPreset) {
        clearLoadedPreset();
      }
    }
  }, [
    loadedPresetFromUrl,
    applyPreset,
    toast,
    lastAppliedPresetId,
    clearLoadedPreset,
    hasAppliedLoadedPreset,
  ]);

  // Heavily optimized display values with minimal computation
  const paperSizeDisplayValue = useMemo(() => {
    return paperSize === "custom"
      ? `${customPaperWidth}" × ${customPaperHeight}"`
      : paperSize;
  }, [paperSize, customPaperWidth, customPaperHeight]);

  const aspectRatioDisplayValue = useMemo(() => {
    return aspectRatio === "custom"
      ? `${customAspectWidth}:${customAspectHeight}`
      : aspectRatio;
  }, [aspectRatio, customAspectWidth, customAspectHeight]);

  const borderSizeDisplayValue = useMemo(() => {
    const val = +minBorder || 0; // Fastest number conversion
    return `${val.toFixed(2)}"`;
  }, [minBorder]);

  const positionDisplayValue = useMemo(() => {
    if (!enableOffset) return "Centered";
    const hOffset = +horizontalOffset || 0; // Fastest number conversion
    const vOffset = +verticalOffset || 0;
    return `H:${hOffset.toFixed(1)} V:${vOffset.toFixed(1)}`;
  }, [enableOffset, horizontalOffset, verticalOffset]);

  const presetsDisplayValue = useMemo(() => {
    if (!currentPreset) return "Presets";
    return currentPreset.name.length > 10
      ? currentPreset.name
      : `${currentPreset.name}`;
  }, [currentPreset]);

  // Current settings for sharing - optimized number conversion
  const currentSettings = useMemo(
    () => ({
      aspectRatio,
      paperSize,
      customAspectWidth: +customAspectWidth || 0,
      customAspectHeight: +customAspectHeight || 0,
      customPaperWidth: +customPaperWidth || 0,
      customPaperHeight: +customPaperHeight || 0,
      minBorder: +minBorder || 0,
      enableOffset,
      ignoreMinBorder,
      horizontalOffset: +horizontalOffset || 0,
      verticalOffset: +verticalOffset || 0,
      showBlades,
      isLandscape,
      isRatioFlipped,
    }),
    [
      aspectRatio,
      paperSize,
      customAspectWidth,
      customAspectHeight,
      customPaperWidth,
      customPaperHeight,
      minBorder,
      enableOffset,
      ignoreMinBorder,
      horizontalOffset,
      verticalOffset,
      showBlades,
      isLandscape,
      isRatioFlipped,
    ],
  );

  // Action handlers

  const handleShare = () => {
    // Check if the current settings match a saved preset
    const matchedPreset = presets.find(
      (p) => JSON.stringify(p.settings) === JSON.stringify(currentSettings),
    );

    if (matchedPreset) {
      // If it's a saved preset, share it directly
      setIsShareModalVisible(true);
    } else {
      // If not saved, open the modal to force saving
      setIsSaveBeforeShareModalVisible(true);
    }
  };

  const handleSaveAndShare = (presetName: string) => {
    // Create and save the new preset
    const newPreset = {
      id: "user-" + Date.now(),
      name: presetName,
      settings: currentSettings,
    };
    addPreset(newPreset);
    setCurrentPreset(newPreset);

    // Now open the share modal
    setIsShareModalVisible(true);
  };

  // Open drawer handlers
  const openDrawerSection = (section: ActiveSection) => {
    setActiveSection(section);
    setIsDrawerOpen(true);
  };

  // Close drawer handler
  const closeDrawer = () => {
    setIsDrawerOpen(false);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor }}
      contentContainerStyle={{
        flexGrow: 1,
        paddingBottom:
          Platform.OS === "ios" || Platform.OS === "android" ? 100 : 80,
      }}
    >
      <Box style={{ flex: 1, padding: 16 }}>
        <VStack space="lg">
          {/* Hero Section - Blade Results */}
          <BladeResultsDisplay
            calculation={calculation}
            paperSize={paperSizeDisplayValue}
            aspectRatio={aspectRatioDisplayValue}
          />

          {/* Compact Preview */}
          <CompactPreview calculation={calculation} showBlades={showBlades} />

          {/* Warnings */}
          {bladeWarning && (
            <WarningAlert message={bladeWarning} action="error" />
          )}
          {minBorderWarning && (
            <WarningAlert message={minBorderWarning} action="error" />
          )}
          {paperSizeWarning && (
            <WarningAlert message={paperSizeWarning} action="warning" />
          )}
          {offsetWarning && (
            <WarningAlert message={offsetWarning} action="warning" />
          )}

          {/* Settings Buttons */}
          <VStack space="xs" style={{ marginTop: 5 }}>
            <SettingsButton
              label="Paper and Image Size"
              value={`${aspectRatioDisplayValue} on ${paperSizeDisplayValue}`}
              onPress={() => openDrawerSection("paperSize")}
              icon={ImageIcon}
            />

            <SettingsButton
              label="Border Size"
              value={borderSizeDisplayValue}
              onPress={() => openDrawerSection("borderSize")}
              icon={RulerIcon}
            />

            <SettingsButton
              label="Position & Offsets"
              value={positionDisplayValue}
              onPress={() => openDrawerSection("positionOffsets")}
              icon={MoveIcon}
            />
            <HStack space="sm" style={{ flex: 1 }}>
              <Box style={{ flex: 1 }}>
                <SettingsButton
                  label="Blades"
                  onPress={() => setShowBlades(!showBlades)}
                  icon={showBlades ? EyeOff : Crop}
                  showChevron={false}
                  centerLabel={true}
                />
              </Box>

              <Box style={{ flex: 1 }}>
                <SettingsButton
                  value={presetsDisplayValue}
                  onPress={() => openDrawerSection("presets")}
                  icon={BookOpen}
                />
              </Box>

              <Box style={{ flex: 0.3 }}>
                <TouchableOpacity onPress={handleShare} activeOpacity={0.7}>
                  <Box
                    style={{
                      backgroundColor: "#10B981",
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 12,
                      minHeight: 56,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Share size={20} color="white" />
                  </Box>
                </TouchableOpacity>
              </Box>
            </HStack>
          </VStack>

          {/* Reset Button */}
          <Button
            onPress={resetToDefaults}
            variant="solid"
            action="negative"
            size="md"
            style={{ marginTop: 4 }}
          >
            <ButtonIcon as={RotateCcw} />
            <ButtonText style={{ marginLeft: 8 }}>Reset to Defaults</ButtonText>
          </Button>

          {/* Bottom Drawer */}
          <Drawer
            isOpen={isDrawerOpen}
            onClose={closeDrawer}
            size="md"
            anchor="bottom"
          >
            <DrawerContent style={{ backgroundColor }}>
              <DrawerBody style={{ flex: 1, backgroundColor, padding: 0 }}>
                {activeSection === "paperSize" && (
                  <PaperSizeSection
                    onClose={closeDrawer}
                    aspectRatio={aspectRatio}
                    setAspectRatio={setAspectRatio}
                    customAspectWidth={customAspectWidth}
                    setCustomAspectWidth={setCustomAspectWidth}
                    customAspectHeight={customAspectHeight}
                    setCustomAspectHeight={setCustomAspectHeight}
                    paperSize={paperSize}
                    setPaperSize={setPaperSize}
                    customPaperWidth={customPaperWidth}
                    setCustomPaperWidth={setCustomPaperWidth}
                    customPaperHeight={customPaperHeight}
                    setCustomPaperHeight={setCustomPaperHeight}
                    isLandscape={isLandscape}
                    setIsLandscape={setIsLandscape}
                    isRatioFlipped={isRatioFlipped}
                    setIsRatioFlipped={setIsRatioFlipped}
                  />
                )}

                {activeSection === "borderSize" && (
                  <BorderSizeSection
                    onClose={closeDrawer}
                    minBorder={+minBorder || 0}
                    setMinBorder={(value: number) =>
                      setMinBorder(String(value))
                    }
                    minBorderWarning={minBorderWarning}
                  />
                )}

                {activeSection === "positionOffsets" && (
                  <PositionOffsetsSection
                    onClose={closeDrawer}
                    enableOffset={enableOffset}
                    setEnableOffset={setEnableOffset}
                    ignoreMinBorder={ignoreMinBorder}
                    setIgnoreMinBorder={setIgnoreMinBorder}
                    horizontalOffset={+horizontalOffset || 0}
                    setHorizontalOffset={(value: number) =>
                      setHorizontalOffset(String(value))
                    }
                    verticalOffset={+verticalOffset || 0}
                    setVerticalOffset={(value: number) =>
                      setVerticalOffset(String(value))
                    }
                    offsetWarning={offsetWarning}
                  />
                )}

                {activeSection === "presets" && (
                  <PresetsSection
                    onClose={closeDrawer}
                    presets={presets}
                    currentPreset={currentPreset}
                    onApplyPreset={(preset) => {
                      applyPreset(preset.settings);
                      setCurrentPreset(preset);
                      closeDrawer();
                    }}
                    onSavePreset={(name, settings) => {
                      const newPreset: BorderPreset = {
                        id: Date.now().toString(),
                        name,
                        settings,
                      };
                      addPreset(newPreset);
                      setCurrentPreset(newPreset);
                      closeDrawer();
                    }}
                    onUpdatePreset={(id, name, settings) => {
                      updatePreset(id, { name, settings });
                      if (currentPreset?.id === id) {
                        setCurrentPreset({ ...currentPreset, name, settings });
                      }
                    }}
                    onDeletePreset={(id) => {
                      removePreset(id);
                      if (currentPreset?.id === id) {
                        setCurrentPreset(null);
                      }
                    }}
                    getCurrentSettings={() => ({
                      aspectRatio,
                      paperSize,
                      customAspectWidth: +customAspectWidth || 0,
                      customAspectHeight: +customAspectHeight || 0,
                      customPaperWidth: +customPaperWidth || 0,
                      customPaperHeight: +customPaperHeight || 0,
                      minBorder: +minBorder || 0,
                      enableOffset,
                      ignoreMinBorder,
                      horizontalOffset: +horizontalOffset || 0,
                      verticalOffset: +verticalOffset || 0,
                      showBlades,
                      isLandscape,
                      isRatioFlipped,
                    })}
                  />
                )}
              </DrawerBody>
            </DrawerContent>
          </Drawer>

          {/* Share Modal */}
          <ShareModal
            isVisible={isShareModalVisible}
            onClose={() => setIsShareModalVisible(false)}
            currentSettings={currentSettings}
            presetName={currentPreset?.name || "Unnamed Preset"}
          />

          {/* Save Before Share Modal */}
          <SaveBeforeShareModal
            isVisible={isSaveBeforeShareModalVisible}
            onClose={() => setIsSaveBeforeShareModalVisible(false)}
            onSaveAndShare={handleSaveAndShare}
            currentSettings={currentSettings}
          />
        </VStack>
      </Box>
    </ScrollView>
  );
};
