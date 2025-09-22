import React, { useState, useEffect, useCallback } from "react";
import { Platform, ScrollView, Linking } from "react-native";
import { Box, Text, Button, ButtonText, HStack } from "@gluestack-ui/themed";
import { X } from "lucide-react-native";

import { useThemeColor } from "@/hooks/useThemeColor";
import {
  showAlert,
  showConfirmAlert,
} from "@/components/ui/layout/ConfirmAlert";
import { useDevelopmentRecipes } from "@/hooks/useDevelopmentRecipes";
import { useCustomRecipes } from "@/hooks/useCustomRecipes";
import {
  createRecipeIssue,
  createIssueUrl,
} from "@/utils/githubIssueGenerator";
import { normalizeDilution } from "@/utils/dilutionUtils";
import { debugLog } from "@/utils/debugLogger";
import type {
  CustomRecipe,
  CustomRecipeFormData,
  CustomFilmData,
  CustomDeveloperData,
} from "@/types/customRecipeTypes";

// Step components
import {
  ProgressIndicator,
  StepNavigation,
  RecipeIdentityStep,
  DeveloperSetupStep,
  DevelopmentParamsStep,
  FinalDetailsStep,
  SaveSubmitStep,
} from "./recipe-steps";

interface CustomRecipeFormProps {
  recipe?: CustomRecipe; // For editing existing recipes
  onClose: () => void;
  onSave?: (recipeId: string) => void;
  isDesktop?: boolean;
  isMobileWeb?: boolean;
}

const STEP_TITLES = [
  "Recipe Identity",
  "Developer Setup",
  "Development Parameters",
  "Final Details",
  "Save & Submit",
];

export function CustomRecipeForm({
  recipe,
  onClose,
  onSave,
  isDesktop = false,
  isMobileWeb = false,
}: CustomRecipeFormProps) {
  debugLog("[CustomRecipeForm] ===== COMPONENT RENDER =====");
  debugLog("[CustomRecipeForm] Props received:", {
    hasRecipe: !!recipe,
    recipeId: recipe?.id,
    recipeName: recipe?.name,
    hasOnClose: !!onClose,
    hasOnSave: !!onSave,
    isDesktop,
    isMobileWeb,
  });
  debugLog(
    "[CustomRecipeForm] Full recipe object:",
    JSON.stringify(recipe, null, 2),
  );

  const textColor = useThemeColor({}, "text");
  const cardBackground = useThemeColor({}, "cardBackground");
  const outline = useThemeColor({}, "outline");

  const { allFilms, allDevelopers, getFilmById, getDeveloperById } =
    useDevelopmentRecipes();
  const {
    addCustomRecipe,
    updateCustomRecipe,
    deleteCustomRecipe,
    forceRefresh,
  } = useCustomRecipes();

  // Step state management
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDilution, setSelectedDilution] = useState<string>("");

  // Form data initialization
  const [formData, setFormData] = useState<CustomRecipeFormData>(() => {
    if (recipe) {
      return {
        name: recipe.name,
        useExistingFilm: !recipe.isCustomFilm,
        selectedFilmId: recipe.isCustomFilm ? undefined : recipe.filmId,
        customFilm: recipe.customFilm,
        useExistingDeveloper: !recipe.isCustomDeveloper,
        selectedDeveloperId: recipe.isCustomDeveloper
          ? undefined
          : recipe.developerId,
        customDeveloper: recipe.customDeveloper,
        temperatureF: recipe.temperatureF,
        timeMinutes: recipe.timeMinutes,
        shootingIso: recipe.shootingIso,
        pushPull: recipe.pushPull,
        agitationSchedule: recipe.agitationSchedule || "",
        notes: recipe.notes || "",
        customDilution: recipe.customDilution || "",
        isPublic: recipe.isPublic,
      };
    }

    return {
      name: "",
      useExistingFilm: true,
      selectedFilmId: undefined,
      customFilm: {
        brand: "",
        name: "",
        isoSpeed: 400,
        colorType: "bw",
        grainStructure: "",
        description: "",
      },
      useExistingDeveloper: true,
      selectedDeveloperId: undefined,
      customDeveloper: {
        manufacturer: "",
        name: "",
        type: "",
        filmOrPaper: "film",
        workingLifeHours: undefined,
        stockLifeMonths: undefined,
        notes: "",
        mixingInstructions: "",
        safetyNotes: "",
        dilutions: [{ name: "Stock", dilution: "1+1" }],
      },
      temperatureF: 68,
      timeMinutes: 7,
      shootingIso: 400, // Will be auto-updated by useEffect when film is selected
      pushPull: 0,
      agitationSchedule: "",
      notes: "",
      customDilution: "",
      isPublic: false,
    };
  });

  // Film and developer options for selects
  const filmOptions = [
    { label: "Select a film...", value: "" },
    ...allFilms
      .filter((film) => film.colorType === "bw") // Only show black and white films
      .map((film) => ({
        label: `${film.brand} ${film.name}`,
        value: film.uuid,
      })),
  ];

  // Get available dilutions for selected developer
  const selectedDeveloper =
    formData.useExistingDeveloper && formData.selectedDeveloperId
      ? getDeveloperById(formData.selectedDeveloperId) || null
      : null;

  const dilutionOptions = React.useMemo(() => {
    if (!selectedDeveloper) return [];

    const options = [
      { label: "Select a dilution...", value: "" },
      ...selectedDeveloper.dilutions.map((d: any) => ({
        label: `${d.name} (${d.dilution})`,
        value: d.dilution,
      })),
      { label: "Custom dilution", value: "custom" },
    ];

    return options;
  }, [selectedDeveloper]);

  // Initialize selectedDilution when editing an existing recipe
  useEffect(() => {
    if (
      recipe &&
      formData.useExistingDeveloper &&
      formData.customDilution &&
      selectedDeveloper
    ) {
      const matchingDilution = selectedDeveloper.dilutions.find(
        (d: any) => d.dilution === formData.customDilution,
      );
      if (matchingDilution) {
        setSelectedDilution(matchingDilution.dilution);
      } else {
        setSelectedDilution("custom");
      }
    }
  }, [
    recipe,
    formData.useExistingDeveloper,
    formData.customDilution,
    selectedDeveloper,
  ]);

  // Step validation functions
  const validateRecipeIdentity = (): boolean => {
    if (!formData.name.trim()) return false;
    if (formData.useExistingFilm && !formData.selectedFilmId) return false;
    if (!formData.useExistingFilm && formData.customFilm) {
      if (!formData.customFilm.brand.trim() || !formData.customFilm.name.trim())
        return false;
    }
    return true;
  };

  const validateDeveloperSetup = (): boolean => {
    if (formData.useExistingDeveloper && !formData.selectedDeveloperId)
      return false;
    if (!formData.useExistingDeveloper && formData.customDeveloper) {
      if (
        !formData.customDeveloper.manufacturer.trim() ||
        !formData.customDeveloper.name.trim() ||
        !formData.customDeveloper.type.trim()
      )
        return false;
    }
    return true;
  };

  const validateDevelopmentParams = (): boolean => {
    return (
      formData.temperatureF >= 32 &&
      formData.temperatureF <= 120 &&
      formData.timeMinutes > 0 &&
      formData.shootingIso > 0
    );
  };

  const validateFinalDetails = (): boolean => {
    return true; // All fields are optional in this step
  };

  const validateSaveSubmit = (): boolean => {
    return true; // Just action buttons, no validation needed
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 0:
        return validateRecipeIdentity();
      case 1:
        return validateDeveloperSetup();
      case 2:
        return validateDevelopmentParams();
      case 3:
        return validateFinalDetails();
      case 4:
        return validateSaveSubmit();
      default:
        return false;
    }
  };

  const stepValidation = {
    0: validateRecipeIdentity(),
    1: validateDeveloperSetup(),
    2: validateDevelopmentParams(),
    3: validateFinalDetails(),
    4: validateSaveSubmit(),
  };

  // Form data update functions
  const updateFormData = useCallback(
    (updates: Partial<CustomRecipeFormData>) => {
      setFormData((prev) => ({ ...prev, ...updates }));
    },
    [],
  );

  const updateCustomFilm = (updates: Partial<CustomFilmData>) => {
    if (formData.customFilm) {
      updateFormData({
        customFilm: { ...formData.customFilm, ...updates },
      });
    }
  };

  const updateCustomDeveloper = (updates: Partial<CustomDeveloperData>) => {
    if (formData.customDeveloper) {
      updateFormData({
        customDeveloper: { ...formData.customDeveloper, ...updates },
      });
    }
  };

  const addDilution = () => {
    if (formData.customDeveloper) {
      updateCustomDeveloper({
        dilutions: [
          ...formData.customDeveloper.dilutions,
          { name: "", dilution: "" },
        ],
      });
    }
  };

  const updateDilution = (
    index: number,
    field: "name" | "dilution",
    value: string,
  ) => {
    if (formData.customDeveloper) {
      const newDilutions = [...formData.customDeveloper.dilutions];
      const processedValue =
        field === "dilution" ? normalizeDilution(value) : value;
      newDilutions[index] = { ...newDilutions[index], [field]: processedValue };
      updateCustomDeveloper({ dilutions: newDilutions });
    }
  };

  const removeDilution = (index: number) => {
    if (
      formData.customDeveloper &&
      formData.customDeveloper.dilutions.length > 1
    ) {
      const newDilutions = formData.customDeveloper.dilutions.filter(
        (_, i) => i !== index,
      );
      updateCustomDeveloper({ dilutions: newDilutions });
    }
  };

  const handleDilutionChange = (value: string) => {
    setSelectedDilution(value);
    if (value && value !== "custom") {
      updateFormData({ customDilution: value });
    } else if (value === "custom") {
      updateFormData({ customDilution: "" });
    }
  };

  // Auto-update shooting ISO when film selection changes (only for new recipes)
  useEffect(() => {
    // Don't auto-update if we're editing an existing recipe
    if (recipe) return;

    let filmIso: number | undefined;

    if (formData.useExistingFilm && formData.selectedFilmId) {
      // Get ISO from selected existing film
      const selectedFilm = getFilmById(formData.selectedFilmId);
      filmIso = selectedFilm?.isoSpeed;
    } else if (!formData.useExistingFilm && formData.customFilm?.isoSpeed) {
      // Get ISO from custom film
      filmIso = formData.customFilm.isoSpeed;
    }

    // Update shooting ISO if we have a valid film ISO
    if (filmIso) {
      debugLog("[CustomRecipeForm] Auto-updating shooting ISO to", filmIso);
      updateFormData({ shootingIso: filmIso });
    }
  }, [
    recipe, // Only run for new recipes
    formData.useExistingFilm,
    formData.selectedFilmId,
    formData.customFilm?.isoSpeed,
    getFilmById,
    updateFormData,
  ]);

  // Navigation functions
  const nextStep = () => {
    if (currentStep < 4 && validateCurrentStep()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Validation and save functions
  const validateForm = (): string | null => {
    if (!validateRecipeIdentity())
      return "Please complete recipe identity information";
    if (!validateDeveloperSetup()) return "Please complete developer setup";
    if (!validateDevelopmentParams())
      return "Please check development parameters";
    return null;
  };

  const handleSave = async () => {
    debugLog("[CustomRecipeForm] handleSave called");

    const validationError = validateForm();
    if (validationError) {
      debugLog("[CustomRecipeForm] Validation failed:", validationError);
      showAlert("Validation Error", validationError);
      return;
    }

    debugLog("[CustomRecipeForm] Validation passed, starting save operation");
    setIsLoading(true);
    try {
      let savedRecipeId: string;

      if (recipe) {
        debugLog("[CustomRecipeForm] Updating existing recipe:", recipe.id);
        await updateCustomRecipe(recipe.id, formData);
        savedRecipeId = recipe.id;
      } else {
        debugLog("[CustomRecipeForm] Adding new recipe");
        savedRecipeId = await addCustomRecipe(formData);
      }

      debugLog("[CustomRecipeForm] Successfully saved recipe:", savedRecipeId);
      onSave?.(savedRecipeId);
      onClose();
    } catch (error) {
      debugLog("[CustomRecipeForm] Save operation failed:", error);
      const errorMessage =
        error instanceof Error
          ? `Failed to save recipe: ${error.message}`
          : "Failed to save recipe";
      showAlert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete functionality
  const performDeletion = async () => {
    if (!recipe) return;

    debugLog("[CustomRecipeForm] Starting delete operation");
    setIsLoading(true);

    try {
      await deleteCustomRecipe(recipe.id);
      await forceRefresh();

      if (onSave) {
        onSave(recipe.id);
      } else {
        onClose();
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? `Failed to delete recipe: ${error.message}`
          : "Failed to delete recipe";

      showAlert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!recipe) return;

    showConfirmAlert(
      "Delete Recipe",
      "Are you sure you want to delete this recipe? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: performDeletion },
      ],
    );
  };

  const handleSubmitToGitHub = async () => {
    const validationError = validateForm();
    if (validationError) {
      showAlert("Validation Error", validationError);
      return;
    }

    const filmData = formData.useExistingFilm
      ? getFilmById(formData.selectedFilmId!)
      : formData.customFilm;

    const developerData = formData.useExistingDeveloper
      ? getDeveloperById(formData.selectedDeveloperId!)
      : formData.customDeveloper;

    const tempRecipe: CustomRecipe = {
      id: recipe?.id || "temp",
      name: formData.name,
      filmId: formData.selectedFilmId || "custom",
      developerId: formData.selectedDeveloperId || "custom",
      temperatureF: formData.temperatureF,
      timeMinutes: formData.timeMinutes,
      shootingIso: formData.shootingIso,
      pushPull: formData.pushPull,
      agitationSchedule: formData.agitationSchedule,
      notes: formData.notes,
      customDilution: formData.customDilution,
      isCustomFilm: !formData.useExistingFilm,
      isCustomDeveloper: !formData.useExistingDeveloper,
      customFilm: formData.customFilm,
      customDeveloper: formData.customDeveloper,
      dateCreated: recipe?.dateCreated || new Date().toISOString(),
      dateModified: new Date().toISOString(),
      isPublic: formData.isPublic,
    };

    const issueData = createRecipeIssue(
      tempRecipe,
      filmData,
      developerData,
      "",
    );
    const githubUrl = createIssueUrl(issueData);

    if (Platform.OS === "web") {
      window.open(githubUrl, "_blank");
    } else {
      try {
        await Linking.openURL(githubUrl);
      } catch {
        showAlert("Error", "Could not open GitHub in browser");
      }
    }
  };

  // Render current step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <RecipeIdentityStep
            formData={formData}
            updateFormData={updateFormData}
            updateCustomFilm={updateCustomFilm}
            filmOptions={filmOptions}
            allFilms={allFilms}
            isDesktop={isDesktop}
          />
        );
      case 1:
        return (
          <DeveloperSetupStep
            formData={formData}
            updateFormData={updateFormData}
            updateCustomDeveloper={updateCustomDeveloper}
            allDevelopers={allDevelopers}
            selectedDeveloper={selectedDeveloper}
            dilutionOptions={dilutionOptions}
            selectedDilution={selectedDilution}
            handleDilutionChange={handleDilutionChange}
            addDilution={addDilution}
            updateDilution={updateDilution}
            removeDilution={removeDilution}
            isDesktop={isDesktop}
          />
        );
      case 2:
        return (
          <DevelopmentParamsStep
            formData={formData}
            updateFormData={updateFormData}
            filmOptions={filmOptions}
            getFilmById={getFilmById}
            isDesktop={isDesktop}
          />
        );
      case 3:
        return (
          <FinalDetailsStep
            formData={formData}
            updateFormData={updateFormData}
            selectedDilution={selectedDilution}
            isDesktop={isDesktop}
          />
        );
      case 4:
        return (
          <SaveSubmitStep
            formData={formData}
            recipe={recipe}
            onSave={handleSave}
            onDelete={handleDelete}
            onSubmitToGitHub={handleSubmitToGitHub}
            isLoading={isLoading}
            isDesktop={isDesktop}
          />
        );
      default:
        return null;
    }
  };

  // Check if we're on the final step (no Next button needed)
  const isLastStep = currentStep === 4;

  return (
    <Box
      style={{
        flex: 1,
        backgroundColor: cardBackground,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header with progress indicator */}
      <Box
        style={{
          paddingTop:
            Platform.OS === "ios" ? 20 : Platform.OS === "android" ? 16 : 16,
          paddingHorizontal: 16,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: outline,
          backgroundColor: cardBackground,
          // For native mobile, optimized for bottom-sheet style modal
          ...(Platform.OS !== "web" && {
            paddingTop: 24, // Extra padding for rounded top corners
            minHeight: 80,
            borderTopLeftRadius: 48,
            borderTopRightRadius: 48,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
          }),
        }}
      >
        <HStack
          style={{
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "600", color: textColor }}>
            {recipe ? "Edit Recipe" : "New Recipe"}
          </Text>
          {!isDesktop && (
            <Button onPress={onClose} variant="outline" size="sm">
              <X size={16} color={textColor} />
            </Button>
          )}
        </HStack>

        <ProgressIndicator
          currentStep={currentStep}
          totalSteps={5}
          stepTitles={STEP_TITLES}
          stepValidation={stepValidation}
        />
      </Box>

      {/* Content area - properly scrollable with native mobile adjustments */}
      <Box
        style={{
          flex: 1,
          minHeight: 0, // Critical for proper flex scrolling
        }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            padding: 16,
            // For native mobile, ensure comfortable spacing for modal bottom sheet
            ...(Platform.OS !== "web" && {
              paddingBottom: 24,
            }),
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderCurrentStep()}
        </ScrollView>
      </Box>

      {/* Navigation footer - optimized for native mobile thumb access */}
      <Box
        style={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: Platform.OS === "ios" ? 34 : 16,
          borderTopWidth: 1,
          borderTopColor: outline,
          backgroundColor: cardBackground,
          // For native mobile bottom-sheet style, ensure comfortable thumb access
          ...(Platform.OS !== "web" && {
            paddingBottom: Platform.OS === "ios" ? 34 : 20,
            minHeight: 70,
          }),
        }}
      >
        {/* Only show step navigation if not on final step */}
        {!isLastStep && (
          <StepNavigation
            currentStep={currentStep}
            totalSteps={5}
            canProceed={validateCurrentStep()}
            onPrevious={previousStep}
            onNext={nextStep}
            onSave={handleSave}
            isLoading={isLoading}
            recipe={recipe}
            showGitHubSubmit={false} // Moved to SaveSubmitStep
            isDesktop={isDesktop}
          />
        )}

        {/* On final step, show simple navigation without save buttons */}
        {isLastStep && (
          <HStack space="md">
            <Button
              variant="outline"
              onPress={previousStep}
              style={{ flex: 1 }}
            >
              <ButtonText>Previous</ButtonText>
            </Button>

            <Button
              onPress={onClose}
              style={{ flex: 1, backgroundColor: outline }}
            >
              <ButtonText>Close</ButtonText>
            </Button>
          </HStack>
        )}
      </Box>
    </Box>
  );
}
