import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  ScrollView,
  Platform,
  Animated,
  TouchableOpacity,
} from "react-native";
import { PanGestureHandler, State } from "react-native-gesture-handler";
import { useWindowDimensions } from "@/hooks/useWindowDimensions";
import {
  Box,
  Text,
  VStack,
  HStack,
  Button,
  ButtonText,
  useToast,
  Toast,
  ToastTitle,
} from "@gluestack-ui/themed";
import {
  X,
  Calculator,
  Beaker,
  Edit3,
  Copy,
  Trash2,
  Share,
} from "lucide-react-native";

import { FormGroup } from "@/components/ui/forms/FormSection";
import { TextInput } from "@/components/ui/forms";
import { StyledSelect } from "@/components/ui/select/StyledSelect";
import { ChemistryCalculator } from "@/components/development-recipes/ChemistryCalculator";
import { ShareRecipeModal } from "@/components/ShareRecipeModal";
import { showConfirmAlert } from "@/components/ui/layout/ConfirmAlert";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useChemistryCalculator } from "@/hooks/useChemistryCalculator";
import { useCustomRecipes } from "@/hooks/useCustomRecipes";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { debugLog } from "@/utils/debugLogger";
import type { Film, Developer, Combination } from "@/api/dorkroom/types";
import type { CustomRecipe } from "@/types/customRecipeTypes";
import {
  convertToDisplay,
  formatTime,
  PUSH_PULL_LABELS,
} from "@/constants/developmentRecipes";
import { formatDilution } from "@/utils/dilutionUtils";
import { formatFilmType } from "@/utils/filmTypeFormatter";

interface RecipeDetailProps {
  combination: Combination;
  film: Film | undefined;
  developer: Developer | undefined;
  onClose: () => void;
  onEdit?: () => void; // For editing custom recipes
  onDuplicate?: () => void; // For duplicating any recipe
  onDelete?: () => void; // For deleting custom recipes
  isCustomRecipe?: boolean; // Whether this is a custom recipe
}

export function RecipeDetail({
  combination,
  film,
  developer,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
  isCustomRecipe,
}: RecipeDetailProps) {
  const [showCalculator, setShowCalculator] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { width } = useWindowDimensions();
  const isMobile = Platform.OS !== "web" || width <= 768;

  // Animation for bottom sheet
  const translateY = React.useRef(new Animated.Value(1000)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  const textColor = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");
  const developmentTint = useThemeColor({}, "developmentRecipesTint");
  const cardBackground = useThemeColor({}, "cardBackground");
  const outline = useThemeColor({}, "outline");
  const inputBackground = useThemeColor({}, "inputBackground");

  const chemistry = useChemistryCalculator();
  const { deleteCustomRecipe, forceRefresh } = useCustomRecipes();
  const { isCustomRecipeSharingEnabled } = useFeatureFlags();
  const toast = useToast();

  // Get film and developer names
  const filmName = film ? `${film.brand} ${film.name}` : "Unknown Film";
  const developerName = developer
    ? `${developer.manufacturer} ${developer.name}`
    : "Unknown Developer";

  // Get dilution info
  const dilutionInfo = formatDilution(
    combination.customDilution ||
      developer?.dilutions.find((d) => d.id === combination.dilutionId)
        ?.dilution ||
      "Stock",
  );

  // Available dilutions for calculator
  const availableDilutions = useMemo(() => {
    const dilutions = [{ label: "Stock", value: "Stock" }];

    if (developer?.dilutions) {
      developer.dilutions.forEach((d) => {
        dilutions.push({ label: d.dilution, value: d.dilution });
      });
    }

    if (
      combination.customDilution &&
      !dilutions.find((d) => d.value === combination.customDilution)
    ) {
      dilutions.push({
        label: combination.customDilution,
        value: combination.customDilution,
      });
    }

    return dilutions;
  }, [developer, combination.customDilution]);

  // Set default dilution when calculator is opened
  React.useEffect(() => {
    if (showCalculator && !chemistry.selectedDilution) {
      chemistry.setSelectedDilution(dilutionInfo);
    }
  }, [showCalculator, chemistry, dilutionInfo]);

  const volumeUnits = [
    { label: "Milliliters (ml)", value: "ml" },
    { label: "Fluid Ounces (fl oz)", value: "oz" },
    { label: "Number of Rolls", value: "rolls" },
  ];

  const filmFormats = [
    { label: "35mm (300ml per roll)", value: "35mm" },
    { label: "120 (500ml per roll)", value: "120" },
  ];

  // Animation functions for bottom sheet
  const showBottomSheet = () => {
    setShowCalculator(true);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideBottomSheet = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 1000,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowCalculator(false);
    });
  };

  // Delete functionality for custom recipes - identical to CustomRecipeForm.tsx
  const performDeletion = async () => {
    if (!combination.id) return;

    debugLog("[RecipeDetail] Starting delete operation");
    setIsLoading(true);

    try {
      const recipeName = filmName; // Use the film name as the recipe name for the toast

      await deleteCustomRecipe(combination.id);
      await forceRefresh();

      // Show success toast
      toast.show({
        placement: "top",
        render: ({ id }) => (
          <Toast nativeID={`toast-${id}`} action="success" variant="solid">
            <ToastTitle>&quot;{recipeName}&quot; deleted.</ToastTitle>
          </Toast>
        ),
      });

      if (onDelete) {
        onDelete();
      } else {
        onClose();
      }
    } catch (error) {
      debugLog("[RecipeDetail] Delete operation failed:", error);
      const errorMessage =
        error instanceof Error
          ? `Failed to delete recipe: ${error.message}`
          : "Failed to delete recipe";

      // Show error toast
      toast.show({
        placement: "top",
        render: ({ id }) => (
          <Toast nativeID={`toast-${id}`} action="error" variant="solid">
            <ToastTitle>{errorMessage}</ToastTitle>
          </Toast>
        ),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    showConfirmAlert(
      "Delete Recipe",
      "Are you sure you want to delete this recipe? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: performDeletion },
      ],
    );
  };

  // Handle pan gesture for swipe down
  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: translateY } }],
    { useNativeDriver: true },
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationY, velocityY } = event.nativeEvent;

      if (translationY > 100 || velocityY > 500) {
        hideBottomSheet();
      } else {
        // Snap back to position
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  return (
    <Box
      style={[
        styles.container,
        { backgroundColor: cardBackground, borderColor: outline },
      ]}
    >
      {/* Header */}
      <Box style={styles.header}>
        <VStack space="xs" style={styles.headerContent}>
          <Text
            style={[styles.filmName, { color: developmentTint }]}
            numberOfLines={2}
          >
            {filmName}
          </Text>
          <Text
            style={[styles.developerName, { color: textSecondary }]}
            numberOfLines={2}
          >
            {developerName}
          </Text>
        </VStack>

        <HStack space="xs" style={styles.headerActions}>
          {/* Share button - conditional based on recipe type and feature flags */}
          {(!isCustomRecipe || isCustomRecipeSharingEnabled) && (
            <Button
              variant="outline"
              size="sm"
              onPress={() => setShowShareModal(true)}
              style={styles.actionButton}
            >
              <Share size={16} color={textColor} />
            </Button>
          )}

          {/* Edit button for custom recipes */}
          {isCustomRecipe && onEdit && (
            <Button
              variant="outline"
              size="sm"
              onPress={onEdit}
              style={styles.actionButton}
            >
              <Edit3 size={16} color={developmentTint} />
            </Button>
          )}

          {/* Delete button for custom recipes */}
          {isCustomRecipe && (
            <Button
              variant="outline"
              size="sm"
              onPress={handleDelete}
              style={styles.actionButton}
              disabled={isLoading}
            >
              <Trash2 size={16} color="#ff4444" />
            </Button>
          )}

          {/* Duplicate button for all recipes */}
          {onDuplicate && (
            <Button
              variant="outline"
              size="sm"
              onPress={onDuplicate}
              style={styles.actionButton}
            >
              <Copy size={16} color={textColor} />
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onPress={onClose}
            style={styles.closeButton}
          >
            <X size={20} color={textColor} />
          </Button>
        </HStack>
      </Box>

      {/* Recipe Details - Scrollable */}
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <VStack space="lg" style={styles.content}>
          {/* Basic Parameters */}
          <Box>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              Development Parameters
            </Text>

            <Box style={styles.parametersGrid}>
              <Box style={styles.parameterCard}>
                <Text style={[styles.parameterLabel, { color: textSecondary }]}>
                  Development Time
                </Text>
                <Text style={[styles.parameterValue, { color: textColor }]}>
                  {formatTime(combination.timeMinutes)}
                </Text>
              </Box>

              <Box style={styles.parameterCard}>
                <Text style={[styles.parameterLabel, { color: textSecondary }]}>
                  Temperature
                </Text>
                <Text style={[styles.parameterValue, { color: textColor }]}>
                  {convertToDisplay(combination.temperatureF)}
                </Text>
              </Box>

              <Box style={styles.parameterCard}>
                <Text style={[styles.parameterLabel, { color: textSecondary }]}>
                  Shooting ISO
                </Text>
                <Text style={[styles.parameterValue, { color: textColor }]}>
                  {combination.shootingIso}
                </Text>
              </Box>

              <Box style={styles.parameterCard}>
                <Text style={[styles.parameterLabel, { color: textSecondary }]}>
                  Dilution
                </Text>
                <Text style={[styles.parameterValue, { color: textColor }]}>
                  {dilutionInfo}
                </Text>
              </Box>
            </Box>
          </Box>

          {/* Push/Pull */}
          {combination.pushPull !== 0 && (
            <Box>
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                Push/Pull Processing
              </Text>
              <Text style={[styles.pushPullValue, { color: developmentTint }]}>
                {PUSH_PULL_LABELS[combination.pushPull] ||
                  `${combination.pushPull > 0 ? "+" : ""}${combination.pushPull} stops`}
              </Text>
            </Box>
          )}

          {/* Agitation */}
          {combination.agitationSchedule && (
            <Box>
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                Agitation Schedule
              </Text>
              <Text style={[styles.detailText, { color: textColor }]}>
                {combination.agitationSchedule}
              </Text>
            </Box>
          )}

          {/* Notes */}
          {combination.notes && (
            <Box>
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                Notes
              </Text>
              <Text style={[styles.detailText, { color: textColor }]}>
                {combination.notes}
              </Text>
            </Box>
          )}

          {/* Film Information */}
          {film && (
            <Box>
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                Film Information
              </Text>
              <VStack space="xs">
                <Text style={[styles.detailText, { color: textColor }]}>
                  <Text style={{ fontWeight: "600" }}>ISO Speed:</Text>{" "}
                  {film.isoSpeed}
                </Text>
                <Text style={[styles.detailText, { color: textColor }]}>
                  <Text style={{ fontWeight: "600" }}>Type:</Text>{" "}
                  {formatFilmType(film.colorType)}
                </Text>
                {film.grainStructure && (
                  <Text style={[styles.detailText, { color: textColor }]}>
                    <Text style={{ fontWeight: "600" }}>Grain:</Text>{" "}
                    {film.grainStructure}
                  </Text>
                )}
              </VStack>
            </Box>
          )}

          {/* Developer Information */}
          {developer && (
            <Box>
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                Developer Information
              </Text>
              <VStack space="xs">
                <Text style={[styles.detailText, { color: textColor }]}>
                  <Text style={{ fontWeight: "600" }}>Type:</Text>{" "}
                  {developer.type}
                </Text>
                <Text style={[styles.detailText, { color: textColor }]}>
                  <Text style={{ fontWeight: "600" }}>For:</Text>{" "}
                  {developer.filmOrPaper}
                </Text>
                {developer.workingLifeHours && (
                  <Text style={[styles.detailText, { color: textColor }]}>
                    <Text style={{ fontWeight: "600" }}>Working Life:</Text>{" "}
                    {developer.workingLifeHours} hours
                  </Text>
                )}
                {developer.stockLifeMonths && (
                  <Text style={[styles.detailText, { color: textColor }]}>
                    <Text style={{ fontWeight: "600" }}>Stock Life:</Text>{" "}
                    {developer.stockLifeMonths} months
                  </Text>
                )}
              </VStack>
            </Box>
          )}

          {/* Chemistry Calculator Toggle */}
          <Box style={styles.calculatorSection}>
            <Button
              variant="outline"
              onPress={
                isMobile
                  ? showBottomSheet
                  : () => setShowCalculator(!showCalculator)
              }
              style={[
                styles.calculatorToggle,
                { borderColor: developmentTint },
              ]}
            >
              <Calculator size={16} color={developmentTint} />
              <ButtonText
                style={[
                  styles.calculatorToggleText,
                  { color: developmentTint },
                ]}
              >
                Show Chemistry Calculator
              </ButtonText>
            </Button>

            {/* Chemistry Calculator - Desktop Only */}
            {showCalculator && !isMobile && (
              <VStack
                space="md"
                style={[
                  styles.calculator,
                  { backgroundColor: inputBackground },
                ]}
              >
                <HStack space="sm" style={styles.calculatorHeader}>
                  <Beaker size={16} color={developmentTint} />
                  <Text style={[styles.calculatorTitle, { color: textColor }]}>
                    Chemistry Calculator
                  </Text>
                </HStack>

                <FormGroup label="Volume Unit">
                  <StyledSelect
                    value={chemistry.unit}
                    onValueChange={(value) => chemistry.setUnit(value as any)}
                    items={volumeUnits}
                  />
                </FormGroup>

                {chemistry.unit === "rolls" ? (
                  <>
                    <FormGroup label="Film Format">
                      <StyledSelect
                        value={chemistry.filmFormat}
                        onValueChange={(value) =>
                          chemistry.setFilmFormat(value as any)
                        }
                        items={filmFormats}
                      />
                    </FormGroup>

                    <FormGroup label="Number of Rolls">
                      <TextInput
                        value={chemistry.numberOfRolls}
                        onChangeText={chemistry.setNumberOfRolls}
                        placeholder="1"
                        keyboardType="numeric"
                        inputTitle="Enter Number of Rolls"
                      />
                    </FormGroup>
                  </>
                ) : (
                  <FormGroup label={`Total Volume (${chemistry.unit})`}>
                    <TextInput
                      value={chemistry.totalVolume}
                      onChangeText={chemistry.setTotalVolume}
                      placeholder={chemistry.unit === "ml" ? "500" : "16.9"}
                      keyboardType="numeric"
                      inputTitle={`Enter Total Volume (${chemistry.unit})`}
                    />
                  </FormGroup>
                )}

                <FormGroup label="Dilution Ratio">
                  <StyledSelect
                    value={chemistry.selectedDilution || ""}
                    onValueChange={(value) =>
                      chemistry.setSelectedDilution(value || null)
                    }
                    items={availableDilutions}
                  />
                </FormGroup>

                {/* Results */}
                {chemistry.calculation && (
                  <Box
                    style={[
                      styles.calculationResults,
                      { borderColor: outline },
                    ]}
                  >
                    <Text style={[styles.resultsTitle, { color: textColor }]}>
                      Recipe:
                    </Text>

                    <VStack space="xs">
                      <HStack style={styles.resultRow}>
                        <Text
                          style={[styles.resultLabel, { color: textSecondary }]}
                        >
                          Total Volume:
                        </Text>
                        <Text
                          style={[styles.resultValue, { color: textColor }]}
                        >
                          {chemistry.calculation.totalVolumeDisplay}
                        </Text>
                      </HStack>

                      <HStack style={styles.resultRow}>
                        <Text
                          style={[styles.resultLabel, { color: textSecondary }]}
                        >
                          Developer:
                        </Text>
                        <Text
                          style={[
                            styles.resultValue,
                            { color: developmentTint },
                          ]}
                        >
                          {chemistry.calculation.developerVolumeDisplay}
                        </Text>
                      </HStack>

                      <HStack style={styles.resultRow}>
                        <Text
                          style={[styles.resultLabel, { color: textSecondary }]}
                        >
                          Water:
                        </Text>
                        <Text
                          style={[styles.resultValue, { color: textColor }]}
                        >
                          {chemistry.calculation.waterVolumeDisplay}
                        </Text>
                      </HStack>
                    </VStack>
                  </Box>
                )}

                {/* Errors */}
                {chemistry.errors.length > 0 && (
                  <Box style={styles.errorContainer}>
                    {chemistry.errors.map((error, index) => (
                      <Text key={index} style={styles.errorText}>
                        {error}
                      </Text>
                    ))}
                  </Box>
                )}

                <Button
                  variant="outline"
                  onPress={chemistry.reset}
                  style={styles.resetButton}
                >
                  <ButtonText
                    style={[styles.resetButtonText, { color: textSecondary }]}
                  >
                    Reset Calculator
                  </ButtonText>
                </Button>
              </VStack>
            )}
          </Box>
        </VStack>
      </ScrollView>

      {/* Bottom Sheet Overlay - Mobile Only */}
      {isMobile && showCalculator && (
        <>
          {/* Backdrop */}
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={hideBottomSheet}
          >
            <Animated.View
              style={[styles.backdropOverlay, { opacity }]}
              pointerEvents="none"
            />
          </TouchableOpacity>

          {/* Bottom Sheet */}
          <PanGestureHandler
            onGestureEvent={onGestureEvent}
            onHandlerStateChange={onHandlerStateChange}
          >
            <Animated.View
              style={[
                styles.bottomSheet,
                {
                  backgroundColor: cardBackground,
                  borderColor: outline,
                  transform: [{ translateY }],
                },
              ]}
            >
              {/* Bottom Sheet Header */}
              <Box style={styles.bottomSheetHeader}>
                <Box style={styles.dragHandle} />
                <HStack style={styles.bottomSheetTitleContainer}>
                  <VStack space="xs" style={styles.bottomSheetTitleContent}>
                    <Text
                      style={[styles.bottomSheetTitle, { color: textColor }]}
                    >
                      Chemistry Calculator
                    </Text>
                    <Text
                      style={[
                        styles.bottomSheetSubtitle,
                        { color: textSecondary },
                      ]}
                    >
                      {filmName} + {developerName}
                    </Text>
                  </VStack>
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={hideBottomSheet}
                    style={styles.closeButton}
                  >
                    <X size={20} color={textColor} />
                  </Button>
                </HStack>
              </Box>

              {/* Bottom Sheet Content */}
              <ScrollView
                style={styles.bottomSheetScrollView}
                showsVerticalScrollIndicator={false}
              >
                <Box style={styles.bottomSheetContent}>
                  <ChemistryCalculator
                    availableDilutions={availableDilutions}
                    defaultDilution={dilutionInfo}
                  />
                </Box>
              </ScrollView>
            </Animated.View>
          </PanGestureHandler>
        </>
      )}

      {/* Share Recipe Modal */}
      <ShareRecipeModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        recipe={combination}
        film={film}
        developer={developer}
        isCustomRecipe={isCustomRecipe}
        customRecipe={
          isCustomRecipe ? (combination as unknown as CustomRecipe) : undefined
        }
      />
    </Box>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    overflow: "visible",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  headerContent: {
    flex: 1,
    marginRight: 12,
  },
  filmName: {
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 24,
  },
  developerName: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  headerActions: {
    alignItems: "center",
  },
  actionButton: {
    width: 32,
    height: 32,
    padding: 0,
    minHeight: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    width: 32,
    height: 32,
    padding: 0,
    minHeight: 32,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  parametersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  parameterCard: {
    flex: 1,
    minWidth: "45%",
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 8,
  },
  parameterLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  parameterValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  pushPullValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  detailText: {
    fontSize: 14,
    lineHeight: 20,
  },
  calculatorSection: {
    marginTop: 8,
  },
  calculatorToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
  },
  calculatorToggleText: {
    fontSize: 14,
    fontWeight: "500",
  },
  calculator: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  calculatorHeader: {
    alignItems: "center",
    marginBottom: 12,
  },
  calculatorTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  input: {
    borderRadius: 8,
  },
  calculationResults: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 8,
  },
  resultsTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  resultRow: {
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  resultValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  errorContainer: {
    padding: 8,
    backgroundColor: "rgba(255, 0, 0, 0.1)",
    borderRadius: 6,
  },
  errorText: {
    fontSize: 12,
    color: "#d32f2f",
  },
  resetButton: {
    alignSelf: "center",
  },
  resetButtonText: {
    fontSize: 12,
  },
  // Bottom Sheet Styles
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  backdropOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  bottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "85%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    zIndex: 1001,
    overflow: "hidden",
  },
  bottomSheetHeader: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  bottomSheetTitleContainer: {
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  bottomSheetTitleContent: {
    flex: 1,
    marginRight: 12,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  bottomSheetSubtitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  bottomSheetScrollView: {
    flex: 1,
  },
  bottomSheetContent: {
    padding: 16,
    paddingBottom: 32,
  },
});
