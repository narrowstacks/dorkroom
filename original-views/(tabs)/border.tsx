import React from "react";
import { Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  startContinuousFPSMonitoring,
  stopContinuousFPSMonitoring,
  debugLog,
} from "@/utils/debugLogger";
// UI Components
import {
  LabeledSliderInput,
  TextInput,
  DimensionInputGroup,
  ToggleSwitch,
} from "@/components/ui/forms";
import { WarningAlert } from "@/components/ui/feedback";
import { ResultRow } from "@/components/ui/calculator";
// Border Calculator Specific Components
import {
  AnimatedPreview,
  BorderInfoSection,
} from "@/components/border-calculator";
import {
  MobileBorderCalculator,
  useResponsiveDetection,
} from "@/components/border-calculator/mobile";

import {
  DESKTOP_BREAKPOINT,
  SLIDER_MIN_BORDER,
  SLIDER_MAX_BORDER,
  SLIDER_STEP_BORDER,
  BORDER_SLIDER_LABELS,
  OFFSET_SLIDER_MIN,
  OFFSET_SLIDER_MAX,
  OFFSET_SLIDER_STEP,
  OFFSET_SLIDER_LABELS,
} from "@/constants/borderCalc";

import { useWindowDimensions } from "@/hooks/useWindowDimensions";
import {
  useBorderCalculator,
  useBorderPresets,
} from "@/hooks/borderCalculator";
import { useThemeColor } from "@/hooks/useThemeColor";
import { ASPECT_RATIOS, PAPER_SIZES } from "@/constants/border";
import { ThemedSelect } from "@/components/ui/select/ThemedSelect";
import { DEFAULT_BORDER_PRESETS } from "@/constants/borderPresets";
import {
  RotateCwSquare,
  Proportions,
  Edit,
  RotateCcw,
  ArrowUp,
  Check,
  Trash2,
  Share2,
} from "lucide-react-native";
import type { BorderPreset } from "@/types/borderPresetTypes";
import * as Clipboard from "expo-clipboard";
import { encodePreset } from "@/utils/presetSharing";
import { useSharedPresetLoader } from "@/hooks/useSharedPresetLoader";
import { generateSharingUrls } from "@/utils/urlHelpers";
import { useAppDetection } from "@/hooks/useAppDetection";
import { AppBanner } from "@/components/ui/feedback/AppBanner";

import {
  Box,
  Text,
  ScrollView,
  HStack,
  VStack,
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Heading,
  Icon,
  CloseIcon,
  useToast,
  Toast,
  ToastTitle,
  VStack as ToastVStack,
  Button,
  ButtonText,
  ButtonIcon,
} from "@gluestack-ui/themed";

export default function BorderCalculator() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width > DESKTOP_BREAKPOINT;
  const { shouldUseMobileLayout } = useResponsiveDetection();
  const backgroundColor = useThemeColor({}, "background");
  const cardBackground = useThemeColor({}, "cardBackground");
  const textColor = useThemeColor({}, "text");
  const borderColor = useThemeColor({}, "icon");
  const tintColor = useThemeColor({}, "tint");
  const outline = useThemeColor({}, "outline");
  const shadowColor = useThemeColor({}, "shadowColor");

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
    setMinBorderSlider,
    enableOffset,
    setEnableOffset,
    ignoreMinBorder,
    setIgnoreMinBorder,
    horizontalOffset,
    setHorizontalOffset,
    setHorizontalOffsetSlider,
    verticalOffset,
    setVerticalOffset,
    setVerticalOffsetSlider,
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
  const { loadedPreset: loadedPresetFromUrl, clearLoadedPreset } =
    useSharedPresetLoader();
  const toast = useToast();
  const { showAppBanner, openInApp, dismissBanner, appMessage } =
    useAppDetection({
      hasSharedContent: !!loadedPresetFromUrl,
    });

  const [selectedPresetId, setSelectedPresetId] = React.useState("");
  const [presetName, setPresetName] = React.useState("");
  const [isEditingPreset, setIsEditingPreset] = React.useState(false);
  const [isShareModalVisible, setShareModalVisible] = React.useState(false);
  const loadedPresetRef = React.useRef<BorderPreset | null>(null);

  // Optimized settings memoization - avoid object recreation
  const currentSettings = React.useMemo(
    () => ({
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
  const presetDirty = React.useMemo(
    () =>
      loadedPresetRef.current &&
      JSON.stringify(loadedPresetRef.current.settings) !==
        JSON.stringify(currentSettings),
    [currentSettings],
  );

  React.useEffect(() => {
    if (presetDirty) setIsEditingPreset(true);
  }, [presetDirty]);

  // Start/stop continuous FPS monitoring when page is focused/unfocused
  useFocusEffect(
    React.useCallback(() => {
      startContinuousFPSMonitoring("Border Calculator");
      return () => {
        stopContinuousFPSMonitoring();
      };
    }, []),
  );

  React.useEffect(() => {
    if (loadedPresetFromUrl && !shouldUseMobileLayout) {
      applyPreset(loadedPresetFromUrl.settings);
      setPresetName(loadedPresetFromUrl.name);
      // Create a temporary preset object to indicate it's loaded, but not saved yet
      const tempPreset = {
        id: "shared-" + Date.now(),
        name: loadedPresetFromUrl.name,
        settings: loadedPresetFromUrl.settings,
      };
      loadedPresetRef.current = tempPreset;
      setSelectedPresetId(""); // It's not a saved preset yet
      setIsEditingPreset(true); // Encourage user to save it

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
      clearLoadedPreset();
    }
  }, [loadedPresetFromUrl, shouldUseMobileLayout, clearLoadedPreset]); // eslint-disable-line react-hooks/exhaustive-deps

  // Memoized preset items to avoid recreation on every render
  const presetItems = React.useMemo(
    () => [
      ...presets.map((p) => ({ label: p.name, value: p.id })),
      { label: "────────", value: "__divider__" },
      ...DEFAULT_BORDER_PRESETS.map((p) => ({ label: p.name, value: p.id })),
    ],
    [presets],
  );

  const handleSelectPreset = (id: string) => {
    if (id === "__divider__") return;
    setSelectedPresetId(id);
    const preset =
      presets.find((p) => p.id === id) ||
      DEFAULT_BORDER_PRESETS.find((p) => p.id === id);
    if (preset) {
      applyPreset(preset.settings);
      setPresetName(preset.name);
      loadedPresetRef.current = preset;
      setIsEditingPreset(false);
    }
  };

  const savePreset = () => {
    if (!presetName.trim()) return;
    const newPreset = {
      id: "user-" + Date.now(),
      name: presetName.trim(),
      settings: currentSettings,
    };
    addPreset(newPreset);
    loadedPresetRef.current = newPreset;
    setSelectedPresetId(newPreset.id);
    setIsEditingPreset(false);
  };

  const updatePresetHandler = () => {
    if (!selectedPresetId) return;
    const updated = { name: presetName.trim(), settings: currentSettings };
    updatePreset(selectedPresetId, updated);
    loadedPresetRef.current = {
      ...(loadedPresetRef.current as BorderPreset),
      ...updated,
      id: selectedPresetId,
    };
    setIsEditingPreset(false);
  };

  const deletePresetHandler = () => {
    if (!selectedPresetId) return;
    removePreset(selectedPresetId);
    setSelectedPresetId("");
    setPresetName("");
    loadedPresetRef.current = null;
    setIsEditingPreset(false);
  };

  const sharePreset = async (preset: {
    name: string;
    settings: typeof currentSettings;
  }) => {
    const encoded = encodePreset(preset);
    if (!encoded) {
      toast.show({
        placement: "top",
        render: ({ id }) => (
          <Toast nativeID={`toast-${id}`} action="error" variant="solid">
            <ToastTitle>Failed to create share link.</ToastTitle>
          </Toast>
        ),
      });
      return;
    }

    const { webUrl, nativeUrl } = generateSharingUrls(encoded);
    const urlToCopy = Platform.OS === "web" ? webUrl : nativeUrl;

    await Clipboard.setStringAsync(urlToCopy);
    toast.show({
      placement: "top",
      render: ({ id }) => (
        <Toast nativeID={`toast-${id}`} action="success" variant="solid">
          <ToastVStack space="xs">
            <ToastTitle>
              Share link for &quot;{preset.name}&quot; copied!
            </ToastTitle>
          </ToastVStack>
        </Toast>
      ),
    });
  };

  const handleSharePreset = async () => {
    // Check if the current settings match a saved preset
    const matchedPreset = presets.find(
      (p) => JSON.stringify(p.settings) === JSON.stringify(currentSettings),
    );

    if (matchedPreset) {
      // If it's a saved preset, share it directly
      sharePreset(matchedPreset);
    } else {
      // If not saved, open the modal to force saving
      setShareModalVisible(true);
    }
  };

  const handleSaveAndShare = () => {
    if (!presetName.trim()) {
      toast.show({
        placement: "top",
        render: ({ id }) => (
          <Toast nativeID={`toast-${id}`} action="error" variant="solid">
            <ToastTitle>Please enter a name for the preset.</ToastTitle>
          </Toast>
        ),
      });
      return;
    }
    const newPreset = {
      id: "user-" + Date.now(),
      name: presetName.trim(),
      settings: currentSettings,
    };
    addPreset(newPreset);
    loadedPresetRef.current = newPreset;
    setSelectedPresetId(newPreset.id);
    setIsEditingPreset(false);
    setShareModalVisible(false);

    // Now share the newly saved preset
    sharePreset(newPreset);
  };

  const handleOpenInApp = async () => {
    if (loadedPresetFromUrl) {
      const encoded = encodePreset(loadedPresetFromUrl);
      if (encoded) {
        const { nativeUrl } = generateSharingUrls(encoded);
        await openInApp(nativeUrl);
      }
    }
  };

  // Use mobile layout for mobile devices
  if (shouldUseMobileLayout) {
    return (
      <>
        <AppBanner
          isVisible={showAppBanner}
          message={appMessage}
          onOpenApp={handleOpenInApp}
          onDismiss={dismissBanner}
        />
        <MobileBorderCalculator
          loadedPresetFromUrl={loadedPresetFromUrl}
          clearLoadedPreset={clearLoadedPreset}
        />
      </>
    );
  }

  return (
    <ScrollView
      sx={{ flex: 1, bg: backgroundColor }}
      contentContainerStyle={{
        flexGrow: 1,
        paddingBottom:
          Platform.OS === "ios" || Platform.OS === "android" ? 100 : 80,
      }}
    >
      <AppBanner
        isVisible={showAppBanner}
        message={appMessage}
        onOpenApp={handleOpenInApp}
        onDismiss={dismissBanner}
      />
      <Modal
        isOpen={isShareModalVisible}
        onClose={() => setShareModalVisible(false)}
      >
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Heading size="lg">Save Preset to Share</Heading>
            <ModalCloseButton>
              <Icon as={CloseIcon} />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody>
            <Text>
              To share these settings, you must first save them as a named
              preset.
            </Text>
            <TextInput
              value={presetName}
              onChangeText={setPresetName}
              placeholder="Enter Preset Name"
              inputTitle="Enter Preset Name"
              style={{ marginTop: 16 }}
            />
          </ModalBody>
          <ModalFooter>
            <HStack sx={{ gap: 12, justifyContent: "flex-end" }}>
              <Button
                variant="outline"
                size="sm"
                action="secondary"
                onPress={() => setShareModalVisible(false)}
              >
                <ButtonText>Cancel</ButtonText>
              </Button>
              <Button size="sm" action="positive" onPress={handleSaveAndShare}>
                <ButtonText>Save & Share</ButtonText>
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Box
        sx={{
          flex: 1,
          p: 16,
          ...(Platform.OS === "web" && {
            maxWidth: 1024,
            marginHorizontal: "auto",
            width: "100%",
            p: 24,
          }),
        }}
      >
        <Box
          sx={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            width: "100%",
            mb: 24,
            pb: 16,
            borderBottomWidth: 1,
            borderBottomColor: outline,
          }}
        >
          <Text sx={{ fontSize: 30, textAlign: "center", fontWeight: "600" }}>
            Border Calculator
          </Text>
        </Box>

        <Box
          sx={{
            width: "100%",
            ...(Platform.OS === "web" &&
              isDesktop && {
                flexDirection: "row",
                gap: 32,
                alignItems: "flex-start",
              }),
          }}
        >
          {calculation && (
            <Box
              sx={{
                gap: 16,
                alignItems: "center",
                width: "100%",
                mb: Platform.OS === "web" ? 0 : 32,
                ...(Platform.OS === "web" &&
                  isDesktop && { flex: 1, alignSelf: "flex-start", mb: 0 }),
              }}
            >
              {/* Fixed-size preview container to prevent layout shifts */}
              <Box
                sx={{
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                }}
              >
                <Box
                  sx={{
                    width: isDesktop ? 400 : 320,
                    height: isDesktop ? 300 : 240,
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    backgroundColor: "transparent",
                  }}
                >
                  <Box
                    sx={{
                      transform: [
                        {
                          scale: Math.min(
                            (isDesktop ? 400 : 320) /
                              (calculation.previewWidth || 1),
                            (isDesktop ? 300 : 240) /
                              (calculation.previewHeight || 1),
                            1,
                          ),
                        },
                      ],
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <AnimatedPreview
                      calculation={calculation}
                      showBlades={showBlades}
                      borderColor={borderColor}
                    />
                  </Box>
                </Box>
              </Box>

              {!shouldUseMobileLayout &&
                (Platform.OS === "web" && isDesktop ? (
                  <HStack
                    sx={{ flex: 1, justifyContent: "space-between", gap: 12 }}
                  >
                    <Button
                      onPress={() => setIsLandscape(!isLandscape)}
                      variant="solid"
                      action="primary"
                      size="md"
                    >
                      <ButtonIcon as={RotateCwSquare} size="md" />
                      <ButtonText
                        style={{ fontSize: 12.5, fontWeight: "bold" }}
                      >
                        Flip Paper Orientation
                      </ButtonText>
                    </Button>
                    <Button
                      onPress={() => setIsRatioFlipped(!isRatioFlipped)}
                      variant="solid"
                      action="primary"
                      size="md"
                    >
                      <ButtonIcon as={Proportions} size="md" />
                      <ButtonText
                        style={{ fontSize: 12.5, fontWeight: "bold" }}
                      >
                        Flip Aspect Ratio
                      </ButtonText>
                    </Button>
                  </HStack>
                ) : (
                  <VStack sx={{ flex: 1, gap: 12, width: "100%" }}>
                    <Button
                      onPress={() => setIsLandscape(!isLandscape)}
                      variant="solid"
                      action="primary"
                      size="md"
                    >
                      <ButtonIcon as={RotateCwSquare} size="md" />
                      <ButtonText style={{ fontSize: 18 }}>
                        Flip Paper Orientation
                      </ButtonText>
                    </Button>
                    <Button
                      onPress={() => setIsRatioFlipped(!isRatioFlipped)}
                      variant="solid"
                      action="primary"
                      size="md"
                    >
                      <ButtonIcon as={Proportions} size="md" />
                      <ButtonText style={{ fontSize: 18 }}>
                        Flip Aspect Ratio
                      </ButtonText>
                    </Button>
                  </VStack>
                ))}

              <Box
                className="mb-4 mt-1 rounded-2xl border p-5 shadow-sm"
                style={{
                  backgroundColor: cardBackground,
                  borderColor: outline,
                  shadowColor,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 4,
                  borderWidth: 1,
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  maxWidth: 400,
                  alignSelf: "center",
                  borderRadius: 16,
                  padding: 16,
                  minWidth: Platform.OS === "web" ? 140 : 160,
                  justifyContent: "center",
                }}
              >
                <ResultRow
                  label="Image Dimensions:"
                  value={`${calculation.printWidth.toFixed(2)} x ${calculation.printHeight.toFixed(2)} inches`}
                />
                <ResultRow
                  label="Left Blade:"
                  value={`${calculation.leftBladeReading.toFixed(2)} inches`}
                />
                <ResultRow
                  label="Right Blade:"
                  value={`${calculation.rightBladeReading.toFixed(2)} inches`}
                />
                <ResultRow
                  label="Top Blade:"
                  value={`${calculation.topBladeReading.toFixed(2)} inches`}
                />
                <ResultRow
                  label="Bottom Blade:"
                  value={`${calculation.bottomBladeReading.toFixed(2)} inches`}
                />
                <Button
                  onPress={resetToDefaults}
                  variant="solid"
                  action="negative"
                  size="md"
                  style={{ marginTop: 8 }}
                >
                  <ButtonIcon as={RotateCcw} />
                  <ButtonText style={{ marginLeft: 18 }}>
                    Reset to Defaults
                  </ButtonText>
                </Button>
                {calculation.isNonStandardPaperSize && (
                  <Box
                    sx={{
                      borderWidth: 1,
                      p: 16,
                      borderRadius: 8,
                      mt: 16,
                      mb: 8,
                      width: "100%",
                      borderColor: tintColor,
                      backgroundColor: `${tintColor}20`,
                    }}
                  >
                    <Text sx={{ fontSize: 16, textAlign: "center", mb: 8 }}>
                      Non-Standard Paper Size
                    </Text>
                    <Text sx={{ fontSize: 14, textAlign: "center" }}>
                      Position paper in the {calculation.easelSizeLabel} slot
                      all the way to the left.
                    </Text>
                  </Box>
                )}
                {bladeWarning && (
                  <WarningAlert message={bladeWarning} action="error" />
                )}
                {minBorderWarning && (
                  <WarningAlert message={minBorderWarning} action="error" />
                )}
                {paperSizeWarning && (
                  <WarningAlert message={paperSizeWarning} action="warning" />
                )}
              </Box>
            </Box>
          )}

          <Box
            sx={{
              gap: 16,
              width: "100%",
              ...(Platform.OS === "web" &&
                isDesktop && { flex: 1, maxWidth: 480 }),
            }}
          >
            <Box sx={{ gap: 8 }}>
              <HStack
                style={{
                  gap: 12,
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <Box style={{ flex: 1 }}>
                  <ThemedSelect
                    label="Presets:"
                    selectedValue={selectedPresetId}
                    onValueChange={handleSelectPreset}
                    items={presetItems as any}
                    placeholder="Select Preset"
                  />
                </Box>
                <Box style={{ marginTop: 12, flexDirection: "row", gap: 8 }}>
                  <Button onPress={handleSharePreset} size="md" variant="solid">
                    <ButtonIcon as={Share2} />
                  </Button>
                  {!isEditingPreset && !presetDirty && (
                    <Button
                      onPress={() => setIsEditingPreset(true)}
                      size="md"
                      variant="solid"
                    >
                      <ButtonIcon as={Edit} />
                    </Button>
                  )}
                </Box>
              </HStack>
              {(isEditingPreset || presetDirty) && (
                <>
                  <Text sx={{ fontSize: 20 }}>Preset Name</Text>
                  <TextInput
                    value={presetName}
                    onChangeText={setPresetName}
                    placeholder="Preset Name"
                    inputTitle="Enter Preset Name"
                  />
                  <HStack style={{ gap: 8, justifyContent: "space-between" }}>
                    <Button
                      onPress={savePreset}
                      variant="solid"
                      action="positive"
                      size="md"
                    >
                      <ButtonIcon as={Check} />
                      <ButtonText style={{ marginLeft: 5, fontSize: 18 }}>
                        Save
                      </ButtonText>
                    </Button>
                    <Button
                      onPress={updatePresetHandler}
                      variant="solid"
                      action="primary"
                      size="md"
                      isDisabled={!selectedPresetId}
                    >
                      <ButtonIcon as={ArrowUp} />
                      <ButtonText style={{ marginLeft: 5, fontSize: 18 }}>
                        Update
                      </ButtonText>
                    </Button>
                    <Button
                      onPress={deletePresetHandler}
                      variant="solid"
                      action="negative"
                      size="md"
                      isDisabled={!selectedPresetId}
                    >
                      <ButtonIcon as={Trash2} />
                      <ButtonText style={{ marginLeft: 5, fontSize: 18 }}>
                        Delete
                      </ButtonText>
                    </Button>
                  </HStack>
                </>
              )}
            </Box>

            <ThemedSelect
              label="Aspect Ratio:"
              selectedValue={aspectRatio}
              onValueChange={setAspectRatio}
              items={ASPECT_RATIOS as any}
              placeholder="Select Aspect Ratio"
            />
            {aspectRatio === "custom" && (
              <DimensionInputGroup
                widthValue={String(customAspectWidth)}
                onWidthChange={setCustomAspectWidth}
                heightValue={String(customAspectHeight)}
                onHeightChange={setCustomAspectHeight}
                widthLabel="width:"
                heightLabel="height:"
                widthPlaceholder="Width"
                heightPlaceholder="Height"
                widthDefault="2"
                heightDefault="3"
              />
            )}

            <ThemedSelect
              label="Paper Size:"
              selectedValue={paperSize}
              onValueChange={setPaperSize}
              items={PAPER_SIZES as any}
              placeholder="Select Paper Size"
            />
            {paperSize === "custom" && (
              <DimensionInputGroup
                widthValue={String(customPaperWidth)}
                onWidthChange={setCustomPaperWidth}
                heightValue={String(customPaperHeight)}
                onHeightChange={setCustomPaperHeight}
                widthLabel="Width (inches):"
                heightLabel="Height (inches):"
                widthPlaceholder="Width"
                heightPlaceholder="Height"
                widthDefault="8"
                heightDefault="10"
              />
            )}

            <LabeledSliderInput
              label="Minimum Border (inches):"
              value={minBorder}
              onChange={setMinBorder}
              onSliderChange={setMinBorderSlider}
              min={SLIDER_MIN_BORDER}
              max={SLIDER_MAX_BORDER}
              step={SLIDER_STEP_BORDER}
              labels={BORDER_SLIDER_LABELS}
              textColor={textColor}
              borderColor={borderColor}
              tintColor={tintColor}
              inputWidth={Platform.OS === "web" && isDesktop ? 80 : undefined}
              continuousUpdate={true}
            />

            <HStack sx={{ flexDirection: "row", gap: 16, width: "100%" }}>
              <ToggleSwitch
                label="Enable Offsets:"
                value={enableOffset}
                onValueChange={setEnableOffset}
              />
              <ToggleSwitch
                label="Show Easel Blades:"
                value={showBlades}
                onValueChange={setShowBlades}
              />
            </HStack>

            {enableOffset && (
              <>
                <Box sx={{ gap: 8 }}>
                  <ToggleSwitch
                    label="Ignore Min Border:"
                    value={ignoreMinBorder}
                    onValueChange={setIgnoreMinBorder}
                  />
                  {ignoreMinBorder && (
                    <Text sx={{ fontSize: 14, mb: 8, lineHeight: 20 }}>
                      Print can be positioned freely but will stay within paper
                      edges
                    </Text>
                  )}
                </Box>
                <Box sx={{ gap: 8 }}>
                  <Box
                    sx={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: 24,
                      mt: 8,
                    }}
                  >
                    <Box sx={{ flex: 1, gap: 4 }}>
                      <LabeledSliderInput
                        label="Horizontal Offset:"
                        value={horizontalOffset}
                        onChange={setHorizontalOffset}
                        onSliderChange={setHorizontalOffsetSlider}
                        min={OFFSET_SLIDER_MIN}
                        max={OFFSET_SLIDER_MAX}
                        step={OFFSET_SLIDER_STEP}
                        labels={OFFSET_SLIDER_LABELS}
                        textColor={textColor}
                        borderColor={borderColor}
                        tintColor={tintColor}
                        warning={!!offsetWarning}
                        continuousUpdate={true}
                      />
                    </Box>
                    <Box sx={{ flex: 1, gap: 4 }}>
                      <LabeledSliderInput
                        label="Vertical Offset:"
                        value={verticalOffset}
                        onChange={setVerticalOffset}
                        onSliderChange={setVerticalOffsetSlider}
                        min={OFFSET_SLIDER_MIN}
                        max={OFFSET_SLIDER_MAX}
                        step={OFFSET_SLIDER_STEP}
                        labels={OFFSET_SLIDER_LABELS}
                        textColor={textColor}
                        borderColor={borderColor}
                        tintColor={tintColor}
                        warning={!!offsetWarning}
                        continuousUpdate={true}
                      />
                    </Box>
                  </Box>
                  {offsetWarning && (
                    <WarningAlert message={offsetWarning} action="warning" />
                  )}
                </Box>
              </>
            )}
          </Box>
        </Box>
        <BorderInfoSection />
      </Box>
    </ScrollView>
  );
}
